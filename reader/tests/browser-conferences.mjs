import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();page.on("pageerror",e=>console.log(e.message));
 const run='conference-0123456789abcdef';
 await page.route('**/docs/data/catalog.json',r=>r.fulfill({json:{schema_version:1,runs:[],conferences:[{run_id:run,title:'ICML 2025',count:1,path:`conferences/${run}.json`,kind:'conference'}],migration:{unresolved_conference_routes:['conference/old/unknown']}}}));
 await page.route(`**/docs/data/conferences/${run}.json`,r=>r.fulfill({json:{schema_version:1,run_id:run,papers:[{paper_key:'ICML-2025-Accepted:ExactID',original_id:'ExactID',source:'ICML-2025-Accepted',title:'Conference fixture',score:8,authors:['Alice'],abstract:'Original abstract',tags:[],breakdown:{},publication_date:'2025',publication_date_precision:'year'}]}}));
 await page.goto(process.env.DPR_TEST_URL||'http://127.0.0.1:5173/');
 await page.locator('.paper-card').first().waitFor({timeout:5000}).catch(async e=>{console.log(await page.locator('body').innerText());throw e;});
 assert.equal(await page.locator('.paper-card').count(),1);
 assert.equal(await page.locator('meta[name="citation_date"]').getAttribute('content'),'2025');
 assert.equal(await page.getByRole('button',{name:'精读 d',exact:true}).isDisabled(),true);
 assert.ok(await page.getByText(/1 篇历史会议论文缺少可核验身份/).isVisible());
 assert.equal(await page.getByRole('combobox',{name:'推荐日期'}).inputValue(),run);
 console.log('Conference-only catalog loads with exact source, year-only citation, migration notice and arXiv deep-read guard');
}finally{await browser.close();}
