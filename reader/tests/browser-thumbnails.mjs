import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {homedir} from 'node:os';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({locale:'zh-CN',viewport:{width:1440,height:1000}});
 const papers=['first_page','selected','selected'].map((kind,i)=>({paper_key:`icml:test${i}`,original_id:`test${i}`,source:'icml',title:`Preview fixture ${i}`,score:8,authors:[],abstract:'Abstract',tags:[],breakdown:{},published:'2023-01-01',publication_date:'2025',publication_date_precision:'year',thumbnail:{url:`./docs/data/previews/${String(i).repeat(24)}.webp`,kind,figure_id:i===1?'Figure 2':'Figure 3'}}));
 await page.route('**/docs/data/catalog.json',r=>r.fulfill({json:{schema_version:1,runs:[{run_id:'20261124',count:3,path:'daily/20261124.json'}]}}));
 await page.route('**/docs/data/daily/20261124.json',r=>r.fulfill({json:{schema_version:1,run_id:'20261124',papers}}));
 const png=await readFile('app/asserts/icon.png');
 await page.route('**/docs/data/previews/*.webp',route=>route.request().url().endsWith('1'.repeat(24)+'.webp')?route.fulfill({contentType:'image/png',body:png}):route.fulfill({status:404}));
 await page.goto(process.env.DPR_TEST_URL||'http://127.0.0.1:5173/');
 await page.locator('.paper-card').first().waitFor();await expect(page.locator('.figure-trigger')).toHaveCount(0);
 assert.equal(await page.locator('.paper-meta').first().innerText().then(text=>text.includes('2023')),false);
 assert.equal(await page.locator('.paper-meta').first().innerText().then(text=>text.includes('2025')),true);
 await page.locator('.paper-select').nth(1).click();await expect(page.getByText('Figure 2',{exact:true})).toBeVisible();await expect(page.getByRole('img',{name:'Figure 2',exact:true})).toBeVisible();
 await page.locator('.paper-select').nth(2).click();await expect(page.locator('.overview.with-figure')).toHaveCount(0);
  await page.locator('.paper-select').first().click();
 const output=process.env.DPR_TEST_OUTPUT||resolve(homedir(),'workspace/runs/daily-paper-reader/browser');await mkdir(output,{recursive:true});
 await page.screenshot({path:resolve(output,'thumbnail-labels.png')});await page.setViewportSize({width:390,height:844});if(!await page.locator('.preview').isVisible())await page.locator('.paper-select').first().click();
 await expect(page.locator('.figure-trigger')).toHaveCount(0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:resolve(output,'thumbnail-labels-mobile.png')});
 console.log('Thumbnail UI passed: first-page suppression, semantic Figure 2 label, failed-image fallback, precise conference year, mobile layout');
}finally{await browser.close();}
