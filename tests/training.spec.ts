import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
const abilities: {icon:string;agentName:string;name:string}[]=JSON.parse(fs.readFileSync('abilities.json','utf8'));
async function lab(page:Page){await page.goto('/');await page.locator('#manager-name').fill('Treinador');await page.locator('#start').click();await page.locator('[data-view="training"]').click();}
async function state(page:Page){return page.evaluate(()=>JSON.parse(localStorage.getItem('tactical-career-v3')!));}
async function begin(page:Page,kind:string){await page.locator(`[data-training-kind="${kind}"]`).click();await page.locator('#launch-training').click();await page.locator('[data-begin]').click();}
for(const kind of ['agent-match','ability-names'])test(`${kind}: matching, feedback, selected athletes and saved rewards`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await lab(page);
 await page.screenshot({path:'test-results/training-desktop.png'});await page.locator('[data-trainee]').nth(1).check();const before=await state(page);await begin(page,kind);
 for(let round=0;round<3;round++){
  await expect.poll(()=>page.locator('.connect-board img').evaluateAll(images=>images.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);if(round===0)await page.screenshot({path:`test-results/training-${kind}.png`});const icons=page.locator('[data-left]');for(let i=0;i<4;i++){const icon=icons.nth(i),src=await icon.locator('img').getAttribute('src'),ability=abilities.find(a=>a.icon===src)!;await icon.click();const label=kind==='agent-match'?ability.agentName:ability.name;await page.locator('[data-right]').filter({hasText:label}).click();}
  await expect(page.locator('svg line')).toHaveCount(4);await page.locator('[data-next]').click();
 }
 const after=await state(page);expect(after.trainingHistory[0].score).toBeGreaterThanOrEqual(70);expect(after.trainingHistory[0].durationMs).toBeGreaterThanOrEqual(0);
 for(let i=0;i<2;i++)expect(after.players[i].agentMastery[before.players[i].agent]).toBe((before.players[i].agentMastery[before.players[i].agent]??48)+Math.floor(after.trainingHistory[0].score/12.5));
 expect(after.players[2].agentMastery).toEqual(before.players[2].agentMastery);expect(after.trainingHistory).toHaveLength(1);
 await page.locator('[data-finish]').click();await page.reload();await page.locator('[data-view="training"]').click();await expect(page.locator('.lab-history')).toHaveCount(1);expect(errors).toEqual([]);
});
test('aim: timed target practice, pause, save, cancellation and mobile',async({page})=>{
 await page.clock.install();await lab(page);const before=await state(page);await begin(page,'aim');
 await page.locator('[data-pause]').click();await page.clock.fastForward(5000);await expect(page.locator('[data-time]')).toHaveText('30.0s');await page.locator('[data-pause]').click();
 for(let i=0;i<30;i++)await page.locator('.aim-target').nth(i%3).click();await page.clock.fastForward(31000);
 const after=await state(page);expect(after.trainingHistory[0].score).toBeGreaterThanOrEqual(70);expect(after.trainingHistory[0].durationMs).toBeGreaterThanOrEqual(0);expect(after.players[0].agentMastery[before.players[0].agent]).toBe(48+Math.floor(after.trainingHistory[0].score/12.5));await page.locator('[data-finish]').click();
 await begin(page,'aim');await page.locator('.aim-target').first().click();await page.locator('[data-exit]').click();expect((await state(page)).trainingHistory).toHaveLength(1);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/training-mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('map crops: identification, partial score and map mastery',async({page})=>{
 await lab(page);let answer='';page.on('request',r=>{const m=r.url().match(/\/maps\/(.+)-splash\.jpg/);if(m)answer=m[1];});await begin(page,'map-guess');
 for(let i=0;i<6;i++){await expect(page.locator('[data-answer]').first()).toBeEnabled();const options=page.locator('[data-answer]');let choice=options.filter({hasText:new RegExp(`^${answer}$`,'i')});if(i===0)choice=options.filter({hasNotText:new RegExp(`^${answer}$`,'i')}).first();await choice.click();await expect(page.locator('[data-feedback]')).toContainText('Este mapa é');await page.locator('[data-next]').click();}
 const after=await state(page);expect(after.trainingHistory[0].score).toBeGreaterThanOrEqual(58);expect(after.trainingHistory[0].score).toBeLessThanOrEqual(83);expect(after.players[0].mapMastery.Ascent).toBe(48+Math.floor(after.trainingHistory[0].score/12.5));expect(after.players[1].mapMastery.Ascent).toBe(48);expect(after.trainingHistory[0].kind).toBe('map-guess');
});
test('veto: clear picked, blocked and decider maps',async({page})=>{
 await lab(page);await page.locator('[data-view="overview"]').click();await page.locator('[data-action="watch"]').click();await page.locator('[data-order="A"]').click();
 for(let step=0;step<9;step++){if(await page.locator('[data-start]').count())break;if(await page.locator('[data-side]').count())await page.locator('[data-side="attack"]').click();else await page.locator('[data-map]:not(:disabled)').first().click();}
 await expect(page.locator('.veto-map.ban')).toHaveCount(4);await expect(page.locator('.veto-map.pick')).toHaveCount(2);await expect(page.locator('.veto-map.decider')).toHaveCount(1);await expect(page.locator('.series-picker').first()).toContainText('PICK DE LOUD');await expect(page.locator('.veto-blocked>span')).toHaveCount(4);await page.screenshot({path:'test-results/veto-completed.png'});await page.locator('[data-cancel]').click();
});
test('incorrect connections cannot earn full credit, and empty selection disables launch',async({page})=>{
 await lab(page);await page.locator('[data-trainee]').first().uncheck();await expect(page.locator('#launch-training')).toBeDisabled();await page.locator('[data-trainee]').first().check();await begin(page,'ability-names');
 for(let round=0;round<3;round++){const icons=page.locator('[data-left]');for(let i=0;i<4;i++){const icon=icons.nth(i),src=await icon.locator('img').getAttribute('src'),ability=abilities.find(a=>a.icon===src)!;await icon.click();if(round===0&&i===0){await page.locator('[data-right]').filter({hasNotText:ability.name}).first().click();await expect(page.locator('[data-feedback]')).toContainText('Este par não pontua mais');}await page.locator('[data-right]').filter({hasText:ability.name}).click();}await page.locator('[data-next]').click();}
 const after=await state(page);expect(after.trainingHistory[0].score).toBeLessThanOrEqual(92);expect(after.players[0].agentMastery[after.players[0].agent]).toBe(48+Math.floor(after.trainingHistory[0].score/12.5));
});
test('failed map images can retry and abandoning does not reward',async({page})=>{
 await lab(page);await page.route('**/assets/maps/*-splash.jpg',route=>route.abort());await begin(page,'map-guess');await expect(page.locator('[data-feedback]')).toContainText('Não foi possível');await expect(page.locator('[data-answer]').first()).toBeDisabled();await page.unroute('**/assets/maps/*-splash.jpg');await page.locator('[data-retry]').click();await expect(page.locator('[data-answer]').first()).toBeEnabled();await page.locator('[data-exit]').click();expect((await state(page)).trainingHistory??[]).toHaveLength(0);
});
