import type {CareerState,Player,View} from '../types/career.ts';
import {playerPurchasePrice,playerSaleValue} from '../game/transfers.ts';
import {staffView} from './staff-view.ts';
import {navIcon} from './navigation.ts';
import {effectiveStaffQuality} from '../game/shop.ts';

export type MarketTab='players'|'sell'|'staff'|'scouts';
export interface MarketFilters {query:string;role:string;origin:'all'|'clubs'|'free'}
interface MarketOptions {
  tab:MarketTab;filters:MarketFilters;feedback:string;
  cash:(amount:number)=>string;escape:(value:unknown)=>string;
  photo:(player:Player)=>string;clubName:(id:string)=>string;
}

export function marketView(state:CareerState,{tab,filters,feedback,cash,escape,photo,clubName}:MarketOptions):string {
  const scout=state.staff?.find(member=>member.role==='scout');
  const tabs:{id:MarketTab;title:string;view:View;count:number}[]=[
    {id:'players',title:'Contratar jogadores',view:'market',count:state.market.length},
    {id:'sell',title:'Vender jogadores',view:'squad',count:state.players.length},
    {id:'staff',title:'Staff',view:'staff',count:(state.staff||[]).filter(member=>member.role!=='scout').length},
    {id:'scouts',title:'Olheiros',view:'scouting',count:(state.staff||[]).filter(member=>member.role==='scout').length},
  ];
  const header=`<div class="page-title"><div><small class="eyebrow">CENTRAL DE TRANSFERÊNCIAS</small><h1>MERCADO <em>DO CLUBE.</em></h1><p>Construa seu elenco, negocie saídas e encontre os profissionais para sua próxima conquista.</p></div><div class="overall-box"><small>ORÇAMENTO DISPONÍVEL</small><b class="cash-label">${cash(state.money)}</b></div></div>
    <div class="market-summary"><span>ELENCO <b>${state.players.length} atletas</b></span><span>FOLHA DE ATLETAS <b>${cash(state.players.reduce((sum,player)=>sum+player.salary,0))} / sem.</b></span><span>OLHEIRO <b>${scout?`${escape(scout.name)} · ${Number((effectiveStaffQuality(state,scout)/10).toFixed(1)).toLocaleString('pt-BR')}% de desconto`:'Nenhum contratado'}</b></span></div>
    <nav class="market-tabs" aria-label="Categorias do mercado">${tabs.map(item=>`<button data-market-tab="${item.id}" aria-current="${tab===item.id?'page':'false'}" class="${tab===item.id?'active':''}">${navIcon(item.view)}${item.title}<span>${item.count}</span></button>`).join('')}</nav>
    ${feedback?`<p class="market-feedback" role="status" aria-live="polite">${escape(feedback)}</p>`:''}`;
  if(tab==='staff'||tab==='scouts')return header+staffView(state,cash,escape,{embedded:true,role:tab==='scouts'?'scout':'staff'});
  const source=tab==='sell'?state.players:state.market;
  const search=filters.query.trim().toLocaleLowerCase('pt-BR');
  const players=source.filter(player=>(!filters.role||player.role===filters.role)&&
    (tab==='sell'||filters.origin==='all'||(filters.origin==='free'?player.source==='free':player.source!=='free'))&&
    (!search||`${player.alias} ${player.real} ${player.source==='free'?'Agente livre':clubName(player.source)}`.toLocaleLowerCase('pt-BR').includes(search)));
  const toolbar=`<div class="market-toolbar"><label class="market-search"><span>BUSCAR ATLETA</span><input id="market-search" type="search" value="${escape(filters.query)}" placeholder="Nome, apelido ou clube" aria-label="Buscar atleta"></label><label><span>FUNÇÃO</span><select id="market-role" aria-label="Filtrar por função"><option value="">Todas as funções</option>${['Duelista','Iniciador','Controlador','Sentinela','Flex'].map(role=>`<option ${filters.role===role?'selected':''}>${role}</option>`).join('')}</select></label>${tab==='players'?`<label><span>ORIGEM</span><select id="market-origin" aria-label="Filtrar por origem"><option value="all" ${filters.origin==='all'?'selected':''}>Todos os atletas</option><option value="clubs" ${filters.origin==='clubs'?'selected':''}>Outros clubes</option><option value="free" ${filters.origin==='free'?'selected':''}>Agentes livres</option></select></label>`:''}<span class="market-result-count">${players.length} ${players.length===1?'atleta':'atletas'}</span></div>`;
  const explanation=tab==='sell'?`<p class="market-help">O valor de venda entra imediatamente no caixa. Ao vender um titular, o primeiro reserva assume a vaga. Mantenha pelo menos cinco atletas no clube.</p>`:`<p class="market-help">Atletas de outros clubes e agentes livres fictícios. A assinatura de um agente livre tem custo de negociação. Novas contratações chegam ao banco de reservas.</p>`;
  const cards=players.map(player=>{
    const selling=tab==='sell',index=state.players.findIndex(member=>member.id===player.id);
    const fee=selling?playerSaleValue(player):playerPurchasePrice(state,state.market.find(member=>member.id===player.id)!);
    const blocked=selling?state.players.length<=5:state.money<fee;
    return `<article class="market-card" data-market-player="${player.id}"><div class="market-top">${photo(player)}<div><small>${selling?index<5?'TITULAR':'RESERVA':player.source==='free'?'AGENTE LIVRE':escape(clubName(player.source))}</small><h2>${escape(player.alias)}</h2><p>${escape(player.real)}</p></div><strong>${player.rating}<small>OVR</small></strong></div><div class="market-details"><span>${escape(player.role)}</span><span>SALÁRIO ${cash(player.salary)} / sem.</span></div><div class="market-buy"><div><small>${selling?'VALOR DE VENDA':player.source==='free'?'ASSINATURA':'TRANSFERÊNCIA'}</small><b>${cash(fee)}</b></div><button data-action="${selling?'sell-player':'buy'}" data-id="${player.id}" ${blocked?'disabled':''}>${selling?blocked?'MÍNIMO DE 5 ATLETAS':'VENDER ATLETA':blocked?'SALDO INSUFICIENTE':'CONTRATAR'} ↗</button></div>${selling&&blocked?'<small class="market-card-note">Contrate um substituto para liberar a venda.</small>':''}</article>`;
  }).join('');
  return header+toolbar+explanation+`<div class="market-grid">${cards||'<div class="market-empty">Nenhum atleta encontrado. Ajuste os filtros para ver mais opções.</div>'}</div>`;
}
