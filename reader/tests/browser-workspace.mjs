import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch();try{
 const p=await b.newPage({locale:'zh-CN',viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
 const summary={card_hook:'机器人先参考专家示范，再用触觉判断接触状态并修正动作。',context_and_problem:'插入零件时只看图像容易漏掉接触偏差，因此机器人需要触觉反馈。',core_approach:['先从专家示范整理任务指导，给模型提供操作参考。','执行时再读取触觉信号，根据接触状态修正下一步动作。'],caveats_and_pointers:'限定的实验范围。',experimental_results:'结果只适用于给定测试；更多实验条件需查看原文。',tags:['触觉','机器人']};
 await p.addInitScript(()=>localStorage.setItem('dpr.reading.prompt.arxiv:1706.03762v1','USER_SAVED_PROMPT'));
 await p.route('**/daily/20261124.json',async r=>{const response=await r.fetch();const feed=await response.json();feed.papers[0].narrative=summary;feed.papers[0].title_zh='GPT-6-Astra理解触觉';feed.papers[0].title='Vision--Tactile--Language';for(let i=2;i<8;i++)feed.papers.push({...feed.papers[1],paper_key:"sample-"+i});await r.fulfill({json:feed});});
 await p.goto(process.env.DPR_TEST_URL);await expect(p.locator('.paper-select').first()).toBeVisible();
 const list=p.locator('.paper-card').first(),preview=p.getByRole('complementary',{name:'论文预览'});
 await expect(list.getByRole('heading')).toHaveText('GPT-6-Astra 理解触觉');await expect(list).toContainText('Vision–Tactile–Language');
 const queue=await p.locator('.paper-list').boundingBox(), fifth=await p.locator('.paper-card').nth(4).boundingBox();assert.equal(queue.width,340);assert.ok(fifth.y+fifth.height<=queue.y+queue.height);await expect(preview.locator('.bento-card')).toHaveCount(4);await p.getByTitle('折叠导航').click();assert.equal((await p.locator('.navigation').boundingBox()).width,60);await p.getByTitle('展开导航').click();await expect(p.locator('.nav-top-links,.mobile-top-links')).toHaveCount(0);
 await expect(preview).toContainText(summary.card_hook);await expect(preview).not.toContainText('核心亮点');await expect(preview).toContainText(summary.context_and_problem);await expect(preview.locator('.narrative-summary li')).toHaveCount(2);
 await expect(preview.locator('details.original-abstract')).toContainText('Synthetic browser fixture abstract.');
 for(const name of ['归档 x','复制精读包','导出 Markdown'])await expect(preview.getByRole('button',{name,exact:true})).toBeVisible();
 await preview.getByRole('button',{name:'复制精读包',exact:true}).click();const copied=await p.evaluate(()=>navigator.clipboard.readText());assert.match(copied,/USER_SAVED_PROMPT/);assert.ok(copied.includes(summary.context_and_problem));
 const pending=p.waitForEvent('download');await preview.getByRole('button',{name:'导出 Markdown',exact:true}).click();const d=await pending;let text='';for await(const part of await d.createReadStream())text+=part.toString('utf8');assert.ok(text.includes(summary.experimental_results));assert.match(text,/Synthetic browser fixture abstract/);
 await p.setViewportSize({width:390,height:844});await p.locator('.paper-select').first().click();await expect(preview.getByRole('button',{name:'归档 x',exact:true})).toBeVisible();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('Workspace: compact header, consistent actions, narrative mapping, saved prompt/export, title presentation, mobile');
}finally{await b.close()}
