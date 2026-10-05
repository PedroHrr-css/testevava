import type { View } from '../types/career.ts';

export const NAV_ITEMS: { id: View; label: string }[] = [
  {id:'overview',label:'Home'}, {id:'mail',label:'Mail'},
  {id:'squad',label:'Squad'}, {id:'staff',label:'Staff'}, {id:'training',label:'Training'},
  {id:'strategy',label:'Strategies'}, {id:'scouting',label:'Scouting'},
  {id:'market',label:'Transfers'}, {id:'competition',label:'Tournaments'},
  {id:'ranking',label:'Statistics'}, {id:'basecamp',label:'Academy'},
  {id:'shop',label:'Shop'}, {id:'sponsors',label:'Sponsors'},
  {id:'finances',label:'Finances'}, {id:'settings',label:'Settings'},
];

export const NAV_GROUPS: {id:string; title:string; items:View[]}[] = [
  {id:'central',title:'Central',items:['overview','mail']},
  {id:'team',title:'Equipe & desenvolvimento',items:['squad','staff','training','basecamp']},
  {id:'competition',title:'Competição',items:['strategy','competition','ranking']},
  {id:'market',title:'Mercado de jogadores',items:['scouting','market']},
  {id:'business',title:'Gestão do clube',items:['sponsors','finances','shop']},
  {id:'settings',title:'Sistema',items:['settings']},
];

export function sidebarNavigation(active:View,marketCount:number,unreadCount:number):string{
  return NAV_GROUPS.map(group=>`<section class="nav-group nav-group-${group.id}" aria-labelledby="nav-heading-${group.id}"><h2 class="nav-group-title" id="nav-heading-${group.id}">${group.title}</h2><div class="nav-group-items">${group.items.map(id=>{
    const label=NAV_ITEMS.find(item=>item.id===id)!.label;
    const count=id==='mail'?unreadCount:id==='market'?marketCount:0;
    return `<button class="nav-link ${active===id?'active':''}" data-view="${id}" aria-current="${active===id?'page':'false'}"><span class="nav-icon">${navIcon(id)}</span>${label}${count>0?`<i aria-label="${count} ${id==='mail'?'mensagens não lidas':'jogadores disponíveis'}">${count}</i>`:''}</button>`;
  }).join('')}</div></section>`).join('');
}

const ICONS: Record<View,string> = {
  overview:'<path d="m3 10 9-7 9 7v10H3Z M9 20v-7h6v7"/>',
  mail:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>',
  squad:'<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M2 20a6 6 0 0 1 12 0M14 17a5 5 0 0 1 8 3"/>',
  staff:'<circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2ZM10 15l2 3 2-3"/>',
  training:'<path d="m3 17 5-5 4 3 7-9M3 21h18"/><circle cx="19" cy="6" r="2"/>',
  strategy:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="15" r="1"/><path d="m9 16 3-4 3 1"/>',
  scouting:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M7 10h6M10 7v6"/>',
  market:'<path d="M4 7h15l-3-3M20 17H5l3 3M19 7l-3-3M5 17l3-3"/>',
  competition:'<path d="M8 3h8v7a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 14v5M8 21h8"/>',
  ranking:'<path d="M3 20V12h5v8M10 20V5h5v15M17 20V9h4v11M2 21h20"/>',
  basecamp:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14M13 9h5M13 13h5"/>',
  shop:'<path d="M2 4h3l2 12h12l3-9H6M9 21h.01M18 21h.01"/>',
  sponsors:'<circle cx="12" cy="7" r="4"/><path d="M7 21v-4a5 5 0 0 1 10 0v4M10 6h4M12 4v6"/>',
  finances:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/>',
  settings:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M20 4l-2 2M6 18l-2 2"/>',
};

export function navIcon(view: View): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[view]}</svg>`;
}
