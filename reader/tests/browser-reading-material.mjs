import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({locale:'zh-CN',permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage();
 let calls=0;
 await page.route('https://api.github.com/**',async route=>{calls++;await route.abort();});
 await page.goto(process.env.DPR_TEST_URL);await page.locator('.paper-card').first().waitFor();
 const panel=page.locator('.preview-buttons');
 await panel.getByRole('button',{name:'编辑提示词',exact:true}).click();
 const editor=page.getByRole('dialog',{name:'编辑精读提示词',exact:true});
 const original=await editor.getByLabel('精读提示词',{exact:true}).inputValue();
 await editor.getByLabel('精读提示词',{exact:true}).fill(original+'\n特别关注复杂度与消融。');
 await editor.getByRole('button',{name:'保存提示词',exact:true}).click();
 await expect(editor).toHaveCount(0);
 const heading=page.locator('.paper-heading'), y=(await heading.boundingBox()).y;
 await panel.getByRole('button',{name:'复制精读包'}).click();
 const notice=page.locator('.workspace-notifications [role=status]');
 await expect(notice).toContainText('精读包已复制');
 assert.equal((await heading.boundingBox()).y,y);
 assert.ok((await notice.boundingBox()).y>page.viewportSize().height/2);
 assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/特别关注复杂度与消融/);

 assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/1706\.03762v1/);
 await page.setViewportSize({width:390,height:844});await page.locator('.paper-select').first().click();await expect(panel.getByRole('button',{name:'复制精读包'})).toBeVisible();
 const mobile=await notice.boundingBox();
 assert.ok(mobile.y>page.viewportSize().height/2 && mobile.y+mobile.height<=page.viewportSize().height);
 assert.equal(calls,0);
 console.log('Reading materials: real clipboard and Markdown download, exact PDF version, editable prompt, full context package, mobile layout; no API dispatch');
}finally{await browser.close();}
