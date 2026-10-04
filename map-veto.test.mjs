import assert from 'node:assert/strict';
import {VETO_POOL,VETO_STEPS,createVeto,applyVeto,chooseOpponent} from './map-veto.ts';
for(const ownSlot of ['A','B']) {
  const veto=createVeto(ownSlot);
  assert.equal(applyVeto(veto,'Not a map'),false);
  assert.equal(veto.step,0);
  while(VETO_STEPS[veto.step]) {
    const [slot,action]=VETO_STEPS[veto.step];
    const value=slot===ownSlot?(action==='side'?'attack':veto.available[0]):chooseOpponent(veto,{preferred:['Lotus','Haven','Ascent'],trainingMap:'Summit',mastery:{}});
    if(action==='side')assert.equal(applyVeto(veto,'Summit'),false);
    assert.equal(applyVeto(veto,value),true);
    if(action!=='side')assert.equal(applyVeto(veto,value),false);
  }
  assert.equal(veto.maps.length,3);
  assert.equal(new Set(veto.maps.map(m=>m.map)).size,3);
  assert.equal(veto.history.filter(e=>e.action==='ban').length,4);
  assert.equal(veto.history.filter(e=>e.action==='pick').length,2);
  assert.equal(veto.history.filter(e=>e.action==='side').length,3);
  assert.equal(veto.maps[2].map,veto.available[0]);
  const bans=veto.history.filter(e=>e.action==='ban').map(e=>e.map);
  veto.maps.forEach(m=>{assert.ok(VETO_POOL.includes(m.map));assert.ok(!bans.includes(m.map));assert.equal(typeof m.ownStartsAttack,'boolean');});
  assert.equal(applyVeto(veto,'attack'),false);
  veto.history.filter(e=>e.action==='side').forEach(e=>{
    assert.equal(veto.maps.find(m=>m.map===e.map).ownStartsAttack,e.slot===ownSlot?e.value==='attack':e.value==='defense');
  });
}
console.log('Map veto OK: A/B orders, opponent turns, unique picks, bans, decider and side selection');
