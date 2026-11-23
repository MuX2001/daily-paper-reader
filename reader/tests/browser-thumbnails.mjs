import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {homedir} from 'node:os';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const papers=['first_page','figure1'].map((kind,i)=>({paper_key:`icml:test${i}`,original_id:`test${i}`,source:'icml',title:`Preview fixture ${i}`,score:8,authors:[],abstract:'Abstract',tags:[],breakdown:{},published:'2023-01-01',publication_date:'2025',publication_date_precision:'year',thumbnail:{url:`./docs/data/previews/${String(i).repeat(24)}.webp`,kind}}));
 await page.route('**/docs/data/catalog.json',r=>r.fulfill({json:{schema_version:1,runs:[{run_id:'20261124',count:2,path:'daily/20261124.json'}]}}));
 await page.route('**/docs/data/daily/20261124.json',r=>r.fulfill({json:{schema_version:1,run_id:'20261124',papers}}));
 const png=await readFile('app/asserts/icon.png');
 await page.route('**/docs/data/previews/*.webp',route=>route.request().url().endsWith('0'.repeat(24)+'.webp')?route.fulfill({contentType:'image/png',body:png}):route.fulfill({status:404}));
 await page.goto(process.env.DPR_TEST_URL||'http://127.0.0.1:5173/');
 await expect(page.getByText('PDF 首页',{exact:true})).toBeVisible();await expect(page.getByText('Figure 1',{exact:true})).toBeVisible();await expect(page.getByText('预览不可用',{exact:true})).toBeVisible();
 assert.equal(await page.getByRole('img',{name:'PDF 首页',exact:true}).evaluate(img=>img.complete&&img.naturalWidth>0),true);
 assert.equal(await page.locator('.paper-meta').first().innerText().then(text=>text.includes('2023')),false);
 assert.equal(await page.locator('.paper-meta').first().innerText().then(text=>text.includes('2025')),true);
 const output=process.env.DPR_TEST_OUTPUT||resolve(homedir(),'workspace/runs/daily-paper-reader/browser');await mkdir(output,{recursive:true});
 await page.screenshot({path:resolve(output,'thumbnail-labels.png')});await page.setViewportSize({width:390,height:844});
 await expect(page.getByText('PDF 首页',{exact:true})).toBeVisible();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:resolve(output,'thumbnail-labels-mobile.png')});
 console.log('Thumbnail UI passed: actual image rendering, visible first-page/Figure 1 labels, failed-image fallback, precise conference year, mobile layout');
}finally{await browser.close();}
