import {trainingHub} from './src/ui/training-hub.ts';
import {openTrainingSession} from './src/ui/training-session.ts';
import {beginTraining, rewardTraining, type TrainingKind} from './src/game/training.ts';
import {openMapVeto} from './map-veto.ts';
import {createMapSimulation} from './src/game/simulation.ts';
import {watchSeries} from './src/game/watch-series.ts';
import {NAV_ITEMS, navIcon} from './src/ui/navigation.ts';
import rawRosterData from './rosters.json';
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

const TEAMS: Team[] = [
  {id:'loud',name:'LOUD',tag:'LOUD',region:'AMÉRICAS',color:'#b2e441',secondary:'#15191a',power:84},
  {id:'100t',name:'100 Thieves',tag:'100T',region:'AMÉRICAS',color:'#ed4148',secondary:'#f4f0e9',power:89},
  {id:'lev',name:'Leviatán',tag:'LEV',region:'AMÉRICAS',color:'#70c4dc',secondary:'#101c2c',power:86},
  {id:'nrg',name:'NRG',tag:'NRG',region:'AMÉRICAS',color:'#f3f4f2',secondary:'#18191b',power:87},
  {id:'prx',name:'Paper Rex',tag:'PRX',region:'PACÍFICO',color:'#f4c45e',secondary:'#1d2536',power:90},
  {id:'tl',name:'Team Liquid',tag:'TL',region:'EMEA',color:'#80aaf0',secondary:'#142239',power:86},
  {id:'kc',name:'Karmine Corp',tag:'KC',region:'EMEA',color:'#54aaff',secondary:'#14213b',power:88},
  {id:'edg',name:'EDward Gaming',tag:'EDG',region:'CHINA',color:'#ef555a',secondary:'#22242a',power:85}
];
const ROLE = ['Duelista','Iniciador','Controlador','Sentinela','Flex'];
const KEY = 'tactical-career-v3';
const $ = <T extends HTMLElement = HTMLInputElement>(q: string) => document.querySelector<T>(q)!;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const cash = (n: number) => `$ ${Number(n).toLocaleString('pt-BR')} mil`;
const image = (path: string, label: string, cls='') => path ? `<img class="${cls}" src="${path}" alt="${esc(label)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">` : '';
const logo = (team: Team, cls='') => `<span class="team-emblem ${cls}" style="--club:${team.color}">${image(`/assets/${team.id}.png`, `Escudo ${team.name}`)}<span class="logo-fallback" ${rosterData[team.id]?.logo?'style="display:none"':''}>${team.tag.slice(0,2)}</span></span>`;
const photo = (p: Player, cls='') => {const path=p.id==='loud-erde' ? '/assets/loud-erde.jpg' : p.image ? `/assets/${p.source}-${p.alias.toLowerCase()}.png` : ''; return `<span class="player-photo ${cls}">${image(path, `Foto de ${p.alias}`)}<span class="photo-fallback" ${path?'style="display:none"':''}>${esc(p.alias.slice(0,2).toUpperCase())}</span></span>`};
const team = (id: string) => TEAMS.find(t => t.id === id) || TEAMS[0];
const rating = (p: Player) => p.rating;
let state: CareerState | null = null;
function career(): CareerState { if(!state)throw new Error("Nenhuma carreira ativa");return state; }
try {state = JSON.parse(localStorage.getItem(KEY) || 'null')} catch {state=null}
if (state && (!TEAMS.some(t=>t.id===career().team) || !Array.isArray(career().players))) state=null;
let view: View='overview';
let selected: string | null=null;
let profileOpen=false, createTeam='loud', createDifficulty='normal', tacticsMap='Ascent', scoutTeam='', pingType='attack', rankingStat: 'kills' | 'assists' | 'deaths'='kills';
function makePlayer(source: string, raw: RawPlayer, i: number, reserve=false): Player{
  return {agent:agentsData.find(a=>a.role===ROLE[i%5])?.id||agentsData[0].id,agentMastery:{},stats:{kills:0,deaths:0,assists:0,matches:0},id:`${source}-${raw.alias.toLowerCase()}`,source,alias:raw.alias,real:raw.real,image:raw.image && !raw.image.includes('/img/base/ph/') ? true : false,role:ROLE[i%5],rating:Math.min(94,Math.max(75,team(source).power + [2,1,0,-1,-2][i%5] - (reserve?4:0))),salary:Math.round(65 + team(source).power*1.2 + (4-i%5)*12),number:i+1,energy:90,morale:80};
}
function newState(id: string,manager: string,difficulty: string): CareerState{
  const all=rosterData[id].players.map((p,i)=>makePlayer(id,p,i,i>=5));
  const market=TEAMS.filter(t=>t.id!==id).flatMap(t=>rosterData[t.id].players.slice(0,5).map((p,i)=>({...makePlayer(t.id,p,i),price:300+(team(t.id).power-80)*35+(5-i)*32}))).slice(0,18);
  return {team:id,manager,difficulty,week:1,money:difficulty==='hard'?950:1450,fans:82000,points:0,wins:0,losses:0,players:all,market,kit:'home',focus:'team',trainingMap:'Ascent',mapMastery:Object.fromEntries(MAP_IDS.map(m=>[m,48])),trainingPlayer:all[0].id,captain:all[0].id,tactics:[],activeTactics:{},scoutReports:{},log:[{kind:'info',title:'Carreira iniciada',body:`${manager} assumiu o comando da ${team(id).name}.`}],lastMatch:null};
}
if (!state) {
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
const starters = () => career().players.slice(0,5);
const avg = () => Math.round(starters().reduce((n,p)=>n+rating(p),0)/5);
const payroll = () => career().players.reduce((n,p)=>n+p.salary,0);
const opponent = () => TEAMS.filter(t=>t.id!==career().team)[(career().week-1)%7];
function ensureSystems(){
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
function upcomingIntel(){
  const o=opponent(),report=career().scoutReports[o.id],maps=matchMaps(o.id);
  return `<div class="upcoming-maps"><div><small>MAPA EM TREINAMENTO</small><b>${career().trainingMap}</b></div><div><small>PREFERÊNCIAS DO ADVERSÁRIO</small>${report?`<b>${maps.slice(1).join(' · ')}</b>`:`<button data-view="strategy">Enviar olheiro ↗</button>`}</div></div>`;
}
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
  return `<div class="page-title"><div><small class="eyebrow">ANÁLISE COMPETITIVA</small><h1>TÁTICAS & <em>OLHEIROS.</em></h1><p>Prepare jogadas por mapa e estude as escolhas dos próximos adversários.</p></div><div class="overall-box"><small>TÁTICAS SALVAS</small><b>${career().tactics.length}</b></div></div><div class="systems-layout"><section class="panel"><div class="panel-head"><div><small class="eyebrow">PLAYBOOK</small><h2>Planos por mapa</h2></div><span class="tag">${tacticsMap.toUpperCase()}</span></div><div class="system-body"><div class="map-tabs">${MAPS.map(m=>`<button data-tactics-map="${m.id}" class="${tacticsMap===m.id?'active':''}">${m.id}</button>`).join('')}</div><form id="tactic-form" class="tactic-form"><label>Nome da tática<input name="name" maxlength="32" required placeholder="Ex.: controle de meio"/></label><label>Ataque<select name="attack">${ATTACKS.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><label>Defesa<select name="defense">${DEFENSES.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><button type="submit" class="primary">CRIAR TÁTICA ↗</button></form><div class="tactics-list">${tactics.length?tactics.map(t=>`<article class="tactic-row ${career().activeTactics[tacticsMap]===t.id?'active':''}"><div><small>${t.map.toUpperCase()}</small><b>${esc(t.name)}</b><span>${ATTACKS.find(a=>a[0]===t.attack)?.[1]} · ${DEFENSES.find(d=>d[0]===t.defense)?.[1]}</span></div><button data-active-tactic="${t.id}" data-map="${t.map}">${career().activeTactics[t.map]===t.id?'ATIVA':'ATIVAR'}</button><button class="tactic-delete" data-delete-tactic="${t.id}" aria-label="Excluir ${esc(t.name)}">×</button></article>`).join(''):'<p class="empty-note">Crie um plano para este mapa. A tática ativa dá vantagem quando ele aparecer na série.</p>'}</div></div></section><section class="panel"><div class="panel-head"><div><small class="eyebrow">INTELIGÊNCIA</small><h2>Relatório de olheiros</h2></div></div><div class="system-body"><label class="system-label">TIME OBSERVADO<select id="scout-team">${TEAMS.filter(t=>t.id!==career().team).map(t=>`<option value="${t.id}" ${scoutTeam===t.id?'selected':''}>${t.name}</option>`).join('')}</select></label><div class="scout-summary">${logo(team(scoutTeam))}<div><b>${team(scoutTeam).name}</b><small>${report?'RELATÓRIO DISPONÍVEL':'AINDA NÃO OBSERVADO'}</small></div></div>${report?`<p class="sample-note">Mapas mais frequentes na amostra de ${sample} mapas dos resultados recentes exibidos pelo VLR.gg.</p><div class="scout-bars">${top.map((m,i)=>{const n=mapStats[scoutTeam].maps[m]||0;return `<div><span><b>${i+1}. ${m}</b><small>${n} ${n===1?'vez':'vezes'}</small></span><i><em style="width:${Math.round(n/Math.max(1,mapStats[scoutTeam].maps[top[0]])*100)}%"></em></i></div>`}).join('')}</div><div class="scout-hint">Relatório disponível para preparar as próximas partidas contra ${team(scoutTeam).name}.</div>`:`<p class="empty-note">Envie um olheiro para revelar os mapas mais jogados por ${team(scoutTeam).name}.</p><button class="primary" data-action="scout" data-id="${scoutTeam}" ${career().money<40?'disabled':''}>ENVIAR OLHEIRO · ${cash(40)} ↗</button>`}<div class="source-note">Dados observados em outubro de 2026. A preferência é inferida pela frequência da amostra, não representa uma estatística oficial de toda a temporada.</div></div></section></div>`;
}
function render(): void {
  if (!state) return renderCreate();
  ensureSystems();
  if(view==='squad'&&!career().players.some(p=>p.id===selected))selected=career().players[0].id;
  const t=team(career().team);
  $('#app').innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="brand"><span class="brand-symbol">V<span></span></span><div><strong>TACTICAL</strong><small>VALORANT MANAGER</small></div></div><div class="club-panel"><small class="eyebrow">SEU CLUBE</small><div class="club-profile">${logo(t)}<div><b>${t.name}</b><small>VCT ${t.region}</small></div></div><div class="season-line">TEMPORADA 2026 <b>● ATIVA</b></div></div><div class="nav-caption">CENTRAL</div><nav aria-label="Navegação principal">${NAV_ITEMS.map(({id,label})=>`<button class="nav-link ${view===id?'active':''}" data-view="${id}" aria-current="${view===id?'page':'false'}"><span class="nav-icon">${navIcon(id)}</span>${label}${id==='market'?`<i>${career().market.length}</i>`:''}</button>`).join('')}</nav><div class="manager-line"><span>${esc(career().manager[0].toUpperCase())}</span><div><b>${esc(career().manager)}</b><small>Diretor esportivo</small></div></div></aside><main><header class="topbar"><span>CLUBE / <b>${({overview:'VISÃO GERAL',squad:'TEAM MANAGER',ranking:'RANKING',market:'MERCADO',training:'TREINOS',strategy:'TÁTICAS & OLHEIROS',competition:'CAMPEONATO'})[view]}</b></span><div><b class="week">● SEMANA ${String(Math.min(career().week,14)).padStart(2,'0')} / 14</b><button data-action="reset" class="reset">↻ &nbsp;Reiniciar</button></div></header><div class="content">${({overview:overview,squad:squadView,ranking:ranking,market:market,training:training,strategy:strategy,competition:competition})[view]()}</div></main></div>`;
  if(view==='overview')$('.matchup')?.insertAdjacentHTML('afterend',upcomingIntel());
  if(view==='strategy')$('.tactics-list')?.insertAdjacentHTML('afterend',pingEditor());
  if(view==='training')$('#lab-agent-assignment')?.insertAdjacentHTML('beforeend',agentTraining());
  document.querySelectorAll<HTMLElement>('[data-view]').forEach(el=>el.onclick=()=>{view=el.dataset.view! as View;selected=null;profileOpen=false;render()});
  document.querySelectorAll<HTMLElement>('[data-action]').forEach(el=>el.onclick=()=>action(el.dataset.action!,el.dataset.id!));
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
function renderCreate(){
  $('#app').innerHTML=`<div class="create-screen"><header class="create-header"><div class="brand"><span class="brand-symbol">V<span></span></span><div><strong>TACTICAL</strong><small>VALORANT MANAGER</small></div></div><span>CARREIRA / NOVO JOGO</span></header><section class="create-intro"><small class="eyebrow">01 / NOVA CARREIRA</small><h1>ASSUMA O <em>COMANDO.</em></h1><p>Escolha sua organização e monte seu time para a temporada 2026.</p></section><div class="create-grid"><section><h2>Escolha seu time</h2><p>Organizações e elencos reais do circuito VCT. Atributos e contratos simulados.</p><div class="team-picker">${TEAMS.map(t=>`<button class="team-choice ${createTeam===t.id?'chosen':''}" data-create-team="${t.id}" style="--club:${t.color}">${logo(t)}<b>${t.name}</b><small>VCT ${t.region}</small><span>OVR ${t.power}</span></button>`).join('')}</div></section><aside class="create-options"><h2>Seu perfil</h2><label for="manager-name">NOME DO MANAGER</label><input id="manager-name" maxlength="24" placeholder="Digite seu nome" value="${esc(window.createManager||'')}"/><h2>Nível de desafio</h2>${[['normal','Padrão','Orçamento de $ 1.450 mil'],['hard','Desafiante','Orçamento de $ 950 mil']].map(([id,name,desc])=>`<button class="difficulty ${createDifficulty===id?'chosen':''}" data-difficulty="${id}"><b>${name}</b><small>${desc}</small></button>`).join('')}<div class="create-summary"><small class="eyebrow">RESUMO DA CARREIRA</small><div>CLUBE <b>${team(createTeam).name}</b></div><div>LIGA <b>VCT ${team(createTeam).region}</b></div><div>TEMPORADA <b>2026 · 14 RODADAS</b></div></div><button id="start" class="primary">INICIAR CARREIRA <span>↗</span></button><p id="create-error" role="alert"></p></aside></div></div>`;
  $('#manager-name').oninput=e=>window.createManager=(e.target as HTMLInputElement).value;
  document.querySelectorAll<HTMLElement>('[data-create-team]').forEach(el=>el.onclick=()=>{createTeam=el.dataset.createTeam!;render()});
  document.querySelectorAll<HTMLElement>('[data-difficulty]').forEach(el=>el.onclick=()=>{createDifficulty=el.dataset.difficulty!;render()});
  $('#start').onclick=()=>{const name=$('#manager-name').value.trim();if(!name){$('#create-error').textContent='Digite o nome do manager.';return}state=newState(createTeam,name,createDifficulty);save();view='squad';render()};
}
function overview(){const t=team(career().team),o=opponent();return `<section class="hero"><div><small>● CENTRAL DE COMANDO / SEMANA ${String(Math.min(career().week,14)).padStart(2,'0')}</small><h1>${career().week>14?'TEMPORADA<br><em>ENCERRADA.</em>':'O PRÓXIMO<br><em>CAPÍTULO</em> COMEÇA AQUI.'}</h1><p>${career().week>14?`${career().wins} vitórias, ${career().losses} derrotas e ${career().points} pontos.`:'Monte seu elenco. Defina a estratégia. Deixe sua marca no circuito.'}</p><button class="primary" data-action="${career().week>14?'reset':'simulate'}">${career().week>14?'NOVA CARREIRA':'SIMULAR PRÓXIMA PARTIDA'} <span>↗</span></button>${career().week<=14?'<button class="watch-match" data-action="watch">▷ ASSISTIR PARTIDA</button>':''}</div><strong>${String(Math.min(career().week,14)).padStart(2,'0')}</strong></section><div class="stats-grid"><article><small>ORÇAMENTO DISPONÍVEL</small><b>${cash(career().money)}</b><span>Transferências e salários</span></article><article><small>OVERALL DO ELENCO</small><b>${avg()} <em>/ 100</em></b><div class="meter"><i style="width:${avg()}%"></i></div></article><article><small>CAMPANHA</small><b>${career().wins}V <em>—</em> ${career().losses}D</b><span>${career().points} pontos na temporada</span></article><article><small>TORCIDA</small><b>${Math.round(career().fans/1000)}K</b><span>Seguidores do clube</span></article></div><div class="overview-grid"><section class="panel"><div class="panel-head"><div><small class="eyebrow">AGENDA</small><h2>Próximo confronto</h2></div><span class="tag">BO3 · SEMANA ${Math.min(career().week,14)}</span></div><div class="matchup"><div>${logo(t)}<b>${t.name}</b><small>SEU TIME</small></div><strong>VS</strong><div>${logo(o)}<b>${o.name}</b><small>${o.region}</small></div></div><div class="panel-foot"><span>VCT ${t.region}</span><button data-view="competition">Ver calendário ↗</button></div></section><section class="panel"><div class="panel-head"><div><small class="eyebrow">BASTIDORES</small><h2>Últimas notícias</h2></div></div><div class="news">${career().log.slice(0,3).map(l=>`<div><i>${l.kind==='win'?'↑':l.kind==='loss'?'↓':'◇'}</i><span><b>${esc(l.title)}</b><small>${esc(l.body)}</small></span></div>`).join('')}</div></section></div>`}
const agentOf = (id: string) => agentsData.find(a=>a.id===id) || agentsData[0];
const agentIcon = (id: string,cls='') => `<img class="${cls}" src="/assets/agents/${agentOf(id).id}.png" alt="${esc(agentOf(id).name)}" loading="lazy">`;
function playerModal(p: Player){
  const agent=agentOf(p.agent),isStarter=career().players.indexOf(p)<5;
  return `<div class="profile-overlay" data-close-modal><section class="profile-modal" role="dialog" aria-modal="true" aria-label="Perfil de ${esc(p.alias)}"><button class="modal-close" data-action="close-profile" aria-label="Fechar perfil">×</button><div class="profile-hero" style="--club:${team(p.source).color}">${photo(p)}<div><small>${team(p.source).tag} · ${p.role.toUpperCase()}</small><h2>${esc(p.alias)}</h2><p>${esc(p.real)}</p><span class="profile-overall">OVR <b>${p.rating}</b></span></div></div><div class="profile-content"><div class="detail-stats"><div><small>ENERGIA</small><b>${p.energy}%</b></div><div><small>MORAL</small><b>${p.morale}%</b></div><div><small>SALÁRIO / SEM.</small><b>${cash(p.salary)}</b></div></div><div class="profile-fields"><label>FUNÇÃO<select id="player-role" class="role-select">${ROLE.map(role=>`<option value="${role}" ${p.role===role?'selected':''}>${role}</option>`).join('')}</select></label><label>NÚMERO DA CAMISA<input id="shirt-number" type="number" min="1" max="99" value="${p.number}"></label></div><div class="agent-assignment">${agentIcon(agent.id)}<div><small>AGENTE ATRIBUÍDO</small><b>${agent.name}</b><span>Domínio ${p.agentMastery?.[agent.id]??48}%</span></div></div><label class="agent-select-label">TROCAR AGENTE<select id="player-agent" class="role-select">${agentsData.map(a=>`<option value="${a.id}" ${p.agent===a.id?'selected':''}>${a.name} · ${a.role}</option>`).join('')}</select></label><div class="profile-actions">${career().captain===p.id?'<span class="captain-badge">★ CAPITÃO</span>':isStarter?`<button data-action="captain" data-id="${p.id}">DEFINIR CAPITÃO</button>`:''}${!isStarter?`<button data-action="start" data-id="${p.id}">ESCALAR TITULAR</button>`:career().players.length>5?`<button data-action="bench" data-id="${p.id}">MOVER PARA RESERVA</button>`:''}<button data-action="train-agent" data-id="${p.id}">TREINAR AGENTE ↗</button></div></div></section></div>`;
}
function squadView(){
  const t=team(career().team),p=career().players.find(x=>x.id===selected)||career().players[0];
  return `<div class="page-title"><div><small class="eyebrow">GESTÃO DE ELENCO / VCT 2026</small><h1>TEAM <em>MANAGER.</em></h1><p>Os cinco titulares ficam lado a lado. Clique em um atleta para abrir seu perfil.</p></div><div class="overall-box"><small>OVERALL DO TIME</small><b>${avg()}</b><span>5 TITULARES</span></div></div><section class="panel lineup-panel lineup-wide"><div class="panel-head"><div><small class="eyebrow">PALCO VCT</small><h2>Escalação principal</h2></div><span class="tag">CAPITÃO: ${esc(career().players.find(x=>x.id===career().captain)?.alias||'—').toUpperCase()}</span></div><div class="arena-stage" style="--club:${t.color}"><div class="arena-header"><span class="live-indicator">● AO VIVO</span><span>VCT 2026 / ESTAÇÕES DE JOGO</span><span>BO3</span></div><div class="arena-light"></div><div class="station-row">${starters().map((pl,i)=>`<button class="station" data-player="${pl.id}"><span class="station-number">ESTAÇÃO ${String(i+1).padStart(2,'0')}</span><span class="station-monitor"><span class="monitor-screen">${logo(t)}<i>TACTICAL</i></span><span class="monitor-neck"></span><span class="monitor-base"></span></span><span class="station-player">${photo(pl)}<span class="station-headset"></span></span><span class="station-desk"><span class="station-keyboard"></span><span class="station-mouse"></span></span><span class="station-name"><b>${career().captain===pl.id?'★ ':''}${esc(pl.alias)}</b><small>${pl.role.toUpperCase()} · ${agentOf(pl.agent).name}</small></span><span class="station-rating">${pl.rating}<small>OVR</small></span></button>`).join('')}</div><div class="arena-footer">${logo(t)}<span>${t.name.toUpperCase()}</span><strong>●</strong><small>CLIQUE PARA GERENCIAR</small></div></div><div class="bench"><div><small class="eyebrow">BANCO DE RESERVAS</small><b>${Math.max(0,career().players.length-5)} atletas</b></div><div class="bench-list">${career().players.slice(5).length?career().players.slice(5).map(pl=>`<button class="bench-player" data-player="${pl.id}">${photo(pl)}<span><b>${esc(pl.alias)}</b><small>${pl.role} · ${agentOf(pl.agent).name}</small></span><strong>${pl.rating}</strong></button>`).join(''):'<p>Sem reservas. Contrate jogadores no Mercado.</p>'}</div></div></section><div class="squad-lower"><section class="panel roster-panel"><div class="panel-head"><div><small class="eyebrow">PLANEJAMENTO</small><h2>Elenco completo <span>(${career().players.length})</span></h2></div><span class="tag">FOLHA ${cash(payroll())} / SEM.</span></div><div class="table-wrap"><table><thead><tr><th>ATLETA</th><th>FUNÇÃO</th><th>AGENTE</th><th>CAMISA</th><th>OVR</th><th>K / A / D</th><th>STATUS</th></tr></thead><tbody>${career().players.map((pl,i)=>`<tr data-player="${pl.id}"><td>${photo(pl)}<span><b>${esc(pl.alias)} ${career().captain===pl.id?'★':''}</b><small>${esc(pl.real)}</small></span></td><td>${pl.role}</td><td>${agentOf(pl.agent).name}</td><td>#${String(pl.number).padStart(2,'0')}</td><td><strong>${pl.rating}</strong></td><td>${pl.stats.kills} / ${pl.stats.assists} / ${pl.stats.deaths}</td><td><span class="status ${i<5?'starter':''}">${i<5?'TITULAR':'RESERVA'}</span></td></tr>`).join('')}</tbody></table></div></section><section class="panel kit-panel"><div class="panel-head"><div><small class="eyebrow">IDENTIDADE DO CLUBE</small><h2>Uniforme</h2></div></div><div class="kit-body"><div class="jersey ${career().kit==='away'?'away':''}" style="--shirt:${career().kit==='away'?t.secondary:t.color};--trim:${career().kit==='away'?t.color:t.secondary}"><div class="jersey-sleeve left"></div><div class="jersey-sleeve right"></div><div class="jersey-body"><span class="jersey-collar"></span>${logo(t)}<b>${t.tag}</b><strong>${p.number}</strong></div></div><div class="kit-options"><button data-kit="home" class="${career().kit==='home'?'active':''}"><i style="background:${t.color}"></i> PRINCIPAL</button><button data-kit="away" class="${career().kit==='away'?'active':''}"><i style="background:${t.secondary}"></i> RESERVA</button><small>Visual conceitual com cores do clube.</small></div></div></section></div>${profileOpen?playerModal(p):''}`;
}
function ranking(){
  const sorted=[...career().players].sort((a,b)=>b.stats[rankingStat]-a.stats[rankingStat]||b.rating-a.rating);
  const labels={kills:'ABATES',assists:'ASSISTÊNCIAS',deaths:'MORTES'};
  return `<div class="page-title"><div><small class="eyebrow">NÚMEROS DA TEMPORADA</small><h1>RANKING DE <em>ATLETAS.</em></h1><p>Estatísticas simuladas das partidas da sua carreira.</p></div><div class="overall-box"><small>SÉRIES JOGADAS</small><b>${career().wins+career().losses}</b></div></div><div class="ranking-tabs">${Object.entries(labels).map(([key,label])=>`<button data-ranking="${key}" class="${rankingStat===key?'active':''}">${label}</button>`).join('')}</div><div class="ranking-podium">${sorted.slice(0,3).map((p,i)=>`<article><span>${String(i+1).padStart(2,'0')}</span>${photo(p)}<b>${esc(p.alias)}</b><small>${p.role} · ${agentOf(p.agent).name}</small><strong>${p.stats[rankingStat]}</strong><em>${labels[rankingStat]}</em></article>`).join('')}</div><section class="panel"><div class="panel-head"><h2>Classificação do elenco</h2><span class="tag">CARREIRA 2026</span></div><div class="table-wrap"><table><thead><tr><th>#</th><th>ATLETA</th><th>MAPAS</th><th>ABATES</th><th>ASSISTÊNCIAS</th><th>MORTES</th><th>K/D</th></tr></thead><tbody>${sorted.map((p,i)=>`<tr><td>${String(i+1).padStart(2,'0')}</td><td>${photo(p)}<span><b>${esc(p.alias)}</b><small>${p.role}</small></span></td><td>${p.stats.maps||0}</td><td><strong>${p.stats.kills}</strong></td><td>${p.stats.assists}</td><td>${p.stats.deaths}</td><td>${p.stats.deaths?(p.stats.kills/p.stats.deaths).toFixed(2):'—'}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function market(){return `<div class="page-title"><div><small class="eyebrow">JANELA DE TRANSFERÊNCIAS</small><h1>REFORCE O <em>ESQUADRÃO.</em></h1><p>Atletas reais de outros clubes. Transferências e valores são simulados.</p></div><div class="overall-box"><small>CAIXA</small><b class="cash-label">${cash(career().money)}</b></div></div><div class="market-grid">${career().market.map(p=>`<article class="market-card"><div class="market-top">${photo(p)}<div><small>${team(p.source).name}</small><h2>${esc(p.alias)}</h2><p>${esc(p.real)}</p></div><strong>${p.rating}</strong></div><div class="market-details"><span>${p.role}</span><span>SALÁRIO ${cash(p.salary)}</span></div><div class="market-buy"><b>${cash(p.price)}</b><button data-action="buy" data-id="${p.id}" ${career().money<p.price?'disabled':''}>CONTRATAR ↗</button></div></article>`).join('')}</div>`}
function training(){return trainingHub(career(),MAPS,esc)}
function competition(){const opponents=TEAMS.filter(t=>t.id!==career().team);return `<div class="page-title"><div><small class="eyebrow">CIRCUITO COMPETITIVO</small><h1>RUMO AO <em>TOPO.</em></h1><p>Temporada fictícia de 14 semanas inspirada no VCT.</p></div><div class="overall-box"><small>PONTOS</small><b>${career().points}</b></div></div><div class="overview-grid"><section class="panel"><div class="panel-head"><h2>Calendário</h2>${career().week<=14?'<button class="watch-match" data-action="watch">▷ ASSISTIR PARTIDA</button>':'<span class="tag">TEMPORADA 2026</span>'}</div><div class="schedule">${Array.from({length:14},(_,i)=>{const t=opponents[i%7];return `<div class="schedule-row ${i+1===career().week?'current':''}"><span>SEM ${String(i+1).padStart(2,'0')}</span>${logo(t)}<b>${t.name}</b><strong>${i+1<career().week?'CONCLUÍDO':i+1===career().week?'PRÓXIMO':'AGENDADO'}</strong></div>`}).join('')}</div></section><section class="panel"><div class="panel-head"><h2>Classificação</h2><span class="tag">CIRCUITO GLOBAL</span></div><div class="schedule">${[...TEAMS].sort((a,b)=>(b.id===career().team?career().points:Math.round(b.power*.12))-(a.id===career().team?career().points:Math.round(a.power*.12))).map((t,i)=>`<div class="schedule-row ${t.id===career().team?'ours':''}"><span>${String(i+1).padStart(2,'0')}</span>${logo(t)}<b>${t.name}</b><strong>${t.id===career().team?career().points:Math.round(t.power*.12)} PTS</strong></div>`).join('')}</div><div class="data-note">Pontuações dos rivais são simuladas.</div></section></div>`}
function action(type: string,id=''){
  if(type==='reset'){if(confirm('Reiniciar a carreira e apagar o progresso local?')){localStorage.removeItem(KEY);localStorage.removeItem('tactical-career-v2');state=null;view='overview';render()}return}
  if(type==='close-profile'){profileOpen=false;render();return}
  if(type==='train-agent'){career().trainingPlayer=id;career().trainingAthletes=[id];career().focus='agent';career().trainingKind='agent-match';profileOpen=false;view='training'}
  if(type==='start'){const i=career().players.findIndex(p=>p.id===id);if(i>4){const [p]=career().players.splice(i,1);career().players.splice(4,0,p);selected=p.id}}
  if(type==='bench'){const i=career().players.findIndex(p=>p.id===id);if(i>=0&&i<5&&career().players.length>5){const [p]=career().players.splice(i,1);career().players.splice(5,0,p);selected=p.id}}
  if(type==='captain'&&starters().some(p=>p.id===id)){career().captain=id;const p=career().players.find(x=>x.id===id)!;career().log.unshift({kind:'info',title:'Novo capitão',body:`${p.alias} assumiu a liderança do quinteto.`})}
  if(type==='scout'&&id!==career().team&&mapStats[id]&&!career().scoutReports[id]&&career().money>=40){career().money-=40;career().scoutReports[id]={week:career().week};career().log.unshift({kind:'info',title:'Relatório de olheiros',body:`Mapas mais jogados por ${team(id).name}: ${preferredMaps(id).join(', ')}.`})}
  if(type==='buy'){const i=career().market.findIndex(p=>p.id===id);if(i>=0&&career().money>=career().market[i].price){const [p]=career().market.splice(i,1);career().money-=p.price;p.number=Array.from({length:99},(_,n)=>n+1).find(n=>!career().players.some(x=>x.number===n))??p.number;career().players.push(p);career().log.unshift({kind:'info',title:'Nova contratação',body:`${p.alias} chegou ao elenco por ${cash(p.price)}.`})}}
  if(['watch','simulate'].includes(type)&&career().week<=14){
    openMapVeto({own:team(career().team).tag,opponent:opponent().tag,preferred:preferredMaps(opponent().id),trainingMap:career().trainingMap,mastery:career().mapMastery,escape:esc,onStart:veto=>{
      simulateSeries(type==='watch',veto);
      if(type!=='watch'){ensureSystems();save();render()}
    }});
    return;
  }
  ensureSystems();save();render();
}
function simulateSeries(watch=false,veto: Veto | null=null){
  const ownPlayers=starters().map(p=>({...p}));
  const enemyPlayers=rosterData[opponent().id].players.slice(0,5).map((p,i)=>({...p,agent:agentsData.find(a=>a.role===ROLE[i])?.id||agentsData[i].id}));
  const units=[...ownPlayers,...enemyPlayers];
  const o=opponent(),maps=veto?veto.maps.map(entry=>entry.map):matchMaps(o.id),energy=starters().reduce((n,p)=>n+p.energy,0)/5;
  const coverage=roleCoverage(),captain=starters().find(p=>p.id===career().captain);
  const agentBonus=starters().reduce((n,p)=>n+((p.agentMastery[p.agent]??48)-48)*.06+(agentOf(p.agent).role===p.role ? .5 : 0),0)/5;
  const results: SeriesMap[]=[];
  let ownWins=0,oppWins=0;
  for(let i=0;i<maps.length&&ownWins<2&&oppWins<2;i++){
    const map=maps[i],mastery=(career().mapMastery[map]-48)*.1;
    const tacticAdvantage=tacticBonus(map);
    const scoutBonus=career().scoutReports[o.id]?1.5:0;
    const focusBonus=career().focus==='strategy'?3:career().focus==='team'?2:career().focus==='aim'?1.5:career().focus==='map'&&career().trainingMap===map?3:0;
    const roleBonus=coverage===4?2:coverage===3?0:-2;
    const captainBonus=(captain?.morale??0)>=70?1:0;
    const opponentRank=preferredMaps(o.id).indexOf(map);
    const opponentMapBonus=opponentRank<0?0:3-opponentRank;
    const strength=avg()-o.power+mastery+agentBonus+tacticAdvantage+scoutBonus+focusBonus+roleBonus+captainBonus+(energy-70)*.14-opponentMapBonus-(career().difficulty==='hard'?5:0);
    const chance=Math.max(.18,Math.min(.82,.5+strength*.035));
    const win=Math.random()<chance;
    ownWins+=Number(win);oppWins+=Number(!win);
    results.push({map,win,ownStartsAttack:veto?.maps[i].ownStartsAttack??true,simulation:createMapSimulation(win,units,Math.random,veto?.maps[i].ownStartsAttack??true)});
  }
  const finish=()=>{
  const win=ownWins>oppWins,score=`${ownWins}–${oppWins}`;
  career().wins+=Number(win);career().losses+=Number(!win);career().points+=win?3:0;
  career().money+=win?210:95;career().fans+=win?4200:700;
  career().lastMatch={opp:o.name,score,win,veto:veto?structuredClone(veto):null,maps:results.map(({map,win,simulation,ownStartsAttack})=>({map,win,ownStartsAttack,score:simulation.score}))};
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
  career().players.forEach((p,i)=>{p.energy=Math.max(35,Math.min(100,p.energy+(i<5?(career().focus==='rest'?16:-9):5)));if(i<5){p.morale=Math.max(35,Math.min(100,p.morale+(win?6:-5)));if(career().focus!=='rest'&&Math.random()<.26)p.rating=Math.min(99,p.rating+1)}});
  career().money=Math.max(0,career().money-Math.round(payroll()*.1));
  career().week++;
  };
  if(watch)watchSeries({maps:results,players:units,own:team(career().team).tag,opponent:o.tag,escape:esc,onFinish:()=>{finish();ensureSystems();save();render()}});
  else finish();
}

render();
