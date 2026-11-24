// Explicit opt-in: exercise actual UI signup/login against disposable local Auth.
import {chromium,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const connection=JSON.parse(await readFile(process.env.DPR_LOCAL_SUPABASE_CONNECTION,'utf8'));
const site=process.env.DPR_TEST_URL||'http://127.0.0.1:5174/';
if(![site,connection.API_URL].every(u=>['localhost','127.0.0.1','[::1]'].includes(new URL(u).hostname)))throw new Error('Local services only');
const email=`reader-auth-${randomUUID()}@example.test`,password=randomUUID();
const browser=await chromium.launch();let id;
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto(site);await page.locator('.profile').click();
 await page.getByText('本地测试（不与线上同步）',{exact:true}).click();
 await page.getByRole('button',{name:'连接本地测试库',exact:true}).click();
 await expect(page.locator('.auth-target')).toContainText(connection.API_URL);
 await page.getByLabel('Supabase URL',{exact:true}).fill('https://unsaved-project.supabase.co');
 await expect(page.getByRole('button',{name:'邮箱登录',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'使用 GitHub 登录',exact:true})).toBeDisabled();
 await expect(page.locator('.auth-target')).toContainText(connection.API_URL);
 await page.getByLabel('Supabase URL',{exact:true}).fill(connection.API_URL);
 await page.getByRole('button',{name:'使用 GitHub 登录',exact:true}).click();
 await expect(page.locator('.account-login [role=alert]')).toContainText('尚未启用 GitHub');
 await expect(page).toHaveURL(site);
 await page.getByLabel('登录邮箱',{exact:true}).fill(email);await page.getByLabel('登录密码',{exact:true}).fill(password);
 const registration=page.waitForResponse(r=>r.url().includes('/auth/v1/signup')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'注册邮箱账户',exact:true}).click();
 const response=await registration;const body=await response.json();id=body.user?.id;
 if(!response.ok()||!id)throw new Error(`Signup failed (${response.status()})`);
 await expect(page.locator('.account-login [role=status]')).toContainText('登录成功');
 await expect(page.getByLabel('登录密码',{exact:true})).toHaveValue('');
 await page.getByRole('button',{name:'关闭对话框',exact:true}).click();
 await page.getByText('云端账户已连接',{exact:true}).waitFor();
 const note=page.getByRole('textbox',{name:'个人阅读笔记',exact:true});await note.fill('Actual UI login test note');
 await page.getByRole('button',{name:'保存笔记',exact:true}).click();
 await expect(page.locator('.note-controls [role=status]')).toContainText('与云端一致');
 await page.locator('.profile').click();await page.getByRole('button',{name:'退出登录',exact:true}).click();
 await page.getByLabel('登录邮箱',{exact:true}).fill(email);await page.getByLabel('登录密码',{exact:true}).fill(password);
 await page.getByRole('button',{name:'邮箱登录',exact:true}).click();
 await expect(page.locator('.account-login [role=status]')).toContainText('登录成功');
 await page.getByRole('button',{name:'关闭对话框',exact:true}).click();await page.reload();
 await expect(page.getByRole('textbox',{name:'个人阅读笔记',exact:true})).toHaveValue('Actual UI login test note');
 console.log('PASS real UI signup, password login, persistent note, disabled GitHub inline error; no auth mocks');
}finally{
 await browser.close();
 if(id){const r=await fetch(`${connection.API_URL}/auth/v1/admin/users/${id}`,{method:'DELETE',headers:{apikey:connection.SERVICE_ROLE_KEY,Authorization:`Bearer ${connection.SERVICE_ROLE_KEY}`}});if(!r.ok)throw new Error('Temporary account cleanup failed');}
}
