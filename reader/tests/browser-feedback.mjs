import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.addInitScript(()=>{window.open=url=>{window.testFeedbackURL=String(url);return null;};});
 await page.goto(process.env.DPR_TEST_URL||'http://127.0.0.1:5173/');
 const openFeedback=async()=>{await page.getByRole('button',{name:/快捷键/}).click();await page.getByRole('button',{name:'反馈问题',exact:true}).click();};await openFeedback();
 await expect(page.getByRole('dialog')).toBeVisible();await page.mouse.click(2,2);await expect(page.getByRole('dialog')).toHaveCount(0);
 await openFeedback();await page.getByLabel('功能新增',{exact:true}).check();await page.getByLabel('体验问题',{exact:true}).check();
 await page.getByLabel('标题',{exact:true}).fill('Improve keyboard navigation');await page.getByLabel('反馈内容',{exact:true}).fill('My own feedback, no automatic metadata.');
 await page.getByRole('button',{name:'前往 GitHub 检查反馈',exact:true}).click();assert.equal(await page.evaluate(()=>window.testFeedbackURL),undefined);
 await page.getByLabel('我已知晓：提交后，内容将以我的 GitHub 身份公开发布。',{exact:true}).check();await page.getByRole('button',{name:'前往 GitHub 检查反馈',exact:true}).click();
 const url=new URL(await page.evaluate(()=>window.testFeedbackURL));assert.equal(url.searchParams.get('title'),'[功能新增|体验问题] Improve keyboard navigation');assert.equal(url.searchParams.get('body'),'My own feedback, no automatic metadata.');
 await page.getByRole('button',{name:'关闭对话框'}).click();await page.setViewportSize({width:390,height:844});await openFeedback();await expect(page.getByRole('dialog')).toBeVisible();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await expect(page.locator('.nav-top-links,.mobile-top-links')).toHaveCount(0);
 console.log('Feedback passed: low-frequency help entry desktop/mobile, multi-select title, public consent gate, draft URL only, backdrop dismissal');
}finally{await browser.close();}
