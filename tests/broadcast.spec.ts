import {test,expect,type Page} from '@playwright/test';

async function replay(page:Page){
  await page.goto('/');
  await page.evaluate(async()=>{
    const {watchSeries}=await import('/src/game/watch-series.ts');
    const {createMapSimulation}=await import('/src/game/simulation.ts');
    const agents=['jett','sova','omen','raze','sage','viper','cypher','killjoy','breach','phoenix'];
    const players=agents.map((agent,id)=>({alias:['zekken','johnqt','zellsis','bang','n4rrate','aspas','less','saadhak','cauanzin','tuyz'][id],agent}));
    const simulation=createMapSimulation(true,players);
    // Exercise assists, headshots, deaths and a completed round without waiting a whole match.
    simulation.rounds[0]={winner:0,attacking:0,events:[{time:.02,killer:0,victim:5,assist:1,weapon:'vandal',headshot:true}],spike:null,outcome:'elimination',resolveAt:.06,duration:.45,site:'A',seed:.2};
    simulation.rounds[1]={winner:1,attacking:0,events:[{time:.02,killer:6,victim:2,assist:7,weapon:'operator',headshot:false}],spike:null,outcome:'elimination',resolveAt:90,duration:92,site:'A',seed:.3};
    (window as unknown as {broadcastFinished:number}).broadcastFinished=0;
    watchSeries({maps:[{map:'Ascent',win:true,ownStartsAttack:true,simulation}],players,own:'SENTINELS',opponent:'LOUD',ownLogo:'/assets/sen.png',opponentLogo:'/assets/loud.png',competition:'VCT AMERICAS',stage:'TEMPORADA · SEMANA 4',escape:value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!)),onFinish:()=>{(window as unknown as {broadcastFinished:number}).broadcastFinished++}});
  });
  await expect(page.locator('.sim-pause')).toBeEnabled({timeout:30000});
  await expect(page.locator('.broadcast-headshot')).toBeVisible();
  await expect(page.locator('.broadcast-round-number')).toHaveText(/ROUND 2/,{timeout:15000});
  await expect(page.locator('.broadcast-kill')).toHaveCount(1);
  await page.locator('.sim-pause').click();
}

test('broadcast uses shared kills and assists, preserves cameras and completes once',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1600,height:940});
  await replay(page);
  await expect(page.locator('.broadcast-own-score')).toHaveText('1');
  await expect(page.locator('[data-roster="0"] .sim-player-stats')).toHaveText('1 / 0 / 0');
  await expect(page.locator('[data-roster="1"] .sim-player-stats')).toHaveText('0 / 1 / 0');
  await expect(page.locator('[data-roster="5"] .sim-player-stats')).toHaveText('0 / 0 / 1');
  await expect(page.locator('[data-roster="6"] .sim-player-stats')).toHaveText('1 / 0 / 0');
  await expect(page.locator('[data-roster="7"] .sim-player-stats')).toHaveText('0 / 1 / 0');
  await expect(page.locator('[data-roster="2"]')).toHaveClass(/dead/);
  await expect(page.locator('.broadcast-kill')).toHaveAttribute('aria-label',/less eliminou zellsis, assistência de killjoy|less eliminou zellsis, assistência de saadhak/);
  await expect(page.locator('.kill-assist-portrait')).toHaveCount(1);
  await expect(page.locator('.broadcast-round-slot.completed')).toHaveCount(1);
  await expect(page.locator('[data-alive="0"]')).toHaveText('4 VIVOS');
  const images=await page.locator('.broadcast-viewer img[src]').evaluateAll(images=>images.filter(img=>!(img as HTMLImageElement).complete||!(img as HTMLImageElement).naturalWidth).map(img=>img.getAttribute('src')));
  expect(images).toEqual([]);
  await page.screenshot({path:'test-results/broadcast-desktop.png'});
  await page.locator('.sim-speed').selectOption('2');
  await page.locator('.sim-view-mode').selectOption('2d');
  await expect(page.locator('.sim-plan-view')).toBeVisible();
  await expect(page.locator('.sim-minimap')).toBeVisible();
  await page.locator('[data-roster="6"]').click();
  await expect(page.locator('[data-roster="6"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('.broadcast-camera summary').click();
  await page.locator('.sim-camera-mode').selectOption('player');
  await expect(page.locator('.sim-map')).toHaveAttribute('data-camera-mode','player');
  await page.locator('.sim-view-mode').selectOption('3d');
  await page.locator('.sim-camera-reset').click();
  await expect(page.locator('.sim-map')).toHaveAttribute('data-camera-mode','tactical');
  await page.locator('.broadcast-camera summary').click();
  await page.locator('.broadcast-camera summary').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-roster="5"]')).toBeFocused();
  await page.locator('.sim-audio').click();
  await expect(page.locator('.sim-audio')).toHaveAttribute('aria-pressed','true');
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.broadcast-viewer')).toBeVisible();
  expect(await page.locator('.broadcast-viewer').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await page.locator('.sim-view-mode').selectOption('2d');
  await page.screenshot({path:'test-results/broadcast-mobile.png'});
  await page.keyboard.press('Escape');
  await expect(page.locator('.sim-pause')).toHaveText('CONTINUAR');
  await page.locator('.sim-finish').click();
  await expect(page.locator('.broadcast-overlay')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as unknown as {broadcastFinished:number}).broadcastFinished)).toBe(1);
  expect(await page.evaluate(()=>document.body.style.overflow)).toBe('');
  expect(errors).toEqual([]);
});
