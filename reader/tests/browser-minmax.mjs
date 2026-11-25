import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch();try{
 const c=await b.newContext({permissions:['clipboard-read','clipboard-write']});const p=await c.newPage();let calls=0;
 await p.route('https://api.github.com/**',r=>{calls++;return r.abort();});
 await p.route('**/daily/20261124.json',async r=>{const response=await r.fetch();const data=await response.json();data.papers[0].minmax={status:'ready',source:{format:'html'},excerpts:[{id:'E1',start:0,end:80,text:'A measured comparison.'}],delta:{text:'固定任务下比较具体方法',quote:'A measured comparison.',source_id:'E1'}};data.papers[0].minmax_candidate={status:'ready',readable:{tldr:'Rejected candidate must not show'}};await r.fulfill({json:data});});
 await p.goto(process.env.DPR_TEST_URL);const card=p.getByRole('region',{name:'论文速览'});
 await expect(card).toContainText('固定任务下比较具体方法');await expect(card.getByText('未说明',{exact:true})).toHaveCount(0);
 await expect(card.locator('h3')).toHaveText(['背景与卡点']);await expect(card.locator('details,blockquote')).toHaveCount(0);await expect(p.getByText('依据选取的原文片段抽取；',{exact:false})).toHaveCount(0);await expect(p.getByRole('region',{name:'新旧文案对照'})).toHaveCount(0);
 await p.getByRole('button',{name:'复制强模型精读包',exact:true}).click();const text=await p.evaluate(()=>navigator.clipboard.readText());assert.match(text,/固定任务下比较具体方法/);assert.match(text,/status: "triage-card"/);assert.match(text,/1706.03762v1/);assert.match(text,/请基于我附上的论文全文/);assert.doesNotMatch(text,/A measured comparison|原文依据|Rejected candidate/);
 await expect(p.getByRole('button',{name:'精读 d',exact:true})).toHaveCount(0);await p.keyboard.press('d');assert.equal(calls,0);
 await p.setViewportSize({width:390,height:844});await p.locator('.paper-select').first().click();await expect(card).toBeVisible();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('Min-Max: classic summaries, plain headings, no evidence blocks or candidates, clipboard package, no Actions dispatch, mobile');
}finally{await b.close()}
