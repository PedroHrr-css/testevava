import type { CareerState } from '../types/career.ts';

export interface BrandSponsor {
  id: string;
  name: string;
  category: string;
  slogan: string;
  signingBonus: number;
  weeklyIncome: number;
  accent: string;
  item: {name:string;icon:string;description:string};
}

export const SPONSOR_WEEKS=4;
export const BRANDS: readonly BrandSponsor[] = [
  {id:'logilag',name:'LogiLag',category:'PERIFÉRICOS',slogan:'Mira rápida, ping nem tanto.',signingBonus:260,weeklyIncome:42,accent:'#74d0dd',item:{name:'Mouse Rato Turbo',icon:'◉',description:'Pingente virtual para o uniforme'}},
  {id:'razeira',name:'Razeira',category:'TECLADOS RGB',slogan:'Mais luz para a jogada perfeita.',signingBonus:210,weeklyIncome:55,accent:'#a4e35b',item:{name:'Teclado Neon',icon:'⌨',description:'Emblema virtual de teclas luminosas'}},
  {id:'hiperxis',name:'HiperXis',category:'ÁUDIO GAMER',slogan:'Ouça o clutch antes de acontecer.',signingBonus:320,weeklyIncome:37,accent:'#ef7283',item:{name:'Headset Fantasma',icon:'♫',description:'Emblema virtual com áudio holográfico'}},
  {id:'nvideia',name:'N-ViDEIA',category:'GRÁFICOS',slogan:'Frames de sobra, ideias também.',signingBonus:150,weeklyIncome:72,accent:'#b0e154',item:{name:'Holograma de FPS',icon:'◈',description:'Insígnia virtual para o uniforme'}},
  {id:'redbuff',name:'Red Buff',category:'ENERGIA GAMER',slogan:'Um buff para cada round.',signingBonus:290,weeklyIncome:45,accent:'#f0b967',item:{name:'Pingente de Energia',icon:'⚡',description:'Distintivo virtual de energia'}},
  {id:'corsairzinho',name:'Corsairzinho',category:'ACESSÓRIOS',slogan:'Seu setup virou lenda.',signingBonus:185,weeklyIncome:58,accent:'#d1a0f2',item:{name:'Mousepad Nebuloso',icon:'▣',description:'Patch virtual do clube'}},
];

export function signSponsor(state: CareerState,id: string): boolean {
  const brand=BRANDS.find(item=>item.id===id);
  if(!brand||state.week>14||state.sponsorDeal)return false;
  state.sponsorDeal={id,weeksRemaining:SPONSOR_WEEKS};
  state.money+=brand.signingBonus;
  state.sponsorIncome=(state.sponsorIncome??0)+brand.signingBonus;
  state.sponsorItems??=[];
  if(!state.sponsorItems.includes(id))state.sponsorItems.push(id);
  state.equippedSponsorItem??=id;
  return true;
}

export function advanceSponsorDeal(state: CareerState): {name:string;income:number;expired:boolean}|null {
  const deal=state.sponsorDeal;
  if(!deal)return null;
  const brand=BRANDS.find(item=>item.id===deal.id);
  if(!brand||deal.weeksRemaining<1){state.sponsorDeal=undefined;return null}
  state.money+=brand.weeklyIncome;
  state.sponsorIncome=(state.sponsorIncome??0)+brand.weeklyIncome;
  deal.weeksRemaining--;
  const expired=deal.weeksRemaining===0;
  if(expired)state.sponsorDeal=undefined;
  return {name:brand.name,income:brand.weeklyIncome,expired};
}

export function equipSponsorItem(state: CareerState,id: string): boolean {
  if(!state.sponsorItems?.includes(id)||!BRANDS.some(brand=>brand.id===id))return false;
  state.equippedSponsorItem=state.equippedSponsorItem===id?undefined:id;
  return true;
}
