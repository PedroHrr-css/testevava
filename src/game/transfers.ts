import type {CareerState,MarketPlayer,Player,StaffContract} from '../types/career.ts';
import {effectiveStaffQuality} from './shop.ts';

const FREE_AGENTS=[
  ['pulse','Gabriel Ramos','Duelista','jett',77],
  ['kairo','Lucas Tanaka','Iniciador','sova',74],
  ['frost','Matheus Reis','Controlador','omen',81],
  ['zero','Rafael Martins','Sentinela','cypher',79],
  ['soul','André Vieira','Flex','sage',72],
  ['nexus','Thiago Lopes','Duelista','raze',83],
  ['wave','Felipe Moura','Iniciador','skye',76],
  ['orbit','Diego Castro','Controlador','viper',75],
  ['onyx','Bruno Azevedo','Sentinela','killjoy',78],
  ['blaze','Henrique Dias','Flex','phoenix',73],
  ['echo','Vinícius Nunes','Iniciador','breach',70],
  ['zen','Caio Oliveira','Controlador','brimstone',68],
] as const;

export function createFreeAgents():MarketPlayer[] {
  return FREE_AGENTS.map(([alias,real,role,agent,rating],index)=>({
    id:`free-agent-${alias}`,source:'free',alias,real,image:false,portrait:8+index%8,
    role,rating,salary:Math.round(35+(rating-65)*2.5),price:Math.round(70+(rating-65)*13),
    number:index+1,energy:95,morale:80,agent,agentMastery:{[agent]:48},
    stats:{kills:0,deaths:0,assists:0,matches:0},
  }));
}

export function ensureTransferMarket(state:CareerState):boolean {
  if((state.marketCatalogVersion||0)>=1)return false;
  const existing=new Set([...state.players,...state.market].map(player=>player.id));
  state.market.push(...createFreeAgents().filter(player=>!existing.has(player.id)));
  state.marketCatalogVersion=1;
  return true;
}

export const playerMarketValue=(player:Player):number=>Math.max(1,Math.round(
  Number.isFinite(player.price)&&player.price!>0?player.price!:Math.max(100,100+(player.rating-65)*24),
));
export const playerSaleValue=(player:Player):number=>Math.round(playerMarketValue(player)*.7);
export function playerPurchasePrice(state:CareerState,player:MarketPlayer):number {
  const scout=state.staff?.find(member=>member.role==='scout');
  const quality=scout?effectiveStaffQuality(state,scout):0;
  return Math.max(1,Math.round(player.price*(1-Math.max(0,Math.min(100,quality))/1000)));
}
export const staffTransferValue=(member:StaffContract):number=>Math.max(0,Math.round(member.weeklySalary*2*Math.min(12,Math.max(0,member.contractWeeks))/12));

type TransferResult<T>={ok:true;person:T;fee:number}|{ok:false;error:string};

export function buyPlayer(state:CareerState,id:string):TransferResult<Player> {
  const index=state.market.findIndex(player=>player.id===id);
  if(index<0)return {ok:false,error:'Esse atleta não está mais disponível.'};
  if(state.players.some(player=>player.id===id))return {ok:false,error:'Esse atleta já faz parte do elenco.'};
  const player=state.market[index];
  if(!Number.isFinite(player.price)||player.price<=0)return {ok:false,error:'O atleta está sem uma avaliação de mercado válida.'};
  const fee=playerPurchasePrice(state,player);
  if(state.money<fee)return {ok:false,error:'Saldo insuficiente para essa contratação.'};
  const number=Array.from({length:99},(_,i)=>i+1).find(value=>!state.players.some(member=>member.number===value));
  if(number===undefined)return {ok:false,error:'O elenco atingiu o limite de atletas.'};
  state.market.splice(index,1);
  state.money-=fee;
  player.number=number;
  state.players.push(player);
  return {ok:true,person:player,fee};
}

export function sellPlayer(state:CareerState,id:string,offerId?:string):TransferResult<Player> {
  const index=state.players.findIndex(player=>player.id===id);
  if(index<0)return {ok:false,error:'Esse atleta já deixou o clube.'};
  if(state.players.length<=5)return {ok:false,error:'O clube precisa manter pelo menos cinco atletas. Contrate um substituto antes de vender.'};
  const player=state.players[index];
  const offer=offerId?state.emails?.find(email=>email.id===offerId&&email.offer?.status==='pending'&&email.offer.playerId===id)?.offer:null;
  if(offerId&&(!offer||!Number.isFinite(offer.fee)||offer.fee<=0))return {ok:false,error:'Essa proposta não está mais disponível.'};
  const fee=offer?.fee??playerSaleValue(player);
  state.players.splice(index,1);
  state.money+=fee;
  // Removing a starter promotes the first reserve; keep captain and training selections valid.
  if(!state.players.slice(0,5).some(member=>member.id===state.captain))state.captain=state.players[0].id;
  if(state.trainingPlayer===id)state.trainingPlayer=state.players[0].id;
  state.trainingAthletes=state.trainingAthletes?.filter(playerId=>playerId!==id);
  if(state.trainingUsage)delete state.trainingUsage[id];
  for(const email of state.emails||[])if(email.offer?.playerId===id&&email.offer.status==='pending')email.offer.status=email.id===offerId?'accepted':'declined';
  if(!state.market.some(candidate=>candidate.id===id))state.market.push({...player,price:playerMarketValue(player)});
  return {ok:true,person:player,fee};
}

export function transferStaff(state:CareerState,id:string):TransferResult<StaffContract> {
  const index=state.staff?.findIndex(member=>member.id===id)??-1;
  if(index<0)return {ok:false,error:'Esse profissional já deixou o clube.'};
  const member=state.staff![index],fee=staffTransferValue(member);
  if(fee<=0)return {ok:false,error:'O contrato deste profissional não tem valor de transferência.'};
  state.staff!.splice(index,1);
  state.money+=fee;
  return {ok:true,person:member,fee};
}
