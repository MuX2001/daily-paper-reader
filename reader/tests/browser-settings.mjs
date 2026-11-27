import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {parse} from 'yaml';
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({locale:'zh-CN',viewport:{width:1440,height:1000}});
 let modelCalls=0,githubPosts=0,storedYaml='subscriptions: {}\n',sha='initial',denySecrets=false;
 const storedKeys=new Map();
 const python=process.env.PYTHON || 'python3';
 const pair=JSON.parse(execFileSync(python,['-c','from nacl.public import PrivateKey; import base64,json; k=PrivateKey.generate(); print(json.dumps([base64.b64encode(bytes(x)).decode() for x in (k,k.public_key)]))'],{encoding:'utf8'}));
 await page.route('https://api.deepseek.com/**',async r=>{modelCalls++;assert.equal(r.request().postDataJSON().messages.length,1);if(r.request().headers().authorization==='Bearer rejected-key')await r.fulfill({status:401,json:{error:{message:'Invalid API key rejected-key'}}});else await r.fulfill({json:{choices:[{message:{content:'OK'}}]}});});
 await page.route('https://api.github.com/**',async r=>{
   const req=r.request(),path=new URL(req.url()).pathname,method=req.method();
   if(path.endsWith('/contents/config.yaml')){
     if(method==='PUT'){const payload=req.postDataJSON();assert.equal(payload.sha,sha);assert.equal(payload.branch,'dev');storedYaml=Buffer.from(payload.content,'base64').toString();sha+='x';return r.fulfill({json:{content:{sha}}});}
     return r.fulfill({json:{encoding:'base64',content:Buffer.from(storedYaml).toString('base64'),sha}});
   }
   if(path.includes('/actions/secrets')){
     if(denySecrets)return r.fulfill({status:403});
     if(path.endsWith('/public-key'))return r.fulfill({json:{key:pair[1],key_id:'test-key'}});
     if(method==='PUT'){const body=req.postDataJSON();assert.equal(body.key_id,'test-key');storedKeys.set(path.split('/').pop(),body.encrypted_value);return r.fulfill({status:204});}
     return r.fulfill({json:{secrets:[...storedKeys.keys()].map(name=>({name,updated_at:'2026-01-07T00:00:00Z'}))}});
   }
   if(method==='POST'){githubPosts++;return r.fulfill({status:204});}
   await r.fulfill({json:{state:'active'}});
 });
 await page.goto(process.env.DPR_TEST_URL);await page.locator('.paper-card').first().waitFor();await page.locator('.profile').click();
 await expect(page.getByRole('heading',{name:'工作台设置',exact:true})).toBeVisible();await expect(page.getByRole('tab')).toHaveCount(5);
 const tab=name=>page.getByRole('tab',{name:new RegExp(name)}).click();
 await tab('网页 AI 聊天');await page.getByLabel('快速预设').selectOption('0');await page.getByLabel('聊天 API Key',{exact:true}).fill('session-only');
 await page.getByLabel('快速预设').selectOption({label:'DeepSeek Pro'});await expect(page.getByLabel('聊天模型 ID')).toHaveValue('deepseek-v4-pro');await page.getByLabel('快速预设').selectOption({label:'DeepSeek Flash'});await expect(page.getByLabel('聊天模型 ID')).toHaveValue('deepseek-flash');await tab('研究管理连接');await tab('网页 AI 聊天');await expect(page.getByLabel('聊天 API Key',{exact:true})).toHaveValue('session-only');
 await page.getByRole('button',{name:'测试连接',exact:true}).click();await expect(page.getByText('模型已返回有效回答。测试没有保存设置。',{exact:true})).toBeVisible();assert.equal(modelCalls,1);await page.getByLabel('聊天 API Key',{exact:true}).fill('rejected-key');await page.getByRole('button',{name:'测试连接',exact:true}).click();await expect(page.locator('.settings-result.failure')).toContainText('401');await expect(page.locator('.settings-result.failure')).not.toContainText('rejected-key');await page.getByLabel('聊天 API Key',{exact:true}).fill('session-only');
 assert.equal(await page.evaluate(()=>localStorage.getItem('dpr.chat.model')),null);
 await page.getByRole('button',{name:'保存聊天设置',exact:true}).click();await expect(page.getByRole('tab',{name:/网页 AI 聊天/})).not.toContainText('未保存');
 await page.getByRole('button',{name:'关闭对话框',exact:true}).click();await page.reload();await page.locator('.profile').click();await tab('网页 AI 聊天');await expect(page.getByLabel('聊天 API Key',{exact:true})).toHaveValue('');
 await page.getByLabel('聊天 API Key',{exact:true}).fill('remember-me');await page.getByLabel('在当前浏览器记住 API Key（仅限个人设备）',{exact:true}).check();await page.getByRole('button',{name:'保存聊天设置',exact:true}).click();
 await tab('研究管理连接');await page.getByLabel('GitHub 仓库',{exact:true}).fill('test/reader');await page.getByLabel('GitHub Token',{exact:true}).fill('github-memory');await page.getByLabel('在当前浏览器记住 Token（仅限个人设备）',{exact:true}).check();
 assert.equal(githubPosts,0);
 await page.getByRole('button',{name:'保存任务设置',exact:true}).click();await page.getByRole('button',{name:'关闭对话框',exact:true}).click();await page.reload();await page.locator('.profile').click();await tab('研究管理连接');await expect(page.getByLabel('GitHub Token',{exact:true})).toHaveValue('github-memory');
 const secret=randomBytes(32).toString('base64');
 const savePipeline=page.getByRole('button',{name:'保存流水线配置到 GitHub'});
 await page.getByRole('button',{name:'DeepSeek Pro',exact:true}).click();
 await page.getByLabel('DEEPSEEK_API_KEY',{exact:true}).fill(secret);
 await page.getByLabel('重排模式').selectOption('siliconflow');
 await expect(page.getByLabel('SILICONFLOW_API_KEY',{exact:true})).toBeVisible();
 await savePipeline.click();await expect(page.getByText('已保存到 GitHub，下次日报生效。')).toBeVisible();
 assert.equal(parse(storedYaml).pipeline.daily_llm.model,'deepseek-v4-pro');
 assert.equal(parse(storedYaml).pipeline.rerank.profile,'siliconflow');
 assert.ok(!storedYaml.includes(secret));
 const decoded=execFileSync(python,['-c','from nacl.public import PrivateKey,SealedBox; from base64 import b64decode; import json,sys; private,cipher=json.load(sys.stdin); print(SealedBox(PrivateKey(b64decode(private))).decrypt(b64decode(cipher)).decode())'],{input:JSON.stringify([pair[0],storedKeys.get('DEEPSEEK_API_KEY')]),encoding:'utf8'}).trim();
 assert.equal(decoded,secret);await expect(page.getByText(/更新于 2026-01-07/)).toBeVisible();
 await page.getByRole('button',{name:'立即运行一次今日推荐'}).click();await expect.poll(()=>githubPosts).toBe(1);
 denySecrets=true;await page.getByRole('button',{name:'检查连接与权限'}).click();await expect(page.getByText(/当前 GitHub Token 缺少 Secrets/)).toBeVisible();
 await page.getByRole('button',{name:'DeepSeek Flash',exact:true}).click();await savePipeline.click();await expect.poll(()=>parse(storedYaml).pipeline.daily_llm.model).toBe('deepseek-flash');
 await tab('网页 AI 聊天');await expect(page.getByLabel('聊天 API Key',{exact:true})).toHaveValue('remember-me');await page.getByLabel('在当前浏览器记住 API Key（仅限个人设备）',{exact:true}).uncheck();assert.equal(await page.evaluate(()=>localStorage.getItem('dpr.chat.api_key')),null);
 await tab('导出与 Obsidian');await page.getByLabel('两者同时显示',{exact:true}).check();await page.getByLabel('Vault 名称',{exact:true}).fill('Research');await page.getByLabel('收件箱目录',{exact:true}).fill('Papers/Inbox');await page.getByLabel('笔记命名格式').selectOption('id-title');await expect(page.locator('.settings-preview')).toContainText('Papers/Inbox/');await page.getByRole('button',{name:'保存导出偏好',exact:true}).click();
 await page.getByRole('button',{name:'关闭对话框',exact:true}).click();await page.locator('.export-menu summary').click();await expect(page.getByRole('button',{name:'导出骨架到 Obsidian',exact:true})).toBeVisible();
 await page.locator('.profile').click();await tab('网页 AI 聊天');await page.getByLabel('聊天模型 ID').fill('unsaved');await page.getByRole('button',{name:'关闭对话框',exact:true}).click();await expect(page.getByRole('button',{name:'继续编辑',exact:true})).toBeVisible();await page.getByRole('button',{name:'继续编辑',exact:true}).click();
 await tab('数据与维护');await page.getByRole('button',{name:'一键清除本机保存的 API Key 与 GitHub Token',exact:true}).click();await expect(page.getByText('已清除本机保存及当前页面中的 API Key 和 Token。',{exact:true})).toBeVisible();
 await tab('研究管理连接');await expect(page.getByLabel('GitHub Token',{exact:true})).toHaveValue('');await expect(page.getByLabel('GitHub 仓库',{exact:true})).toHaveValue('test/reader');await expect(page.getByText('查看当前精读提示词（只读）',{exact:true})).toHaveCount(0);
 const output=process.env.DPR_TEST_OUTPUT;if(output){await mkdir(output,{recursive:true});await page.screenshot({path:resolve(output,'settings-desktop.png')});}
 await page.setViewportSize({width:390,height:844});await tab('网页 AI 聊天');await expect(page.getByLabel('聊天模型 ID')).toHaveValue('unsaved');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.settings-nav').evaluate(e=>getComputedStyle(e).flexDirection),'row');if(output)await page.screenshot({path:resolve(output,'settings-mobile.png')});
 console.log('Settings: five tabs, draft isolation, explicit secret memory, persistence/clear, real export controls, permission honesty, desktop/mobile rendered');
}finally{await browser.close();}
