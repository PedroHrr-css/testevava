import type {CareerState} from '../types/career.ts';
import {SHOP_ITEMS,SHOP_CATEGORIES,type ShopCategory,shopBonuses} from '../game/shop.ts';
import {navIcon} from './navigation.ts';

export type ShopFilter='all'|'owned'|ShopCategory;
export function shopView(state:CareerState,cash:(value:number)=>string,escape:(value:unknown)=>string,filter:ShopFilter,feedback:string):string {
  const owned=new Set(state.shopItems||[]),bonuses=shopBonuses(state);
  const installed=SHOP_ITEMS.filter(item=>owned.has(item.id));
  const products=SHOP_ITEMS.filter(item=>filter==='all'||filter==='owned'&&owned.has(item.id)||item.category===filter);
  const filters:{id:ShopFilter;label:string}[]=[{id:'all',label:'Todos os itens'},...Object.entries(SHOP_CATEGORIES).map(([id,label])=>({id:id as ShopCategory,label})),{id:'owned',label:'Meus itens'}];
  return `<div class="shop-page">
    <div class="page-title"><div><small class="eyebrow">EQUIPAMENTOS E ESTRUTURA DO CLUBE</small><h1>SHOP <em>DO TIME.</em></h1><p>Invista na equipe, na comissão e nos talentos que vão construir sua próxima temporada.</p></div><div class="overall-box"><small>ORÇAMENTO DISPONÍVEL</small><b class="cash-label">${cash(state.money)}</b></div></div>
    <section class="shop-overview"><div class="shop-overview-icon">${navIcon('shop')}</div><div><small>MELHORIAS DO CLUBE</small><h2>${installed.length} ${installed.length===1?'item instalado':'itens instalados'} <span>/ ${SHOP_ITEMS.length}</span></h2><p>Compra única. Os bônus são ativados automaticamente e ficam salvos na carreira.</p></div><div class="shop-overview-stats"><span>FORÇA EM SÉRIES <b>+${bonuses.matchStrength}</b></span><span>RECUPERAÇÃO <b>+${bonuses.energyRecovery}</b></span><span>QUALIDADE DO STAFF <b>+${bonuses.staffQuality}</b></span></div></section>
    ${feedback?`<p class="shop-feedback" role="status" aria-live="polite">${escape(feedback)}</p>`:''}
    <nav class="shop-filters" aria-label="Categorias da loja">${filters.map(option=>`<button data-shop-filter="${option.id}" class="${filter===option.id?'active':''}" aria-current="${filter===option.id?'page':'false'}">${option.label}${option.id==='owned'?` <span>${installed.length}</span>`:''}</button>`).join('')}</nav>
    <div class="shop-grid">${products.map(item=>{
      const hasItem=owned.has(item.id),affordable=state.money>=item.price;
      return `<article class="shop-card ${hasItem?'is-owned':''}" data-shop-item="${item.id}"><div class="shop-card-image"><span class="shop-category">${SHOP_CATEGORIES[item.category]}</span><span class="shop-product-art" role="img" aria-label="${escape(item.name)}" style="--item-x:${item.image%4};--item-y:${Math.floor(item.image/4)}"></span>${hasItem?'<span class="shop-owned-badge">✓ INSTALADO</span>':''}</div><div class="shop-card-body"><h2>${escape(item.name)}</h2><p>${escape(item.description)}</p><div class="shop-bonus"><span>↑</span><b>${escape(item.bonusLabel)}</b></div><details class="shop-item-details"><summary>Como funciona o bônus</summary><p>${escape(item.details)}</p></details><div class="shop-card-footer"><div><small>INVESTIMENTO ÚNICO</small><b>${cash(item.price)}</b></div><button data-action="buy-shop-item" data-id="${item.id}" ${hasItem||!affordable?'disabled':''}>${hasItem?'INSTALADO':affordable?'COMPRAR ↗':'SALDO INSUFICIENTE'}</button></div></div></article>`;
    }).join('')||'<div class="shop-empty">Você ainda não tem itens nesta categoria. Explore a loja para escolher sua primeira melhoria.</div>'}</div>
    ${installed.length?`<section class="shop-installed"><div class="panel-head"><div><small class="eyebrow">INVENTÁRIO DO CLUBE</small><h2>Seus bônus ativos</h2></div><span class="tag">${installed.length} MELHORIAS</span></div><div class="shop-installed-list">${installed.map(item=>`<div><span>${navIcon(item.category==='staff'?'staff':item.category==='scouting'?'scouting':item.category==='academy'?'basecamp':item.category==='training'?'training':'squad')}</span><div><b>${escape(item.name)}</b><small>${escape(item.bonusLabel)}</small></div><i>ATIVO</i></div>`).join('')}</div></section>`:''}
  </div>`;
}
