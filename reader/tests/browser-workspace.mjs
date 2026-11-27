import {chromium,expect} from '@playwright/test';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const b=await chromium.launch();try{
 const p=await b.newPage({locale:'zh-CN',viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
 const summary={card_hook:'机器人先参考专家示范，再用触觉判断接触状态并修正动作。',context_and_problem:'插入零件时只看图像容易漏掉接触偏差，因此机器人需要触觉反馈。',core_approach:['先从专家示范整理任务指导，给模型提供操作参考。','执行时再读取触觉信号，根据接触状态修正下一步动作。'],caveats_and_pointers:'限定的实验范围。',experimental_results:'结果只适用于给定测试；更多实验条件需查看原文。',tags:['触觉','机器人']};
 await p.addInitScript(()=>localStorage.setItem('dpr.reading.prompt.arxiv:1706.03762v1','USER_SAVED_PROMPT'));
 await p.route('**/daily/20261124.json',async r=>{const response=await r.fetch();const feed=await response.json();feed.papers[0].thumbnail={kind:'figure1',url:new URL('preview-figure.svg',process.env.DPR_TEST_URL).href,source_url:new URL('full-figure.svg',process.env.DPR_TEST_URL).href};
 feed.papers[0].narrative={...summary,tags:['keyword:bot-learning','query:BOT-learning','topic:control']};feed.papers[0].title_zh='GPT-6-Astra理解触觉';feed.papers[0].title='Vision--Tactile--Language';feed.papers[1]={...feed.papers[0],paper_key:feed.papers[1].paper_key,title_zh:'长标题示例'.repeat(40),abstract:'Original abstract. '.repeat(1000),
 narrative:{...feed.papers[0].narrative,card_hook:summary.context_and_problem.repeat(20),context_and_problem:summary.context_and_problem.repeat(20),core_approach:Array(20).fill(summary.core_approach[0]),experimental_results:summary.experimental_results.repeat(30),caveats_and_pointers:summary.caveats_and_pointers.repeat(70)}};
 for(let i=2;i<8;i++)feed.papers.push({...feed.papers[1],paper_key:"sample-"+i});await r.fulfill({json:feed});});
 const image='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="260" viewBox="0 0 600 260"><rect width="600" height="260" fill="white"/><path d="M70 24V218H570" fill="none" stroke="#63756d" stroke-width="3"/><path d="M70 188L150 164L230 110L310 96L390 70L470 62L550 54" fill="none" stroke="#287653" stroke-width="6"/><text x="240" y="248" font-family="sans-serif" font-size="22">Training steps</text></svg>';
 await p.route('**/*-figure.svg',r=>r.fulfill({body:image,contentType:'image/svg+xml'}));
 await p.goto(process.env.DPR_TEST_URL);await expect(p.locator('.paper-select').first()).toBeVisible();
 const list=p.locator('.paper-card').first(),preview=p.getByRole('complementary',{name:'论文预览'});
 await expect(list.getByRole('heading')).toHaveText('GPT-6-Astra 理解触觉');await expect(list).toContainText('Vision–Tactile–Language');
 const queue=await p.locator('.paper-list').boundingBox(), fifth=await p.locator('.paper-card').nth(4).boundingBox();assert.equal(queue.width,340);assert.ok(fifth.y+fifth.height<=queue.y+queue.height);await expect(preview.locator('.bento-card')).toHaveCount(4);await p.getByTitle('折叠导航').click();assert.equal((await p.locator('.navigation').boundingBox()).width,60);await p.getByTitle('展开导航').click();await expect(p.locator('.nav-top-links,.mobile-top-links')).toHaveCount(0);
 await expect(preview).toContainText(summary.card_hook);await expect(preview).not.toContainText('核心亮点');await expect(preview).toContainText(summary.context_and_problem);await expect(preview.locator('.narrative-summary li')).toHaveCount(2);
 await expect(preview.locator('details.original-abstract')).toContainText('Synthetic browser fixture abstract.');
 for(const name of ['归档 x','复制精读包'])await expect(preview.getByRole('button',{name,exact:true})).toBeVisible();
 await preview.getByRole('button',{name:'复制精读包',exact:true}).click();const copied=await p.evaluate(()=>navigator.clipboard.readText());assert.match(copied,/USER_SAVED_PROMPT/);assert.ok(copied.includes(summary.context_and_problem));
 await preview.locator('.export-menu summary').click();const pending=p.waitForEvent('download');await preview.getByRole('button',{name:'导出 Markdown',exact:true}).click();const d=await pending;let text='';for await(const part of await d.createReadStream())text+=part.toString('utf8');assert.ok(text.includes(summary.experimental_results));assert.match(text,/Synthetic browser fixture abstract/);
 await p.setViewportSize({width:1920,height:1080});
 const canvas=preview.locator('.preview-content'),figure=canvas.getByRole('img',{name:'Figure 1'});
 async function assertFits(){
   await expect(figure).toBeVisible();
   await expect(preview.locator('.original-abstract summary')).toBeInViewport({ratio:1});
   const size=await preview.evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight,top:el.scrollTop}));
   assert.ok(size.height>=680&&size.height<=760);assert.equal(size.scroll,size.height);assert.equal(size.top,0);
   const box=await canvas.locator('.overview').boundingBox();assert.ok(box.height>=170&&box.height<=200);
   await expect(canvas.locator('.overview-meta')).toContainText('bot-learning · control');
   await expect(canvas.locator('.overview-meta')).not.toContainText(/(query|keyword|topic):/i);
   console.log('1920×1080 canvas',size,'overview height',box.height);
 }
 await assertFits();await figure.click();await expect(p.getByRole('dialog',{name:'Figure 1'})).toBeVisible();
 await expect(p.getByRole('dialog').getByRole('img')).toHaveAttribute('src',/full-figure.svg$/);
 await p.keyboard.press('Escape');await expect(p.getByRole('dialog')).toHaveCount(0);
 await figure.click();await p.getByRole('dialog').click({position:{x:8,y:8}});
 await expect(p.getByRole('dialog')).toHaveCount(0);
 await p.keyboard.press('n');await expect(p.getByLabel('个人阅读笔记')).toBeVisible();
 await p.getByLabel('个人阅读笔记').fill('viewport draft');await expect(preview.locator('.note-dot')).toBeVisible();
 await assertFits();
 if(process.env.DPR_TEST_OUTPUT)await p.screenshot({path:join(process.env.DPR_TEST_OUTPUT,'single-viewport-notes.png')});
 await p.getByRole('tab',{name:/AI 问答/}).click();await expect(p.getByLabel('向论文提问')).toBeVisible();
 await p.getByRole('tab',{name:/阅读笔记/}).click();await expect(p.getByLabel('个人阅读笔记')).toHaveValue('viewport draft');
 await p.locator('.paper-select').nth(1).click();
 await expect(preview.locator('.overview-hook')).toHaveText('Fixture only');
 await assertFits();
 await preview.locator('.original-abstract summary').click();
 const heading=preview.locator('.paper-heading'),before=await heading.boundingBox();
 await preview.evaluate(el=>el.scrollTop=el.scrollHeight);
 assert.ok(await preview.evaluate(el=>el.scrollTop>0));
 assert.equal((await heading.boundingBox()).y,before.y);
 await p.keyboard.press('Escape');
 await p.setViewportSize({width:390,height:844});await preview.getByRole('button',{name:'关闭',exact:true}).click();await p.locator('.paper-select').first().click();await expect(preview.getByRole('button',{name:'归档 x',exact:true})).toBeVisible();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('Workspace: compact header, consistent actions, narrative mapping, saved prompt/export, title presentation, mobile');
}finally{await b.close()}
