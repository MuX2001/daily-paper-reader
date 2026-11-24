import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 let modelCalls=0,githubPosts=0;
 await page.route('https://api.deepseek.com/**',async r=>{modelCalls++;assert.equal(r.request().postDataJSON().messages.length,1);if(r.request().headers().authorization==='Bearer rejected-key')await r.fulfill({status:401,json:{error:{message:'Invalid API key rejected-key'}}});else await r.fulfill({json:{choices:[{message:{content:'OK'}}]}});});
 await page.route('https://api.github.com/**',async r=>{if(r.request().method()==='POST')githubPosts++;await r.fulfill({json:{state:'active'}});});
 await page.goto(process.env.DPR_TEST_URL);await page.locator('.paper-card').first().waitFor();await page.locator('.profile').click();
 await expect(page.getByRole('heading',{name:'工作台设置',exact:true})).toBeVisible();await expect(page.getByRole('tab')).toHaveCount(5);
 const tab=name=>page.getByRole('tab',{name:new RegExp(name)}).click();
 await tab('网页 AI 聊天');await page.getByLabel('快速预设').selectOption('0');await page.getByLabel('聊天 API Key',{exact:true}).fill('session-only');
 await tab('云端精读');await tab('网页 AI 聊天');await expect(page.getByLabel('聊天 API Key',{exact:true})).toHaveValue('session-only');
 await page.getByRole('button',{name:'测试连接',exact:true}).click();await expect(page.getByText('模型已返回有效回答。测试没有保存设置。',{exact:true})).toBeVisible();assert.equal(modelCalls,1);await page.getByLabel('聊天 API Key',{exact:true}).fill('rejected-key');await page.getByRole('button',{name:'测试连接',exact:true}).click();await expect(page.locator('.settings-result.failure')).toContainText('401');await expect(page.locator('.settings-result.failure')).not.toContainText('rejected-key');await page.getByLabel('聊天 API Key',{exact:true}).fill('session-only');
 assert.equal(await page.evaluate(()=>localStorage.getItem('dpr.chat.model')),null);
 await page.getByRole('button',{name:'保存聊天设置',exact:true}).click();await expect(page.getByRole('tab',{name:/网页 AI 聊天/})).not.toContainText('未保存');
 await page.getByRole('button',{name:'关闭对话框',exact:true}).click();await page.reload();await page.locator('.profile').click();await tab('网页 AI 聊天');await expect(page.getByLabel('聊天 API Key',{exact:true})).toHaveValue('');
 await page.getByLabel('聊天 API Key',{exact:true}).fill('remember-me');await page.getByLabel('在当前浏览器记住 API Key（仅限个人设备）',{exact:true}).check();await page.getByRole('button',{name:'保存聊天设置',exact:true}).click();
 await tab('云端精读');await page.getByLabel('GitHub 仓库',{exact:true}).fill('test/reader');await page.getByLabel('GitHub Token',{exact:true}).fill('github-memory');await page.getByLabel('在当前浏览器记住 Token（仅限个人设备）',{exact:true}).check();
 await page.getByRole('button',{name:'验证仓库与权限',exact:true}).click();await expect(page.getByText(/Actions 写权限及云端 Secrets 需首次精读任务确认/)).toBeVisible();assert.equal(githubPosts,0);
 await page.getByRole('button',{name:'保存任务设置',exact:true}).click();await page.getByRole('button',{name:'关闭对话框',exact:true}).click();await page.reload();await page.locator('.profile').click();await tab('云端精读');await expect(page.getByLabel('GitHub Token',{exact:true})).toHaveValue('github-memory');
 await tab('网页 AI 聊天');await expect(page.getByLabel('聊天 API Key',{exact:true})).toHaveValue('remember-me');await page.getByLabel('在当前浏览器记住 API Key（仅限个人设备）',{exact:true}).uncheck();assert.equal(await page.evaluate(()=>localStorage.getItem('dpr.chat.api_key')),null);
 await tab('导出与 Obsidian');await page.getByLabel('两者同时显示',{exact:true}).check();await page.getByLabel('Vault 名称',{exact:true}).fill('Research');await page.getByLabel('收件箱目录',{exact:true}).fill('Papers/Inbox');await page.getByLabel('笔记命名格式').selectOption('id-title');await expect(page.locator('.settings-preview')).toContainText('Papers/Inbox/');await page.getByRole('button',{name:'保存导出偏好',exact:true}).click();
 await page.getByRole('button',{name:'关闭对话框',exact:true}).click();await expect(page.getByRole('button',{name:'发送到 Obsidian',exact:true})).toBeVisible();
 await page.locator('.profile').click();await tab('网页 AI 聊天');await page.getByLabel('聊天模型 ID').fill('unsaved');await page.getByRole('button',{name:'关闭对话框',exact:true}).click();await expect(page.getByRole('button',{name:'继续编辑',exact:true})).toBeVisible();await page.getByRole('button',{name:'继续编辑',exact:true}).click();
 await tab('数据与维护');await page.getByRole('button',{name:'一键清除本机保存的 API Key 与 GitHub Token',exact:true}).click();await expect(page.getByText('已清除本机保存及当前页面中的 API Key 和 Token。',{exact:true})).toBeVisible();
 await tab('云端精读');await expect(page.getByLabel('GitHub Token',{exact:true})).toHaveValue('');await expect(page.getByLabel('GitHub 仓库',{exact:true})).toHaveValue('test/reader');await page.getByText('查看当前精读提示词（只读）',{exact:true}).click();await expect(page.getByLabel('自动精读提示词')).toBeVisible();
 const output=process.env.DPR_TEST_OUTPUT;if(output){await mkdir(output,{recursive:true});await page.screenshot({path:resolve(output,'settings-desktop.png')});}
 await page.setViewportSize({width:390,height:844});await tab('网页 AI 聊天');await expect(page.getByLabel('聊天模型 ID')).toHaveValue('unsaved');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.settings-nav').evaluate(e=>getComputedStyle(e).flexDirection),'row');if(output)await page.screenshot({path:resolve(output,'settings-mobile.png')});
 console.log('Settings: five tabs, draft isolation, explicit secret memory, persistence/clear, real export controls, permission honesty, desktop/mobile rendered');
}finally{await browser.close();}
