import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
let dispatched,posts=0;
await page.route('https://api.github.com/**',async route=>{
 if(route.request().method()==='POST'){
  assert.ok(route.request().url().endsWith('/actions/workflows/daily-paper-reader.yml/dispatches'));posts++;dispatched=route.request().postDataJSON();
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({workflow_run_id:42,html_url:'https://github.com/test/reader/actions/runs/42'})});
 }else if(route.request().url().includes('/runs?'))await route.fulfill({json:{workflow_runs:[{id:42,display_title:`Deep read ${dispatched.inputs.request_id} · ${dispatched.inputs.arxiv_id}`,head_branch:'dev',status:'completed',conclusion:'success',html_url:'https://github.com/test/reader/actions/runs/42'}]}});
 else await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:42,status:'completed',conclusion:'success',html_url:'https://github.com/test/reader/actions/runs/42'})});
});
await page.goto(process.env.DPR_TEST_URL||'http://127.0.0.1:5173/');
await page.locator('.paper-card').first().waitFor();
await page.getByLabel('精读模型',{exact:true}).selectOption('deepseek-v4-pro');
await page.keyboard.press('d');
await page.getByLabel('GitHub 仓库',{exact:true}).fill('test/reader');
await page.getByLabel('GitHub Token',{exact:true}).fill('mock-browser-token');
await page.getByRole('button',{name:'保存任务设置',exact:true}).click();
await page.getByRole('button',{name:'关闭对话框',exact:true}).click();
await page.keyboard.press('d');
assert.equal(await page.getByRole('heading',{name:'生成这篇论文的深度笔记'}).isVisible(),true);
assert.equal(await page.getByText(/最多12段加1次合成调用/).isVisible(),true);
await page.getByRole('button',{name:'确认精读',exact:true}).click();
await page.getByText('精读任务完成，可下载笔记',{exact:true}).waitFor({timeout:20000});
const start=await page.getByRole('button',{name:'精读 d',exact:true}).boundingBox(),recover=await page.getByRole('button',{name:'恢复这篇的精读任务',exact:true}).boundingBox();
assert.ok(recover.x>=start.x+start.width+8||recover.y>=start.y+start.height+8);

assert.match(dispatched.inputs.arxiv_id,/v\d+$/);
assert.equal(dispatched.inputs.deep_read_model,'deepseek-v4-pro');assert.equal(dispatched.ref,'dev');assert.equal(dispatched.inputs.pipeline_action,'deep-read');
assert.equal(await page.evaluate(()=>Object.values(localStorage).some(value=>String(value).includes('mock-browser-token'))),false);
assert.equal(await page.getByRole('link',{name:'查看运行与下载笔记'}).getAttribute('href'),'https://github.com/test/reader/actions/runs/42');
await page.reload();await page.locator('.paper-card').first().waitFor();
await page.getByRole('button',{name:'恢复这篇的精读任务',exact:true}).click();
await page.getByLabel('GitHub Token',{exact:true}).fill('mock-browser-token');await page.getByRole('button',{name:'保存任务设置',exact:true}).click();await page.getByRole('button',{name:'关闭对话框',exact:true}).click();
await page.getByRole('button',{name:'恢复这篇的精读任务',exact:true}).click();await page.getByText('精读任务完成，可下载笔记',{exact:true}).waitFor();assert.equal(posts,1);
await browser.close();
console.log('Deep-read UI passed with mocked GitHub transport: explicit confirmation, exact version, correlated polling, memory-only token');
