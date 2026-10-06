import {planRoundMovement,tacticalPosition,type TacticalRoute} from './tactical-movement.ts';
import type { WatchOptions, Navigation } from '../types/game.ts';
import { MatchAudio } from './match-audio.ts';
import {broadcastLayout, killFeedRow, weaponIcon, objectiveIcon} from '../ui/match-broadcast.ts';
import type { MatchRenderer, CameraMode } from './match-renderer.ts';

const REPLAY_TIME_SCALE = .15;

export function watchSeries(options: WatchOptions) {
  const {maps,players,own,opponent,escape,onFinish}=options;
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const overlay = document.createElement('div');
  overlay.className='match-page broadcast-overlay';
  overlay.innerHTML=broadcastLayout(options);
  const root=document.getElementById('app')!;
  const previousPage=[...root.childNodes];
  const previousURL=location.href;
  const previousTitle=document.title;
  root.replaceChildren(overlay);
  history.pushState({match:true},'', '#/match');
  document.title=`${own} × ${opponent} | Partida assistida`;
  window.scrollTo(0,0);
  const q = <T extends HTMLElement = HTMLElement>(selector: string): T => {
    const element = overlay.querySelector<T>(selector);
    if (!element) throw new Error(`Controle ausente: ${selector}`);
    return element;
  };
  const rows = [...overlay.querySelectorAll<HTMLButtonElement>('[data-roster]')];
  let mapIndex=0, roundIndex=0, elapsed=0, paused=false, speed=1, last=performance.now(), frame=0, finished=false;
  let renderer: MatchRenderer | null = null;
  let selectedPlayer: number | null = null, cameraMode: CameraMode = 'tactical';
  let lastDead = new Set<number>();
  const audio = new MatchAudio();
  let loadingTimer:ReturnType<typeof setTimeout>|undefined;
  let loadingStarted=0;
  let splashReady:Promise<void>=Promise.resolve();
  const loading=document.createElement('section');
  loading.className='match-loading';
  loading.setAttribute('aria-label','Carregamento do mapa');
  overlay.append(loading);
  let score=[0,0], series=[0,0], totals=players.map(()=>({kills:0,deaths:0,assists:0}));
  const finish=()=>{if(finished)return;finished=true;cancelAnimationFrame(frame);clearTimeout(loadingTimer);window.removeEventListener('popstate',finish);renderer?.destroy();audio.destroy();root.replaceChildren(...previousPage);history.replaceState(null,'',previousURL);document.title=previousTitle;onFinish();if(previousFocus?.isConnected)previousFocus.focus();};
  window.addEventListener('popstate',finish);
  function showLoading(){
    loadingStarted=performance.now();
    const map=maps[mapIndex].map;
    loading.dataset.map=map;
    loading.hidden=false;
    q('.match-viewer').inert=true;
    overlay.classList.add('is-loading');
    loading.innerHTML=`<img class="match-loading-image" src="/assets/maps/${encodeURIComponent(map.toLowerCase())}-splash.jpg" alt="${escape(map)}"><div class="match-loading-grid" aria-hidden="true"></div><header><span>VCT / PARTIDA ASSISTIDA</span><button type="button" data-loading-skip>PULAR PARA RESULTADO ↗</button></header><div class="match-loading-title"><small>MAPA ${mapIndex+1} / ${maps.length}</small><h1>${escape(map.toUpperCase())}</h1><p>${escape(own)} <span>VS</span> ${escape(opponent)}</p><ol class="match-loading-series" aria-label="Ordem dos mapas">${maps.map((entry,index)=>`<li ${index===mapIndex?'aria-current="step"':''}><small>MAPA ${index+1}</small><b>${escape(entry.map.toUpperCase())}</b></li>`).join('')}</ol></div><footer><span class="match-loading-symbol" aria-hidden="true">◇</span><div><b role="status">CARREGANDO MAPA</b><div class="match-loading-track" aria-hidden="true"><i></i></div></div><small>PREPARANDO O CAMPO DE BATALHA</small></footer>`;
    loading.querySelector<HTMLElement>('[data-loading-skip]')!.onclick=finish;
    const splash=loading.querySelector<HTMLImageElement>('img')!;
    splash.onerror=()=>{splash.style.display='none'};
    splashReady=splash.decode().catch(()=>{});
  }
  async function enterMap(){
    await Promise.all([renderer?.prepare(maps[mapIndex].map),splashReady]);
    if(finished)return;
    await new Promise<void>(resolve=>{loadingTimer=setTimeout(resolve,Math.max(0,1900-(performance.now()-loadingStarted)))});
    if(finished)return;
    startRound();
    loading.hidden=true;overlay.classList.remove('is-loading');q('.match-viewer').inert=false;
    q('.match-viewer').focus();
    last=performance.now();frame=requestAnimationFrame(draw);
  }
  showLoading();
  q('.sim-finish').onclick=finish;
  q('.sim-event-filter').onclick=()=>{
    const button=q('.sim-event-filter'), expanded=button.getAttribute('aria-pressed')!=='true';
    button.setAttribute('aria-pressed',String(expanded));button.textContent=expanded?'Ver recentes':'Ver todos';
    q('.sim-feed').classList.toggle('show-all',expanded);
  };
  q('.sim-pause').onclick=()=>{paused=!paused;q('.sim-pause').textContent=paused?'CONTINUAR':'PAUSAR';};
  q<HTMLSelectElement>('.sim-speed').onchange=()=>speed=Number(q<HTMLSelectElement>('.sim-speed').value);
  q('.sim-audio').onclick=async()=>{
    try {
      const enabled=await audio.toggle();
      if(finished)return;
      q('.sim-audio').textContent=enabled?'SOM: LIGADO':'SOM: DESLIGADO';
      q('.sim-audio').setAttribute('aria-pressed',String(enabled));
    } catch { if(!finished)q('.sim-audio').textContent='SOM INDISPONÍVEL'; }
  };
  const modeLabels = {tactical:'TÁTICA 3D',follow:'TERCEIRA PESSOA',player:'VISÃO DO ATLETA'};
  function updateCameraUI(){
    q<HTMLSelectElement>('.sim-camera-mode').value=cameraMode;
    q('.sim-map').dataset.cameraMode=cameraMode;
    q('.sim-map').dataset.playerDead=String(selectedPlayer!==null&&lastDead.has(selectedPlayer));
    rows.forEach((row,i)=>row.setAttribute('aria-pressed',String(i===selectedPlayer)));
    q('.sim-player-card').hidden=selectedPlayer===null;
    q('.sim-camera-label').textContent=selectedPlayer===null?modeLabels[cameraMode]:`${modeLabels[cameraMode]} · ${players[selectedPlayer].alias}`;
    if(selectedPlayer!==null){
      const player=players[selectedPlayer],isDead=lastDead.has(selectedPlayer);
      q('.sim-player-name').textContent=player.alias;
      q('.sim-player-agent').textContent=`${player.agent.toUpperCase()} · ${selectedPlayer<5?own:opponent}`;
      q('.sim-player-state').textContent=isDead?'ELIMINADO · TROQUE DE ATLETA':'ACOMPANHANDO';
      q('.sim-player-card').dataset.dead=String(isDead);
      const portrait=overlay.querySelector<HTMLImageElement>('.sim-player-card img')!;
      const source=`/assets/agents/${player.agent}.png`;
      if(portrait.getAttribute('src')!==source)portrait.src=source;
    }
    const noLiving=players.every((_,id)=>lastDead.has(id));
    for(const selector of ['.sim-player-prev','.sim-player-next'])q<HTMLButtonElement>(selector).disabled=noLiving||!renderer;
  }
  const selectPlayer=(id: number | null)=>{
    selectedPlayer=id;
    cameraMode=id===null?'tactical':cameraMode==='player'?'player':'follow';
    renderer?.follow(id);
    q<HTMLInputElement>('.sim-zoom').value=id===null?'1':'2';
    updateCameraUI();
  };
  q<HTMLSelectElement>('.sim-view-mode').onchange=()=>{
    const flat=q<HTMLSelectElement>('.sim-view-mode').value==='2d';
    q('.sim-map').dataset.view=flat?'2d':'3d';q('.sim-plan-view').hidden=!flat;
    q('.sim-canvas').style.visibility=flat?'hidden':'visible';
  };
  overlay.querySelectorAll<HTMLButtonElement>('[data-plan-unit]').forEach((button,id)=>button.onclick=()=>selectPlayer(id));
  rows.forEach((row,id)=>row.onclick=()=>selectPlayer(row.getAttribute('aria-pressed')==='true'?null:id));
  q<HTMLSelectElement>('.sim-camera-mode').onchange=()=>{
    const mode=q<HTMLSelectElement>('.sim-camera-mode').value as CameraMode;
    if(mode==='tactical'){selectPlayer(null);return;}
    if(selectedPlayer===null){const id=players.findIndex((_,id)=>!lastDead.has(id));if(id<0)return;selectPlayer(id);}
    cameraMode=mode;renderer?.cameraMode(mode);updateCameraUI();
  };
  function cyclePlayer(direction: number){
    const start=selectedPlayer??(direction>0?-1:0);
    for(let offset=1;offset<=players.length;offset++){
      const id=(start+direction*offset+players.length)%players.length;
      if(!lastDead.has(id)){selectPlayer(id);return;}
    }
  }
  q('.sim-player-prev').onclick=()=>cyclePlayer(-1);
  q('.sim-player-next').onclick=()=>cyclePlayer(1);
  q('.sim-rotate-left').onclick=()=>renderer?.rotate(1);
  q('.sim-rotate-right').onclick=()=>renderer?.rotate(-1);
  q('.sim-camera-reset').onclick=()=>selectPlayer(null);
  q<HTMLInputElement>('.sim-zoom').oninput=()=>renderer?.zoom(Number(q<HTMLInputElement>('.sim-zoom').value));
  overlay.addEventListener('keydown',e=>{
    if(e.key==='Escape'){paused=true;q('.sim-pause').textContent='CONTINUAR';}
  });
  loading.querySelector<HTMLButtonElement>('button')!.focus();
  let applied=0, navigation: Record<string, Navigation>={}, routes:TacticalRoute[]=[], spikeDeathsApplied=false, objectiveEvents=new Set<string>();
  function addEvent(label:string,side:number,objective=false){
    overlay.querySelector('.broadcast-event-empty')?.remove();
    const seconds=Math.max(0,Math.ceil((maps[mapIndex].simulation.rounds[roundIndex].resolveAt-elapsed)/REPLAY_TIME_SCALE));
    const time=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
    q('.sim-feed').insertAdjacentHTML('afterbegin',`<div class="broadcast-event side-${side}"><time>${time}</time><span class="broadcast-event-icon">${objective?objectiveIcon:'×'}</span><span>${label}</span></div>`);
  }
  q<HTMLButtonElement>('.sim-pause').disabled=true;
  q('.sim-status').textContent='CARREGANDO ARENA 3D…';
  for(const control of overlay.querySelectorAll<HTMLButtonElement | HTMLSelectElement | HTMLInputElement>('.sim-camera-tools button,.sim-camera-tools select,.sim-camera-tools input,[data-roster]'))control.disabled=true;
  function startRound(){
    applied=0;elapsed=0;spikeDeathsApplied=false;objectiveEvents.clear();
    q('.sim-map').classList.remove('detonating');
    q('.sim-feed').innerHTML='<p class="broadcast-event-empty">Aguardando os primeiros eventos.</p>';
    q('.sim-killfeed').innerHTML='';
    const map=maps[mapIndex];
    q('.broadcast-map-name').textContent=map.map.toUpperCase();
    overlay.querySelector<HTMLImageElement>('.broadcast-map-preview')!.src=`/assets/maps/${map.map.toLowerCase()}-splash.jpg`;
    const round=map.simulation.rounds[roundIndex];
    rows.forEach((row,id)=>{
      const weapon=round.events.find(event=>event.killer===id)?.weapon??(roundIndex===0||roundIndex===12?'classic':'vandal');
      row.querySelector('.broadcast-loadout')!.innerHTML=weaponIcon(weapon);
    });
    q('.broadcast-rounds').innerHTML=Array.from({length:Math.max(24,map.simulation.rounds.length)},(_,id)=>{
      const complete=id<roundIndex, item=map.simulation.rounds[id];
      return `<span class="broadcast-round-slot ${id===roundIndex?'current':''} ${complete?`side-${item.winner} completed`:''}" ${id===roundIndex?'aria-current="step"':''} aria-label="Round ${id+1}${complete?`, vitória de ${escape(item.winner===0?own:opponent)}`:''}"><small>${String(id+1).padStart(2,'0')}</small><i>${complete?(item.outcome==='elimination'?'×':objectiveIcon):''}</i></span>`;
    }).join('');
    overlay.querySelector<HTMLImageElement>('.sim-minimap img')!.src=`/assets/maps/${map.map.toLowerCase()}-plan.png`;
    q('.sim-minimap-name').textContent=map.map.toUpperCase();overlay.querySelector<HTMLImageElement>('.sim-plan-view > img')!.src=`/assets/maps/${map.map.toLowerCase()}-plan.png`;
    const tactic=options.tactics?.[map.map];
    routes=planRoundMovement(navigation[map.map.toLowerCase()],map.map,round,(roundIndex<12)===(map.ownStartsAttack!==false),players,tactic,options.mapMastery?.[map.map]??48);
    q('.sim-tactic').textContent=`PLANO: ${tactic?.name??'Distribuição automática'}`;
    rows.forEach((row,id)=>{row.dataset.assignment=routes[id].assignment;row.title=`${players[id].alias} · ${routes[id].assignment}`;row.querySelector('.broadcast-assignment')!.textContent=routes[id].assignment});
  }
  function draw(now: number){
    const dt=Math.min((now-last)/1000,.1);last=now;
    overlay.classList.toggle('sim-paused',paused);
    // Source rounds are compressed; 1× now gives each event time to be read.
    if(!paused)elapsed+=dt*speed*REPLAY_TIME_SCALE;
    const map=maps[mapIndex], round=map.simulation.rounds[roundIndex];
    const attacksOwn=(roundIndex<12)===(map.ownStartsAttack!==false);
    const dead=new Set(round.events.filter(e=>e.time<=elapsed).map(e=>e.victim));
    if(round.spike&&elapsed>=round.resolveAt)round.spike.casualties.forEach(id=>dead.add(id));
    if(round.spike&&!spikeDeathsApplied&&elapsed>=round.resolveAt){
      round.spike.casualties.forEach(id=>totals[id].deaths++);spikeDeathsApplied=true;
    }
    const nav=navigation[map.map.toLowerCase()];
    const positions=players.map((_,i)=>{
      const death=round.events.find(e=>e.victim===i);
      const t=Math.min(elapsed,death?.time??elapsed);
      // All movement stays on cardinal grid edges, including at corners.
      return tacticalPosition(nav,routes[i],t);
    });
    overlay.querySelectorAll<HTMLElement>('[data-mini-unit]').forEach((marker,id)=>{
      marker.style.left=`${positions[id].x}%`;marker.style.top=`${positions[id].y}%`;
      marker.style.opacity=dead.has(id)?'.2':'1';marker.classList.toggle('selected',id===selectedPlayer);
    });
    lastDead=dead;updateCameraUI();
    rows.forEach((row,i)=>row.classList.toggle('dead',dead.has(i)));
    const headings=players.map((_,i)=>{
      if(dead.has(i))return {x:0,y:0};
      const future=tacticalPosition(nav,routes[i],elapsed+.08);
      let heading={x:future.x-positions[i].x,y:future.y-positions[i].y};
      if(Math.hypot(heading.x,heading.y)<.001){
        const opponents=positions.map((point,id)=>({point,id})).filter(({id})=>(id<5)!==(i<5)&&!dead.has(id));
        opponents.sort((a,b)=>Math.hypot(a.point.x-positions[i].x,a.point.y-positions[i].y)-Math.hypot(b.point.x-positions[i].x,b.point.y-positions[i].y));
        if(opponents[0])heading={x:opponents[0].point.x-positions[i].x,y:opponents[0].point.y-positions[i].y};
      }
      return heading;
    });
    while(applied<round.events.length && round.events[applied].time<=elapsed){
      const e=round.events[applied++];audio.cue('shot');totals[e.killer].kills++;totals[e.victim].deaths++;
      if(e.assist!==null)totals[e.assist].assists++;
      q('.sim-killfeed').insertAdjacentHTML('afterbegin',killFeedRow(e,players,escape));
      while(q('.sim-killfeed').children.length>5)q('.sim-killfeed').lastElementChild?.remove();
      addEvent(`${escape(players[e.killer].alias)} eliminou ${escape(players[e.victim].alias)}${e.assist!==null?` · assistência: ${escape(players[e.assist].alias)}`:''}`,e.killer<5?0:1);
    }
    rows.forEach((row,i)=>{
      row.querySelector('.sim-player-stats')!.textContent=`${totals[i].kills} / ${totals[i].assists} / ${totals[i].deaths}`;
      row.querySelector('.broadcast-hp')!.textContent=dead.has(i)?'ELIMINADO':'♥ 100';
      (row.querySelector('.broadcast-health i') as HTMLElement).style.width=dead.has(i)?'0%':'100%';
    });
    const spike=round.spike,over=elapsed>=round.resolveAt;
    const planting=spike&&elapsed>=spike.plantStart&&elapsed<spike.plantAt;
    const planted=spike&&elapsed>=spike.plantAt&&!over;
    const defusing=planted&&round.outcome==='defuse'&&elapsed>=spike.defuseStart!;
    const exploding=over&&round.outcome==='detonation';
    const objective=q('.sim-objective');
    objective.dataset.phase=exploding?'exploded':over?'resolved':defusing?'defusing':planted?'planted':planting?'planting':'approach';
    q('.spike-status').textContent=exploding?'SPIKE DETONADA':over?(round.outcome==='defuse'?'SPIKE DESARMADA':'ROUND ENCERRADO'):defusing?`${players[spike.defuser!].alias} DESARMANDO`:planted?`SPIKE PLANTADA · SITE ${round.site}`:planting?`${players[spike.planter].alias} PLANTANDO`:`EXECUÇÃO NO SITE ${round.site}`;
    q('.spike-clock').textContent=planted?`${Math.max(0,(spike.explodeAt-elapsed)/REPLAY_TIME_SCALE).toFixed(1)}s`:planting?'PLANT':'—';
    const progress=defusing?(elapsed-spike.defuseStart!)/(round.resolveAt-spike.defuseStart!):planted?1-(elapsed-spike.plantAt)/(spike.explodeAt-spike.plantAt):planting?(elapsed-spike.plantStart)/(spike.plantAt-spike.plantStart):0;
    q('.spike-progress i').style.width=`${Math.max(0,Math.min(1,progress))*100}%`;
    const anchor=tacticalPosition(nav,routes[spike?.planter??0],Infinity);
    overlay.querySelectorAll<HTMLElement>('[data-plan-unit]').forEach((marker,id)=>{
      marker.style.left=`${positions[id].x}%`;marker.style.top=`${positions[id].y}%`;
      marker.classList.toggle('dead',dead.has(id));marker.classList.toggle('selected',id===selectedPlayer);
    });
    q('.sim-plan-spike').style.left=`${anchor.x}%`;q('.sim-plan-spike').style.top=`${anchor.y}%`;
    renderer?.draw({map:map.map,round,roundKey:`${mapIndex}:${roundIndex}`,elapsed,delta:dt,positions,headings,dead,anchor,navigation:nav});
    q('.sim-map').classList.toggle('detonating',exploding);
    if(spike) {
      const messages: [string, number | null, string | null][]=[
        ['plant',spike.plantAt,`${escape(players[spike.planter].alias)} · SPIKE PLANTADA`],
        ['defuse',spike.defuseStart,spike.defuser!==null?`${escape(players[spike.defuser!].alias)} · DESARMANDO`:null],
        ['resolve',round.resolveAt,round.outcome==='detonation'?'◈ SPIKE DETONADA':'✓ SPIKE DESARMADA']
      ];
      for(const [id,time,label] of messages)if(label&&time!==null&&elapsed>=time&&!objectiveEvents.has(id)){
        objectiveEvents.add(id);
        audio.cue(id==='plant'?'plant':id==='defuse'?'defuse':round.outcome==='detonation'?'detonation':'round');
        addEvent(label,id==='defuse'?1-round.attacking:round.attacking,true);
      }
    }
    const outcomeLabel=round.outcome==='detonation'?' · SPIKE DETONADA':round.outcome==='defuse'?' · SPIKE DESARMADA':' · ELIMINAÇÃO';
    q('.sim-round-banner').textContent=over?`${round.winner===0?own:opponent} VENCE O ROUND${outcomeLabel}`:'';
    q('.sim-score').textContent=`${own} ${score[0]} : ${score[1]} ${opponent}`;
    q('.broadcast-own-score').textContent=String(score[0]);q('.broadcast-opponent-score').textContent=String(score[1]);
    q('.broadcast-round-number').textContent=`ROUND ${roundIndex+1} / ${Math.max(24,map.simulation.rounds.length)}`;
    const remaining=Math.max(0,Math.ceil((round.resolveAt-elapsed)/REPLAY_TIME_SCALE));
    q('.broadcast-clock').textContent=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
    q('.broadcast-side').textContent=attacksOwn?'ATAQUE':'DEFESA';
    for(const side of [0,1])q(`[data-alive="${side}"]`).textContent=`${players.filter((_,id)=>Math.floor(id/5)===side&&!dead.has(id)).length} VIVOS`;
    q('.sim-status').textContent=`${map.map} · MAPA ${mapIndex+1} · ROUND ${roundIndex+1} · ${attacksOwn?'ATAQUE':'DEFESA'} · SÉRIE ${series.join(' : ')}`;
    if(elapsed>=round.duration){
      if(!round.spike)audio.cue('round');
      score[round.winner]++;roundIndex++;
      if(roundIndex===map.simulation.rounds.length){
        series[map.win?0:1]++;mapIndex++;roundIndex=0;score=[0,0];
        if(mapIndex===maps.length){finish();return;}
        showLoading();void enterMap().catch(showLoadError);return;
      }
      startRound();
    }
    frame=requestAnimationFrame(draw);
  }
  Promise.all([
    fetch('/assets/maps/navigation.json',{signal:AbortSignal.timeout(20000)}).then(response=>{
      if(!response.ok)throw new Error('Navigation unavailable');
      return response.json() as Promise<Record<string, Navigation>>;
    }),
    import('./match-renderer.ts'),
  ]).then(async ([data, {createMatchRenderer}])=>{
    if(finished)return;
    if(maps.some(map=>!data[map.map.toLowerCase()]?.walk?.some(Boolean)))throw new Error('Missing walkable map');
    navigation=data;
    const view=createMatchRenderer(q('.sim-canvas'),maps.map(map=>map.map),players,selectPlayer,navigation);
    renderer=view.renderer;
    await view.ready;
    if(finished)return;
    q<HTMLButtonElement>('.sim-pause').disabled=false;
    for(const control of overlay.querySelectorAll<HTMLButtonElement | HTMLSelectElement | HTMLInputElement>('.sim-camera-tools button,.sim-camera-tools select,.sim-camera-tools input,[data-roster]'))control.disabled=false;
    updateCameraUI();
    await enterMap();
  }).catch(showLoadError);
  function showLoadError(){
    if(finished)return;
    renderer?.destroy();renderer=null;
    loading.querySelector<HTMLElement>('[role="status"]')!.textContent='Não foi possível carregar o mapa. Pule para ver o resultado.';
    q('.sim-status').textContent='Não foi possível carregar o campo. Recarregue a página ou pule para ver o resultado.';
  }
}
