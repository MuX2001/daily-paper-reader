import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch();try{
 const c=await b.newContext({permissions:['clipboard-read','clipboard-write']});const p=await c.newPage();let calls=0;
 await p.route('https://api.github.com/**',r=>{calls++;return r.abort();});
 await p.route('**/daily/20261124.json',async r=>{const response=await r.fetch();const data=await response.json();data.papers[0].minmax={status:'ready',source:{format:'html'},excerpts:[{id:'E1',start:0,end:80,text:'A measured comparison.'}],delta:{text:'固定任务下比较具体方法',quote:'A measured comparison.',source_id:'E1'}};await r.fulfill({json:data});});
 await p.goto(process.env.DPR_TEST_URL);const card=p.getByRole('region',{name:'最小可重建分析'});
 await expect(card).toContainText('固定任务下比较具体方法');await expect(card.getByText('未说明',{exact:true})).toHaveCount(4);
 await card.getByText('查看原文依据 · E1').click();await expect(card.getByText('A measured comparison.',{exact:true})).toBeVisible();
 await p.getByRole('button',{name:'复制强模型精读包',exact:true}).click();const text=await p.evaluate(()=>navigator.clipboard.readText());assert.match(text,/固定任务下比较具体方法/);assert.match(text,/status: "triage-card"/);assert.match(text,/1706.03762v1/);assert.match(text,/请基于我附上的论文全文/);
 await expect(p.getByRole('button',{name:'精读 d',exact:true})).toHaveCount(0);await p.keyboard.press('d');assert.equal(calls,0);
 await p.setViewportSize({width:390,height:844});await p.locator('.paper-select').first().click();await expect(card).toBeVisible();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('Min-Max: five fields, source evidence, clipboard package, no Actions dispatch, mobile');
}finally{await b.close()}
