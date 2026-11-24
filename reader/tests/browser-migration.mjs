import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
let writes=0;
await page.route('**/rest/v1/**',async route=>{writes++;await route.abort();});
await page.goto(process.env.DPR_TEST_URL||'http://127.0.0.1:5173/');
await page.locator('.paper-card').first().waitFor();await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('tab',{name:/数据与维护/}).click();await page.getByRole('button',{name:'选择 JSON 备份文件',exact:true}).click();
const upload=async data=>page.getByLabel('旧记录备份文件',{exact:true}).setInputFiles({name:'old-cloud.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
await upload([
 {github_username:'alice',paper_id:'1706.03762v1',status:'good'},
 {github_username:'bob',paper_id:'1706.03762v1',status:'bad'},
 {github_username:'alice',paper_id:'1706.03762v2',status:'blue'},
 {github_username:'alice',paper_id:'1706.03762v2',status:'orange'},
]);
await page.getByLabel('备份用户名',{exact:true}).waitFor();
assert.equal(await page.getByRole('button',{name:'预览文件迁移',exact:true}).isDisabled(),true);
await page.getByLabel('备份用户名',{exact:true}).selectOption('alice');
await page.getByRole('button',{name:'预览文件迁移',exact:true}).click();
await page.getByText('可导入 1 条；保留或待处理 1 条。',{exact:true}).waitFor();
assert.equal(await page.getByRole('button',{name:'导入到当前账户',exact:true}).isDisabled(),true);
await page.getByLabel('备份用户名',{exact:true}).selectOption('bob');
await page.getByRole('button',{name:'导入到当前账户',exact:true}).waitFor({state:'detached'});
await page.getByRole('button',{name:'预览文件迁移',exact:true}).click();
await page.getByText('可导入 1 条；保留或待处理 0 条。',{exact:true}).waitFor();
await upload({'1706.03762v1':true});await page.getByLabel('备份用户名',{exact:true}).waitFor({state:'detached'});
await page.getByRole('button',{name:'预览文件迁移',exact:true}).click();
await page.getByText('可导入 1 条；保留或待处理 0 条。',{exact:true}).waitFor();
assert.equal(writes,0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await browser.close();console.log('Backup migration preview: explicit owner, conflicts skipped, local JSON, no guest writes, mobile layout');
