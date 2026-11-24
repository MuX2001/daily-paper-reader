import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch();try{const p=await b.newPage();
 const card={tldr:'读取接触力，预测下一步动作。',problem_delta:'不再逐任务训练，用示范作参考。',method_steps:['读取触觉数据','比较接触状态','输出修正动作'],evidence:'所选片段未说明',caveats:'需要专家示范。',where_to_look:'图1看动作循环。',tags:['机器人触觉','示范']};
 await p.route('**/daily/20261124.json',async r=>{const response=await r.fetch();const data=await response.json();const paper=data.papers[0];paper.minmax_candidate={status:'ready',readable:card,delta:{text:card.problem_delta},steps:{text:card.method_steps.join('\n')},evidence:{text:card.evidence},constraints:{text:card.caveats},landmarks:{text:card.where_to_look}};await r.fulfill({json:data});});
 await p.goto(process.env.DPR_TEST_URL);const comparison=p.getByRole('region',{name:'新旧文案对照'});await expect(comparison).toBeVisible();await expect(comparison).toContainText(card.problem_delta);await expect(comparison.locator('tbody tr')).toHaveCount(7);await expect(comparison).toContainText('待确认');
 const pending=p.waitForEvent('download');await comparison.getByRole('button',{name:'下载新版骨架'}).click();const download=await pending;const stream=await download.createReadStream();let body='';for await(const part of stream)body+=part.toString('utf8');assert.match(body,/1\. 读取触觉数据/);assert.match(body,/status: "triage-card"/);assert.ok(body.indexOf('1. 读取触觉数据')<body.indexOf('<details>'));
 await p.setViewportSize({width:390,height:844});await p.locator('.paper-select').first().click();await expect(comparison).toBeVisible();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('Readable candidates: old/new parallel view, no default replacement, mobile width');
}finally{await b.close()}
