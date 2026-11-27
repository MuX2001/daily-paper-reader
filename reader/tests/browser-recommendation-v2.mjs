import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},locale:'en-US'});
  await page.route('**/daily/20261124.json',async route=>{
    const data=await (await route.fetch()).json();
    data.papers[0].retrieval_sources=[{channel:'global'},{channel:'exploration',profile:'control'}];
    data.papers[0].evaluation_v2={dimensions:{idea:4,experiment:1,engineering:null,visualization:null,insight:3},highlights:[
      {dimension:'idea',verified:true,description:'Reusable delay model',transferability:'Controller design',
       limitation:'Bounded delay',locations:[{id:'S2',url:'https://arxiv.org/html/1706.03762v1#S2'}]},
      {dimension:'insight',verified:false,locations:[{id:'invented',url:'https://example.invalid'}]}]};
    data.papers[1].retrieval_sources=[{channel:'targeted'}];
    await route.fulfill({json:data});
  });
  await page.goto(process.env.DPR_TEST_URL);
  const filter=page.getByRole('combobox',{name:'Retrieval source'});
  await filter.selectOption('exploration');
  await expect(page.locator('.paper-card')).toHaveCount(1);
  const summary=page.locator('.v2-values summary');
  await expect(summary).toContainText('visualization —');
  await expect(summary).toContainText('insight 3?');
  await summary.click();
  await expect(page.getByRole('link',{name:'S2',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'invented'})).toHaveCount(0);
  await expect(page.locator('.overview')).toContainText('Legacy score');
  await expect(page.locator('.overview')).toContainText('Bounded delay');
  await filter.selectOption('targeted');
  await expect(page.locator('.paper-card')).toHaveCount(1);
  await expect(page.locator('.paper-card')).toHaveAttribute('data-paper-key','arxiv:1706.03762v2');
  await filter.selectOption('all');await expect(page.locator('.paper-card')).toHaveCount(2);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Desktop horizontal overflow');
} finally {await browser.close();}
