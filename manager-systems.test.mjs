import {trainingHub} from './src/ui/training-hub.ts';
import {createMapSimulation} from './src/game/simulation.ts';
import {NAV_ITEMS,navIcon} from './src/ui/navigation.ts';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const rosterData=JSON.parse(fs.readFileSync('rosters.json','utf8'));
const mapStats=JSON.parse(fs.readFileSync('mapStats.json','utf8'));
const agentsData=JSON.parse(fs.readFileSync('agents.json','utf8'));
const app={innerHTML:''};
const storage=new Map();
let pendingMatch,pendingVeto;
const context=vm.createContext({
  trainingHub,rawRosterData:rosterData,rawMapStats:mapStats,agentsData,NAV_ITEMS,navIcon,createMapSimulation,openMapVeto:options=>{pendingVeto=options},watchSeries:options=>{pendingMatch=options},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  document:{querySelector:key=>key==='#app'?app:null,querySelectorAll:()=>[]},
  confirm:()=>true,alert:()=>{},structuredClone,Math,Number,Object,Array,Date,JSON
});
let code=stripTypeScriptTypes(fs.readFileSync('manager.ts','utf8'));
code=code.replace(/^import .*?;\r?\n/gm,'').replace(/^export \{\};?\r?\n/gm,'').replace(/\nrender\(\);\s*$/,'');
code+='\nglobalThis.testApi={newState,render,training,strategy,squadView,ranking,pingEditor,agentTraining,action,simulateSeries,preferredMaps,matchMaps,roleCoverage,MAP_IDS,getState:()=>state,setState:value=>{state=value},setView:value=>{view=value},setScoutTeam:value=>{scoutTeam=value},setTacticsMap:value=>{tacticsMap=value},openProfile:id=>{selected=id;profileOpen=true}};';
vm.runInContext(code,context);
const api=context.testApi;
api.setState(api.newState('loud','Teste','normal'));
assert.equal(api.MAP_IDS.length,13);
assert.equal(agentsData.length,29);
for(const map of api.MAP_IDS){
  assert.ok(fs.existsSync(`public/assets/maps/${map.toLowerCase()}-plan.png`));
  assert.ok(fs.existsSync(`public/assets/maps/${map.toLowerCase()}-splash.jpg`));
}
for(const agent of agentsData)assert.ok(fs.existsSync(`public/assets/agents/${agent.id}.png`));
assert.match(api.training(),/Summit/);
assert.match(api.training(),/Corrode/);
assert.equal(api.preferredMaps('100t').length,3);
api.setScoutTeam('100t');
assert.match(api.strategy(),/ENVIAR OLHEIRO/);
const originalMoney=api.getState().money;
api.action('scout','100t');
assert.equal(api.getState().money,originalMoney-40);
assert.ok(api.getState().scoutReports['100t']);
assert.match(api.strategy(),/Mapas mais frequentes/);
const state=api.getState();
assert.match(api.squadView(),/ESTAÇÃO 05/);
api.openProfile(state.players[0].id);
assert.match(api.squadView(),/role="dialog"/);
assert.match(api.squadView(),/TROCAR AGENTE/);
assert.match(api.agentTraining(),/Miks/);
state.focus='map';state.trainingMap='Summit';
assert.equal(api.matchMaps('100t')[0],'Summit');
assert.equal(api.roleCoverage(),4);
api.action('captain',state.players[1].id);
assert.equal(state.captain,state.players[1].id);
state.tactics.push({id:'test-tactic',map:'Summit',name:'Teste',attack:'split',defense:'retake'});
state.activeTactics.Summit='test-tactic';
api.setTacticsMap('Summit');
assert.match(api.pingEditor(),/summit-plan.png/);
state.tactics[0].pings=[{id:'ping-test',type:'attack',label:'Entrada A',x:40,y:30}];
assert.match(api.pingEditor(),/Entrada A/);
const before=state.mapMastery.Summit;
api.simulateSeries();
assert.equal(state.mapMastery.Summit,before);
assert.ok(state.lastMatch.maps.length>=2);
assert.ok(state.players[0].stats.kills>0);
assert.match(api.ranking(),/ABATES/);
assert.equal(state.week,2);
state.focus='agent';state.trainingPlayer=state.players[0].id;
const agentBefore=state.players[0].agentMastery[state.players[0].agent];
api.simulateSeries();
assert.equal(state.players[0].agentMastery[state.players[0].agent],agentBefore);
assert.equal(state.week,3);
console.log('Manager systems OK');

// Every visual elimination has a living killer and victim; maps end at 13.
for(const win of [true,false]) {
  for(let trial=0;trial<50;trial++) {
    const replay=createMapSimulation(win,Array.from({length:10},(_,i)=>({id:i})));
    const score=[0,0], kills=Array(10).fill(0), deaths=Array(10).fill(0);
    for(const round of replay.rounds) {
      assert.ok(score[0]<13 && score[1]<13);
      const alive=new Set(Array.from({length:10},(_,i)=>i));
      for(const event of round.events) {
        assert.ok(alive.has(event.killer));assert.ok(alive.has(event.victim));
        assert.notEqual(event.killer<5,event.victim<5);
        alive.delete(event.victim);kills[event.killer]++;deaths[event.victim]++;
      }
      if(round.spike) {
        assert.equal(round.spike.planter<5?0:1,round.attacking);
        assert.ok(round.spike.plantAt<round.events[0].time);
        if(round.outcome==='detonation') {
          assert.equal(round.winner,round.attacking);
          assert.equal(round.resolveAt,round.spike.explodeAt);
          round.spike.casualties.forEach(id=>{assert.ok(alive.has(id));alive.delete(id);deaths[id]++;});
        } else {
          assert.equal(round.outcome,'defuse');assert.notEqual(round.winner,round.attacking);
          assert.ok(alive.has(round.spike.defuser));assert.equal(round.spike.defuser<5?0:1,round.winner);
          assert.ok(round.resolveAt<round.spike.explodeAt);
        }
      } else assert.ok([...alive].every(i=>(i<5?0:1)===round.winner));
      score[round.winner]++;
    }
    assert.deepEqual(score,replay.score);
    assert.equal(score[win?0:1],13);
    replay.stats.forEach((stats,i)=>{assert.equal(stats.kills,kills[i]);assert.equal(stats.deaths,deaths[i]);});
  }
}
console.log('Match simulation invariants OK');

const weekBeforeWatch=state.week;
const winsBeforeWatch=state.wins+state.losses;
const killsBeforeWatch=state.players.slice(0,5).map(p=>p.stats.kills);
api.simulateSeries(true);
assert.equal(state.week,weekBeforeWatch);
assert.equal(state.wins+state.losses,winsBeforeWatch);
assert.equal(pendingMatch.players.length,10);
pendingMatch.onFinish();
assert.equal(state.week,weekBeforeWatch+1);
state.players.slice(0,5).forEach((p,i)=>{
  const shownKills=pendingMatch.maps.reduce((sum,map)=>sum+map.simulation.stats[i].kills,0);
  assert.equal(p.stats.kills-killsBeforeWatch[i],shownKills);
});
console.log('Watched match career completion OK');

// Both entry points open the veto and leave the career untouched until starting.
for(const mode of ['watch','simulate']) {
  const week=state.week,kills=state.players[0].stats.kills;
  api.action(mode);
  assert.equal(state.week,week);
  assert.equal(state.players[0].stats.kills,kills);
  assert.ok(pendingVeto);
  const veto={maps:[{map:'Haven',ownStartsAttack:false},{map:'Split',ownStartsAttack:true},{map:'Lotus',ownStartsAttack:false}],history:[{action:'ban',map:'Summit'}]};
  pendingVeto.onStart(veto);
  if(mode==='watch') {
    assert.equal(state.week,week);
    assert.equal(pendingMatch.maps[0].map,'Haven');
    assert.equal(pendingMatch.maps[0].ownStartsAttack,false);
    pendingMatch.onFinish();
  }
  assert.equal(state.week,week+1);
  assert.equal(state.lastMatch.maps[0].map,'Haven');
  assert.equal(state.lastMatch.maps[0].ownStartsAttack,false);
  assert.deepEqual(state.lastMatch.veto,veto);
  assert.ok(state.lastMatch.maps.every(m=>veto.maps.some(p=>p.map===m.map)));
}
console.log('Veto integration OK: quick and watched matches use selected maps and sides');
