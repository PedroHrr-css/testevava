import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const rosterData=JSON.parse(fs.readFileSync('rosters.json','utf8'));
const mapStats=JSON.parse(fs.readFileSync('mapStats.json','utf8'));
const agentsData=JSON.parse(fs.readFileSync('agents.json','utf8'));
const app={innerHTML:''};
const storage=new Map();
const context=vm.createContext({
  rosterData,mapStats,agentsData,
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  document:{querySelector:key=>key==='#app'?app:null,querySelectorAll:()=>[]},
  confirm:()=>true,alert:()=>{},structuredClone,Math,Number,Object,Array,Date,JSON
});
let code=fs.readFileSync('manager.js','utf8');
code=code.replace(/^import .*?;\r?\n/gm,'').replace(/\nrender\(\);\s*$/,'');
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
assert.equal(state.mapMastery.Summit,before+8);
assert.ok(state.lastMatch.maps.length>=2);
assert.ok(state.players[0].stats.kills>0);
assert.match(api.ranking(),/ABATES/);
assert.equal(state.week,2);
state.focus='agent';state.trainingPlayer=state.players[0].id;
const agentBefore=state.players[0].agentMastery[state.players[0].agent];
api.simulateSeries();
assert.equal(state.players[0].agentMastery[state.players[0].agent],agentBefore+8);
assert.equal(state.week,3);
console.log('Manager systems OK');
