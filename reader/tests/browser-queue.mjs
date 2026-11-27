import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';

const browser=await chromium.launch();
try{
  const page=await browser.newPage({locale:'zh-CN',viewport:{width:1920,height:1080}});
  const user={id:'00000000-0000-0000-0000-000000000001',aud:'authenticated',role:'authenticated',user_metadata:{}};
  await page.addInitScript(user=>{
    localStorage.setItem('dpr.cloud.url','https://queue.supabase.co');
    localStorage.setItem('dpr.cloud.key','sb_publishable_test');
    localStorage.setItem('sb-queue-auth-token',JSON.stringify({access_token:'test',refresh_token:'test',expires_at:4102444800,expires_in:3600,token_type:'bearer',user}));
  },user);
  const keys=[1,2].map(i=>'arxiv:1706.03762v'+i);
  const states=keys.map(paper_key=>({paper_key,revision:1,starred:false,read_at:null,dismissed_at:null,feedback:0}));
  let release,rejectNext=false,failRead=false;
  await page.route('https://queue.supabase.co/**',async route=>{
    if(!route.request().url().includes('/paper_states'))return route.fulfill({json:user});
    if(route.request().method()==='GET')return route.fulfill(failRead?{status:503,json:{message:'test unavailable'}}:{json:states});
    const row=states.find(s=>route.request().url().includes(encodeURIComponent(s.paper_key)));
    if(!row)throw Error('Unknown paper in test update');
    if(rejectNext){await new Promise(resolve=>release=resolve);rejectNext=false;return route.fulfill({status:409,json:{message:'test conflict'}});}
    Object.assign(row,route.request().postDataJSON());row.revision++;
    await route.fulfill({json:row});
  });
  const formula=String.raw`$$\begin{aligned}\frac{\tau}{\beta}&=\nabla f\end{aligned}$$`;
  const structured=['Paragraph one.','','- one','- two','','1. first','2. second','',formula,'','```js','x = "$literal$"','```','','<img src=x onerror=alert(1)>'].join('\n');
  await page.route('**/daily/20261124.json',async route=>{
    const payload=await (await route.fetch()).json();payload.papers[0].abstract=structured;
    await route.fulfill({json:payload});
  });
  await page.goto(process.env.DPR_TEST_URL);
  const cards=page.locator('.paper-card'),filter=page.locator('.queue-filter'),ring=page.locator('.progress-today svg');
  const current=page.locator('.paper-card.selected');
  await expect(cards).toHaveCount(2);await expect(ring).toHaveAttribute('aria-label',/0 \/ 2/);
  const heading=page.locator('.paper-heading');const y=(await heading.boundingBox()).y;
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.keyboard.press('u');await expect(current).toHaveAttribute('data-paper-key',keys[0]);await expect(current).toHaveClass(/is-read/);
  await expect(ring).toHaveAttribute('aria-label',/1 \/ 2/);assert.equal((await heading.boundingBox()).y,y);
  await expect(current.locator('.queue-read')).toBeEnabled();await page.keyboard.press('s');await expect(current.locator('.star-button')).toHaveAttribute('aria-pressed','true');
  await expect(ring).toHaveAttribute('aria-label',/1 \/ 2/);
  await expect(current.locator('.queue-read')).toBeEnabled();await page.keyboard.press('u');await expect(current).toHaveClass(/is-unread/);await expect(ring).toHaveAttribute('aria-label',/1 \/ 2/);
  await filter.getByRole('button',{name:'未读'}).click();await expect(cards).toHaveCount(2);
  await expect(current.locator('.queue-read')).toBeEnabled();rejectNext=true;await page.keyboard.press('r');await expect(cards).toHaveCount(1);await expect(current).toHaveAttribute('data-paper-key',keys[1]);
  await expect.poll(()=>typeof release).toBe('function');release();
  await expect(page.getByRole('alert')).toContainText('test conflict');await expect(cards).toHaveCount(2);await expect(current).toHaveAttribute('data-paper-key',keys[0]);
  await page.locator('.banner.error button').last().click();
  await page.keyboard.press('j');await expect(current).toHaveAttribute('data-paper-key',keys[1]);
  await page.keyboard.press('k');await expect(current).toHaveAttribute('data-paper-key',keys[0]);
  await page.keyboard.press('j');await page.keyboard.press('r');await expect(current).toHaveAttribute('data-paper-key',keys[0]);
  await page.locator('.preview-buttons').getByRole('button',{name:/标记为已读/}).click();
  await expect(cards).toHaveCount(0);await expect(page.locator('.preview')).toContainText('已读完当前队列');await expect(ring).toHaveAttribute('aria-label',/2 \/ 2/);
  await filter.getByRole('button',{name:'全部'}).click();await expect(cards).toHaveCount(2);
  await page.reload();await expect(cards.first()).toHaveClass(/is-read/);
  await page.locator('.original-abstract summary').click();
  const body=page.locator('.abstract');await expect(body.locator('.katex')).toHaveCount(1);await expect(body.locator('ul li')).toHaveCount(2);await expect(body.locator('ol li')).toHaveCount(2);
  await expect(body.locator('pre code')).toHaveText('x = "$literal$"');assert.equal(await body.locator('img').count(),0);
  await page.getByRole('button',{name:/笔记 n/}).click();const edit=page.getByLabel('个人阅读笔记');await edit.fill('jkrxu');await expect(cards).toHaveCount(2);
  await page.keyboard.press('Escape');await page.locator('.profile').click();
  await page.getByRole('button',{name:'立即同步'}).click();await expect(page.locator('.sync-toast')).toBeVisible();await expect(page.locator('.sync-toast')).toHaveCount(0);
  failRead=true;await page.getByRole('button',{name:'立即同步'}).click();await expect(page.locator('.settings-result.failure')).toContainText('test unavailable');
  console.log('Queue progress, optimistic rollback, stable order, wraparound, completion, persistence, manual sync toast/error, structured Markdown and KaTeX passed');
}finally{await browser.close();}
