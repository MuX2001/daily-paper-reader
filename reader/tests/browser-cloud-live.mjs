// Opt-in integration test: real local Auth/REST, isolated temporary users.
// Only paper metadata is a fixture. No Supabase requests are mocked.
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const connection=JSON.parse(await readFile(process.env.DPR_LOCAL_SUPABASE_CONNECTION,'utf8'));
const api=new URL(connection.API_URL);
const site=new URL(process.env.DPR_TEST_URL||'http://127.0.0.1:5174/');
if(!['127.0.0.1','localhost','[::1]'].includes(api.hostname)||!['127.0.0.1','localhost','[::1]'].includes(site.hostname))throw new Error('Live test requires disposable loopback services');
const users=[];let browser;
async function request(path,key,body,method='POST'){
 const response=await fetch(new URL(path,api),{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok)throw new Error(`Local Supabase ${method} failed (${response.status})`);
 return response.status===204?null:response.json();
}
const p={paper_key:'arxiv:1706.03762v7',original_id:'1706.03762v7',source:'arxiv',title:'Live cloud test paper',score:8,authors:[],abstract:'Fixture metadata; real private states',tags:[],breakdown:{}};
async function open(session){
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(({url,key,session})=>{
  localStorage.setItem('dpr.cloud.url',url);localStorage.setItem('dpr.cloud.key',key);
  localStorage.setItem(`sb-${new URL(url).hostname.split('.')[0]}-auth-token`,JSON.stringify(session));
 },{url:api.origin,key:connection.ANON_KEY,session});
 const page=await context.newPage();
 await page.route('**/docs/data/catalog.json',r=>r.fulfill({json:{schema_version:1,runs:[{run_id:'20261124',path:'daily/20261124.json',count:1}]}}));
 await page.route('**/docs/data/daily/20261124.json',r=>r.fulfill({json:{schema_version:1,run_id:'20261124',papers:[p]}}));
 await page.goto(site.href);await page.getByText('云端账户已连接',{exact:true}).waitFor();
 const editor=page.getByRole('textbox',{name:'个人阅读笔记',exact:true});await editor.waitFor();
 return {context,page,editor};
}
try{
 for(let i=0;i<2;i++){
  const email=`browser-${randomUUID()}@example.test`,password=randomUUID();
  const user=await request('/auth/v1/admin/users',connection.SERVICE_ROLE_KEY,{email,password,email_confirm:true});
  users.push({id:user.id,email,password});
 }
 const login=user=>request('/auth/v1/token?grant_type=password',connection.ANON_KEY,{email:user.email,password:user.password});
 const sessions=await Promise.all([login(users[0]),login(users[0]),login(users[1])]);
 browser=await chromium.launch({headless:true});
 const [a,b,other]=await Promise.all(sessions.map(open));
 await a.editor.fill('Private note from device A');await a.page.getByRole('button',{name:'保存笔记',exact:true}).click();
 await expect(a.page.locator('.note-controls [role=status]')).toContainText('与云端一致');
 await b.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(b.editor).toHaveValue('Private note from device A');
 await other.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(other.editor).toHaveValue('');
 await b.editor.fill('Device B unsaved draft');
 await a.editor.fill('Updated on device A');await a.page.getByRole('button',{name:'保存笔记',exact:true}).click();await expect(a.page.locator('.note-controls [role=status]')).toContainText('与云端一致');
 await b.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await b.page.getByText('云端笔记已变更。草稿仍保留，请比较后选择；不会自动覆盖。',{exact:true}).waitFor();
 await expect(b.editor).toHaveValue('Device B unsaved draft');await expect(b.page.getByRole('button',{name:'保存笔记',exact:true})).toBeDisabled();
 await b.page.getByRole('button',{name:'采用云端内容',exact:true}).click();await expect(b.editor).toHaveValue('Updated on device A');
 await other.editor.fill('Private note of a different account');await other.page.getByRole('button',{name:'保存笔记',exact:true}).click();await expect(other.page.locator('.note-controls [role=status]')).toContainText('与云端一致');
 await a.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(a.editor).toHaveValue('Updated on device A');
 const response=await fetch(new URL('/rest/v1/paper_states?select=note_text',api),{headers:{apikey:connection.ANON_KEY,Authorization:`Bearer ${sessions[0].access_token}`}});
 assert.deepEqual(await response.json(),[{note_text:'Updated on device A'}]);
 console.log('PASS: real Auth sessions + browser REST writes; same-account focus synchronization, unsaved draft conflict, cross-account note isolation');
}finally{
 if(browser)await browser.close();
 const cleanup=await Promise.allSettled(users.map(user=>request('/auth/v1/admin/users/'+user.id,connection.SERVICE_ROLE_KEY,undefined,'DELETE')));
 if(cleanup.some(result=>result.status==='rejected'))throw new Error('Temporary browser-test account cleanup failed');
}
