import type { CareerState, Team, View } from '../types/career.ts';
import { navIcon, NAV_ITEMS } from './navigation.ts';
import { tournamentAccess, tournamentRound, canPlayTournament } from '../game/tournaments.ts';

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 12h17m-6-6 6 6-6 6"/></svg>';
const mark = '<svg class="home-mark" viewBox="0 0 64 56" aria-hidden="true"><path fill="currentColor" d="M3 3v27l23 23h19L3 3Zm58 0L34 35h18l9-10V3Z"/></svg>';
const groups: {label:string; view:View; items?:View[]}[] = [
  {label:'Home',view:'overview'},
  {label:'Equipe',view:'squad',items:['squad','training','strategy','staff','basecamp']},
  {label:'Competições',view:'competition'},
  {label:'Transferências',view:'market',items:['market','scouting']},
  {label:'Gestão',view:'sponsors',items:['sponsors','finances','shop']},
  {label:'Estatísticas',view:'ranking'},
];
const labels:Partial<Record<View,string>> = {squad:'Elenco',training:'Treinamento',strategy:'Estratégias',staff:'Staff',basecamp:'Academia',market:'Mercado',scouting:'Olheiros',sponsors:'Patrocínios',finances:'Finanças',shop:'Loja'};

export function appNavigation(active:View, state:CareerState|null, portrait:string):string {
  const unread=state?.emails?.filter(email=>!email.read).length||0;
  return `<header class="app-navigation">
    <button class="home-brand" data-view="overview" aria-label="Home — VAVA manager">${mark}</button>
    <nav class="home-nav" aria-label="Navegação principal">${groups.map(group=>{
      const current=active===group.view||group.items?.includes(active);
      const button=`<button class="home-nav-link ${current?'active':''}" data-view="${group.view}" ${current?'aria-current="page"':''}>${group.label}</button>`;
      return group.items?`<div class="home-nav-group">${button}<details class="home-nav-dropdown"><summary aria-label="Mais opções de ${group.label}"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4 3 3 3-3"/></svg></summary><div class="home-nav-menu">${group.items.map(id=>`<button data-view="${id}" class="${active===id?'selected':''}">${navIcon(id)}${labels[id]||NAV_ITEMS.find(item=>item.id===id)?.label}</button>`).join('')}</div></details></div>`:button;
    }).join('')}</nav>
    <div class="home-account">
      <button class="home-icon-button home-notifications" data-view="mail" aria-label="Caixa de entrada${unread?` — ${unread} mensagens não lidas`:''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3Zm5 3h4M12 2v2"/></svg>${unread?'<i></i>':''}</button>
      <button class="home-profile" ${state?'data-action="manager-profile"':'data-home-start'}>${portrait?`<span class="home-avatar">${portrait}</span>`:`<span class="home-avatar home-avatar-empty">${navIcon('staff')}</span>`}<span><b>${esc(state?.manager||'Seu manager')}</b><small>${state?'Manager':'Nova carreira'}</small></span></button>
      <button class="home-icon-button" data-view="settings" aria-label="Configurações">${navIcon('settings')}</button>
    </div>
  </header>`;
}

interface HomeOptions {
  state:CareerState|null; own:Team; rival:Team; badge:(team:Team)=>string;
  portraits:string; calendar?:string; running?:boolean; feedback?:string;
  canPlay?:boolean; played?:boolean;
}

export function homeView({state,own,rival,badge,portraits,calendar='',running=false,feedback='',canPlay=false,played=false}:HomeOptions):string {
  const round=state?tournamentRound(state.week):null;
  const access=state&&round?tournamentAccess(state,round):null;
  const finished=!!state&&state.week>14;
  const pendingInvite=access==='invite'&&!finished;
  const available=!!state&&!finished&&canPlayTournament(state)&&!played;
  const progress=state?Math.min(100,finished?100:((state.week-1)*7+(state.day||1)-1)/98*100):0;
  const winRate=state&&state.wins+state.losses?Math.round(state.wins/(state.wins+state.losses)*100):0;
  const tasks=state?[
    {view:'squad',title:'Preparar a escalação',description:`${state.players.slice(0,5).length} titulares · ${own.name}`,done:state.players.length>=5},
    {view:'scouting',title:'Observar o adversário',description:state.scoutReports[rival.id]?'Relatório disponível':`Conheça o ${rival.name}`,done:!!state.scoutReports[rival.id]},
    {view:pendingInvite?'competition':'training',title:pendingInvite?'Responder ao convite':'Treinar a equipe',description:pendingInvite?round!.name:`Mapa em foco · ${state.trainingMap}`,done:!pendingInvite&&Object.values(state.trainingUsage||{}).some(item=>item.week===state.week&&item.count>0)},
  ]:[
    {view:'squad',title:'Escolher sua equipe',description:'Encontre sua organização no VCT',done:false},
    {view:'squad',title:'Criar seu manager',description:'Defina sua identidade e trajetória',done:false},
    {view:'competition',title:'Começar a temporada',description:'Sua jornada até o topo',done:false},
  ];
  const latest=state?.log[0];
  const primaryAction=!state?'data-home-start':finished?'data-action="open-calendar"':running?'data-action="stop-calendar"':pendingInvite||canPlay?'data-view="competition"':'data-action="advance-day"';
  const primaryText=!state?'INICIAR CARREIRA':finished?'VER TEMPORADA':running?'PAUSAR':pendingInvite?'VER CONVITE':canPlay?'DIA DE PARTIDA':'CONTINUAR';
  return `<div class="home-layout">
    <div class="home-main">
      <section class="home-hero" aria-labelledby="home-title">
        <span class="home-kicker">VALORANT · ESPORTS</span>
        <h1 id="home-title">VAVA<br>MANAGER</h1>
        <p class="home-motto"><i></i>BUILD · MANAGE · COMPETE</p>
        <button class="home-continue" ${primaryAction}>${primaryText}${arrow}</button>
        <div class="home-career-status">${state?`<span class="home-live-dot"></span><span class="week">${finished?'TEMPORADA ENCERRADA':`SEMANA ${String(state.week).padStart(2,'0')} · DIA ${state.day} / 7`}</span><span class="home-status-divider">/</span><span>${esc(own.name)}</span>`:'Sua equipe. Sua estratégia. Seu legado.'}</div>
        ${state?`<p class="home-feedback" role="status" aria-live="polite">${esc(feedback|| (pendingInvite?'Um novo convite espera por você.':canPlay?'Seu time está pronto para entrar no servidor.':finished?'Confira os resultados da sua temporada.':''))}</p>`:''}
      </section>
      <nav class="home-shortcuts" aria-label="Atalhos do clube">
        <button class="home-shortcut home-card-team" data-view="squad"><span class="home-card-art home-team-art" aria-hidden="true">${portraits}</span><span class="home-card-copy"><b>GERENCIAR EQUIPE</b><small>Elenco, táticas e staff</small></span>${arrow}</button>
        <button class="home-shortcut home-card-transfers" data-view="market"><span class="home-card-art home-transfer-art" aria-hidden="true"><img src="/assets/agents/chamber.png" alt=""><span class="home-transfer-lines"></span><span class="home-transfer-label">SCOUTING / VCT 2026</span></span><span class="home-card-copy"><b>TRANSFERÊNCIAS</b><small>Observe e contrate jogadores</small></span>${arrow}</button>
        <button class="home-shortcut home-card-competitions" data-view="competition"><span class="home-card-art home-competition-art" aria-hidden="true">${mark}<span>VCT</span></span><span class="home-card-copy"><b>COMPETIÇÕES</b><small>Circuito VCT e torneios</small></span>${arrow}</button>
        <button class="home-shortcut home-card-stats" data-view="ranking"><span class="home-card-art home-stats-art" aria-hidden="true"><svg viewBox="0 0 280 170" fill="none"><path d="M25 135h235M25 95h235M25 55h235" stroke="#ff4655" opacity=".12"/><path d="M40 135V115h25v20m25 0V98h25v37m25 0V83h25v52m25 0V52h25v83m25 0V22h25v113" fill="#ff4655" opacity=".16"/><path d="m38 114 48-13 44 4 44-39 42-13 35-33" stroke="#ff4655" stroke-width="2"/><g fill="#ff4655"><circle cx="38" cy="114" r="3"/><circle cx="86" cy="101" r="3"/><circle cx="130" cy="105" r="3"/><circle cx="174" cy="66" r="3"/><circle cx="216" cy="53" r="3"/><circle cx="251" cy="20" r="4"/></g></svg></span><span class="home-card-copy"><b>ESTATÍSTICAS</b><small>Desempenho e análise</small></span>${arrow}</button>
      </nav>
      ${state?`<div class="home-agenda-tools">${calendar}</div>`:''}
    </div>
    <aside class="home-widgets" aria-label="Resumo da carreira">
      <section class="home-widget home-next-match"><div class="home-widget-heading"><h2>PRÓXIMA PARTIDA</h2><span>${state?`VCT ${own.region}`:'SUA TEMPORADA'}</span></div>
        ${available?`<div class="home-matchup"><div>${badge(own)}<b>${esc(own.name)}</b></div><span>VS</span><div>${badge(rival)}<b>${esc(rival.name)}</b></div></div><p>${esc(round!.name)}<small>${canPlay?'Hoje':`${7-(state!.day||1)} dias`} · BO3</small></p>`:`<div class="home-match-empty">${navIcon('competition')}<b>${!state?'O palco espera por você':finished?'Temporada concluída':pendingInvite?'Você recebeu um convite':played?'Partida concluída':'Aguardando próxima etapa'}</b><p>${esc(!state?'Inicie sua carreira para entrar no circuito.':round!.name)}</p></div>`}
        <button class="home-widget-button" ${state?'data-view="competition"':'data-home-start'}>${pendingInvite?'VER CONVITE':!state?'ESCOLHER EQUIPE':'VER COMPETIÇÃO'}</button>
      </section>
      <section class="home-widget home-season"><div class="home-widget-heading"><h2>PROGRESSO DA TEMPORADA</h2><span>2026</span></div><div class="home-season-stats"><div><b>${state?`${Math.min(state.week,14)}<small> / 14</small>`:'—'}</b><span>SEMANA</span></div><div><b>${state?.wins??0}</b><span>VITÓRIAS</span></div><div><b>${state?.losses??0}</b><span>DERROTAS</span></div><div><b>${winRate}%</b><span>APROVEIT.</span></div></div><div class="home-progress" role="progressbar" aria-label="Progresso da temporada" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><i style="width:${progress}%"></i></div></section>
      <section class="home-widget home-tasks"><div class="home-widget-heading"><h2>TAREFAS DO MANAGER <i>${tasks.filter(task=>!task.done).length}</i></h2></div><div class="home-task-list">${tasks.map(task=>`<button data-view="${task.view}"><span class="home-task-check ${task.done?'done':''}" aria-label="${task.done?'Concluída':'Pendente'}">${task.done?'✓':''}</span><span><b>${esc(task.title)}</b><small>${esc(task.description)}</small></span><span class="home-task-arrow" aria-hidden="true">›</span></button>`).join('')}</div></section>
      <section class="home-widget home-latest"><div class="home-widget-heading"><h2>ÚLTIMAS NOTÍCIAS</h2><button ${state?'data-view="mail"':'data-home-start'}>Ver todas</button></div><button class="home-news-story" ${state?'data-action="home-news"':'data-home-start'}><span class="home-news-image">${mark}</span><span><b>${esc(latest?.title||'Uma nova história no VCT')}</b><small>${state?`Semana ${Math.min(state.week,14)} · ${own.tag}`:'Comece sua carreira em 2026'}</small></span></button></section>
    </aside>
  </div>`;
}
