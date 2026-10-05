import {test,expect,type Page} from '@playwright/test';

async function createCareer(page:Page){
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.locator('[data-home-start]').first().click();
  await page.locator('#select-team').click();
  await page.locator('#manager-name').fill('Shop Teste');
  await page.locator('#start').click();
  await page.locator('[data-contract-sign]').click();
  await expect(page.locator('.home-profile b')).toHaveText('Shop Teste');
}
async function openShop(page:Page){
  await page.locator('summary[aria-label="Mais opções de Gestão"]').click();
  await page.locator('.home-nav-menu [data-view="shop"]').click();
}
const saved=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('tactical-career-v3')!));

test('shop purchases install once, affect staff and remain saved on mobile',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await createCareer(page);await openShop(page);
  await expect(page.locator('.shop-card')).toHaveCount(8);
  const asset=await page.request.get('/assets/shop/shop-products.png');expect(asset.ok()).toBe(true);
  await page.screenshot({path:'test-results/shop-desktop.png',fullPage:true});
  const before=await saved(page);
  await page.locator('[data-action="buy-shop-item"][data-id="pro-headsets"]').click();
  await expect(page.locator('[data-shop-item="pro-headsets"] button')).toBeDisabled();
  await expect(page.locator('.shop-feedback')).toContainText('instalado');
  const after=await saved(page);expect(after.money).toBe(before.money-180);expect(after.shopItems).toContain('pro-headsets');
  await page.locator('[data-action="buy-shop-item"][data-id="precision-mice"]').click();
  await page.locator('[data-action="buy-shop-item"][data-id="coaching-tablets"]').click();
  await page.locator('[data-shop-filter="owned"]').click();
  await expect(page.locator('.shop-card')).toHaveCount(3);
  await expect(page.locator('.shop-installed-list>div')).toHaveCount(3);
  await page.locator('.home-nav-link[data-view="market"]').click();
  await page.locator('[data-market-tab="staff"]').click();
  await expect(page.locator('[data-staff-candidate="coach-murilo"] .staff-candidate-top>strong')).toContainText('89');
  await page.locator('[data-action="hire-staff"][data-id="coach-murilo"]').click();
  await expect(page.locator('.staff-member .shop-equipment-note')).toContainText('+5');
  expect((await saved(page)).staff[0].quality).toBe(84);
  await openShop(page);
  await page.locator('[data-shop-filter="all"]').click();
  await expect(page.locator('[data-shop-item="academy-stations"] button')).toBeDisabled();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/shop-mobile.png',fullPage:true});
  const balance=(await saved(page)).money;
  await page.reload();await openShop(page);
  await expect(page.locator('[data-shop-item="pro-headsets"] button')).toBeDisabled();
  expect((await saved(page)).money).toBe(balance);
  await page.locator('.home-nav-link[data-view="squad"]').click();
  await page.locator('summary[aria-label="Mais opções de Equipe"]').click();
  await page.locator('.home-nav-menu [data-view="training"]').click();
  await expect(page.locator('.page-title p')).toContainText('+9 de domínio');
  expect(errors).toEqual([]);
});

test('scouting equipment reduces report cost and academy equipment improves training',async({page})=>{
  await createCareer(page);await openShop(page);
  await page.locator('[data-action="buy-shop-item"][data-id="scouting-laptop"]').click();
  await page.locator('[data-action="buy-shop-item"][data-id="academy-stations"]').click();
  await page.locator('.home-nav-link[data-view="market"]').click();
  await page.locator('[data-market-tab="scouts"]').click();
  await page.locator('[data-action="hire-staff"][data-id="scout-igor"]').click();
  await expect(page.locator('.staff-member .staff-member-title>b')).toContainText('85');
  await expect(page.locator('.market-summary')).toContainText('8,5%');
  await page.locator('summary[aria-label="Mais opções de Transferências"]').click();
  await page.locator('.home-nav-menu [data-view="scouting"]').click();
  await expect(page.locator('[data-action="scout"]')).toContainText('$ 30 mil');
  const beforeReport=await saved(page);
  await page.locator('[data-action="scout"]').click();
  expect((await saved(page)).money).toBe(beforeReport.money-30);
  await page.locator('summary[aria-label="Mais opções de Equipe"]').click();
  await page.locator('.home-nav-menu [data-view="basecamp"]').click();
  await expect(page.locator('.shop-equipment-note')).toContainText('+3 de overall');
  const before=await saved(page),prospect=before.academyProspects[0];
  await page.locator(`[data-action="train-prospect"][data-id="${prospect.id}"]`).click();
  const after=await saved(page);
  expect(after.academyProspects[0].rating).toBe(Math.min(prospect.potential,prospect.rating+3));
  expect(after.money).toBe(before.money-45);
  await expect(page.locator(`[data-action="train-prospect"][data-id="${prospect.id}"]`)).toBeDisabled();
});
