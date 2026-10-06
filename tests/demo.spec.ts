import {test,expect} from '@playwright/test';

test('demo preserves normal save, plays four rounds, resumes and exports feedback',async({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?demo=1');
  await page.evaluate(()=>localStorage.setItem('tactical-career-v3','normal-save-preserved'));
  await page.locator('[data-start-menu]').click();
  await page.locator('#select-team').click();
  await page.locator('#manager-name').fill('Demo Tester');
  await page.locator('#start').click();
  await page.locator('[data-contract-sign]').click();
  await expect(page.locator('.career-guide')).toContainText('DEMO');
  await expect(page.locator('.career-chapters li')).toHaveCount(4);
  await page.locator('.career-guide summary').click();
  await page.locator('[data-action="confirm-demo-lineup"]').click();
  await page.locator('.home-nav-link[data-view="market"]').click();
  await expect(page.locator('#market-search')).toBeVisible();
  await page.locator('.home-nav-link[data-view="overview"]').click();
  for(let week=1;week<=4;week++){
    await page.locator('[data-action="open-simulation"]').click();
    await page.locator('[data-action="advance-week"]').click();
    await expect(page.locator('.home-simulation-dialog [data-action="simulate"]')).toBeVisible({timeout:15000});
    await page.locator('.home-simulation-dialog [data-action="simulate"]').click();
    await page.locator('[data-order="A"]').click();
    for(let step=0;step<9;step++){
      if(await page.locator('[data-start]').count())break;
      if(await page.locator('[data-side="attack"]').count())await page.locator('[data-side="attack"]').click();
      else await page.locator('[data-map]:not(:disabled)').first().click();
    }
    await page.locator('[data-start]').click();
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('tactical-demo-v1')!).tournamentResults.length)).toBe(week);
  }
  await expect(page.locator('.career-guide h2')).toHaveText('Sua demo está concluída');
  await expect(page.locator('.career-guide header>b')).toHaveText('4 / 4 partidas');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.locator('#demo-feedback').fill('Gostei das táticas. Quero mais clareza no veto.');
  const downloading=page.waitForEvent('download');
  await page.locator('[data-action="export-demo-feedback"]').click();
  expect((await downloading).suggestedFilename()).toBe('vava-manager-demo-feedback.json');
  await page.reload();
  await page.locator('[data-start-view="overview"]').click();
  await expect(page.locator('#demo-feedback')).toHaveValue('Gostei das táticas. Quero mais clareza no veto.');
  await page.locator('[data-action="open-simulation"]').click();
  await expect(page.locator('.home-simulation-dialog')).toContainText('DEMO CONCLUÍDA');
  await expect(page.locator('.home-simulation-dialog [data-action="advance-week"]')).toHaveCount(0);
  await expect(page.locator('.home-simulation-dialog [data-action="simulate"]')).toHaveCount(0);
  await page.locator('[data-close-simulation]').click();
  expect(await page.evaluate(()=>localStorage.getItem('tactical-career-v3'))).toBe('normal-save-preserved');
  await page.locator('.home-icon-button[data-view="settings"]').click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('.watch-match[data-action="reset"]').click();
  expect(await page.evaluate(()=>localStorage.getItem('tactical-demo-v1'))).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem('tactical-career-v3'))).toBe('normal-save-preserved');
  expect(errors).toEqual([]);
});
