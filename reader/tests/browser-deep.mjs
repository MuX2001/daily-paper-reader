import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
let dispatched;
await page.route('https://api.github.com/**',async route=>{
 if(route.request().method()==='POST'){
  dispatched=route.request().postDataJSON();
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({workflow_run_id:42,html_url:'https://github.com/test/reader/actions/runs/42'})});
 }else await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:42,status:'completed',conclusion:'success',html_url:'https://github.com/test/reader/actions/runs/42'})});
});
await page.goto('http://127.0.0.1:5173/');
await page.locator('.paper-card').first().waitFor();
await page.keyboard.press('d');
await page.getByLabel('GitHub 仓库',{exact:true}).fill('test/reader');
await page.getByLabel('GitHub Token（Actions 读写）',{exact:true}).fill('mock-browser-token');
await page.getByRole('button',{name:'保存任务设置',exact:true}).click();
await page.getByRole('button',{name:'关闭对话框',exact:true}).click();
await page.keyboard.press('d');
assert.equal(await page.getByRole('heading',{name:'生成这篇论文的深度笔记'}).isVisible(),true);
await page.getByRole('button',{name:'确认调用强模型',exact:true}).click();
await page.getByText('精读任务完成，可下载笔记',{exact:true}).waitFor({timeout:20000});
assert.match(dispatched.inputs.arxiv_id,/v\d+$/);
assert.equal(dispatched.ref,'dev');
assert.equal(await page.evaluate(()=>Object.values(localStorage).some(value=>String(value).includes('mock-browser-token'))),false);
assert.equal(await page.getByRole('link',{name:'查看运行与下载笔记'}).getAttribute('href'),'https://github.com/test/reader/actions/runs/42');
await browser.close();
console.log('Deep-read UI passed with mocked GitHub transport: explicit confirmation, exact version, correlated polling, memory-only token');
