import {trainingHub} from './src/ui/training-hub.ts';
import {openTrainingSession} from './src/ui/training-session.ts';
import {beginTraining, rewardTraining, type TrainingKind} from './src/game/training.ts';
import {openMapVeto} from './map-veto.ts';
import {createMapSimulation} from './src/game/simulation.ts';
import {watchSeries} from './src/game/watch-series.ts';
import {STREAMERS, CAMPAIGN_WEEKS, hireStreamer, advanceStreamerCampaign} from './src/game/streamer-marketing.ts';
import {BRANDS,signSponsor,advanceSponsorDeal,equipSponsorItem} from './src/game/brand-sponsors.ts';
import {sponsorsView} from './src/ui/sponsors-view.ts';
import {mailView,filterMailMessages} from './src/ui/mail-view.ts';
import {STAFF_CANDIDATES,STAFF_ROLE_LABELS,staffEffect} from './src/game/staff.ts';
import {staffView as renderStaff} from './src/ui/staff-view.ts';
import {createAcademyProspects,discoverAcademyProspect,academyScoutingCost,academyTrainingCost,academyPromotionMinimum,academyUpgradeCost,academyGrowthInterval} from './src/game/academy.ts';
import {academyView} from './src/ui/academy-view.ts';
import {MANAGER_COUNTRIES,teamSelectionScreen,managerCreationScreen,managerContractDocument} from './src/ui/onboarding.ts';
import {simulateCalendarDay,careerDate,dateKey,DAY_ACTIVITIES} from './src/game/calendar.ts';
import {teamCalendar} from './src/ui/team-calendar.ts';
import type {ManagerEmail,StaffContract} from './src/types/career.ts';
import {TOURNAMENT_ROUNDS, tournamentRound, tournamentOpponent, tournamentAccess, canPlayTournament} from './src/game/tournaments.ts';
import {NAV_ITEMS} from './src/ui/navigation.ts';
import {appNavigation, homeView} from './src/ui/home-view.ts';
import {marketView,type MarketTab,type MarketFilters} from './src/ui/market-view.ts';
import {genericPortrait,academyPortraitIndex,assignAcademyPortraits} from './src/ui/portraits.ts';
import {ensureTransferMarket,playerSaleValue,buyPlayer,sellPlayer,transferStaff} from './src/game/transfers.ts';
import {buyShopItem,shopBonuses,effectiveStaffQuality,scoutingReportCost,academyTrainingGain} from './src/game/shop.ts';
import {shopView,type ShopFilter} from './src/ui/shop-view.ts';
import {DEMO_WEEKS,demoFinished} from './src/game/progression.ts';
import rawRosterData from './rosters.json';
import rawTeamData from './teams.json';
import rawMapStats from './mapStats.json';
import agentsData from './agents.json';

import type { CareerState, Player, RawPlayer, Team, View } from './src/types/career.ts';
import type { SeriesMap, Veto } from './src/types/game.ts';
const rosterData: Record<string, {logo: string; players: RawPlayer[]}> = rawRosterData;
const mapStats: Record<string, {sample: number; maps: Record<string, number>}> = rawMapStats;
declare global { interface Window { createManager?: string } }

const MAPS = [
  ['Summit','Muros móveis','#d2aeff'],['Corrode','Três rotas','#c9a47b'],
  ['Abyss','Verticalidade','#73b8cd'],['Sunset','Três rotas','#ed9a70'],
  ['Lotus','Três bombsites','#a8bf79'],['Pearl','Controle de meio','#91a9d7'],
  ['Fracture','Ataque dividido','#d29b7c'],['Breeze','Longa distância','#84c9b3'],
  ['Icebox','Verticalidade','#a5d8e7'],['Ascent','Controle de meio','#d6b68b'],
  ['Split','Elevação','#d599ad'],['Haven','Três bombsites','#b4c391'],
  ['Bind','Teletransportes','#d39a76']
].map(([id,type,accent])=>({id,type,accent}));
const MAP_IDS=MAPS.map(m=>m.id);
const ATTACKS=[['default','Padrão'],['fast','Execução rápida'],['split','Divisão de rotas'],['late','Controle lento']];
const DEFENSES=[['default','Padrão'],['aggressive','Pressão inicial'],['retake','Retomada de bombsite'],['hold','Defesa conservadora']];

const TEAMS: Team[] = rawTeamData;
const REGIONS = ['AMERICAS','EMEA','PACIFIC','CHINA'];
const ROLE = ['Duelista','Iniciador','Controlador','Sentinela','Flex'];
const DEMO_MODE=typeof location!=='undefined'&&new URLSearchParams(location.search).get('demo')==='1';
const KEY = DEMO_MODE?'tactical-demo-v1':'tactical-career-v3';
const $ = <T extends HTMLElement = HTMLInputElement>(q: string) => document.querySelector<T>(q)!;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const cash = (n: number) => `$ ${Number(n).toLocaleString('pt-BR')} mil`;
const image = (path: string, label: string, cls='') => path ? `<img class="${cls}" src="${path}" alt="${esc(label)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">` : '';
const logo = (team: Team, cls='') => `<span class="team-emblem ${cls}" style="--club:${team.color}">${image(`/assets/${team.id}.png`, `Escudo ${team.name}`)}<span class="logo-fallback" ${rosterData[team.id]?.logo?'style="display:none"':''}>${team.tag.slice(0,2)}</span></span>`;
const photo = (p: Player, cls='') => {const path=p.id==='loud-erde' ? '/assets/loud-erde.jpg' : p.image ? `/assets/${p.source}-${p.alias.toLowerCase()}.png` : ''; return `<span class="player-photo ${cls}">${image(path, `Foto de ${p.alias}`)}<span class="photo-fallback" ${path?'style="display:none"':''}>${genericPortrait(p.alias,p.portrait)}</span></span>`};
const team = (id: string) => TEAMS.find(t => t.id === id) || TEAMS[0];
const rating = (p: Player) => p.rating;
let state: CareerState | null = null;
let marketTab:MarketTab='players';
let marketFilters:MarketFilters={query:'',role:'',origin:'all'};
let marketFeedback='';
let shopFilter:ShopFilter='all',shopFeedback='';
let mailFolder: 'all'|'general'|'sponsor'|'player'|'transfer'|'streamer'='all', selectedMailId:string|null=null;
let mailQuery='',mailReadingOpen=false;
let startOpen=true;
let introOpen=true;
const MANAGER_AVATARS=['male','woman','cap','glasses','woman-alt'];
let createAvatar='male';
let createCountry='BR';
const MANAGER_BACKGROUNDS=[
  {id:'ex-athlete',name:'Ex-atleta profissional',description:'Conhece a pressão do palco e a rotina competitiva.',advantage:'+3 de moral inicial para o elenco',disadvantage:'Menor orçamento para contratações',money:1150,fans:82000,morale:3,power:0},
  {id:'rookie-coach',name:'Técnico sem títulos',description:'Uma mente tática buscando provar seu valor.',advantage:'+3 de domínio inicial nos mapas',disadvantage:'Elenco começa com menor moral',money:1350,fans:76000,morale:0,power:1},
  {id:'creator',name:'Streamer em transição',description:'Uma comunidade fiel acompanha sua nova jornada.',advantage:'+25.000 fãs e mais receita comercial',disadvantage:'Menos experiência competitiva no elenco',money:1250,fans:107000,morale:0,power:-1}
];
let createBackground='ex-athlete';
const managerAvatar=(id:string)=>{const index=Math.max(0,MANAGER_AVATARS.indexOf(id));return `<span class="manager-avatar-image" style="--portrait-index:${index}" role="img" aria-label="Retrato de manager ${index+1}"></span>`};
function career(): CareerState { if(!state)throw new Error("Nenhuma carreira ativa");return state; }
try {state = JSON.parse(localStorage.getItem(KEY) || 'null')} catch {state=null}
if (state && (!TEAMS.some(t=>t.id===career().team) || !Array.isArray(career().players))) state=null;
let view: View='overview';
let calendarMonth:Date|null=null,calendarSelected='';
let calendarRunning=false,calendarStop=false,calendarFeedback='';
let selected: string | null=null;
let profileOpen=false, createTeam='sen', createStep:'team'|'manager'='team', tacticsMap='Ascent', scoutTeam='', pingType='attack', rankingStat: 'kills' | 'assists' | 'deaths'='kills';
let createRegion=team(createTeam).region;
function makePlayer(source: string, raw: RawPlayer, i: number, reserve=false): Player{
  return {agent:agentsData.find(a=>a.role===ROLE[i%5])?.id||agentsData[0].id,agentMastery:{},stats:{kills:0,deaths:0,assists:0,matches:0},id:`${source}-${raw.alias.toLowerCase()}`,source,alias:raw.alias,real:raw.real,image:raw.image && !raw.image.includes('/img/base/ph/') ? true : false,role:ROLE[i%5],rating:Math.min(94,Math.max(75,team(source).power + [2,1,0,-1,-2][i%5] - (reserve?4:0))),salary:Math.round(65 + team(source).power*1.2 + (4-i%5)*12),number:i+1,energy:90,morale:80};
}
function newState(id: string,manager: string,difficulty: string): CareerState{
  const background=MANAGER_BACKGROUNDS.find(item=>item.id===createBackground)||MANAGER_BACKGROUNDS[0];
  const all=rosterData[id].players.map((p,i)=>({...makePlayer(id,p,i,i>=5),morale:Math.min(100,80+background.morale-(background.id==='rookie-coach'?5:0)),rating:Math.max(70,Math.min(94,makePlayer(id,p,i,i>=5).rating+background.power))}));
  const candidates=TEAMS.filter(t=>t.id!==id).flatMap(t=>rosterData[t.id].players.slice(0,5).map((p,i)=>({...makePlayer(t.id,p,i),price:300+(team(t.id).power-80)*35+(5-i)*32})));
  const market=Array.from({length:Math.min(18,candidates.length)},(_,i)=>candidates[Math.floor(i*candidates.length/Math.min(18,candidates.length))]);
  return {team:id,manager,managerAvatar:createAvatar,managerBackground:background.id,managerContract:{weeksRemaining:28,weeklySalary:background.id==='creator'?55:70},difficulty,week:1,day:1,money:background.money,fans:background.fans,points:0,wins:0,losses:0,players:all,market,kit:'home',focus:'team',trainingMap:'Ascent',mapMastery:Object.fromEntries(MAP_IDS.map(m=>[m,background.id==='rookie-coach'?51:48])),trainingPlayer:all[0].id,captain:all[0].id,tactics:[],activeTactics:{},scoutReports:{},staff:[],academyLevel:1,academyProspects:createAcademyProspects(id,team(id).power),inviteResponses:{},tournamentResults:[],emails:[{id:'welcome-mail',from:'Direção do Clube',address:'direcao@tactical.gg',subject:`Bem-vindo ao ${team(id).name}`,preview:'Sua temporada começa agora.',body:`Olá, ${manager}.\n\nA diretoria deseja uma ótima temporada. Use esta caixa para acompanhar os convites, o elenco, os patrocinadores e o mercado de transferências.\n\nBoa sorte no comando!`,category:'general',week:1,read:false}],log:[{kind:'info',title:'Carreira iniciada',body:`${manager} assumiu o comando da ${team(id).name} como ${background.name}. Contrato inicial: 28 semanas.`}],lastMatch:null};
}
if (!state&&!DEMO_MODE) {
  try {
    const old=JSON.parse(localStorage.getItem('tactical-career-v2') || 'null');
    const id=TEAMS.find(t=>t.name===old?.team)?.id;
    if(id){
      state=newState(id,old.manager||'Manager',old.difficulty==='hard'?'hard':'normal');
      for(const key of ['week','money','fans','points','wins','losses','focus','lastMatch']) if(old[key]!==undefined) Object.assign(state,{[key]:old[key]});
      career().log=[{kind:'info',title:'Carreira atualizada',body:'Seu progresso foi preservado e o elenco recebeu os atletas reais do clube.'},...(old.log||[]).slice(0,8).map((l: {type?: string; title: string; text: string})=>({kind:l.type||'info',title:l.title,body:l.text}))];
      localStorage.setItem(KEY,JSON.stringify(state));
    }
  } catch {}
}
const save = () => localStorage.setItem(KEY, JSON.stringify(state));
function addMail(message:Omit<ManagerEmail,'read'|'week'> & {week?:number}){
  const emails=career().emails ||= [];
  if(emails.some(email=>email.id===message.id))return;
  const {week=career().week,...rest}=message;
  emails.unshift({...rest,week,read:false});
  if(!selectedMailId)selectedMailId=message.id;
}
function mail():string{
  const visible=filterMailMessages(career(),mailFolder,mailQuery);
  const selected=visible.find(email=>email.id===selectedMailId)||visible[0];
  if(selected)selectedMailId=selected.id;
  return mailView(career(),esc,cash,mailFolder,selectedMailId,mailQuery,mailReadingOpen);
}
const starters = () => career().players.slice(0,5);
const avg = () => Math.round(starters().reduce((n,p)=>n+rating(p),0)/5);
const payroll = () => career().players.reduce((n,p)=>n+p.salary,0);
const staffPayroll = () => (career().staff||[]).reduce((n,member)=>n+member.weeklySalary,0);
const staffMember = (role:StaffContract['role']) => {const member=career().staff?.find(person=>person.role===role);return member?{...member,quality:effectiveStaffQuality(career(),member)}:undefined};
const leagueTeams = () => TEAMS.filter(t=>t.region===team(career().team).region);
const opponent = () => tournamentOpponent(career(),TEAMS);
function ensureSystems(){
  career().emails ||= [];
  career().staff ||= [];
  career().day=Number.isInteger(career().day)&&career().day!>=1&&career().day!<=7?career().day:1;
  career().academyLevel ||= 1;
  career().academyProspects ||= createAcademyProspects(career().team,team(career().team).power);
  career().tournamentResults ||= [];
  career().inviteResponses ||= {};
  career().trainingMap=MAP_IDS.includes(career().trainingMap)?career().trainingMap:'Ascent';
  career().mapMastery ||= {};
  for(const map of MAP_IDS) if(!Number.isFinite(career().mapMastery[map])) career().mapMastery[map]=48;
  career().tactics ||= [];
  career().activeTactics ||= {};
  career().scoutReports ||= {};
  career().trainingPlayer=career().players.some(p=>p.id===career().trainingPlayer)?career().trainingPlayer:career().players[0]?.id;
  career().trainingAthletes=(career().trainingAthletes??[career().trainingPlayer]).filter(id=>career().players.some(p=>p.id===id));
  for(const player of career().players){
    player.mapMastery ||= {...career().mapMastery};
    player.stats ||= {kills:0,assists:0,deaths:0,matches:0};
    player.agentMastery ||= {};
    if(!agentsData.some(a=>a.id===player.agent))player.agent=agentsData.find(a=>a.role===player.role)?.id||agentsData[0].id;
    if(!Number.isFinite(player.agentMastery[player.agent]))player.agentMastery[player.agent]=48;
  }
  if(!starters().some(p=>p.id===career().captain)) career().captain=career().players[0]?.id;
  if(!scoutTeam||scoutTeam===career().team)scoutTeam=TEAMS.find(t=>t.id!==career().team)?.id||'';
  const portraitsChanged=assignAcademyPortraits(career().academyProspects!);
  const marketChanged=ensureTransferMarket(career());
  if(portraitsChanged||marketChanged)save();
}
const preferredMaps = (id: string) => {
  const ranked=Object.keys(mapStats[id]?.maps||{}).filter(m=>MAP_IDS.includes(m));
  return [...ranked,...MAP_IDS.filter(m=>!ranked.includes(m))].slice(0,3);
};
const matchMaps = (id: string) => [...new Set([career().trainingMap,...preferredMaps(id),...MAP_IDS])].slice(0,3);
const activeTactic = (map: string) => career().tactics.find(t=>t.id===career().activeTactics[map] && t.map===map);
const TACTIC_FIT: Record<string, [string, string]>={Summit:['split','retake'],Corrode:['late','hold'],Abyss:['fast','aggressive'],Sunset:['split','retake'],Lotus:['split','retake'],Pearl:['late','hold'],Fracture:['fast','aggressive'],Breeze:['late','hold'],Icebox:['late','hold'],Ascent:['late','aggressive'],Split:['split','retake'],Haven:['split','retake'],Bind:['fast','aggressive']};
const tacticBonus = (map: string) => {const tactic=activeTactic(map);if(!tactic)return 0;const [attack,defense]=TACTIC_FIT[map];return 1.5+Number(tactic.attack===attack)+Number(tactic.defense===defense)+Math.min(1.5,(tactic.pings?.length||0)*.3)};
const roleCoverage = () => ['Duelista','Iniciador','Controlador','Sentinela'].filter(r=>starters().some(p=>p.role===r)).length;
function pingEditor(){
  const tactic=activeTactic(tacticsMap),pings=tactic?.pings||[];
  const types=[['attack','↗','Ataque'],['defense','◆','Defesa'],['utility','✦','Utilitário'],['spike','●','Spike']];
  return `<div class="ping-editor"><div class="ping-head"><div><small class="eyebrow">QUADRO TÁTICO</small><h3>${tacticsMap}</h3><p>${tactic?`Plano ativo: ${esc(tactic.name)} · ${pings.length} pings`:'Crie uma tática para marcar posições neste mapa.'}</p></div><span class="tag">PLANTA DO MAPA</span></div><div class="ping-toolbar">${types.map(([id,glyph,label])=>`<button data-ping-type="${id}" class="${pingType===id?'active':''}"><span>${glyph}</span>${label}</button>`).join('')}<input id="ping-label" maxlength="24" placeholder="Nota opcional" aria-label="Nota do ping"></div><div id="tactic-board" class="tactic-board ${tactic?'':'disabled'}" aria-label="Mapa ${tacticsMap} para marcar pings"><img src="/assets/maps/${tacticsMap.toLowerCase()}-plan.png" alt="Planta do mapa ${tacticsMap}">${pings.map(p=>`<button class="map-ping ${p.type}" data-remove-ping="${p.id}" style="left:${p.x}%;top:${p.y}%" title="${esc(p.label||p.type)} · clique para remover">${types.find(t=>t[0]===p.type)?.[1]||'●'}</button>`).join('')}</div><p class="ping-help">${tactic?'Clique na planta para adicionar um ping. Clique em um ping para removê-lo.':'Ative uma tática para começar a marcar a planta.'}</p></div>`;
}
function agentTraining(){
  const player=career().players.find(p=>p.id===career().trainingPlayer)||career().players[0];
  return `<section class="panel agents-panel"><div class="panel-head"><div><small class="eyebrow">DOMÍNIO DE AGENTE</small><h2>Agentes do VALORANT</h2></div><span class="tag">${agentsData.length} AGENTES</span></div><div class="agent-training-head"><label>ATLETA EM TREINAMENTO<select id="training-player">${career().players.map(p=>`<option value="${p.id}" ${p.id===player.id?'selected':''}>${esc(p.alias)} · ${p.role}</option>`).join('')}</select></label><div>${photo(player)}<span><small>AGENTE ATUAL</small><b>${agentOf(player.agent).name}</b><em>Domínio ${player.agentMastery[player.agent]??48}%</em></span></div></div><div class="agent-grid">${agentsData.map(agent=>`<button class="agent-card ${player.agent===agent.id?'active':''}" data-agent-assign="${agent.id}">${agentIcon(agent.id)}<span><b>${agent.name}</b><small>${agent.role}</small></span><strong>${player.agentMastery[agent.id]??48}%</strong></button>`).join('')}</div><div class="data-note">Clique em um agente para atribuí-lo ao atleta escolhido e iniciar treino específico. Complete um minigame para aumentar o domínio com sua pontuação.</div></section>`;
}
function strategy(){
  const top=preferredMaps(scoutTeam),report=career().scoutReports[scoutTeam],sample=mapStats[scoutTeam]?.sample||0;
  const tactics=career().tactics.filter(t=>t.map===tacticsMap);
  return `<div class="page-title"><div><small class="eyebrow">ANÁLISE COMPETITIVA</small><h1>TÁTICAS & <em>OLHEIROS.</em></h1><p>Prepare jogadas por mapa e estude as escolhas dos próximos adversários.</p></div><div class="overall-box"><small>TÁTICAS SALVAS</small><b>${career().tactics.length}</b></div></div><div class="systems-layout"><section class="panel"><div class="panel-head"><div><small class="eyebrow">PLAYBOOK</small><h2>Planos por mapa</h2></div><span class="tag">${tacticsMap.toUpperCase()}</span></div><div class="system-body"><div class="map-tabs">${MAPS.map(m=>`<button data-tactics-map="${m.id}" class="${tacticsMap===m.id?'active':''}">${m.id}</button>`).join('')}</div><form id="tactic-form" class="tactic-form"><label>Nome da tática<input name="name" maxlength="32" required placeholder="Ex.: controle de meio"/></label><label>Ataque<select name="attack">${ATTACKS.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><label>Defesa<select name="defense">${DEFENSES.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><button type="submit" class="primary">CRIAR TÁTICA ↗</button></form><div class="tactics-list">${tactics.length?tactics.map(t=>`<article class="tactic-row ${career().activeTactics[tacticsMap]===t.id?'active':''}"><div><small>${t.map.toUpperCase()}</small><b>${esc(t.name)}</b><span>${ATTACKS.find(a=>a[0]===t.attack)?.[1]} · ${DEFENSES.find(d=>d[0]===t.defense)?.[1]}</span></div><button data-active-tactic="${t.id}" data-map="${t.map}">${career().activeTactics[t.map]===t.id?'ATIVA':'ATIVAR'}</button><button class="tactic-delete" data-delete-tactic="${t.id}" aria-label="Excluir ${esc(t.name)}">×</button></article>`).join(''):'<p class="empty-note">Crie um plano para este mapa. A tática ativa dá vantagem quando ele aparecer na série.</p>'}</div></div></section><section class="panel"><div class="panel-head"><div><small class="eyebrow">INTELIGÊNCIA</small><h2>Relatório de olheiros</h2></div></div><div class="system-body"><label class="system-label">TIME OBSERVADO<select id="scout-team">${scoutOptions()}</select></label><div class="scout-summary">${logo(team(scoutTeam))}<div><b>${team(scoutTeam).name}</b><small>${report?'RELATÓRIO DISPONÍVEL':'AINDA NÃO OBSERVADO'}</small></div></div>${report?`<p class="sample-note">Mapas mais frequentes na amostra de ${sample} mapas dos resultados recentes exibidos pelo VLR.gg.</p><div class="scout-bars">${top.map((m,i)=>{const n=mapStats[scoutTeam].maps[m]||0;return `<div><span><b>${i+1}. ${m}</b><small>${n} ${n===1?'vez':'vezes'}</small></span><i><em style="width:${Math.round(n/Math.max(1,mapStats[scoutTeam].maps[top[0]])*100)}%"></em></i></div>`}).join('')}</div><div class="scout-hint">Relatório disponível para preparar as próximas partidas contra ${team(scoutTeam).name}.</div>`:`<p class="empty-note">Envie um olheiro para revelar os mapas mais jogados por ${team(scoutTeam).name}.</p><button class="primary" data-action="scout" data-id="${scoutTeam}" ${career().money<scoutingReportCost(career())?'disabled':''}>ENVIAR OLHEIRO · ${cash(scoutingReportCost(career()))} ↗</button>`}<div class="source-note">Dados observados em outubro de 2026. A preferência é inferida pela frequência da amostra, não representa uma estatística oficial de toda a temporada.</div></div></section></div>`;
}
function comingSoon(): string {
  const label=NAV_ITEMS.find(item=>item.id===view)?.label??'';
  return `<div class="page-title"><div><small class="eyebrow">${esc(label.toUpperCase())}</small><h1>${esc(label.toUpperCase())}<em>.</em></h1><p>Esta seção está em preparação.</p></div></div>`;
}
function sponsors(): string { return sponsorsView(career(),cash,esc); }
function staff():string{return renderStaff(career(),cash,esc)}
function academy():string{return academyView(career(),cash,esc)}
function shop():string{return shopView(career(),cash,esc,shopFilter,shopFeedback)}
function settingsView():string {
  return `<div class="page-title"><div><small class="eyebrow">PREFERÊNCIAS DA CARREIRA</small><h1>CONFIGURAÇÕES<em>.</em></h1><p>Seu progresso é salvo automaticamente neste navegador.</p></div></div><section class="panel"><div class="panel-head"><h2>Sua carreira</h2></div><div class="system-body"><p>Manager: ${esc(career().manager)} · ${esc(team(career().team).name)}</p><p>Semana ${Math.min(career().week,14)} de 14 · Dificuldade ${career().difficulty==='hard'?'Difícil':'Normal'}</p><button class="primary" data-action="manager-profile">VER PERFIL</button> <button class="watch-match" data-action="main-menu">MENU INICIAL</button> <button class="watch-match" data-action="reset">REINICIAR CARREIRA</button></div></section>`;
}
function homeDialog(title:string,body:string):void {
  const dialog=document.createElement('dialog');dialog.className='home-news-dialog';dialog.setAttribute('aria-label',title);
  dialog.innerHTML=`<h2>${esc(title)}</h2><p>${esc(body)}</p><form method="dialog"><button>FECHAR</button></form>`;
  document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
}
function renderPage(): string {
  const pages: Partial<Record<View, () => string>> = {
    overview, mail, squad:squadView, staff, ranking, market, training, strategy,
    scouting:strategy, competition, sponsors, basecamp:academy, shop, settings:settingsView,
  };
  return (pages[view]??comingSoon)();
}
function render(): void {
  if(startOpen)return renderStart();
  if(introOpen)return renderIntro();
  if (!state) return renderCreate();
  ensureSystems();
  if(view==='squad'&&!career().players.some(p=>p.id===selected))selected=career().players[0].id;
  const page=renderPage();
  $('#app').innerHTML=`<div class="app-shell app-shell-top ${view==='overview'?'home-shell':''}">${appNavigation(view,career(),managerAvatar(career().managerAvatar||'male'))}<main>${view==='overview'?'':`<header class="topbar"><span>CLUBE / <b>${NAV_ITEMS.find(item=>item.id===view)?.label.toUpperCase()}</b></span><div><b class="week">${career().week>14?'● TEMPORADA ENCERRADA':`● DIA ${career().day} / 7 · SEMANA ${String(career().week).padStart(2,'0')} / 14`}</b><button data-action="reset" class="reset">↻ &nbsp;Reiniciar</button></div></header>`}<div class="${view==='overview'?'home-content':'content'}">${page}</div></main></div>`;
  if(view==='strategy')$('.tactics-list')?.insertAdjacentHTML('afterend',pingEditor());
  if(view==='training')$('#lab-agent-assignment')?.insertAdjacentHTML('beforeend',agentTraining());
  document.querySelectorAll<HTMLElement>('[data-view]').forEach(el=>el.onclick=()=>{calendarStop=true;view=el.dataset.view! as View;selected=null;profileOpen=false;render();window.scrollTo(0,0)});
  document.querySelectorAll<HTMLElement>('[data-market-tab]').forEach(el=>el.onclick=()=>{marketTab=el.dataset.marketTab as MarketTab;marketFeedback='';render()});
  document.querySelectorAll<HTMLElement>('[data-shop-filter]').forEach(el=>el.onclick=()=>{shopFilter=el.dataset.shopFilter as ShopFilter;shopFeedback='';render()});
  const marketSearch=$<HTMLInputElement>('#market-search');if(marketSearch)marketSearch.oninput=()=>{
    const cursor=marketSearch.selectionStart;marketFilters.query=marketSearch.value;render();
    const input=$<HTMLInputElement>('#market-search');input.focus({preventScroll:true});if(cursor!==null)try{input.setSelectionRange(cursor,cursor)}catch{}
  };
  const marketRole=$<HTMLSelectElement>('#market-role');if(marketRole)marketRole.onchange=()=>{marketFilters.role=marketRole.value;render()};
  const marketOrigin=$<HTMLSelectElement>('#market-origin');if(marketOrigin)marketOrigin.onchange=()=>{marketFilters.origin=marketOrigin.value as MarketFilters['origin'];render()};
  bindCalendar();
  const simulationDialog=document.querySelector<HTMLDialogElement>('.home-simulation-dialog');if(simulationDialog)simulationDialog.querySelector<HTMLElement>('.home-simulation-body')!.innerHTML=homeSimulation();
  document.querySelectorAll<HTMLElement>('[data-action]').forEach(el=>el.onclick=()=>action(el.dataset.action!,el.dataset.id!));
  const demoFeedback=$<HTMLTextAreaElement>('#demo-feedback');if(demoFeedback)demoFeedback.oninput=()=>{if(career().demo){career().demo!.feedback=demoFeedback.value;save()}};
  document.querySelectorAll<HTMLElement>('[data-mail-folder]').forEach(el=>el.onclick=()=>{mailFolder=el.dataset.mailFolder as typeof mailFolder;selectedMailId=null;mailQuery='';mailReadingOpen=false;render()});
  document.querySelectorAll<HTMLElement>('[data-mail-id]').forEach(el=>el.onclick=()=>{selectedMailId=el.dataset.mailId!;mailReadingOpen=true;const message=career().emails?.find(item=>item.id===selectedMailId);if(message)message.read=true;save();render()});
  const mailSearch=$<HTMLInputElement>('#mail-search');if(mailSearch)mailSearch.oninput=()=>{
    const cursor=mailSearch.selectionStart;mailQuery=mailSearch.value;mailReadingOpen=false;render();
    const input=$<HTMLInputElement>('#mail-search');input.focus({preventScroll:true});if(cursor!==null)input.setSelectionRange(cursor,cursor);
  };
  const mailReadAll=$('[data-mail-read-all]');if(mailReadAll)mailReadAll.onclick=()=>{for(const email of filterMailMessages(career(),mailFolder,mailQuery))email.read=true;save();render()};
  const mailBack=$('[data-mail-back]');if(mailBack)mailBack.onclick=()=>{mailReadingOpen=false;render()};
  document.querySelectorAll<HTMLElement>('[data-player]').forEach(el=>el.onclick=()=>{selected=el.dataset.player!;profileOpen=view==='squad';render()});
  document.querySelectorAll<HTMLElement>('[data-kit]').forEach(el=>el.onclick=()=>{career().kit=el.dataset.kit!;save();render()});
  document.querySelectorAll<HTMLElement>('[data-focus]').forEach(el=>el.onclick=()=>{career().focus=el.dataset.focus!;save();render()});
  document.querySelectorAll<HTMLElement>('[data-train-map]').forEach(el=>el.onclick=()=>{career().trainingMap=el.dataset.trainMap!;career().focus='map';save();render()});
  document.querySelectorAll<HTMLElement>('[data-tactics-map]').forEach(el=>el.onclick=()=>{tacticsMap=el.dataset.tacticsMap!;render()});
  document.querySelectorAll<HTMLElement>('[data-active-tactic]').forEach(el=>el.onclick=()=>{career().activeTactics[el.dataset.map!]=el.dataset.activeTactic!;save();render()});
  document.querySelectorAll<HTMLElement>('[data-delete-tactic]').forEach(el=>el.onclick=()=>{const id=el.dataset.deleteTactic!;career().tactics=career().tactics.filter(t=>t.id!==id);for(const map of MAP_IDS)if(career().activeTactics[map]===id)delete career().activeTactics[map];save();render()});
  const scoutSelect=$('#scout-team');if(scoutSelect)scoutSelect.onchange=e=>{scoutTeam=(e.target as HTMLInputElement).value;render()};
  const roleSelect=$('#player-role');if(roleSelect)roleSelect.onchange=e=>{const player=career().players.find(p=>p.id===selected);if(player&&ROLE.includes((e.target as HTMLInputElement).value)){player.role=(e.target as HTMLInputElement).value;save();render()}};
  const tacticForm=$<HTMLFormElement>('#tactic-form');if(tacticForm)tacticForm.onsubmit=e=>{e.preventDefault();const data=new FormData(tacticForm),name=String(data.get('name')||'').trim();if(!name)return;const tactic={id:`tactic-${Date.now()}`,map:tacticsMap,name:name.slice(0,32),attack:String(data.get('attack')),defense:String(data.get('defense'))};career().tactics.push(tactic);career().activeTactics[tacticsMap]=tactic.id;save();render()};
  document.querySelectorAll<HTMLElement>('[data-close-modal]').forEach(el=>el.onclick=e=>{if(e.target===el){profileOpen=false;render()}});
  document.querySelectorAll<HTMLElement>('[data-ranking]').forEach(el=>el.onclick=()=>{rankingStat=el.dataset.ranking! as 'kills' | 'assists' | 'deaths';render()});
  document.querySelectorAll<HTMLElement>('[data-ping-type]').forEach(el=>el.onclick=()=>{pingType=el.dataset.pingType!;render()});
  document.querySelectorAll<HTMLElement>('[data-remove-ping]').forEach(el=>el.onclick=e=>{e.stopPropagation();const tactic=activeTactic(tacticsMap);if(tactic){tactic.pings=(tactic.pings||[]).filter(p=>p.id!==el.dataset.removePing!);save();render()}});
  const board=$('#tactic-board');if(board)board.onclick=e=>{const tactic=activeTactic(tacticsMap);if(!tactic||(e.target as Element).closest('[data-remove-ping]'))return;const box=board.getBoundingClientRect(),x=Math.max(0,Math.min(100,(e.clientX-box.left)/box.width*100)),y=Math.max(0,Math.min(100,(e.clientY-box.top)/box.height*100));tactic.pings||=[];if(tactic.pings.length>=30)return;const label=($('#ping-label')?.value||'').trim().slice(0,24);tactic.pings.push({id:`ping-${Date.now()}`,type:pingType,label,x:Math.round(x*10)/10,y:Math.round(y*10)/10});save();render()};
  document.querySelectorAll<HTMLInputElement>('[data-trainee]').forEach(el=>el.onchange=()=>{const ids=new Set(career().trainingAthletes??[career().trainingPlayer]);if(el.checked)ids.add(el.dataset.trainee!);else ids.delete(el.dataset.trainee!);career().trainingAthletes=[...ids];save();render()});
  document.querySelectorAll<HTMLElement>('[data-training-kind]').forEach(el=>el.onclick=()=>{career().trainingKind=el.dataset.trainingKind as TrainingKind;save();render()});
  const labMap=$('#lab-map');if(labMap)labMap.onchange=()=>{career().trainingMap=labMap.value;save();render()};
  const launch=$('#launch-training');if(launch)launch.onclick=()=>{const sessionState=career(),ids=sessionState.trainingAthletes??[sessionState.trainingPlayer],targets=sessionState.players.filter(p=>ids.includes(p.id)).map(p=>({playerId:p.id,agentId:p.agent}));if(!beginTraining(sessionState,ids))return;save();render();openTrainingSession(sessionState.trainingKind??'aim',targets,sessionState.trainingMap,MAP_IDS,result=>{if(state!==sessionState)return [];const rewards=rewardTraining(sessionState,result);save();render();return rewards;});};
  const trainingPlayerSelect=$('#training-player');if(trainingPlayerSelect)trainingPlayerSelect.onchange=e=>{career().trainingPlayer=(e.target as HTMLInputElement).value;save();render()};
  document.querySelectorAll<HTMLElement>('[data-agent-assign]').forEach(el=>el.onclick=()=>{const player=career().players.find(p=>p.id===career().trainingPlayer);const agent=agentsData.find(a=>a.id===el.dataset.agentAssign!);if(player&&agent){player.agent=agent.id;player.agentMastery[agent.id]??=48;career().focus='agent';save();render()}});
  const playerAgentSelect=$('#player-agent');if(playerAgentSelect)playerAgentSelect.onchange=e=>{const player=career().players.find(p=>p.id===selected);const agent=agentsData.find(a=>a.id===(e.target as HTMLInputElement).value);if(player&&agent){player.agent=agent.id;player.agentMastery[agent.id]??=48;save();render()}};
  document.onkeydown=e=>{if(e.key==='Escape'&&profileOpen){profileOpen=false;render()}};
  const numberInput=$('#shirt-number'); if(numberInput) numberInput.onchange=e=>{const p=career().players.find(x=>x.id===selected),n=Number((e.target as HTMLInputElement).value);if(p&&Number.isInteger(n)&&n>=1&&n<=99&&!career().players.some(x=>x!==p&&x.number===n)){p.number=n;save();render()}else{(e.target as HTMLInputElement).value=String(p?.number??'');alert('Escolha um número entre 1 e 99 que não esteja em uso.')}};
  $('.sidebar .nav-link.active')?.scrollIntoView({block:'nearest',inline:'nearest'});
}
function renderStart(): void {
  $('#app').innerHTML=`<section class="intro-screen" aria-label="Menu inicial"><div class="intro-shade" aria-hidden="true"></div><div class="intro-grid" aria-hidden="true"></div><header class="intro-top"><div class="intro-brand"><span class="intro-mark" aria-hidden="true">V</span><h1>VAVA<em>MANAGER</em></h1></div></header><div class="intro-rail" aria-hidden="true"><i></i><span>◆</span><i></i></div><nav class="intro-menu" aria-label="Iniciar jogo"><p class="intro-kicker">${DEMO_MODE?'DEMO / 4 PARTIDAS · TODOS OS MENUS':'VCT / TEMPORADA 2026'}</p><button type="button" class="intro-start" data-start-menu><span>START</span><b aria-hidden="true">→</b></button>${DEMO_MODE?'<button type="button" class="intro-option" data-open-career><i aria-hidden="true">↗</i><span>CARREIRA COMPLETA</span></button>':'<button type="button" class="intro-option" data-open-demo><i aria-hidden="true">◇</i><span>JOGAR DEMO</span><small>4 PARTIDAS</small></button>'}${([{view:"overview",label:DEMO_MODE?"CONTINUAR DEMO":"CONTINUAR CARREIRA",icon:"▷"},{view:"ranking",label:"STATS",icon:"▤"},{view:"squad",label:"TIME",icon:"▦"},{view:"settings",label:"CONFIGURAÇÕES",icon:"⚙"}] as const).map(item=>`<button type="button" class="intro-option" data-start-view="${item.view}" ${state?"":"disabled"}><i aria-hidden="true">${item.icon}</i><span>${item.label}</span></button>`).join("")}</nav><span class="intro-side-label" aria-hidden="true">VALORANT / MANAGER</span><footer class="intro-footer"><span aria-hidden="true"></span><small>ASSUMA O COMANDO.</small><b>VCT 2026<br>VAVA MANAGER</b></footer></section>`;
  $('[data-start-menu]').onclick=()=>{startOpen=false;introOpen=false;view='overview';if(!state)createStep='team';render();window.scrollTo(0,0)};
  const modeButton=$('[data-open-demo]');if(modeButton)modeButton.onclick=()=>{const url=new URL(location.href);url.hash='';url.searchParams.set('demo','1');location.href=url.href};
  const fullButton=$('[data-open-career]');if(fullButton)fullButton.onclick=()=>{const url=new URL(location.href);url.hash='';url.searchParams.delete('demo');location.href=url.href};
  document.querySelectorAll<HTMLButtonElement>('[data-start-view]').forEach(button=>button.onclick=()=>{
    if(!state)return;
    startOpen=false;introOpen=false;view=button.dataset.startView as View;
    render();window.scrollTo(0,0);
  });
}
function renderIntro(): void {
  if(!state){startOpen=true;return renderStart()}
  if(state)ensureSystems();
  const own=team(state?.team||createTeam);
  const portraits=(state?.players.slice(0,3)||rosterData[own.id].players.slice(0,3).map((raw,i)=>makePlayer(own.id,raw,i))).map(player=>photo(player)).join('');
  $('#app').innerHTML=`<div class="app-shell app-shell-top home-shell">${appNavigation('overview',state,state?managerAvatar(state.managerAvatar||'male'):'')}<main><div class="home-content">${homeView({state,own,rival:state?opponent():team('loud'),badge:logo,portraits,canPlay:state?canPlayToday():false,played:state?hasPlayedThisWeek():false})}</div></main></div>`;
  const openCareer=()=>{introOpen=false;if(state){view='overview';render()}else{createStep='team';renderCreate()}window.scrollTo(0,0)};
  document.querySelectorAll<HTMLElement>('[data-home-start]').forEach(el=>el.onclick=openCareer);
  document.querySelectorAll<HTMLElement>('[data-view]').forEach(el=>el.onclick=()=>{introOpen=false;if(state){view=el.dataset.view as View;render()}else{createStep='team';renderCreate()}window.scrollTo(0,0)});
  document.querySelectorAll<HTMLElement>('[data-action]').forEach(el=>el.onclick=()=>{introOpen=false;if(el.dataset.action==='advance-day'){view='overview';render();return}action(el.dataset.action!)});
}
function selectCreateRegion(region: string): void {
  if(!REGIONS.includes(region))return;
  createRegion=region;
  if(team(createTeam).region!==region)createTeam=TEAMS.find(t=>t.region===region)!.id;
}
function scoutOptions(): string {
  return REGIONS.map(region=>`<optgroup label="VCT ${region}">${TEAMS.filter(t=>t.region===region&&t.id!==career().team).map(t=>`<option value="${t.id}" ${scoutTeam===t.id?'selected':''}>${t.name}</option>`).join('')}</optgroup>`).join('');
}
function renderCreate():void{
  const club=team(createTeam);
  if(createStep==='team'){
    const roster=rosterData[club.id]?.players??[];
    const players=roster.slice(0,5).map((raw,index)=>makePlayer(club.id,raw,index));
    $('#app').innerHTML=teamSelectionScreen({
      regions:REGIONS,region:createRegion,clubs:TEAMS.map(item=>({club:item,badge:logo(item)})),
      selected:club,badge:logo(club),rosterCount:roster.length,
      overall:players.length?Math.round(players.reduce((sum,player)=>sum+player.rating,0)/players.length):club.power,
      players:players.map(player=>({alias:player.alias,role:player.role,rating:player.rating,portrait:photo(player)})),
    });
    document.querySelectorAll<HTMLElement>('[data-create-region]').forEach(el=>el.onclick=()=>{selectCreateRegion(el.dataset.createRegion!);refreshCreate(`[data-create-region="${createRegion}"]`)});
    document.querySelectorAll<HTMLElement>('[data-create-team]').forEach(el=>el.onclick=()=>{createTeam=el.dataset.createTeam!;refreshCreate(`[data-create-team="${createTeam}"]`)});
    $('#select-team').onclick=()=>{createStep='manager';renderCreate();window.scrollTo(0,0)};
  }else{
    const origin=MANAGER_BACKGROUNDS.find(item=>item.id===createBackground)||MANAGER_BACKGROUNDS[0];
    $('#app').innerHTML=managerCreationScreen({
      club,badge:logo(club),name:window.createManager||'',country:createCountry,
      portrait:managerAvatar(createAvatar),avatar:createAvatar,
      avatars:MANAGER_AVATARS.map(id=>({id,portrait:managerAvatar(id)})),
      background:createBackground,origins:MANAGER_BACKGROUNDS,
      salary:cash(origin.id==='creator'?55:70),budget:cash(origin.money),
    });
    $('#manager-name').oninput=e=>{
      window.createManager=(e.target as HTMLInputElement).value;
      $('#manager-card-name').textContent=window.createManager||'Seu nome aqui';
      $('#create-error').textContent='';$('#manager-name').removeAttribute('aria-invalid');
    };
    $('#manager-country').onchange=e=>{
      createCountry=(e.target as HTMLSelectElement).value;
      const country=MANAGER_COUNTRIES.find(item=>item.code===createCountry)!;
      $('#manager-card-country').innerHTML=`<span>${country.code}</span>${country.name}`;
    };
    $('#back-to-teams').onclick=()=>{createStep='team';renderCreate();window.scrollTo(0,0)};
    document.querySelectorAll<HTMLElement>('[data-avatar]').forEach(el=>el.onclick=()=>{createAvatar=el.dataset.avatar!;refreshCreate(`[data-avatar="${createAvatar}"]`)});
    document.querySelectorAll<HTMLElement>('[data-background]').forEach(el=>el.onclick=()=>{createBackground=el.dataset.background!;refreshCreate(`[data-background="${createBackground}"]`)});
    $('#random-name').onclick=()=>{
      const names=['Pedro','Alex','Gabriel','Rafael','Lucas'];const name=names[Math.floor(Math.random()*names.length)];
      $('#manager-name').value=name;$('#manager-name').dispatchEvent(new Event('input',{bubbles:true}));
    };
    $<HTMLFormElement>('#manager-create-form').onsubmit=e=>{
      e.preventDefault();const name=$('#manager-name').value.trim();
      if(!name){$('#create-error').textContent='Digite o nome do manager para iniciar.';$('#manager-name').setAttribute('aria-invalid','true');$('#manager-name').focus();return}
      openManagerContract(name);
    };
  }
  $('[data-create-home]').onclick=()=>{startOpen=true;introOpen=true;render();window.scrollTo(0,0)};
}
function refreshCreate(focusSelector:string):void{
  const scrollY=window.scrollY;renderCreate();
  $(focusSelector)?.focus({preventScroll:true});window.scrollTo(0,scrollY);
}
function openManagerContract(name:string):void{
  if(document.querySelector('.manager-sign-dialog'))return;
  const club=team(createTeam),origin=MANAGER_BACKGROUNDS.find(item=>item.id===createBackground)||MANAGER_BACKGROUNDS[0];
  const dialog=document.createElement('dialog');dialog.className='manager-sign-dialog';
  dialog.setAttribute('aria-labelledby','contract-title');
  dialog.innerHTML=managerContractDocument({club,name,origin:origin.name,salary:cash(origin.id==='creator'?55:70),budget:cash(origin.money),badge:logo(club)});
  document.body.append(dialog);dialog.showModal();
  let signing=false;
  dialog.addEventListener('cancel',event=>{if(signing)event.preventDefault()});
  dialog.addEventListener('close',()=>{dialog.remove();$('#start')?.focus({preventScroll:true})});
  dialog.querySelector<HTMLButtonElement>('[data-contract-back]')!.onclick=()=>dialog.close();
  const sign=dialog.querySelector<HTMLButtonElement>('[data-contract-sign]')!;
  sign.onclick=()=>{
    if(signing)return;signing=true;sign.disabled=true;
    dialog.querySelector<HTMLButtonElement>('[data-contract-back]')!.disabled=true;
    dialog.classList.add('contract-signing');sign.textContent='ASSINANDO...';
    dialog.querySelector<HTMLElement>('.signing-status')!.textContent='Registrando sua assinatura...';
    const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?300:2400;
    window.setTimeout(()=>{
      state=newState(club.id,name,'normal');state.managerNationality=createCountry;
      state.managerContract!.signedAt='2026-01-01';
      if(DEMO_MODE){state.demo={version:1};state.inviteResponses={tixinha:'accepted',homeground:'accepted'}}
      const welcome=state.emails!.find(message=>message.id==='welcome-mail')!;
      welcome.from=`Diretoria · ${club.name}`;welcome.address=`diretoria@${club.tag.toLowerCase()}.vava.game`;
      welcome.subject=`Bem-vindo à sua nova casa, ${name}!`;
      welcome.preview='Contrato assinado. Estamos felizes em ter você no comando.';
      welcome.body=`Olá, ${name}.\n\nSeja bem-vindo ao ${club.name}! É um prazer confirmar sua chegada como nosso manager principal. Seu contrato está assinado e estamos animados com o que vamos construir juntos.\n\nSeu vínculo é de 28 semanas, com remuneração semanal de ${cash(origin.id==='creator'?55:70)}. Disponibilizamos ${cash(origin.money)} para a gestão do clube.\n\nConhecemos sua trajetória de ${origin.name.toLowerCase()} e confiamos na sua capacidade de liderar este projeto. Nosso primeiro objetivo é preparar o elenco para os convites de pré-temporada e o circuito regional. Confira o calendário, conheça os atletas e organize sua comissão.\n\nVamos acompanhar a evolução da equipe e apoiar suas decisões. Esta caixa de email será nosso canal para novidades, propostas e assuntos do clube.\n\nBoa sorte nesta nova etapa. A casa é sua!\n\nDiretoria do ${club.name}`;
      save();dialog.close();introOpen=false;view='overview';render();window.scrollTo(0,0);
    },duration);
  };
}
function overview(){
  const own=team(career().team);
  return homeView({state:career(),own,rival:opponent(),badge:logo,portraits:starters().slice(0,3).map(player=>photo(player)).join(''),calendar:homeCalendar(),running:calendarRunning,feedback:calendarFeedback,canPlay:canPlayToday(),played:hasPlayedThisWeek()});
}
const agentOf = (id: string) => agentsData.find(a=>a.id===id) || agentsData[0];
const agentIcon = (id: string,cls='') => `<img class="${cls}" src="/assets/agents/${agentOf(id).id}.png" alt="${esc(agentOf(id).name)}" loading="lazy">`;
function playerModal(p: Player){
  const agent=agentOf(p.agent),isStarter=career().players.indexOf(p)<5;
  return `<div class="profile-overlay" data-close-modal><section class="profile-modal" role="dialog" aria-modal="true" aria-label="Perfil de ${esc(p.alias)}"><button class="modal-close" data-action="close-profile" aria-label="Fechar perfil">×</button><div class="profile-hero" style="--club:${team(p.source).color}">${photo(p)}<div><small>${team(p.source).tag} · ${p.role.toUpperCase()}</small><h2>${esc(p.alias)}</h2><p>${esc(p.real)}</p><span class="profile-overall">OVR <b>${p.rating}</b></span></div></div><div class="profile-content"><div class="detail-stats"><div><small>ENERGIA</small><b>${p.energy}%</b></div><div><small>MORAL</small><b>${p.morale}%</b></div><div><small>SALÁRIO / SEM.</small><b>${cash(p.salary)}</b></div></div><div class="profile-fields"><label>FUNÇÃO<select id="player-role" class="role-select">${ROLE.map(role=>`<option value="${role}" ${p.role===role?'selected':''}>${role}</option>`).join('')}</select></label><label>NÚMERO DA CAMISA<input id="shirt-number" type="number" min="1" max="99" value="${p.number}"></label></div><div class="agent-assignment">${agentIcon(agent.id)}<div><small>AGENTE ATRIBUÍDO</small><b>${agent.name}</b><span>Domínio ${p.agentMastery?.[agent.id]??48}%</span></div></div><label class="agent-select-label">TROCAR AGENTE<select id="player-agent" class="role-select">${agentsData.map(a=>`<option value="${a.id}" ${p.agent===a.id?'selected':''}>${a.name} · ${a.role}</option>`).join('')}</select></label><div class="profile-actions">${career().captain===p.id?'<span class="captain-badge">★ CAPITÃO</span>':isStarter?`<button data-action="captain" data-id="${p.id}">DEFINIR CAPITÃO</button>`:''}${!isStarter?`<button data-action="start" data-id="${p.id}">ESCALAR TITULAR</button>`:career().players.length>5?`<button data-action="bench" data-id="${p.id}">MOVER PARA RESERVA</button>`:''}<button data-action="sell-player" data-id="${p.id}" ${career().players.length<=5?'disabled':''}>VENDER · ${cash(playerSaleValue(p))}</button><button data-action="train-agent" data-id="${p.id}">TREINAR AGENTE ↗</button></div></div></section></div>`;
}
function squadView(){
  const t=team(career().team),p=career().players.find(x=>x.id===selected)||career().players[0];
  return `<div class="page-title"><div><small class="eyebrow">GESTÃO DE ELENCO / VCT 2026</small><h1>TEAM <em>MANAGER.</em></h1><p>Os cinco titulares ficam lado a lado. Clique em um atleta para abrir seu perfil.</p></div><div class="overall-box"><small>OVERALL DO TIME</small><b>${avg()}</b><span>5 TITULARES</span></div></div><section class="panel lineup-panel lineup-wide"><div class="panel-head"><div><small class="eyebrow">PALCO VCT</small><h2>Escalação principal</h2></div><span class="tag">CAPITÃO: ${esc(career().players.find(x=>x.id===career().captain)?.alias||'—').toUpperCase()}</span></div><div class="arena-stage" style="--club:${t.color}"><div class="arena-header"><span class="live-indicator">● AO VIVO</span><span>VCT 2026 / ESTAÇÕES DE JOGO</span><span>BO3</span></div><div class="arena-light"></div><div class="station-row">${starters().map((pl,i)=>`<button class="station" data-player="${pl.id}"><span class="station-number">ESTAÇÃO ${String(i+1).padStart(2,'0')}</span><span class="station-monitor"><span class="monitor-screen">${logo(t)}<i>TACTICAL</i></span><span class="monitor-neck"></span><span class="monitor-base"></span></span><span class="station-player">${photo(pl)}<span class="station-headset"></span></span><span class="station-desk"><span class="station-keyboard"></span><span class="station-mouse"></span></span><span class="station-name"><b>${career().captain===pl.id?'★ ':''}${esc(pl.alias)}</b><small>${pl.role.toUpperCase()} · ${agentOf(pl.agent).name}</small></span><span class="station-rating">${pl.rating}<small>OVR</small></span></button>`).join('')}</div><div class="arena-footer">${logo(t)}<span>${t.name.toUpperCase()}</span><strong>●</strong><small>CLIQUE PARA GERENCIAR</small></div></div><div class="bench"><div><small class="eyebrow">BANCO DE RESERVAS</small><b>${Math.max(0,career().players.length-5)} atletas</b></div><div class="bench-list">${career().players.slice(5).length?career().players.slice(5).map(pl=>`<button class="bench-player" data-player="${pl.id}">${photo(pl)}<span><b>${esc(pl.alias)}</b><small>${pl.role} · ${agentOf(pl.agent).name}</small></span><strong>${pl.rating}</strong></button>`).join(''):'<p>Sem reservas. Contrate jogadores no Mercado.</p>'}</div></div></section><div class="squad-lower"><section class="panel roster-panel"><div class="panel-head"><div><small class="eyebrow">PLANEJAMENTO</small><h2>Elenco completo <span>(${career().players.length})</span></h2></div><span class="tag">FOLHA ${cash(payroll())} / SEM.</span></div><div class="table-wrap"><table><thead><tr><th>ATLETA</th><th>FUNÇÃO</th><th>AGENTE</th><th>CAMISA</th><th>OVR</th><th>K / A / D</th><th>STATUS</th></tr></thead><tbody>${career().players.map((pl,i)=>`<tr data-player="${pl.id}"><td>${photo(pl)}<span><b>${esc(pl.alias)} ${career().captain===pl.id?'★':''}</b><small>${esc(pl.real)}</small></span></td><td>${pl.role}</td><td>${agentOf(pl.agent).name}</td><td>#${String(pl.number).padStart(2,'0')}</td><td><strong>${pl.rating}</strong></td><td>${pl.stats.kills} / ${pl.stats.assists} / ${pl.stats.deaths}</td><td><span class="status ${i<5?'starter':''}">${i<5?'TITULAR':'RESERVA'}</span></td></tr>`).join('')}</tbody></table></div></section><section class="panel kit-panel"><div class="panel-head"><div><small class="eyebrow">IDENTIDADE DO CLUBE</small><h2>Uniforme</h2></div></div><div class="kit-body"><div class="jersey ${career().kit==='away'?'away':''}" style="--shirt:${career().kit==='away'?t.secondary:t.color};--trim:${career().kit==='away'?t.color:t.secondary}"><div class="jersey-sleeve left"></div><div class="jersey-sleeve right"></div><div class="jersey-body"><span class="jersey-collar"></span>${logo(t)}${career().equippedSponsorItem?`<span class="jersey-sponsor-item" title="${esc(BRANDS.find(b=>b.id===career().equippedSponsorItem)?.item.name||'')}">${esc(BRANDS.find(b=>b.id===career().equippedSponsorItem)?.item.icon||'')}</span>`:''}<b>${t.tag}</b><strong>${p.number}</strong></div></div><div class="kit-options"><button data-kit="home" class="${career().kit==='home'?'active':''}"><i style="background:${t.color}"></i> PRINCIPAL</button><button data-kit="away" class="${career().kit==='away'?'active':''}"><i style="background:${t.secondary}"></i> RESERVA</button><small>Visual conceitual com cores do clube.</small></div></div></section></div>${profileOpen?playerModal(p):''}`;
}
function ranking(){
  const sorted=[...career().players].sort((a,b)=>b.stats[rankingStat]-a.stats[rankingStat]||b.rating-a.rating);
  const labels={kills:'ABATES',assists:'ASSISTÊNCIAS',deaths:'MORTES'};
  return `<div class="page-title"><div><small class="eyebrow">NÚMEROS DA TEMPORADA</small><h1>RANKING DE <em>ATLETAS.</em></h1><p>Estatísticas simuladas das partidas da sua carreira.</p></div><div class="overall-box"><small>SÉRIES JOGADAS</small><b>${career().wins+career().losses}</b></div></div><div class="ranking-tabs">${Object.entries(labels).map(([key,label])=>`<button data-ranking="${key}" class="${rankingStat===key?'active':''}">${label}</button>`).join('')}</div><div class="ranking-podium">${sorted.slice(0,3).map((p,i)=>`<article><span>${String(i+1).padStart(2,'0')}</span>${photo(p)}<b>${esc(p.alias)}</b><small>${p.role} · ${agentOf(p.agent).name}</small><strong>${p.stats[rankingStat]}</strong><em>${labels[rankingStat]}</em></article>`).join('')}</div><section class="panel"><div class="panel-head"><h2>Classificação do elenco</h2><span class="tag">CARREIRA 2026</span></div><div class="table-wrap"><table><thead><tr><th>#</th><th>ATLETA</th><th>MAPAS</th><th>ABATES</th><th>ASSISTÊNCIAS</th><th>MORTES</th><th>K/D</th></tr></thead><tbody>${sorted.map((p,i)=>`<tr><td>${String(i+1).padStart(2,'0')}</td><td>${photo(p)}<span><b>${esc(p.alias)}</b><small>${p.role}</small></span></td><td>${p.stats.maps||0}</td><td><strong>${p.stats.kills}</strong></td><td>${p.stats.assists}</td><td>${p.stats.deaths}</td><td>${p.stats.deaths?(p.stats.kills/p.stats.deaths).toFixed(2):'—'}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function market(){
  return marketView(career(),{tab:marketTab,filters:marketFilters,feedback:marketFeedback,cash,escape:esc,photo,clubName:id=>team(id).name});
}
function training(){return trainingHub(career(),MAPS,esc)}
function tournamentActions(){
  if(demoFinished(career()))return '<span class="tag">DEMO CONCLUÍDA · 4 PARTIDAS</span><button class="primary" data-view="overview">VER BALANÇO →</button>';
  if(career().week>14)return '<span class="tag">TEMPORADA ENCERRADA</span>';
  const access=tournamentAccess(career(),tournamentRound(career().week));
  const day=career().day||1;
  if(access==='invite')return '<div class="tournament-actions"><button class="primary" data-action="accept-invite">ACEITAR CONVITE ↗</button><button class="watch-match" data-action="decline-invite">RECUSAR</button></div>';
  if(day<7)return `<button class="primary" data-action="advance-day">SIMULAR DIA ${day+1} ↗</button>`;
  if(canPlayToday())return '<div class="tournament-actions"><button class="primary" data-action="simulate">JOGAR PARTIDA ↗</button><button class="watch-match" data-action="watch">▷ ASSISTIR PARTIDA</button></div>';
  return '<button class="primary" data-action="advance-day">AVANÇAR PARA A PRÓXIMA SEMANA ↗</button>';
}
function hasPlayedThisWeek(){return (career().tournamentResults||[]).some(result=>result.week===career().week)}
function canPlayToday(){return !demoFinished(career())&&career().week<=(career().demo?DEMO_WEEKS:14)&&career().day===7&&canPlayTournament(career())&&!hasPlayedThisWeek()}
function canAdvanceDay(){const day=career().day||1;if(career().week>14||demoFinished(career()))return false;if(day<7)return true;const access=tournamentAccess(career(),tournamentRound(career().week));return access!=='invite'&&(!canPlayTournament(career())||hasPlayedThisWeek())}
function homeCalendar(){
  const day=career().day||1,date=careerDate(career().week,day);
  calendarMonth ||= new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1));
  calendarSelected ||= dateKey(date);
  return `<button class="open-simulation" data-action="open-simulation">SIMULAR SEMANA</button><button class="open-team-calendar" data-action="open-calendar"><span>▦</span><span><b>Calendário do time</b><small>Confira jogos, convites e resultados</small></span><i>ABRIR AGENDA →</i></button>`;
}
function homeSimulation(){
  const day=career().day||1,date=careerDate(career().week,day),access=tournamentAccess(career(),tournamentRound(career().week));
  return `<section class="day-calendar ${calendarRunning?'simulating':''}"><div class="day-calendar-head"><div><small class="eyebrow">CENTRAL DE SIMULAÇÃO</small><h2>${esc(date.toLocaleDateString('pt-BR',{day:'numeric',month:'long',timeZone:'UTC'}))} <span>·</span> Semana ${Math.min(career().week,14)}</h2><p>${career().week>14?'Temporada concluída':DAY_ACTIVITIES[day-1]}</p></div><div class="simulation-indicator"><i></i>${calendarRunning?'SIMULANDO':'AO VIVO'}</div></div><div class="calendar-track"><span style="width:${(day-1)/6*100}%"></span></div><div class="calendar-days">${DAY_ACTIVITIES.map((activity,index)=>{const d=careerDate(career().week,index+1);return `<div class="calendar-day ${index+1===day?'current':index+1<day?'passed':''} ${index===6?'match-day':''}"><small>${['SEG','TER','QUA','QUI','SEX','SÁB','DOM'][index]}</small><b>${String(d.getUTCDate()).padStart(2,'0')}</b><i>${activity}</i></div>`}).join('')}</div><div class="simulation-feedback" role="status" aria-live="polite">${esc(calendarFeedback||(access==='invite'?'Convite recebido: confirme sua participação para seguir.':canPlayToday()?'Dia de jogo! Dispute a série para continuar.':'Prepare o elenco. Cada dia faz parte da sua temporada.'))}</div><div class="calendar-footer"><span><b>${calendarRunning?'Avançando a agenda do clube':canPlayToday()?'Sua equipe entra em campo hoje':'Você controla o ritmo'}</b><small>O avanço pausa antes dos jogos e nos novos convites.</small></span><div class="simulation-controls">${calendarRunning?'<button class="primary" data-action="stop-calendar">PAUSAR SIMULAÇÃO</button>':career().week>14?'<span class="tag">TEMPORADA ENCERRADA</span>':`${tournamentActions()}${canAdvanceDay()&&access!=='invite'?'<button class="simulate-week" data-action="advance-week">SIMULAR SEMANA »</button>':''}`}</div></div></section>`;
}
function bindCalendar(){
  const dialog=document.querySelector<HTMLDialogElement>('.team-calendar-dialog');if(!dialog)return;
  dialog.querySelectorAll<HTMLElement>('[data-calendar-month]').forEach(el=>el.onclick=()=>{const current=calendarMonth||careerDate(career().week);calendarMonth=new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth()+Number(el.dataset.calendarMonth),1));refreshCalendarModal(el.dataset.calendarMonth==='-1'?'[data-calendar-month="-1"]':'[data-calendar-month="1"]')});
  dialog.querySelectorAll<HTMLElement>('[data-calendar-date]').forEach(el=>el.onclick=()=>{calendarSelected=el.dataset.calendarDate!;refreshCalendarModal(`[data-calendar-date="${calendarSelected}"]`)});
  const today=dialog.querySelector<HTMLElement>('[data-calendar-today]');if(today)today.onclick=()=>{calendarMonth=null;calendarSelected='';refreshCalendarModal('[data-calendar-today]')};
  dialog.querySelectorAll<HTMLElement>('[data-view]').forEach(el=>el.onclick=()=>{dialog.close();calendarStop=true;view=el.dataset.view! as View;render()});
}
function refreshCalendarModal(focusSelector?:string){
  const dialog=document.querySelector<HTMLDialogElement>('.team-calendar-dialog');if(!dialog)return;
  const date=careerDate(career().week,career().day||1);
  calendarMonth ||= new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1));calendarSelected ||= dateKey(date);
  dialog.querySelector<HTMLElement>('.calendar-modal-content')!.innerHTML=teamCalendar(career(),TEAMS,calendarMonth,calendarSelected,esc);
  bindCalendar();if(focusSelector)dialog.querySelector<HTMLElement>(focusSelector)?.focus({preventScroll:true});
}
function openCalendarModal(){
  if(document.querySelector('.team-calendar-dialog'))return;
  const trigger=document.activeElement as HTMLElement|null;
  const dialog=document.createElement('dialog');dialog.className='team-calendar-dialog';dialog.setAttribute('aria-label','Calendário de jogos do time');
  dialog.innerHTML='<div class="calendar-modal-bar"><span>AGENDA DO CLUBE</span><button type="button" data-close-calendar aria-label="Fechar calendário">×</button></div><div class="calendar-modal-content"></div>';
  document.body.append(dialog);refreshCalendarModal();
  dialog.querySelector<HTMLElement>('[data-close-calendar]')!.onclick=()=>dialog.close();
  dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close()}});
  const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;dialog.remove();if(trigger?.isConnected)trigger.focus({preventScroll:true})},{once:true});
  dialog.showModal();
}
function refreshSimulation(){
  if(view==='overview'&&!introOpen){
    $('.home-content').innerHTML=overview();
    bindHomeControls($('.home-content'));
  }else render();
  const dialog=document.querySelector<HTMLDialogElement>('.home-simulation-dialog');
  if(dialog){dialog.querySelector<HTMLElement>('.home-simulation-body')!.innerHTML=homeSimulation();bindHomeControls(dialog)}
  refreshCalendarModal();
}
function bindHomeControls(root:ParentNode){
  root.querySelectorAll<HTMLElement>('[data-view]').forEach(el=>el.onclick=()=>{
    document.querySelector<HTMLDialogElement>('.home-simulation-dialog')?.close();
    calendarStop=true;introOpen=false;view=el.dataset.view! as View;selected=null;profileOpen=false;render();
  });
  root.querySelectorAll<HTMLElement>('[data-action]').forEach(el=>el.onclick=()=>action(el.dataset.action!,el.dataset.id!));
}
function openSimulationModal(){
  if(document.querySelector('.home-simulation-dialog'))return;
  const trigger=document.activeElement as HTMLElement|null,dialog=document.createElement('dialog');
  dialog.className='home-simulation-dialog';dialog.setAttribute('aria-label','Simulação da temporada');
  dialog.innerHTML=`<div class="calendar-modal-bar"><span>CENTRAL DE SIMULAÇÃO</span><button type="button" data-close-simulation aria-label="Fechar simulação">×</button></div><div class="home-simulation-body">${homeSimulation()}</div>`;
  document.body.append(dialog);bindHomeControls(dialog);
  dialog.querySelector<HTMLElement>('[data-close-simulation]')!.onclick=()=>dialog.close();
  dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close()}});
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  dialog.addEventListener('close',()=>{calendarStop=true;document.body.style.overflow=overflow;dialog.remove();if(trigger?.isConnected)trigger.focus({preventScroll:true})},{once:true});
  dialog.showModal();
}
async function runCalendar(weekly:boolean){
  if(calendarRunning||!canAdvanceDay()||tournamentAccess(career(),tournamentRound(career().week))==='invite')return;
  const current=career();calendarRunning=true;calendarStop=false;calendarFeedback='Atualizando os compromissos do clube...';
  const delay=matchMedia('(prefers-reduced-motion: reduce)').matches?80:700;
  try{
    for(let step=0;step<(weekly?7:1);step++){
      refreshSimulation();
      await new Promise(resolve=>setTimeout(resolve,delay));
      if(calendarStop||state!==current||!canAdvanceDay())break;
      if(tournamentAccess(current,tournamentRound(current.week))==='invite')break;
      const day=current.day||1;
      if(day<7){current.day=day+1;calendarFeedback=simulateCalendarDay(current,day+1,current.trainingMap);current.log.unshift({kind:'info',title:`Dia ${day+1} da semana ${current.week}`,body:calendarFeedback})}
      else{advanceCalendarWeek();calendarFeedback='Semana atualizada. Confira a nova etapa e os compromissos do clube.'}
      calendarMonth=null;calendarSelected='';ensureSystems();save();
      if(current.week>14||canPlayToday()||tournamentAccess(current,tournamentRound(current.week))==='invite')break;
    }
  }finally{
    calendarRunning=false;
    if(state===current){if(canPlayToday())calendarFeedback='Simulação pausada: é dia de jogo. Sua série está pronta!';else if(current.week<=14&&tournamentAccess(current,tournamentRound(current.week))==='invite')calendarFeedback='Novo convite recebido. Aceite ou recuse para continuar.';refreshSimulation()}
  }
}
function advanceCalendarWeek(){
  const campaign=advanceStreamerCampaign(career());
  if(campaign?.expired){career().log.unshift({kind:'info',title:'Campanha concluída',body:`${campaign.name} encerrou a divulgação do clube. A torcida cresceu durante a campanha.`});addMail({id:`streamer-finish-week-${career().week}`,from:campaign.name,address:'contato@creator.tactical',subject:'Foi ótimo representar o clube!',preview:'A campanha chegou ao fim. Obrigado pela parceria.',body:`Oi, ${career().manager}!\n\nNossa campanha terminou e foi muito legal acompanhar o ${team(career().team).name}. A comunidade respondeu bem aos conteúdos. Obrigado por me incluir no projeto!`,category:'streamer'})}
  const sponsorPayment=advanceSponsorDeal(career());
  if(sponsorPayment?.expired){career().log.unshift({kind:'info',title:'Patrocínio concluído',body:`O contrato com ${sponsorPayment.name} terminou após quatro semanas.`});addMail({id:`sponsor-finish-week-${career().week}`,from:`${sponsorPayment.name} · Parcerias`,address:'parcerias@brand.tactical',subject:'Encerramento do nosso contrato',preview:'A parceria chegou ao fim. Obrigado pela temporada.',body:`Olá, ${career().manager}.\n\nNosso contrato com o ${team(career().team).name} foi concluído. Obrigado pela parceria e pelo trabalho nesta temporada.`,category:'sponsor'})}
  const growthInterval=academyGrowthInterval(career().academyLevel||1);
  for(const prospect of career().academyProspects||[]){prospect.weeksInAcademy++;if(career().week%growthInterval===0&&prospect.rating<prospect.potential)prospect.rating++}
  const managerContract=career().managerContract;
  const managerSalary=managerContract&&managerContract.weeksRemaining>0?managerContract.weeklySalary:0;
  career().money=Math.max(0,career().money-Math.round((payroll()+staffPayroll())*.1)-managerSalary);if(career().managerBackground==='creator')career().money+=20;
  if(managerContract&&managerContract.weeksRemaining>0){managerContract.weeksRemaining--;if(managerContract.weeksRemaining===0){career().log.unshift({kind:'info',title:'Seu contrato está no fim',body:'O contrato de duas temporadas com a diretoria terminou. Renegocie para manter seu cargo.'});addMail({id:`manager-contract-${career().week}`,from:'Diretoria do Clube',address:'direcao@tactical.gg',subject:'Fim do contrato de manager',preview:'Seu vínculo de duas temporadas chegou ao fim.',body:`Olá, ${career().manager}.\n\nSeu contrato com o ${team(career().team).name} chegou ao fim. Procure a diretoria para negociar uma renovação.`,category:'general'})}}
  for(const member of [...(career().staff||[])]){member.contractWeeks--;if(member.contractWeeks<=0){career().staff=career().staff!.filter(item=>item.id!==member.id);career().log.unshift({kind:'info',title:'Contrato de staff encerrado',body:`O contrato de ${member.name} chegou ao fim.`});addMail({id:`staff-expired-${member.id}-${career().week}`,from:member.name,address:'comissao@tactical.gg',subject:'Meu contrato chegou ao fim',preview:'Agradeço pelo trabalho com a equipe.',body:`Olá, ${career().manager}.\n\nMeu contrato terminou após esta semana. Obrigado pela oportunidade de fazer parte do ${team(career().team).name}.`,category:'general'})}}
  const endedWeek=career().week;
  career().week=endedWeek>=14?15:endedWeek+1;career().day=1;
  if(career().week<=14)career().log.unshift({kind:'info',title:`Semana ${career().week} começou`,body:'A agenda foi atualizada. Confira os próximos compromissos e prepare a equipe.'});
}
function competition(){
  const current=tournamentRound(career().week);
  const played=career().tournamentResults||[];
  const access=career().week<=14?tournamentAccess(career(),current):'locked';
  const regionalPoints=played.filter(r=>['kickoff','stage1','stage2'].includes(r.eventId)).reduce((n,r)=>n+r.points,0);
  const rows=TOURNAMENT_ROUNDS.filter(round=>round.week<=career().week).map(round=>{
    const result=played.find(r=>r.week===round.week);
    const rival=round.week===career().week?opponent():tournamentOpponent({...career(),week:round.week},TEAMS);
    const roundAccess=tournamentAccess(career(),round);
    const status=result?(result.win?'VITÓRIA':'DERROTA'):round.week<career().week?'NÃO DISPUTADO':roundAccess==='invite'?'CONVITE':roundAccess==='locked'?'SEM VAGA':'PRÓXIMO';
    return `<div class="schedule-row tournament-row ${round.week===career().week?'current':''}"><span>SEM ${String(round.week).padStart(2,'0')}</span><span class="tournament-fixture"><b>${esc(round.name)}</b><small>${esc(round.phase)} · ${round.scope==='regional'?team(career().team).region:round.scope==='americas'?'AMÉRICAS':'GLOBAL'}${result||round.week===career().week&&canPlayTournament(career())?` · vs ${esc(result?team(result.opponentId).name:rival.name)}`:''}</small></span><strong class="${result?(result.win?'result-win':'result-loss'):''}">${status}${result?` ${result.score}`:''}</strong></div>`;
  }).join('');
  const standings=[...leagueTeams()].sort((a,b)=>(b.id===career().team?regionalPoints:Math.round(b.power*.12))-(a.id===career().team?regionalPoints:Math.round(a.power*.12))).map((t,i)=>`<div class="schedule-row ${t.id===career().team?'ours':''}"><span>${String(i+1).padStart(2,'0')}</span>${logo(t)}<b>${t.name}</b><strong>${t.id===career().team?regionalPoints:Math.round(t.power*.12)} PTS</strong></div>`).join('');
  const accessText=access==='invite'?'Convite recebido. Aceite para disputar ou recuse para seguir a temporada.':access==='locked'?`Sem classificação: ${current.requirement}. Avance para a próxima etapa.`:access==='qualified'?'Vaga conquistada pelos resultados regionais.':access==='accepted'?'Convite aceito. Seu time está inscrito.':access==='regional'?'Etapa regional aberta para todos os clubes.':'';
  return `<div class="page-title"><div><small class="eyebrow">CIRCUITO COMPETITIVO</small><h1>RUMO AO <em>TOPO.</em></h1><p>Os campeonatos são anunciados conforme a temporada avança. Convites são opcionais; torneios mundiais exigem classificação.</p></div><div class="overall-box"><small>PONTOS</small><b>${career().points}</b></div></div><section class="panel tournament-highlight"><div><small class="eyebrow">ETAPA ATUAL · SEMANA ${Math.min(career().week,14)}</small><h2>${career().week>14?'Temporada encerrada':esc(current.name)}</h2><p>${career().week>14?'Confira os resultados da sua campanha.':`${esc(current.phase)} · ${accessText} ${canPlayTournament(career())?`Vitória: ${cash(current.winPrize)} e ${current.winPoints} pontos.`:''}`}</p></div>${tournamentActions()}</section><div class="overview-grid"><section class="panel"><div class="panel-head"><h2>Calendário revelado</h2><span class="tag">SEMANA ${Math.min(career().week,14)} / 14</span></div><div class="schedule">${rows}${career().week<=14?'<div class="schedule-row tournament-row"><span>EM BREVE</span><span class="tournament-fixture"><b>Próxima etapa</b><small>Revelada após esta semana</small></span></div>':''}</div></section><section class="panel"><div class="panel-head"><h2>Classificação regional</h2><span class="tag">VCT ${team(career().team).region}</span></div><div class="schedule">${standings}</div><div class="data-note">Somente rodadas regionais contam nesta tabela. Pontuações dos rivais são simuladas. Critérios e premiações desta carreira são fictícios.</div></section></div>`;
}function action(type: string,id=''){
  if(type==='confirm-demo-lineup'&&career().demo){career().demo!.lineupConfirmed=true;save();render();return}
  if(type==='export-demo-feedback'&&career().demo){
    const payload={version:1,completedAt:career().demo!.completedAt,feedback:career().demo!.feedback??'',matches:career().tournamentResults?.map(result=>({week:result.week,score:result.score,win:result.win})),trainingSessions:career().trainingHistory?.length??0,tactics:career().tactics.length};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='vava-manager-demo-feedback.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
  }
  if(type==='main-menu'){calendarStop=true;startOpen=true;introOpen=true;render();window.scrollTo(0,0);return}
  if(type==='home-news'){const latest=career().log[0];if(latest)homeDialog(latest.title,latest.body);return}
  if(type==='manager-profile'){homeDialog(career().manager,`${team(career().team).name} · Manager · ${career().managerContract?.weeksRemaining??0} semanas de contrato restantes. Orçamento do clube: ${cash(career().money)}. Torcida: ${career().fans.toLocaleString('pt-BR')} fãs.`);return}

  if(type==='open-calendar'){openCalendarModal();return}
  if(type==='open-simulation'){openSimulationModal();return}
  if(type==='stop-calendar'){calendarStop=true;calendarFeedback='Pausando a simulação...';refreshSimulation();return}
  if(calendarRunning)return;
  if(type==='buy-shop-item'){
    const result=buyShopItem(career(),id);
    if(result.ok){
      shopFeedback=`${result.item.name} instalado no clube por ${cash(result.item.price)}. ${result.item.bonusLabel}.`;
      career().log.unshift({kind:'info',title:'Nova melhoria do clube',body:shopFeedback});
      addMail({id:`shop-${id}`,from:'Diretoria do Clube',address:'direcao@tactical.gg',subject:`Equipamento instalado: ${result.item.name}`,preview:result.item.bonusLabel,body:`Olá, ${career().manager}.\n\n${shopFeedback}\n\n${result.item.details}`,category:'general'});
    }else shopFeedback=result.error;
  }
  if(type==='advance-day'||type==='advance-week'){void runCalendar(type==='advance-week');return}
  if(type==='reset'){if(confirm('Reiniciar a carreira e apagar o progresso local?')){localStorage.removeItem(KEY);if(!DEMO_MODE)localStorage.removeItem('tactical-career-v2');state=null;calendarMonth=null;calendarSelected='';calendarFeedback='';view='overview';render()}return}
  if(type==='accept-invite'||type==='decline-invite')calendarFeedback='';
  if(type==='accept-invite'&&career().week<=14){const round=tournamentRound(career().week);if(tournamentAccess(career(),round)==='invite'){(career().inviteResponses ||= {})[round.id]='accepted';career().log.unshift({kind:'info',title:'Convite aceito',body:`${team(career().team).name} confirmou presença no ${round.name}.`})}}
  if(type==='decline-invite'&&career().week<=14){const round=tournamentRound(career().week);if(tournamentAccess(career(),round)==='invite'){(career().inviteResponses ||= {})[round.id]='declined';career().log.unshift({kind:'info',title:'Convite recusado',body:`O clube não disputará o ${round.name}.`})}}
  if(type==='close-profile'){profileOpen=false;render();return}
  if(type==='train-agent'){career().trainingPlayer=id;career().trainingAthletes=[id];career().focus='agent';career().trainingKind='agent-match';profileOpen=false;view='training'}
  if(type==='start'){const i=career().players.findIndex(p=>p.id===id);if(i>4){const [p]=career().players.splice(i,1);career().players.splice(4,0,p);selected=p.id}}
  if(type==='bench'){const i=career().players.findIndex(p=>p.id===id);if(i>=0&&i<5&&career().players.length>5){const [p]=career().players.splice(i,1);career().players.splice(5,0,p);selected=p.id}}
  if(type==='captain'&&starters().some(p=>p.id===id)){career().captain=id;const p=career().players.find(x=>x.id===id)!;career().log.unshift({kind:'info',title:'Novo capitão',body:`${p.alias} assumiu a liderança do quinteto.`})}
  if(type==='sell-player'){
    const result=sellPlayer(career(),id);
    if(result.ok){
      const {person,fee}=result;profileOpen=false;selected=null;
      marketFeedback=`${person.alias} foi vendido por ${cash(fee)}. O valor entrou no caixa.`;
      career().log.unshift({kind:'info',title:'Atleta vendido',body:marketFeedback});
      addMail({id:`sale-${career().week}-${Date.now()}-${id}`,from:'Diretoria de Transferências',address:'transferencias@vct.tactical',subject:`Venda de ${person.alias} confirmada`,preview:'A negociação foi concluída.',body:marketFeedback,category:'transfer'});
    }else{marketFeedback=result.error;homeDialog('Venda indisponível',result.error)}
  }
  if(type==='transfer-staff'){
    const result=transferStaff(career(),id);
    if(result.ok){
      marketFeedback=`${result.person.name} foi transferido. Compensação de ${cash(result.fee)} creditada ao clube.`;
      career().log.unshift({kind:'info',title:'Profissional transferido',body:marketFeedback});
      addMail({id:`staff-transfer-${Date.now()}-${id}`,from:'Diretoria do Clube',address:'direcao@tactical.gg',subject:`Transferência de ${result.person.name}`,preview:'Contrato transferido com compensação.',body:marketFeedback,category:'transfer'});
    }else{marketFeedback=result.error;homeDialog('Transferência indisponível',result.error)}
  }
  if(type==='hire-staff'){
    const candidate=STAFF_CANDIDATES.find(person=>person.id===id),crew=career().staff||[];
    if(candidate&&!crew.some(member=>member.role===candidate.role)&&crew.length<4&&career().money>=candidate.signingFee){
      career().money-=candidate.signingFee;
      marketFeedback=`${candidate.name} contratado por ${cash(candidate.signingFee)}. Salário: ${cash(candidate.weeklySalary)} / semana.`;
      crew.push({id:`${candidate.id}-${career().week}`,candidateId:candidate.id,name:candidate.name,role:candidate.role,quality:candidate.quality,weeklySalary:candidate.weeklySalary,contractWeeks:12});
      career().log.unshift({kind:'info',title:'Novo membro da comissão',body:`${candidate.name} entrou para a equipe como ${STAFF_ROLE_LABELS[candidate.role]}.`});
      addMail({id:`staff-hire-${career().week}-${candidate.id}`,from:candidate.name,address:'comissao@tactical.gg',subject:'Animado para começar com o time',preview:'Vamos trabalhar para melhorar o clube.',body:`Olá, ${career().manager}!\n\nAceitei o convite para trabalhar como ${STAFF_ROLE_LABELS[candidate.role]} no ${team(career().team).name}. Meu contrato é de 12 semanas. Já estou preparando meu plano de trabalho.\n\nVamos juntos!`,category:'general'});
    }
  }
  if(type==='fire-staff'){
    const index=career().staff?.findIndex(member=>member.id===id)??-1;
    if(index>=0){const [member]=career().staff!.splice(index,1);marketFeedback=`${member.name} deixou a comissão. A vaga está disponível para uma nova contratação.`;career().log.unshift({kind:'info',title:'Comissão técnica atualizada',body:`${member.name} deixou a comissão técnica.`});addMail({id:`staff-exit-${member.id}-${career().week}`,from:member.name,address:'comissao@tactical.gg',subject:'Encerramento do meu ciclo no clube',preview:'Agradeço pelo período de trabalho.',body:`Olá, ${career().manager}.\n\nEntendi a decisão e agradeço a oportunidade de trabalhar no ${team(career().team).name}. Desejo uma boa sequência para o time.`,category:'general'})}
  }
  if(type==='develop-staff'){
    const member=career().staff?.find(item=>item.id===id);
    if(member&&career().money>=90&&member.quality<100&&(member.lastDevelopmentWeek===undefined||career().week-member.lastDevelopmentWeek>=3)){career().money-=90;member.quality=Math.min(100,member.quality+3);member.lastDevelopmentWeek=career().week;career().log.unshift({kind:'info',title:'Desenvolvimento da comissão',body:`${member.name} concluiu um curso profissional e melhorou sua qualidade.`})}
  }
  if(type==='renew-staff'){
    const member=career().staff?.find(item=>item.id===id),fee=(member?.weeklySalary||0)*2;
    if(member&&member.contractWeeks<=3&&career().money>=fee){career().money-=fee;member.contractWeeks=12;career().log.unshift({kind:'info',title:'Contrato renovado',body:`${member.name} renovou por mais 12 semanas.`});addMail({id:`staff-renew-${member.id}-${career().week}`,from:member.name,address:'comissao@tactical.gg',subject:'Renovação de contrato assinada',preview:'Seguimos juntos por mais uma temporada.',body:`Obrigado pela renovação, ${career().manager}. Vou continuar trabalhando para ajudar o ${team(career().team).name}.`,category:'general'})}
  }
  if(type==='upgrade-academy'){
    const level=career().academyLevel||1,fee=academyUpgradeCost(level);
    if(level<3&&career().money>=fee){career().money-=fee;career().academyLevel=level+1;career().log.unshift({kind:'info',title:'Academy modernizada',body:`A estrutura da base subiu para o nível ${level+1}. Os jovens evoluem mais rápido.`});addMail({id:`academy-upgrade-${level+1}-${career().week}`,from:'Direção do Clube',address:'direcao@tactical.gg',subject:'Obras da Academy concluídas',preview:`A estrutura chegou ao nível ${level+1}.`,body:`Olá, ${career().manager}.\n\nAs melhorias da base foram concluídas. A Academy agora está no nível ${level+1} e os prospects terão ciclos de evolução mais curtos.`,category:'general'})}
  }
  if(type==='discover-prospect'){
    const prospects=career().academyProspects||[];
    if(prospects.length<6&&career().money>=academyScoutingCost){career().money-=academyScoutingCost;const prospect=discoverAcademyProspect(career().team,team(career().team).power,prospects,[...career().players,...career().market].map(player=>player.id));prospects.push(prospect);career().academyProspects=prospects;career().log.unshift({kind:'info',title:'Novo talento observado',body:`${prospect.name}, ${prospect.age} anos, entrou na Academy como ${prospect.role}.`});addMail({id:`academy-scout-${prospect.id}`,from:'Coordenação da Academy',address:'base@tactical.gg',subject:`Nova promessa encontrada: ${prospect.name}`,preview:`${prospect.age} anos · potencial ${prospect.potential}.`,body:`Olá, ${career().manager}.\n\nNossa equipe de observação encontrou ${prospect.name}, ${prospect.age} anos, que atua como ${prospect.role}. A avaliação inicial aponta overall ${prospect.rating} e potencial ${prospect.potential}.\n\nO prospect já está integrado à base para iniciar seu desenvolvimento.`,category:'general'})}
  }
  if(type==='train-prospect'){
    const prospect=career().academyProspects?.find(item=>item.id===id);
    if(prospect&&prospect.rating<prospect.potential&&prospect.lastTrainingWeek!==career().week&&career().money>=academyTrainingCost){career().money-=academyTrainingCost;const gain=Math.min(academyTrainingGain(career()),prospect.potential-prospect.rating);prospect.rating+=gain;prospect.lastTrainingWeek=career().week;career().log.unshift({kind:'info',title:'Treino individual na Academy',body:`${prospect.name} evoluiu ${gain} ponto${gain===1?'':'s'} de overall.`})}
  }
  if(type==='promote-prospect'){
    const index=career().academyProspects?.findIndex(item=>item.id===id)??-1,prospect=index>=0?career().academyProspects![index]:null;
    if(prospect&&prospect.rating>=academyPromotionMinimum){
      const agent=agentsData.find(item=>item.role===prospect.role)?.id||agentsData[0].id;
      const player:Player={id:prospect.id,source:career().team,alias:prospect.name,real:'Formado na Academy',image:false,portrait:prospect.portrait??academyPortraitIndex(prospect.name),role:prospect.role,rating:prospect.rating,salary:Math.round(70+prospect.rating*.9),number:Array.from({length:99},(_,i)=>i+1).find(number=>!career().players.some(member=>member.number===number))||career().players.length+1,energy:100,morale:85,agent,agentMastery:{[agent]:48},stats:{kills:0,deaths:0,assists:0,matches:0}};
      career().players.push(player);career().academyProspects!.splice(index,1);career().log.unshift({kind:'info',title:'Promessa promovida',body:`${prospect.name} subiu da Academy para o elenco principal.`});addMail({id:`academy-promotion-${prospect.id}`,from:prospect.name,address:'academy@tactical.gg',subject:'Chegou minha chance no profissional!',preview:'Estou pronto para defender o time principal.',body:`Olá, ${career().manager}!\n\nObrigado por acreditar no meu desenvolvimento. Estou pronto para dar o próximo passo e defender o ${team(career().team).name} no elenco principal. Vou trabalhar para justificar essa oportunidade.`,category:'player'})
    }
  }
  if(type==='scout'&&id!==career().team&&mapStats[id]&&!career().scoutReports[id]&&career().money>=scoutingReportCost(career())){career().money-=scoutingReportCost(career());career().scoutReports[id]={week:career().week};career().log.unshift({kind:'info',title:'Relatório de olheiros',body:`Mapas mais jogados por ${team(id).name}: ${preferredMaps(id).join(', ')}.`})}
  if(type==='hire-streamer'&&hireStreamer(career(),id)){const streamer=STREAMERS.find(item=>item.id===id)!;career().log.unshift({kind:'info',title:'Campanha de marketing',body:`${streamer.name} contratado por ${CAMPAIGN_WEEKS} semanas, por ${cash(streamer.cost)}.`});addMail({id:`streamer-${career().week}-${id}`,from:streamer.name,address:`contato@creator.tactical`,subject:'Vamos fazer barulho nesta temporada!',preview:'Nossa campanha já está no ar.',body:`Oi, ${career().manager}!\n\nFechamos a campanha de ${CAMPAIGN_WEEKS} semanas. Vou apresentar o projeto do ${team(career().team).name} para a comunidade e acompanhar cada jogo com a torcida.\n\nObrigado pela confiança!`,category:'streamer'})}
  if(type==='sign-sponsor'&&signSponsor(career(),id)){const brand=BRANDS.find(item=>item.id===id)!;career().log.unshift({kind:'info',title:'Novo patrocínio',body:`${brand.name} assinou com o clube. ${brand.item.name} foi desbloqueado.`});addMail({id:`sponsor-${career().week}-${id}`,from:`${brand.name} · Parcerias`,address:'parcerias@brand.tactical',subject:`Parceria fechada com ${team(career().team).name}`,preview:'Contrato assinado e acessório liberado.',body:`Olá, ${career().manager}.\n\nÉ oficial: ${brand.name} é a nova parceira do ${team(career().team).name}. O contrato prevê ${cash(brand.weeklyIncome)} por semana, além do bônus de assinatura.\n\nO acessório ${brand.item.name} já está disponível para o clube. Estamos animados para começar!`,category:'sponsor'})}
  if(type==='equip-sponsor-item')equipSponsorItem(career(),id);
  if(type==='accept-transfer'||type==='reject-transfer'){
    const message=career().emails?.find(email=>email.id===id&&email.offer?.status==='pending');
    if(message?.offer){
      if(type==='accept-transfer'){
        const result=sellPlayer(career(),message.offer.playerId,id);
        if(result.ok){
          marketFeedback=`${result.person.alias} foi vendido por ${cash(result.fee)}.`;
          career().log.unshift({kind:'info',title:'Atleta transferido',body:marketFeedback});
          addMail({id:`transfer-out-${id}`,from:'Diretoria de Transferências',address:'transferencias@vct.tactical',subject:`Venda de ${result.person.alias} confirmada`,preview:'A taxa de transferência entrou no caixa.',body:marketFeedback,category:'transfer'});
        }else{homeDialog('Não foi possível aceitar a proposta',result.error)}
      }else{
        message.offer.status='declined';
        addMail({id:`transfer-reject-${id}`,from:'Diretoria de Transferências',address:'transferencias@vct.tactical',subject:'Proposta recusada',preview:'O atleta permanece no clube.',body:`A proposta por ${career().players.find(player=>player.id===message.offer!.playerId)?.alias||'o atleta'} foi recusada.`,category:'transfer'});
      }
    }
  }
  if(type==='buy'){
    const result=buyPlayer(career(),id);
    if(result.ok){
      const {person,fee}=result;
      marketFeedback=`${person.alias} chegou ao elenco por ${cash(fee)}. Salário: ${cash(person.salary)} / semana.`;
      career().log.unshift({kind:'info',title:'Nova contratação',body:marketFeedback});
      addMail({id:`transfer-in-${career().week}-${Date.now()}-${id}`,from:person.source==='free'?'Agente do atleta':`${team(person.source).name} · Transferências`,address:'transferencias@vct.tactical',subject:`Contratação de ${person.alias} concluída`,preview:'O atleta já está disponível no elenco.',body:`Olá, ${career().manager}.\n\n${marketFeedback}\n\nA documentação foi concluída e o atleta está disponível no banco de reservas.`,category:'transfer'});
    }else{marketFeedback=result.error;homeDialog('Contratação indisponível',result.error)}
  }
  if(['watch','simulate'].includes(type)&&canPlayToday()){
    document.querySelectorAll<HTMLDialogElement>('.home-simulation-dialog[open],.team-calendar-dialog[open]').forEach(dialog=>dialog.close());
    openMapVeto({own:team(career().team).tag,opponent:opponent().tag,preferred:preferredMaps(opponent().id),trainingMap:career().trainingMap,mastery:career().mapMastery,escape:esc,onStart:veto=>{
      simulateSeries(type==='watch',veto);
      if(type!=='watch'){ensureSystems();save();render()}
    }});
    return;
  }
  ensureSystems();save();render();
}
function simulateSeries(watch=false,veto: Veto | null=null){
  const event=tournamentRound(career().week);
  const ownPlayers=starters().map(p=>({...p}));
  const enemyPlayers=rosterData[opponent().id].players.slice(0,5).map((p,i)=>({...p,role:ROLE[i],agent:agentsData.find(a=>a.role===ROLE[i])?.id||agentsData[i].id}));
  const units=[...ownPlayers,...enemyPlayers];
  const o=opponent(),maps=veto?veto.maps.map(entry=>entry.map):matchMaps(o.id),energy=starters().reduce((n,p)=>n+p.energy,0)/5;
  const coverage=roleCoverage(),captain=starters().find(p=>p.id===career().captain);
  const agentBonus=starters().reduce((n,p)=>n+((p.agentMastery[p.agent]??48)-48)*.06+(agentOf(p.agent).role===p.role ? .5 : 0),0)/5;
  const results: SeriesMap[]=[];
  let ownWins=0,oppWins=0;
  for(let i=0;i<maps.length&&ownWins<2&&oppWins<2;i++){
    const map=maps[i],mastery=(career().mapMastery[map]-48)*.1;
    const tacticAdvantage=tacticBonus(map);
    const scoutBonus=(career().scoutReports[o.id]?1.5:0)+(staffMember('analyst')?.quality||0)*.025;
    const coachBonus=staffMember('coach')?staffEffect(staffMember('coach')!.quality):0;
    const focusBonus=career().focus==='strategy'?3:career().focus==='team'?2:career().focus==='aim'?1.5:career().focus==='map'&&career().trainingMap===map?3:0;
    const roleBonus=coverage===4?2:coverage===3?0:-2;
    const captainBonus=(captain?.morale??0)>=70?1:0;
    const opponentRank=preferredMaps(o.id).indexOf(map);
    const opponentMapBonus=opponentRank<0?0:3-opponentRank;
    const strength=avg()-o.power+mastery+agentBonus+tacticAdvantage+scoutBonus+coachBonus+focusBonus+roleBonus+captainBonus+(energy-70)*.14-opponentMapBonus+shopBonuses(career()).matchStrength;
    const chance=Math.max(.18,Math.min(.82,.5+strength*.035));
    const win=Math.random()<chance;
    ownWins+=Number(win);oppWins+=Number(!win);
    results.push({map,win,ownStartsAttack:veto?.maps[i].ownStartsAttack??true,simulation:createMapSimulation(win,units,Math.random,veto?.maps[i].ownStartsAttack??true)});
  }
  const finish=()=>{
  const win=ownWins>oppWins,score=`${ownWins}–${oppWins}`;
  const earnedPoints=win?event.winPoints:0,prize=win?event.winPrize:0;
  career().wins+=Number(win);career().losses+=Number(!win);career().points+=earnedPoints;
  career().money+=(win?210:95)+prize;career().fans+=win?4200:700;
  (career().tournamentResults ||= []).push({week:career().week,eventId:event.id,eventName:event.name,opponentId:o.id,win,score,prize,points:earnedPoints});
  if(demoFinished(career())){career().demo!.completedAt=new Date().toISOString();view='overview'}
  career().lastMatch={opp:o.name,score,win,eventName:event.name,veto:veto?structuredClone(veto):null,maps:results.map(({map,win,simulation,ownStartsAttack})=>({map,win,ownStartsAttack,score:simulation.score}))};
  career().log.unshift({kind:win?'win':'loss',title:`${team(career().team).tag} ${score} ${o.tag}`,body:`${results.map(r=>`${r.map} ${r.win?'V':'D'}`).join(' · ')}. ${win?'Vitória e +3 pontos.':'Derrota na série.'}`});
  career().players.slice(0,5).forEach((p,index)=>{
    const st=p.stats;
    for(const result of results){
      const stats=result.simulation.stats[index];
      st.kills+=stats.kills;
      st.assists+=stats.assists;
      st.deaths+=stats.deaths;
      st.maps=(st.maps||0)+1;
    }
    st.matches=(st.matches||0)+1;
  });
  const fitnessRecovery=staffMember('fitness')?staffEffect(staffMember('fitness')!.quality):0;
  const shopRecovery=shopBonuses(career()).energyRecovery;
  career().players.forEach((p,i)=>{p.energy=Math.max(35,Math.min(100,p.energy+(i<5?(career().focus==='rest'?16:-9+fitnessRecovery):5+fitnessRecovery)+shopRecovery));if(i<5){p.morale=Math.max(35,Math.min(100,p.morale+(win?6:-5)));if(career().focus!=='rest'&&Math.random()<.26)p.rating=Math.min(99,p.rating+1)}});
  const upset=career().players.slice(0,5).find(p=>p.morale<=50&&!career().emails?.some(email=>email.id===`complaint-${p.id}`));
  if(upset)addMail({id:`complaint-${upset.id}`,from:upset.alias,address:`${upset.alias.toLowerCase()}@players.tactical`,subject:'Precisamos conversar sobre meu espaço',preview:'Estou preocupado com meu momento no elenco.',body:`Oi, ${career().manager}.\n\nQueria conversar sobre meu papel no time. O moral está em ${upset.morale}% e estou sentindo o peso dos últimos resultados. Preciso de uma conversa e de um plano claro para voltar a render.\n\n${upset.alias}`,category:'player'});
  if(career().week%4===0&&career().players.length>5&&!career().emails?.some(email=>email.offer?.status==='pending')){
    const reserve=[...career().players.slice(5)].sort((a,b)=>a.rating-b.rating)[0];
    const buyer=TEAMS.filter(club=>club.id!==career().team).sort((a,b)=>a.name.localeCompare(b.name))[career().week%Math.max(1,TEAMS.length-1)];
    const fee=Math.round(300+(reserve.rating-70)*32);
    addMail({id:`offer-${career().week}-${reserve.id}`,from:`${buyer.name} · Diretoria`,address:'scouting@vct.tactical',subject:`Proposta oficial por ${reserve.alias}`,preview:`Oferta de ${cash(fee)} pelo atleta reserva.`,body:`Olá, ${career().manager}.\n\nO ${buyer.name} gostaria de contratar ${reserve.alias} por ${cash(fee)}. A proposta é válida nesta semana. Você pode aceitar a venda ou manter o atleta no elenco.`,category:'transfer',offer:{playerId:reserve.id,fee,status:'pending'}});
  }
  };
  if(watch)watchSeries({maps:results,players:units,tactics:Object.fromEntries(results.flatMap(result=>{const tactic=activeTactic(result.map);return tactic?[[result.map,structuredClone(tactic)]]:[]})),mapMastery:{...career().mapMastery},own:team(career().team).tag,opponent:o.tag,ownLogo:`/assets/${career().team}.png`,opponentLogo:`/assets/${o.id}.png`,competition:`VCT ${team(career().team).region}`,stage:`TEMPORADA · SEMANA ${career().week}`,escape:esc,onFinish:()=>{finish();ensureSystems();save();render()}});
  else finish();
}

render();
