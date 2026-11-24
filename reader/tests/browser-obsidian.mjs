import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const paper={paper_key:'arxiv:1706.03762v7',original_id:'1706.03762v7',source:'arxiv',title:'Short export fixture',authors:[],abstract:'Synthetic abstract',tags:[],breakdown:{},score:8};
 await page.route('**/docs/data/catalog.json',r=>r.fulfill({json:{schema_version:1,runs:[{run_id:'20261124',count:1,path:'daily/20261124.json'}]}}));
 await page.route('**/docs/data/daily/20261124.json',r=>r.fulfill({json:{schema_version:1,run_id:'20261124',papers:[paper]}}));
 const session=await page.context().newCDPSession(page);await session.send('Page.enable');
 let requested='';session.on('Page.frameRequestedNavigation',e=>{if(e.url.startsWith('obsidian:'))requested=e.url;});
 await page.goto(process.env.DPR_TEST_URL||'http://127.0.0.1:5174/');await page.locator('.paper-card').first().waitFor();
 await page.locator('.profile').click();await page.getByRole('tab',{name:/导出与 Obsidian/}).click();await page.getByLabel('两者同时显示',{exact:true}).check();await page.getByLabel('Vault 名称',{exact:true}).fill('Research vault');
 await expect(page.getByLabel('收件箱目录',{exact:true})).toHaveValue('Inbox');
 await page.getByLabel('收件箱目录',{exact:true}).fill('研究/Papers & Inbox');
 await page.getByRole('button',{name:'保存导出偏好',exact:true}).click();await page.getByRole('button',{name:'关闭对话框',exact:true}).click();
 await page.reload();await page.locator('.paper-card').first().waitFor();
 await page.getByRole('button',{name:'发送到 Obsidian',exact:true}).click();
 await expect.poll(()=>requested).toContain('obsidian://new');
 assert.equal(new URL(requested).searchParams.get('file'),'研究/Papers & Inbox/arxiv~3a~1706.03762v7');
 await page.locator('.profile').click();await page.getByRole('tab',{name:/导出与 Obsidian/}).click();await expect(page.getByLabel('收件箱目录',{exact:true})).toHaveValue('研究/Papers & Inbox');
 await page.getByLabel('收件箱目录',{exact:true}).fill('');await page.getByRole('button',{name:'保存导出偏好',exact:true}).click();await page.getByRole('button',{name:'关闭对话框',exact:true}).click();
 requested='';await page.getByRole('button',{name:'发送到 Obsidian',exact:true}).click();
 await expect.poll(()=>requested).toContain('obsidian://new');assert.equal(new URL(requested).searchParams.get('file'),'arxiv~3a~1706.03762v7');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('tab',{name:/导出与 Obsidian/}).click();
 await expect(page.getByLabel('收件箱目录',{exact:true})).toHaveValue('');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('Obsidian folder verified in real URI navigation: nested Unicode folder, persistence, vault root, mobile field; no desktop app synchronization claimed');
}finally{await browser.close();}
