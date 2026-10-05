import {trainingHub} from './src/ui/training-hub.ts';
import {createMapSimulation} from './src/game/simulation.ts';
import {NAV_ITEMS,navIcon} from './src/ui/navigation.ts';
import {STREAMERS,CAMPAIGN_WEEKS,hireStreamer,advanceStreamerCampaign} from './src/game/streamer-marketing.ts';
import {BRANDS,SPONSOR_WEEKS,signSponsor,advanceSponsorDeal,equipSponsorItem} from './src/game/brand-sponsors.ts';
import {sponsorsView} from './src/ui/sponsors-view.ts';
import {mailView} from './src/ui/mail-view.ts';
import {STAFF_CANDIDATES,STAFF_EFFECTS,STAFF_ROLE_LABELS,staffEffect} from './src/game/staff.ts';
import {staffView} from './src/ui/staff-view.ts';
import {createAcademyProspects,discoverAcademyProspect,academyScoutingCost,academyTrainingCost,academyPromotionMinimum,academyUpgradeCost,academyGrowthInterval} from './src/game/academy.ts';
import {academyView} from './src/ui/academy-view.ts';
import {TOURNAMENT_ROUNDS,tournamentRound,tournamentOpponent,tournamentAccess,canPlayTournament} from './src/game/tournaments.ts';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const rosterData=JSON.parse(fs.readFileSync('rosters.json','utf8'));
const rawTeamData=JSON.parse(fs.readFileSync('teams.json','utf8'));
const mapStats=JSON.parse(fs.readFileSync('mapStats.json','utf8'));
const agentsData=JSON.parse(fs.readFileSync('agents.json','utf8'));
const app={innerHTML:''};
const storage=new Map();
let pendingMatch,pendingVeto;
const context=vm.createContext({
  trainingHub,rawRosterData:rosterData,rawTeamData,rawMapStats:mapStats,agentsData,NAV_ITEMS,navIcon,STREAMERS,CAMPAIGN_WEEKS,hireStreamer,advanceStreamerCampaign,BRANDS,SPONSOR_WEEKS,signSponsor,advanceSponsorDeal,equipSponsorItem,sponsorsView,mailView,STAFF_CANDIDATES,STAFF_EFFECTS,STAFF_ROLE_LABELS,staffEffect,renderStaff:staffView,createAcademyProspects,discoverAcademyProspect,academyScoutingCost,academyTrainingCost,academyPromotionMinimum,academyUpgradeCost,academyGrowthInterval,academyView,TOURNAMENT_ROUNDS,tournamentRound,tournamentOpponent,tournamentAccess,canPlayTournament,createMapSimulation,openMapVeto:options=>{pendingVeto=options},watchSeries:options=>{pendingMatch=options},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  document:{querySelector:key=>key==='#app'?app:null,querySelectorAll:()=>[]},
  confirm:()=>true,alert:()=>{},structuredClone,Math,Number,Object,Array,Date,JSON
});
let code=stripTypeScriptTypes(fs.readFileSync('manager.ts','utf8'));
code=code.replace(/^import .*?;\r?\n/gm,'').replace(/^export \{\};?\r?\n/gm,'').replace(/\nrender\(\);\s*$/,'');
code+='\nglobalThis.testApi={newState,render,training,strategy,squadView,ranking,pingEditor,agentTraining,action,simulateSeries,sponsors,preferredMaps,matchMaps,roleCoverage,MAP_IDS,leagueTeams,opponent,competition,selectCreateRegion,regionPicker,teamPreview,getCreateTeam:()=>createTeam,setCreateTeam:id=>{createTeam=id},getState:()=>state,setState:value=>{state=value},setView:value=>{view=value},setScoutTeam:value=>{scoutTeam=value},setTacticsMap:value=>{tacticsMap=value},openProfile:id=>{selected=id;profileOpen=true}};';
vm.runInContext(code,context);
const api=context.testApi;
assert.equal(TOURNAMENT_ROUNDS.length,14);
assert.deepEqual(TOURNAMENT_ROUNDS.map(r=>r.week),Array.from({length:14},(_,i)=>i+1));
for(const name of ['Masters Santiago','Masters London','Esports World Cup','Champions Shanghai','Tixinha & Sacy Invitational','Red Bull Home Ground'])assert.ok(TOURNAMENT_ROUNDS.some(r=>r.name===name));
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

// Every new club supports a playable career with regional opponents and global transfers.
assert.equal(new Set(rawTeamData.map(t=>t.id)).size,27);
for(const region of ['AMERICAS','EMEA','PACIFIC','CHINA']) {
  assert.equal(rawTeamData.filter(t=>t.region===region).length,region==='AMERICAS'?9:6);
  api.selectCreateRegion(region);
  assert.equal(rawTeamData.find(t=>t.id===api.getCreateTeam()).region,region);
  assert.match(api.regionPicker(),new RegExp(`VCT ${region}`));
}
for(const club of rawTeamData) {
  api.setCreateTeam(club.id);
  const preview=api.teamPreview();
  assert.ok(preview.includes(`Prévia de ${club.name}`));
  assert.ok(preview.includes(`VCT ${club.region}`));
  assert.equal((preview.match(/class="team-preview-player"/g)||[]).length,5);
  for(const player of rosterData[club.id].players.slice(0,5))assert.ok(preview.includes(player.alias));
}
for(const club of rawTeamData) {
  assert.ok(rosterData[club.id].players.length>=5);
  assert.ok(fs.existsSync(`public/assets/${club.id}.png`));
  assert.ok(mapStats[club.id].sample>0);
  const career=api.newState(club.id,'Regional','normal');
  api.setState(career);
  assert.equal(api.leagueTeams().length,club.region==='AMERICAS'?9:6);
  assert.equal(new Set(career.players.map(p=>p.id)).size,career.players.length);
  assert.equal(career.market.length,18);
  assert.equal(new Set(career.market.map(p=>p.id)).size,18);
  assert.equal(new Set(career.market.map(p=>rawTeamData.find(t=>t.id===p.source).region)).size,4);
  const opponents=new Set();
  for(let week=1;week<=14;week++) {
    career.week=week;
    if(tournamentRound(week).scope==='regional')assert.equal(api.opponent().region,club.region);
    else if(tournamentRound(week).scope==='americas')assert.equal(api.opponent().region,'AMERICAS');
    else assert.notEqual(api.opponent().region,club.region);
    assert.notEqual(api.opponent().id,club.id);
    opponents.add(api.opponent().id);
  }
  assert.ok(opponents.size>=5);
  assert.match(api.competition(),new RegExp(`VCT ${club.region}`));
  api.setScoutTeam(rawTeamData.find(t=>t.id!==club.id).id);
  assert.doesNotThrow(()=>api.strategy());
  career.week=1;
  api.simulateSeries();
  assert.equal(career.week,2);
  assert.equal(rawTeamData.find(t=>t.name===career.lastMatch.opp).region,'AMERICAS');
  assert.equal(career.tournamentResults.length,1);
  assert.equal(career.tournamentResults[0].eventName,'Tixinha & Sacy Invitational');
}
console.log('27 regional careers, fixtures, scouting data and transfer pools OK');

const progression=api.newState('loud','Progressão','normal');
api.setState(progression);
pendingVeto=undefined;
assert.equal(tournamentAccess(progression,tournamentRound(1)),'invite');
assert.equal(canPlayTournament(progression),false);
assert.doesNotMatch(api.competition(),/Masters Santiago/);
api.action('simulate');
assert.equal(pendingVeto,undefined);
api.action('decline-invite');
assert.equal(progression.week,2);
assert.equal(progression.inviteResponses.tixinha,'declined');
api.action('accept-invite');
assert.equal(progression.inviteResponses.homeground,'accepted');
assert.equal(canPlayTournament(progression),true);
api.action('simulate');
assert.ok(pendingVeto);
pendingVeto=undefined;
progression.week=5;
assert.equal(tournamentAccess(progression,tournamentRound(5)),'locked');
api.action('simulate');
assert.equal(pendingVeto,undefined);
api.action('advance-week');
assert.equal(progression.week,6);
progression.tournamentResults.push({week:3,eventId:'kickoff',eventName:'VCT Kickoff',opponentId:'100t',win:true,score:'2–0',prize:45,points:3});
assert.equal(tournamentAccess(progression,tournamentRound(5)),'qualified');
for(const week of [6,7])progression.tournamentResults.push({week,eventId:'stage1',eventName:'VCT Stage 1',opponentId:'100t',win:true,score:'2–0',prize:50,points:3});
assert.equal(tournamentAccess(progression,tournamentRound(9)),'qualified');
assert.equal(tournamentAccess(progression,tournamentRound(10)),'qualified');
assert.equal(tournamentAccess(progression,tournamentRound(14)),'locked');
progression.tournamentResults.push({week:4,eventId:'kickoff',eventName:'VCT Kickoff',opponentId:'100t',win:true,score:'2–0',prize:80,points:3});
for(const week of [11,12])progression.tournamentResults.push({week,eventId:'stage2',eventName:'VCT Stage 2',opponentId:'100t',win:true,score:'2–0',prize:55,points:3});
assert.equal(tournamentAccess(progression,tournamentRound(14)),'qualified');
console.log('Tournament invites, reveal, qualification and blocked matches OK');

const marketing=api.newState('loud','Marketing','normal');
api.setState(marketing);
api.setView('sponsors');
for(const name of ['Coreano','TcK','Sacy','tarik','TenZ'])assert.match(api.sponsors(),new RegExp(name));
const creator=STREAMERS.find(item=>item.id==='coreano');
const initialMoney=marketing.money;
api.action('hire-streamer','missing');
assert.equal(marketing.money,initialMoney);
api.action('hire-streamer','coreano');
assert.equal(marketing.money,initialMoney-creator.cost);
assert.equal(marketing.streamerContract.weeksRemaining,CAMPAIGN_WEEKS);
assert.match(api.sponsors(),/CONTRATADO/);
api.action('hire-streamer','sacy');
assert.equal(marketing.money,initialMoney-creator.cost);
api.simulateSeries(true);
assert.equal(marketing.streamerContract.weeksRemaining,CAMPAIGN_WEEKS);
assert.equal(marketing.marketingFans,undefined);
pendingMatch.onFinish();
assert.equal(marketing.streamerContract.weeksRemaining,CAMPAIGN_WEEKS-1);
assert.equal(marketing.marketingFans,creator.fansPerWeek);
api.simulateSeries();
api.simulateSeries();
assert.equal(marketing.streamerContract,undefined);
assert.equal(marketing.marketingFans,creator.fansPerWeek*CAMPAIGN_WEEKS);
marketing.money=0;
api.action('hire-streamer','sacy');
assert.equal(marketing.streamerContract,undefined);
marketing.money=1000;
marketing.week=15;
api.action('hire-streamer','sacy');
assert.equal(marketing.streamerContract,undefined);
console.log('Streamer contracts, budget, watched matches and fan growth OK');

const avatars=JSON.parse(fs.readFileSync('src/data/streamer-avatars.json','utf8'));
for(const creator of STREAMERS) {
  assert.ok(avatars[creator.id]);
  assert.ok(fs.existsSync(`public${avatars[creator.id]}`));
  assert.match(api.sponsors(),/assets\/streamers/);
}
const funded=api.newState('c9','Patrocínio','normal');
api.setState(funded);
api.setView('sponsors');
const firstBrand=BRANDS[0],secondBrand=BRANDS[1];
const beforeFunds=funded.money;
api.action('sign-sponsor','unknown');
assert.equal(funded.money,beforeFunds);
api.action('sign-sponsor',firstBrand.id);
assert.equal(funded.money,beforeFunds+firstBrand.signingBonus);
assert.equal(funded.sponsorIncome,firstBrand.signingBonus);
assert.equal(funded.sponsorDeal.weeksRemaining,SPONSOR_WEEKS);
assert.deepEqual(funded.sponsorItems,[firstBrand.id]);
assert.equal(funded.equippedSponsorItem,firstBrand.id);
assert.match(api.sponsors(),new RegExp(firstBrand.item.name));
assert.match(api.squadView(),/jersey-sponsor-item/);
api.action('sign-sponsor',secondBrand.id);
assert.equal(funded.sponsorDeal.id,firstBrand.id);
api.simulateSeries(true);
assert.equal(funded.sponsorDeal.weeksRemaining,SPONSOR_WEEKS);
pendingMatch.onFinish();
assert.equal(funded.sponsorDeal.weeksRemaining,SPONSOR_WEEKS-1);
assert.equal(funded.sponsorIncome,firstBrand.signingBonus+firstBrand.weeklyIncome);
for(let i=1;i<SPONSOR_WEEKS;i++)api.simulateSeries();
assert.equal(funded.sponsorDeal,undefined);
assert.equal(funded.sponsorIncome,firstBrand.signingBonus+SPONSOR_WEEKS*firstBrand.weeklyIncome);
api.action('sign-sponsor',secondBrand.id);
assert.equal(funded.sponsorDeal.id,secondBrand.id);
assert.deepEqual(funded.sponsorItems,[firstBrand.id,secondBrand.id]);
api.action('equip-sponsor-item',secondBrand.id);
assert.equal(funded.equippedSponsorItem,secondBrand.id);
api.action('equip-sponsor-item',secondBrand.id);
assert.equal(funded.equippedSponsorItem,undefined);
api.action('equip-sponsor-item','unknown');
assert.equal(funded.equippedSponsorItem,undefined);
console.log('Creator images, Cloud9 and fictional sponsor contracts and accessories OK');
