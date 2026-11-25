import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';

const browser=await chromium.launch();
try{
 const page=await browser.newPage({locale:'en-US',viewport:{width:1440,height:900},permissions:['clipboard-read','clipboard-write']});
 await page.goto(process.env.DPR_TEST_URL);
 await expect(page.locator('h1')).toHaveText('Inbox');
 await expect(page.locator('.workspace-tools time')).toHaveText('2026-11-24');
 await expect(page.locator('.preview .original-title')).toHaveCount(0);
 await page.getByRole('button',{name:'Copy Deep-Read Pack',exact:true}).click();
 assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/Write an English Markdown research note/);
 await page.keyboard.press('c');
 const chat=page.locator('.split-chat');
 await expect(chat).toBeVisible();
 const reading=await page.locator('.preview').boundingBox(),column=await chat.boundingBox();
 assert.ok(reading.x+reading.width<=column.x);
 assert.ok(column.width>=340&&column.width<=380);
 assert.equal((await page.locator('.navigation').boundingBox()).width,60);
 assert.equal((await page.locator('.avatar').boundingBox()).width,(await page.locator('.avatar').boundingBox()).height);
 await expect(page.locator('.progress-today svg')).toBeVisible();
 await chat.getByRole('button',{name:'Go to settings'}).click();
 await expect(page.getByRole('tab',{selected:true})).toContainText('Web AI Chat');
 await page.keyboard.press('Escape');await expect(chat).toBeVisible();
 await page.keyboard.press('Escape');await expect(chat).toHaveCount(0);
 assert.equal((await page.locator('.navigation').boundingBox()).width,196);
 await page.getByRole('button',{name:'中',exact:true}).click();
 await expect(page.locator('h1')).toHaveText('论文收件箱');
 await expect(page.locator('.workspace-tools time')).toHaveText('2026.11.24');
 await page.reload();await expect(page.locator('h1')).toHaveText('论文收件箱');
 await page.setViewportSize({width:390,height:844});await page.locator('.paper-select').first().click();
 await page.getByRole('button',{name:/AI 问答/}).click();await expect(chat).toBeVisible();await expect(page.locator('.preview')).toBeHidden();
 await page.keyboard.press('Escape');await expect(page.locator('.preview')).toBeVisible();
}finally{await browser.close();}
