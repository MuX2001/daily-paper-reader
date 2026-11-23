import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 await page.goto(process.env.DPR_TEST_URL||'http://127.0.0.1:5173/');
 await page.locator('.paper-card').first().waitFor();
 const title=()=>page.locator('meta[name="citation_title"]').getAttribute('content');
 const first=await title();assert.ok(first);
 await page.keyboard.press('j');assert.notEqual(await title(),first);
 assert.equal(await page.locator('meta[name="citation_title"]').count(),1);
 const selectedTitle=await title();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'下载 BibTeX',exact:true}).click();
 const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith('.bib'));
 const text=await readFile(await download.path(),'utf8');assert.ok(text.startsWith('@misc{'));assert.ok(text.includes('eprint = {'));
 assert.ok(selectedTitle);
 const noteDownload=page.waitForEvent('download');await page.getByRole('button',{name:'下载 Markdown',exact:true}).click();
 const note=await noteDownload;const markdown=await readFile(await note.path(),'utf8');
 assert.ok(markdown.includes('## BibTeX'));assert.ok(markdown.includes('未执行全文精读'));assert.ok(markdown.includes('https://arxiv.org/'));assert.ok(markdown.includes('authors: ['));
 assert.ok(!note.suggestedFilename().includes(':'));
 await page.locator('nav').getByRole('button',{name:'研究管理'}).click();
 assert.equal(await page.locator('meta[data-reader-citation]').count(),0);
 console.log('Production citation checks passed: selection updates metadata, no duplicates, BibTeX download, management clears metadata');
}finally{await browser.close();}
