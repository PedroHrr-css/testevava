import { roundPaths, pathPosition } from './navigation.ts';
import type { WatchOptions, Navigation } from '../types/game.ts';
import { MatchAudio } from './match-audio.ts';
import type { MatchRenderer, CameraMode } from './match-renderer.ts';

const REPLAY_TIME_SCALE = .15;

export function watchSeries({maps,players,own,opponent,escape,onFinish}: WatchOptions) {
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const overlay = document.createElement('div');
  overlay.className='match-overlay';
  overlay.innerHTML=`<section class="match-viewer" role="dialog" aria-modal="true" aria-label="Simulação da partida" tabindex="-1"><header class="match-header"><div><small>SIMULAÇÃO TÁTICA · BO3</small><h2>${escape(own)} <span>VS</span> ${escape(opponent)}</h2></div><button class="sim-finish">PULAR E VER RESULTADO ↗</button></header><div class="sim-toolbar"><strong class="sim-score"></strong><span class="sim-status" aria-live="polite"></span><div><button class="sim-pause">PAUSAR</button><button class="sim-audio" aria-pressed="false">SOM: DESLIGADO</button><label>VELOCIDADE <select class="sim-speed"><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label></div></div><div class="sim-objective"><span class="objective-dot"></span><div><small>OBJETIVO DO ROUND</small><b class="spike-status">CONTROLE DO MAPA</b></div><strong class="spike-clock">—</strong><div class="spike-progress"><i></i></div></div><div class="sim-layout"><div class="sim-map"><div class="sim-canvas" role="img" aria-label="Arena 3D animada. Arraste para girar a câmera ou selecione um atleta no elenco."></div><div class="sim-plan-view" hidden><img alt="Visão tática 2D do mapa">${players.map((p,id)=>`<button class="side-${id<5?0:1}" data-plan-unit="${id}" aria-label="Acompanhar ${escape(p.alias)}"><img src="/assets/agents/${p.agent}.png" alt=""><span>${escape(p.alias)}</span></button>`).join('')}<i class="sim-plan-spike">◆</i></div><div class="sim-minimap"><div class="sim-minimap-plan"><img alt="Planta do mapa para orientação">${players.map((_,id)=>`<i class="side-${id<5?0:1}" data-mini-unit="${id}"></i>`).join('')}</div><small class="sim-minimap-name"></small></div><div class="sim-player-card" hidden><img alt=""><div><small class="sim-player-state"></small><b class="sim-player-name"></b><span class="sim-player-agent"></span></div></div><div class="sim-reticle" aria-hidden="true"><i></i><i></i></div><div class="sim-camera-tools"><label>VISÃO <select class="sim-view-mode" aria-label="Visão da partida"><option value="3d">3D</option><option value="2d">2D</option></select></label><label>CÂMERA <select class="sim-camera-mode" aria-label="Modo da câmera"><option value="tactical">Tática 3D</option><option value="follow">Terceira pessoa</option><option value="player">Visão do atleta</option></select></label><div class="sim-player-switch"><button class="sim-player-prev" aria-label="Atleta vivo anterior">‹</button><button class="sim-player-next" aria-label="Próximo atleta vivo">›</button></div><div class="sim-camera-orbit"><button class="sim-rotate-left" aria-label="Girar câmera para a esquerda">↶</button><button class="sim-rotate-right" aria-label="Girar câmera para a direita">↷</button></div><button class="sim-camera-reset" aria-label="Mostrar mapa inteiro">MAPA INTEIRO</button><label>ZOOM <input class="sim-zoom" type="range" min="1" max="3" step="0.1" value="1" aria-label="Zoom da câmera"></label><span class="sim-camera-label">TÁTICA 3D</span></div><div class="sim-round-banner"></div></div><aside><h3>ELIMINAÇÕES</h3><div class="sim-feed"></div><h3>ELENCO · K / D</h3><div class="sim-roster">${players.map((p,i)=>`<button class="side-${i<5?0:1}" data-roster="${i}" aria-pressed="false" aria-label="Acompanhar ${escape(p.alias)}"><img src="/assets/agents/${p.agent}.png" alt=""><span>${escape(p.alias)}<small>${escape(p.agent)}</small></span><b>0 / 0</b></button>`).join('')}</div></aside></div><footer>Alterne entre a planta 2D e a arena 3D estilizada. Arraste para girar a câmera; use o elenco ou ‹ › para trocar de atleta. Pausa e velocidade controlam o replay.</footer></section>`;
  document.body.append(overlay);
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
  let score=[0,0], series=[0,0], totals=players.map(()=>({kills:0,deaths:0}));
  const finish=()=>{if(finished)return;finished=true;cancelAnimationFrame(frame);renderer?.destroy();audio.destroy();overlay.remove();onFinish();if(previousFocus?.isConnected)previousFocus.focus();};
  q('.sim-finish').onclick=finish;
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
    if(e.key==='Tab') {const items=[...overlay.querySelectorAll<HTMLElement>('button:not(:disabled),select,input')];const i=items.indexOf(document.activeElement as HTMLElement);e.preventDefault();items[(i+(e.shiftKey?-1:1)+items.length)%items.length].focus();}
  });
  q('.match-viewer').focus();
  let applied=0, navigation: Record<string, Navigation>={}, routes: number[][]=[], spikeDeathsApplied=false, objectiveEvents=new Set<string>();
  q<HTMLButtonElement>('.sim-pause').disabled=true;
  q('.sim-status').textContent='CARREGANDO ARENA 3D…';
  for(const control of overlay.querySelectorAll<HTMLButtonElement | HTMLSelectElement | HTMLInputElement>('.sim-camera-tools button,.sim-camera-tools select,.sim-camera-tools input,[data-roster]'))control.disabled=true;
  function startRound(){
    applied=0;elapsed=0;spikeDeathsApplied=false;objectiveEvents.clear();
    q('.sim-map').classList.remove('detonating');
    q('.sim-feed').innerHTML='';
    const map=maps[mapIndex];
    overlay.querySelector<HTMLImageElement>('.sim-minimap img')!.src=`/assets/maps/${map.map.toLowerCase()}-plan.png`;
    q('.sim-minimap-name').textContent=map.map.toUpperCase();overlay.querySelector<HTMLImageElement>('.sim-plan-view > img')!.src=`/assets/maps/${map.map.toLowerCase()}-plan.png`;
    routes=roundPaths(navigation[map.map.toLowerCase()],map.map,map.simulation.rounds[roundIndex],(roundIndex<12)===(map.ownStartsAttack!==false));
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
      return pathPosition(nav,routes[i],t/2.8);
    });
    overlay.querySelectorAll<HTMLElement>('[data-mini-unit]').forEach((marker,id)=>{
      marker.style.left=`${positions[id].x}%`;marker.style.top=`${positions[id].y}%`;
      marker.style.opacity=dead.has(id)?'.2':'1';marker.classList.toggle('selected',id===selectedPlayer);
    });
    lastDead=dead;updateCameraUI();
    rows.forEach((row,i)=>row.classList.toggle('dead',dead.has(i)));
    const headings=players.map((_,i)=>{
      if(dead.has(i))return {x:0,y:0};
      const future=pathPosition(nav,routes[i],(elapsed+.08)/2.8);
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
      q('.sim-feed').insertAdjacentHTML('afterbegin',`<div class="side-${e.killer<5?0:1}"><b>${escape(players[e.killer].alias)}</b> ⌖ <span>${escape(players[e.victim].alias)}</span></div>`);
    }
    rows.forEach((row,i)=>row.querySelector('b')!.textContent=`${totals[i].kills} / ${totals[i].deaths}`);
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
    const anchor=spike?pathPosition(nav,routes[spike.planter],1):pathPosition(nav,routes[0],1);
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
        q('.sim-feed').insertAdjacentHTML('afterbegin',`<div class="spike-event">${label}</div>`);
      }
    }
    const outcomeLabel=round.outcome==='detonation'?' · SPIKE DETONADA':round.outcome==='defuse'?' · SPIKE DESARMADA':' · ELIMINAÇÃO';
    q('.sim-round-banner').textContent=over?`${round.winner===0?own:opponent} VENCE O ROUND${outcomeLabel}`:'';
    q('.sim-score').textContent=`${own} ${score[0]} : ${score[1]} ${opponent}`;
    q('.sim-status').textContent=`${map.map} · MAPA ${mapIndex+1} · ROUND ${roundIndex+1} · ${attacksOwn?'ATAQUE':'DEFESA'} · SÉRIE ${series.join(' : ')}`;
    if(elapsed>=round.duration){
      if(!round.spike)audio.cue('round');
      score[round.winner]++;roundIndex++;
      if(roundIndex===map.simulation.rounds.length){
        series[map.win?0:1]++;mapIndex++;roundIndex=0;score=[0,0];
        if(mapIndex===maps.length){finish();return;}
      }
      startRound();
    }
    frame=requestAnimationFrame(draw);
  }
  Promise.all([
    fetch('/assets/maps/navigation.json').then(response=>{
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
    startRound();
    q<HTMLButtonElement>('.sim-pause').disabled=false;
    for(const control of overlay.querySelectorAll<HTMLButtonElement | HTMLSelectElement | HTMLInputElement>('.sim-camera-tools button,.sim-camera-tools select,.sim-camera-tools input,[data-roster]'))control.disabled=false;
    updateCameraUI();
    last=performance.now();frame=requestAnimationFrame(draw);
  }).catch(()=>{
    if(finished)return;
    renderer?.destroy();renderer=null;
    q('.sim-status').textContent='Não foi possível carregar o campo. Recarregue a página ou pule para ver o resultado.';
  });
}
