import type {CareerState,StaffContract} from '../types/career.ts';

export type ShopCategory='team'|'training'|'staff'|'scouting'|'academy';
export interface ShopBonuses {
  matchStrength:number;energyRecovery:number;trainingMastery:number;mapPractice:number;
  staffQuality:number;scoutQuality:number;scoutCostReduction:number;academyTraining:number;preparationMorale:number;
}
export interface ShopItem {
  id:string;name:string;category:ShopCategory;price:number;image:number;
  description:string;bonusLabel:string;details:string;effects:Partial<ShopBonuses>;
}
export const SHOP_CATEGORIES:Record<ShopCategory,string>={team:'Equipe',training:'Treinamento',staff:'Staff',scouting:'Olheiros',academy:'Base'};
export const SHOP_ITEMS:readonly ShopItem[]=[
  {id:'pro-headsets',name:'Headsets de comunicação',category:'team',price:180,image:0,description:'Comunicação clara para executar cada chamada no servidor.',bonusLabel:'+2 de força nas séries',details:'Bônus para o quinteto em todas as partidas, incluindo novos titulares.',effects:{matchStrength:2}},
  {id:'ergonomic-chairs',name:'Cadeiras ergonômicas',category:'team',price:220,image:1,description:'Mais conforto para enfrentar a rotina de treino e competição.',bonusLabel:'+3 de recuperação de energia',details:'Os titulares recuperam 3 pontos extras no dia de recuperação; todo o elenco recebe o bônus após as séries.',effects:{energyRecovery:3}},
  {id:'precision-mice',name:'Kit de precisão',category:'training',price:240,image:2,description:'Mouse e mousepad para transformar bons treinos em evolução.',bonusLabel:'+1 de domínio por treino com evolução',details:'Treinos interativos que geram domínio recebem 1 ponto adicional, até o limite de 100.',effects:{trainingMastery:1}},
  {id:'tactical-monitors',name:'Monitores de treino',category:'training',price:280,image:3,description:'Mais clareza para estudar os mapas em conjunto.',bonusLabel:'+1 de domínio no treino coletivo',details:'O mapa em foco recebe 1 ponto extra no treino tático do segundo dia da semana.',effects:{mapPractice:1}},
  {id:'coaching-tablets',name:'Tablets da comissão',category:'staff',price:300,image:4,description:'Ferramentas para transformar análise em decisões mais eficientes.',bonusLabel:'+5 de qualidade para o staff',details:'Treinador, analista e preparador físico recebem +5 de qualidade efetiva, até 100. Também vale para futuras contratações.',effects:{staffQuality:5}},
  {id:'scouting-laptop',name:'Central de scouting',category:'scouting',price:260,image:5,description:'Uma estação dedicada a observar adversários e negociar talentos.',bonusLabel:'+5 para o olheiro · relatórios $ 10 mil mais baratos',details:'O olheiro contratado recebe +5 de qualidade, melhorando o desconto no mercado. Cada relatório custa $ 30 mil.',effects:{scoutQuality:5,scoutCostReduction:10}},
  {id:'academy-stations',name:'Estações da Academy',category:'academy',price:340,image:6,description:'Estrutura de treino dedicada às próximas estrelas do clube.',bonusLabel:'+1 de overall no treino da base',details:'Cada treino individual da base evolui até 3 pontos em vez de 2, respeitando o potencial do atleta.',effects:{academyTraining:1}},
  {id:'recovery-kit',name:'Kit de bem-estar',category:'team',price:160,image:7,description:'Uma rotina de recuperação para chegar confiante ao dia de jogo.',bonusLabel:'+2 de moral na preparação',details:'No sexto dia da semana, os titulares ganham 2 pontos extras de moral, até 100.',effects:{preparationMorale:2}},
];

export function shopBonuses(state:Pick<CareerState,'shopItems'>):ShopBonuses {
  const bonuses:ShopBonuses={matchStrength:0,energyRecovery:0,trainingMastery:0,mapPractice:0,staffQuality:0,scoutQuality:0,scoutCostReduction:0,academyTraining:0,preparationMorale:0};
  const owned=new Set(state.shopItems||[]);
  for(const item of SHOP_ITEMS){
    if(!owned.has(item.id))continue;
    for(const key of Object.keys(item.effects) as (keyof ShopBonuses)[])bonuses[key]+=item.effects[key]||0;
  }
  return bonuses;
}

export function effectiveStaffQuality(state:Pick<CareerState,'shopItems'>,member:Pick<StaffContract,'quality'|'role'>):number {
  const bonuses=shopBonuses(state);
  return Math.max(0,Math.min(100,member.quality+(member.role==='scout'?bonuses.scoutQuality:bonuses.staffQuality)));
}
export const scoutingReportCost=(state:Pick<CareerState,'shopItems'>)=>Math.max(5,40-shopBonuses(state).scoutCostReduction);
export const academyTrainingGain=(state:Pick<CareerState,'shopItems'>)=>2+shopBonuses(state).academyTraining;

export function buyShopItem(state:CareerState,id:string):{ok:true;item:ShopItem}|{ok:false;error:string} {
  const item=SHOP_ITEMS.find(product=>product.id===id);
  if(!item)return {ok:false,error:'Este item não está disponível na loja.'};
  if(state.shopItems?.includes(id))return {ok:false,error:'Este item já está instalado no clube.'};
  if(!Number.isFinite(state.money)||state.money<item.price)return {ok:false,error:'Saldo insuficiente para comprar este item.'};
  state.money-=item.price;
  (state.shopItems??=[]).push(id);
  (state.shopPurchases??=[]).unshift({itemId:id,week:state.week,price:item.price});
  return {ok:true,item};
}
