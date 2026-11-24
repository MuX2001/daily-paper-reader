import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage();
 let calls=0;
 await page.route('https://api.github.com/**',async route=>{calls++;await route.abort();});
 await page.goto(process.env.DPR_TEST_URL);await page.locator('.paper-card').first().waitFor();
 const panel=page.getByRole('region',{name:'聊天客户端精读'});
 await expect(panel.getByRole('link',{name:'打开论文 PDF'})).toHaveAttribute('href','https://arxiv.org/pdf/1706.03762v1');
 await panel.getByRole('button',{name:'复制精读提示词'}).click();
 assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/1706\.03762v1/);
 const pending=page.waitForEvent('download');await panel.getByRole('button',{name:'下载精读材料'}).click();
 const download=await pending;assert.match(download.suggestedFilename(),/v1-reading-material\.md$/);
 const stream=await download.createReadStream();let content='';for await(const chunk of stream)content+=chunk.toString('utf8');
 assert.match(content,/不含论文全文/);assert.match(content,/Baseline/);assert.match(content,/note_type: "triage"/);
 await page.locator('.profile').click();await page.getByRole('tab',{name:/云端精读/}).click();
 await expect(page.locator('.settings-variables')).toContainText('deepseek-v4-pro');
 await page.getByLabel('精读服务预设').selectOption('1');await expect(page.locator('.settings-variables')).toContainText('deepseek-flash');
 await page.getByLabel('精读服务预设').selectOption('2');await expect(page.locator('.settings-variables')).toContainText('https://api.siliconflow.cn/v1');await expect(page.getByLabel('参考模型 ID',{exact:true})).toHaveValue('');
 await page.getByText('查看当前精读提示词（只读）',{exact:true}).click();
 await expect(page.getByLabel('自动精读提示词',{exact:true})).toHaveValue(/Do not compare incompatible settings/);
 await page.setViewportSize({width:390,height:844});await expect(page.getByLabel('精读服务预设')).toBeVisible();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(calls,0);
 console.log('Reading materials: real clipboard and Markdown download, exact PDF version, provider presets, shared prompt preview, mobile layout; no API dispatch');
}finally{await browser.close();}
