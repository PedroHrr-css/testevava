import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planRoundMovement,tacticalPosition} from './src/game/tactical-movement.ts';
import {cellPoint,nearestCell} from './src/game/navigation.ts';

const maps=JSON.parse(fs.readFileSync('public/assets/maps/navigation.json','utf8'));
const roles=['Duelista','Iniciador','Controlador','Flex','Sentinela'];
const players=Array.from({length:10},(_,id)=>({alias:`P${id}`,agent:'jett',role:roles[id%5]}));
const round={site:'A',seed:.42,resolveAt:10,duration:12,events:[],spike:null};
for(const [slug,nav] of Object.entries(maps)){
  const map=slug[0].toUpperCase()+slug.slice(1);
  for(const attacksOwn of [true,false])for(const attack of ['default','fast','split','late'])for(const defense of ['default','aggressive','retake','hold']){
    const plan=planRoundMovement(nav,map,round,attacksOwn,players,{name:'Plano',attack,defense});
    assert.equal(plan.length,10);
    for(const route of plan){
      for(const path of [route.opening,route.execution])for(let i=0;i<path.length;i++){
        assert.equal(nav.walk[path[i]],1,`${map}: walkable tactical path`);
        if(i)assert.equal(Math.abs(path[i]%nav.columns-path[i-1]%nav.columns)+Math.abs(Math.floor(path[i]/nav.columns)-Math.floor(path[i-1]/nav.columns)),1);
      }
      assert.equal(route.opening.at(-1),route.execution[0],`${map}: no teleport at rotation`);
      assert.ok(route.delay<route.arriveAt&&route.arriveAt<=route.releaseAt&&route.releaseAt<route.finishAt);
      assert.deepEqual(tacticalPosition(nav,route,route.arriveAt),cellPoint(nav,route.opening.at(-1)));
      assert.deepEqual(tacticalPosition(nav,route,Infinity),cellPoint(nav,route.execution.at(-1)));
    }
    assert.ok(new Set(plan.slice(0,5).map(route=>route.opening.at(-1))).size>=3,`${map}: team is distributed`);
  }
}
const nav=maps.ascent;
const slow=planRoundMovement(nav,'Ascent',round,true,players,{name:'Controle',attack:'late',defense:'hold'},20);
const trained=planRoundMovement(nav,'Ascent',round,true,players,{name:'Controle',attack:'late',defense:'hold'},100);
assert.ok(slow[4].releaseAt>trained[4].releaseAt,'training improves timing');
assert.deepEqual(trained,planRoundMovement(nav,'Ascent',round,true,players,{name:'Controle',attack:'late',defense:'hold'},100),'plans are deterministic');
const ping={type:'attack',x:35,y:62};
const custom=planRoundMovement(nav,'Ascent',round,true,players,{name:'Custom',attack:'split',defense:'hold',pings:[ping]});
assert.equal(custom[0].opening.at(-1),nearestCell(nav,ping.x,ping.y),'saved pings guide the opening');
assert.notEqual(custom[5].assignment,'POSIÇÃO DO PLANO','opponents do not follow the manager plan');
const fast=planRoundMovement(nav,'Ascent',round,true,players,{name:'Rush',attack:'fast',defense:'hold'});
assert.ok(fast[0].releaseAt<slow[0].releaseAt,'rush and slow control have distinct pacing');
const spikeRound={...round,spike:{planter:4,plantStart:2.85,plantAt:4.2,defuser:8,defuseStart:8,explodeAt:12.2,casualties:[]}};
const objectives=planRoundMovement(nav,'Ascent',spikeRound,true,players);
assert.ok(objectives[4].finishAt<spikeRound.spike.plantStart,'planter arrives before planting');
assert.ok(objectives[8].finishAt<spikeRound.spike.defuseStart,'defuser arrives before defusing');
assert.equal(objectives[4].execution.at(-1),objectives[8].execution.at(-1),'defuser reaches the planted spike');
console.log('Tactical movement OK: all maps, patterns and sides; safe routes, distribution, pings and training timing');
