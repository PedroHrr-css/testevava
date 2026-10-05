import type { CareerState } from '../types/career.ts';

export interface Streamer {
  id: string;
  name: string;
  audience: string;
  specialty: string;
  cost: number;
  fansPerWeek: number;
  accent: string;
}

export const CAMPAIGN_WEEKS = 3;
export const STREAMERS: readonly Streamer[] = [
  {id:'coreano',name:'Coreano',audience:'BRASIL',specialty:'Lives de VALORANT',cost:140,fansPerWeek:2400,accent:'#fc7666'},
  {id:'tck',name:'TcK',audience:'BRASIL',specialty:'Ranked e comunidade',cost:175,fansPerWeek:3000,accent:'#e5a550'},
  {id:'sacy',name:'Sacy',audience:'BRASIL',specialty:'Cenário competitivo',cost:290,fansPerWeek:4900,accent:'#c477e8'},
  {id:'tarik',name:'tarik',audience:'GLOBAL',specialty:'Watch parties',cost:620,fansPerWeek:9000,accent:'#63bceb'},
  {id:'tenz',name:'TenZ',audience:'GLOBAL',specialty:'Jogadas e conteúdo',cost:540,fansPerWeek:7900,accent:'#86dcaa'},
  {id:'fns',name:'FNS',audience:'GLOBAL',specialty:'Análise de partidas',cost:340,fansPerWeek:5400,accent:'#87a5ef'},
  {id:'kyedae',name:'Kyedae',audience:'GLOBAL',specialty:'Conteúdo e comunidade',cost:390,fansPerWeek:5900,accent:'#f6a1ce'},
  {id:'mixwell',name:'Mixwell',audience:'EMEA',specialty:'Comunidade europeia',cost:250,fansPerWeek:4200,accent:'#e5bc6b'},
];

export function hireStreamer(state: CareerState, id: string): boolean {
  const streamer=STREAMERS.find(item=>item.id===id);
  if(!streamer||state.week>14||state.streamerContract||state.money<streamer.cost)return false;
  state.money-=streamer.cost;
  state.streamerContract={id, weeksRemaining:CAMPAIGN_WEEKS};
  return true;
}

export function advanceStreamerCampaign(state: CareerState): {name:string;fans:number;expired:boolean}|null {
  const contract=state.streamerContract;
  if(!contract)return null;
  const streamer=STREAMERS.find(item=>item.id===contract.id);
  if(!streamer||contract.weeksRemaining<1){state.streamerContract=undefined;return null}
  state.fans+=streamer.fansPerWeek;
  state.marketingFans=(state.marketingFans??0)+streamer.fansPerWeek;
  contract.weeksRemaining--;
  const expired=contract.weeksRemaining===0;
  if(expired)state.streamerContract=undefined;
  return {name:streamer.name,fans:streamer.fansPerWeek,expired};
}
