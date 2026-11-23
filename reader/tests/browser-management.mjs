import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});
let saved,dispatched;
const yaml='models:\n  unchanged: yes\nsubscriptions:\n  intent_profiles:\n    - tag: robots\n      description: Robotics\n      enabled: true\n      keywords:\n        - keyword: robot manipulation\n          query: learning robot skills\n      intent_queries: []\n';
await page.route('https://api.github.com/**',async route=>{
 const request=route.request();
 if(request.method()==='PUT'){saved=request.postDataJSON();await route.fulfill({json:{content:{sha:'updated-sha'}}});}
 else if(request.method()==='POST'){dispatched=request.postDataJSON();await route.fulfill({status:204});}
 else await route.fulfill({json:{encoding:'base64',content:btoa(yaml),sha:'original-sha'}});
});
await page.goto(process.env.DPR_TEST_URL||'http://127.0.0.1:5173/');await page.locator('.paper-card').first().waitFor();
await page.locator('.profile').click();await page.getByLabel('GitHub 仓库',{exact:true}).fill('test/reader');await page.getByLabel('GitHub Token（Actions 读写）',{exact:true}).fill('mock-token');await page.getByRole('button',{name:'关闭对话框',exact:true}).click();
await page.locator('nav').getByRole('button',{name:'研究管理'}).click();await page.getByRole('button',{name:'读取仓库配置',exact:true}).click();await page.getByText('Robotics',{exact:true}).waitFor();
await page.getByRole('button',{name:'编辑方向',exact:true}).click();const editor=page.getByLabel('研究方向 JSON',{exact:true});const draft=JSON.parse(await editor.inputValue());draft.description='Updated robotics';await editor.fill(JSON.stringify(draft));await page.getByRole('button',{name:'应用编辑',exact:true}).click();await page.getByRole('button',{name:'保存订阅',exact:true}).click();await page.getByText('订阅已保存到所选分支',{exact:true}).waitFor();assert.equal(saved.sha,'original-sha');
await page.getByRole('button',{name:'专题研究',exact:true}).click();await page.getByLabel('任务研究方向',{exact:true}).selectOption('robots');await page.getByRole('button',{name:'准备运行任务',exact:true}).click();assert.equal(dispatched,undefined);await page.getByLabel('本轮新增阅读内容预算').fill('3');await page.locator('.task-confirm').waitFor({state:'detached'});assert.equal(await page.locator('.task-confirm').count(),0);await page.getByRole('button',{name:'准备运行任务',exact:true}).click();await page.getByRole('button',{name:'确认并提交任务',exact:true}).click();await page.getByText('GitHub 已接收任务请求；可刷新运行列表查看进度。',{exact:true}).waitFor();assert.equal(dispatched.inputs.mode,'90');assert.equal(dispatched.inputs.content_batch,'3');assert.equal(dispatched.inputs.profile_tag,'robots');assert.equal(dispatched.ref,'dev');
await page.setViewportSize({width:390,height:844});const sizes=await page.locator('.research-modes button').evaluateAll(elements=>elements.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));assert.ok(sizes.every(s=>Math.abs(s.width-sizes[0].width)<1&&s.height===sizes[0].height));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await browser.close();console.log('Management UI passed with mocked GitHub: load/edit/SHA-save, explicit workflow confirmation, independent topic input, equal mobile mode cards');
