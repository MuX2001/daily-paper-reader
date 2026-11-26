import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';

const browser=await chromium.launch();
try{
 const page=await browser.newPage({locale:'en-US',viewport:{width:1440,height:900}});
 await page.goto(process.env.DPR_TEST_URL);
 const nav=page.locator('.navigation');
 const logo=nav.locator('.brand-icon');
 for(const lang of ['中','EN']){
   await page.getByRole('button',{name:lang,exact:true}).click();
   const bounds=await logo.boundingBox();
   assert.equal(bounds.width,36);assert.equal(bounds.height,36);
 }
 await expect(nav.getByRole('link',{name:/Legacy Archive/})).toHaveAttribute('href','./legacy.html');
 await nav.getByRole('link',{name:/Guide/}).click();
 const guide=page.locator('.guide-canvas');
 await expect(guide.locator(':scope > section')).toHaveCount(4);
 await expect(guide.getByRole('heading',{name:'Screen Today’s Papers in 3 Minutes'})).toBeVisible();
 await expect(guide.getByRole('link',{name:/Submit Issue/})).toHaveAttribute('href','https://github.com/MuX2001/daily-paper-reader/issues/new');
 await expect(guide.getByRole('link',{name:/GitHub Repository/})).toHaveAttribute('href','https://github.com/MuX2001/daily-paper-reader');
 await page.setViewportSize({width:900,height:450});
 const settings=guide.getByRole('button',{name:'Open Settings'});
 await expect(settings).not.toBeInViewport();
 await page.mouse.move(720,260);
 await page.mouse.wheel(0,10000);
 await expect(settings).toBeInViewport({ratio:1});
 await settings.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'中',exact:true}).click();
 await expect(guide.getByRole('heading',{name:'键盘快捷键速查'})).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.reload();await expect(guide).toBeVisible();
 await nav.getByRole('button',{name:/论文收件箱/}).click();await expect(guide).toHaveCount(0);
 await page.keyboard.press('/');await expect(page.getByRole('textbox',{name:'搜索论文'})).toBeFocused();
 await page.evaluate(()=>localStorage.setItem('dpr.github.repository','example-lab/reader'));
 await page.locator('a.mobile-guide').click();
 await expect(guide.getByRole('link',{name:/提交问题/})).toHaveAttribute('href','https://github.com/example-lab/reader/issues/new');
}finally{await browser.close();}
