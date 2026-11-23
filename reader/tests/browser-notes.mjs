import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const user={id:'00000000-0000-0000-0000-000000000001',aud:'authenticated',role:'authenticated',user_metadata:{}};
 await page.addInitScript(user=>{
  localStorage.setItem('dpr.cloud.url','https://notes.supabase.co');localStorage.setItem('dpr.cloud.key','sb_publishable_test');
  localStorage.setItem('sb-notes-auth-token',JSON.stringify({access_token:'test-token',refresh_token:'test-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer',user}));
 },user);
 const p={paper_key:'arxiv:1706.03762v7',original_id:'1706.03762v7',source:'arxiv',title:'Notes fixture',authors:[],abstract:'Abstract',tags:[],breakdown:{},score:8};
 let cloud={paper_key:p.paper_key,user_id:user.id,revision:1,note_text:'Cloud original',starred:false,read_at:null,dismissed_at:null,feedback:0};let saved;
 await page.route('https://notes.supabase.co/**',async route=>{
  if(route.request().method()==='PATCH'){saved=route.request().postDataJSON();if(!route.request().url().includes(`revision=eq.${cloud.revision}`)){await route.fulfill({status:406,json:{message:'revision conflict'}});return;}cloud={...cloud,...saved,revision:cloud.revision+1};await route.fulfill({json:cloud});}
  else if(route.request().url().includes('/rest/v1/paper_states'))await route.fulfill({json:[cloud,{paper_key:'arxiv:1706.03762v6',starred:true,revision:1,feedback:0}]});
  else await route.fulfill({json:user});
 });
 await page.route('**/docs/data/catalog.json',r=>r.fulfill({json:{schema_version:1,runs:[{run_id:'20261124',count:2,path:'daily/20261124.json'}]}}));
 await page.route('**/docs/data/daily/20261124.json',r=>r.fulfill({json:{schema_version:1,run_id:'20261124',papers:[p,{...p,paper_key:'arxiv:1706.03762v6',original_id:'1706.03762v6',title:'Second paper'}]}}));
 await page.goto(process.env.DPR_TEST_URL||'http://127.0.0.1:5173/');
 const editor=page.getByRole('textbox',{name:'个人阅读笔记',exact:true});await editor.waitFor();
 await page.waitForFunction(()=>document.querySelector('.note-editor textarea')?.value==='Cloud original');
 await editor.fill('My unsaved research note');await page.locator('.paper-select').nth(1).click();assert.equal(await editor.inputValue(),'');
 await page.locator('.paper-select').first().click();assert.equal(await editor.inputValue(),'My unsaved research note');
 await page.getByRole('button',{name:'保存笔记',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.note-controls [role=status]')?.textContent.includes('与云端一致'));assert.equal(saved.note_text,'My unsaved research note');
 await editor.fill('Local newer draft');cloud={...cloud,note_text:'Other device edit',revision:3};await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.getByText('云端笔记已变更。草稿仍保留，请比较后选择；不会自动覆盖。',{exact:true}).waitFor();assert.equal(await editor.inputValue(),'Local newer draft');assert.equal(await page.getByRole('button',{name:'保存笔记',exact:true}).isDisabled(),true);
 const promise=page.waitForEvent('download');await page.getByRole('button',{name:'下载 Markdown',exact:true}).click();const file=await promise;assert.ok((await readFile(await file.path(),'utf8')).includes('Local newer draft'));
 await page.getByRole('button',{name:'采用云端内容',exact:true}).click();assert.equal(await editor.inputValue(),'Other device edit');
 await page.getByRole('button',{name:'批量归档',exact:true}).click();await page.getByRole('button',{name:'归档 1 篇',exact:true}).click();
 await page.getByRole('button',{name:'撤销上次归档（1）',exact:true}).waitFor();
 await page.getByRole('button',{name:'撤销上次归档（1）',exact:true}).click();await page.locator('.banner').filter({hasText:'已撤销 1 篇归档。'}).waitFor();assert.equal(cloud.dismissed_at,null);assert.equal(cloud.note_text,'Other device edit');
 await page.getByRole('button',{name:'批量归档',exact:true}).click();await page.getByRole('button',{name:'归档 1 篇',exact:true}).click();await page.getByRole('button',{name:'撤销上次归档（1）',exact:true}).waitFor();
 cloud={...cloud,revision:cloud.revision+1,note_text:'New note after archive'};
 await page.getByRole('button',{name:'撤销上次归档（1）',exact:true}).click();await page.getByText(/其余可能已在归档后修改/).waitFor();assert.ok(cloud.dismissed_at);assert.equal(cloud.note_text,'New note after archive');
 console.log('Notes passed with mocked Supabase: drafts survive navigation, revision save, remote conflict preserves draft, export contains draft, explicit cloud reload');
}finally{await browser.close();}
