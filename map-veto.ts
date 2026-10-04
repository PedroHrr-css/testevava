import type { Veto, VetoSlot } from './src/types/game.ts';
interface OpponentPreparation { preferred?: string[]; trainingMap: string; mastery?: Record<string, number> }
interface VetoOptions extends OpponentPreparation { own: string; opponent: string; escape: (value: unknown) => string; onStart: (veto: Veto) => void }

// Seven-map pool for this fictional career season, rather than every training map.
export const VETO_POOL=['Summit','Ascent','Lotus','Sunset','Haven','Abyss','Split'];
export const VETO_STEPS: [VetoSlot, 'ban' | 'pick' | 'side'][]=[['A','ban'],['B','ban'],['A','pick'],['B','side'],['B','pick'],['A','side'],['A','ban'],['B','ban'],['A','side']];
export function createVeto(ownSlot: VetoSlot='A'): Veto {
  if(!['A','B'].includes(ownSlot))throw new Error('Invalid veto slot');
  return {ownSlot,step:0,available:[...VETO_POOL],maps:[],history:[]};
}
export function applyVeto(veto: Veto,value: string): boolean {
  const step=VETO_STEPS[veto!.step];
  if(!step)return false;
  const [slot,action]=step;
  if(action==='side') {
    if(!['attack','defense'].includes(value))return false;
    const map=veto.maps.at(-1)!;
    map.ownStartsAttack=slot===veto.ownSlot?value==='attack':value==='defense';
    veto.history.push({slot,action,map:map.map,value});
  } else {
    if(!veto!.available.includes(value))return false;
    veto!.available=veto!.available.filter(map=>map!==value);
    veto.history.push({slot,action,map:value});
    if(action==='pick')veto.maps.push({map:value,picker:slot});
    if(veto.step===7) {
      const decider=veto!.available[0];
      veto.maps.push({map:decider,picker:'decider'});
      veto.history.push({slot:null,action:'decider',map:decider});
    }
  }
  veto.step++;
  return true;
}
export function chooseOpponent(veto: Veto,{preferred=[],trainingMap,mastery={}}: OpponentPreparation): string {
  const [,action]=VETO_STEPS[veto!.step];
  if(action==='side')return 'defense';
  const score=(map: string)=>Math.max(0,preferred.length-preferred.indexOf(map))*(preferred.includes(map)?10:0);
  if(action==='pick')return [...veto!.available].sort((a,b)=>score(b)-score(a))[0];
  // Deny the manager's strongest preparation, while protecting our own picks.
  return [...veto!.available].sort((a,b)=>{
    const danger=(map: string)=>(map===trainingMap?30:0)+(mastery[map]??48)*.3-score(map)*.4;
    return danger(b)-danger(a);
  })[0];
}

export function openMapVeto({own,opponent,preferred,trainingMap,mastery={},escape,onStart}: VetoOptions) {
  const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null,overlay=document.createElement('div');
  overlay.className='match-overlay';document.body.append(overlay);
  let veto: Veto | null=null,closed=false;
  const name=(slot: VetoSlot)=>slot===veto?.ownSlot?own:opponent;
  const close=()=>{closed=true;overlay.remove();if(previousFocus?.isConnected)previousFocus.focus();};
  function auto(){
    while(VETO_STEPS[veto!.step]&&VETO_STEPS[veto!.step][0]!==veto!.ownSlot)
      applyVeto(veto!,chooseOpponent(veto!,{preferred,trainingMap,mastery}));
  }
  function paint(){
    if(closed)return;
    const step=veto?VETO_STEPS[veto.step]:undefined,done=veto&&!step;
    overlay.innerHTML=`<section class="match-viewer veto-viewer" role="dialog" aria-modal="true" aria-label="Banimento e escolha dos mapas" tabindex="-1"><header class="match-header"><div><small>PRÉ-PARTIDA · VETO BO3</small><h2>${escape(own)} <span>VS</span> ${escape(opponent)}</h2></div><button data-cancel>CANCELAR</button></header><div class="veto-body"><div class="veto-matchup"><div><span class="veto-team-mark">${escape(own.slice(0,2))}</span><small>SEU TIME${veto?' · TIME '+veto.ownSlot:''}</small><b>${escape(own)}</b></div><span class="veto-versus">BO3<em>VS</em>MAP VETO</span><div><span class="veto-team-mark opponent">${escape(opponent.slice(0,2))}</span><small>ADVERSÁRIO${veto?' · TIME '+(veto.ownSlot==='A'?'B':'A'):''}</small><b>${escape(opponent)}</b></div></div><div class="veto-timeline">${VETO_STEPS.map(([slot,action],i)=>`<span class="${veto&&i<veto.step?'complete':veto&&i===veto!.step?'current':''}"><i>${veto&&i<veto.step?'✓':String(i+1).padStart(2,'0')}</i><b>${action==='side'?'LADO':action.toUpperCase()}</b><small>TIME ${slot}</small></span>`).join('')}</div><p class="veto-instruction" aria-live="polite">${!veto?'Escolha a ordem do veto: seu time é o mandante.':done?'Veto concluído. Confira a série antes de começar.':`SUA VEZ · ${step![1]==='ban'?'BANA UM MAPA':step![1]==='pick'?'ESCOLHA UM MAPA':'ESCOLHA O LADO INICIAL'} · ETAPA ${veto!.step+1}/9`}</p>${!veto?'<div class="veto-order"><button data-order="A">TIME A · PRIMEIRO BAN E PICK</button><button data-order="B">TIME B · SEGUNDO BAN E PICK</button></div>':step?.[1]==='side'?`<div class="veto-order"><b>${escape(veto!.maps.at(-1)!.map)}</b><button data-side="attack">COMEÇAR NO ATAQUE</button><button data-side="defense">COMEÇAR NA DEFESA</button></div>`:''}<div class="veto-legend"><span>● PICK DO SEU TIME</span><span>● PICK ADVERSÁRIO</span><span>× MAPA BLOQUEADO</span><span>◆ DECISIVO</span></div><div class="veto-grid">${VETO_POOL.map((map,index)=>{
      const entry=veto?.history.find(e=>e.map===map&&e.action!=='side');
      const enabled=step&&step[1]!=='side'&&veto!.available.includes(map);
      return `<button class="veto-map ${entry?.action||''} ${entry?.slot===veto?.ownSlot?'own-choice':'opponent-choice'}" data-map="${map}" ${enabled?'':'disabled'} style="--card-delay:${index*35}ms;--veto-image:url(/assets/maps/${map.toLowerCase()}-splash.jpg)"><i class="veto-map-number">${String(index+1).padStart(2,'0')}</i><i class="veto-map-symbol">${entry?.action==='ban'?'×':entry?'✓':'↗'}</i><b>${map}</b><span>${entry?`${entry.action==='ban'?'BLOQUEADO':entry.action==='pick'?'PICKADO':'DECISIVO'}${entry.slot?' · '+escape(name(entry.slot!)):''}`:'DISPONÍVEL'}</span><small>SEU DOMÍNIO ${mastery[map]??48}%${map===trainingMap?' · EM TREINO':''}</small><i class="veto-mastery"><em style="width:${Math.max(0,Math.min(100,mastery[map]??48))}%"></em></i></button>`;
    }).join('')}</div>${veto?`<div class="veto-series">${[0,1,2].map((i)=>{const map=veto!.maps[i];return `<article class="${map?.picker==='decider'?'decider-choice':map?.picker===veto!.ownSlot?'own-choice':'opponent-choice'}" style="${map?`--series-image:url(/assets/maps/${map.map.toLowerCase()}-splash.jpg)`: ''}"><small>MAPA ${i+1}${i===2?' · SE NECESSÁRIO':''}</small><b>${map?escape(map.map):'A DEFINIR'}</b><em class="series-picker">${map?(map.picker==='decider'?'◆ DECISIVO · MAPA RESTANTE':'✓ PICK DE '+escape(name(map.picker!))):'AGUARDANDO PICK'}</em><span>${map?.ownStartsAttack===undefined?'LADO A DEFINIR':`${escape(own)}: ${map.ownStartsAttack?'ATAQUE':'DEFESA'}`}</span></article>`;}).join('')}</div><div class="veto-blocked"><h3>MAPAS BLOQUEADOS</h3>${veto.history.filter(e=>e.action==='ban').map(e=>`<span>× <b>${escape(e.map)}</b> · ${escape(name(e.slot!))}</span>`).join('')||'<small>Nenhum ban realizado.</small>'}</div><h3 class="veto-log-title">REGISTRO DO VETO <span>● LIVE</span></h3><ol class="veto-history">${veto.history.map(e=>`<li>${e.slot?escape(name(e.slot)):'DECIDER'} · ${e.action==='ban'?'baniu':e.action==='pick'?'escolheu':e.action==='side'?(e.value==='attack'?'começa no ataque em':'começa na defesa em'):'mapa restante:'} <b>${escape(e.map)}</b></li>`).join('')}</ol>`:''}${done?'<button class="primary" data-start>INICIAR PARTIDA ↗</button>':''}<p class="veto-help">Ban A → Ban B → Pick A (lado B) → Pick B (lado A) → Ban A → Ban B → Decider (lado A). As escolhas do adversário são automáticas.</p></div></section>`;
    overlay.querySelector<HTMLButtonElement>('[data-cancel]')!.onclick=close;
    overlay.querySelectorAll<HTMLButtonElement>('[data-order]').forEach(button=>button.onclick=()=>{veto=createVeto(button.dataset.order as VetoSlot);auto();paint();});
    overlay.querySelectorAll<HTMLButtonElement>('[data-map]:not(:disabled)').forEach(button=>button.onclick=()=>{if(applyVeto(veto!,button.dataset.map!)){auto();paint();}});
    overlay.querySelectorAll<HTMLButtonElement>('[data-side]').forEach(button=>button.onclick=()=>{applyVeto(veto!,button.dataset.side!);auto();paint();});
    const start=overlay.querySelector<HTMLButtonElement>('[data-start]');
    if(start)start.onclick=()=>{if(closed)return;const result=structuredClone(veto!);close();onStart(result);};
    overlay.querySelector<HTMLButtonElement>('[data-order], [data-side], [data-map]:not(:disabled), [data-start], [data-cancel]')?.focus();
  }
  overlay.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();close();}
    if(e.key==='Tab'){const items=[...overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')],i=items.indexOf(document.activeElement as HTMLButtonElement);e.preventDefault();items[(i+(e.shiftKey?-1:1)+items.length)%items.length].focus();}
  });
  paint();
}
