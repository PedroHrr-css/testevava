import type {CareerState} from '../types/career.ts';
import {shopBonuses} from './shop.ts';
import {tournamentAccess,tournamentRound,tournamentOpponent} from './tournaments.ts';
import type {Team} from '../types/career.ts';

export const DAY_ACTIVITIES=['Planejamento','Treino tático','Comunidade','Academy','Recuperação','Preparação','Competição'];
export function careerDate(week:number,day=1):Date{return new Date(Date.UTC(2026,0,5+(week-1)*7+day-1))}
export function dateKey(date:Date):string{return date.toISOString().slice(0,10)}
export function calendarFixture(state:CareerState,teams:Team[],date:Date){
  const offset=Math.round((date.getTime()-careerDate(1).getTime())/86400000);
  const week=Math.floor(offset/7)+1;
  if(offset<0||offset%7!==6||week>(state.demo?4:14)||week>state.week)return null;
  const round=tournamentRound(week),result=state.tournamentResults?.find(item=>item.week===week);
  const access=tournamentAccess(state,round);
  if(!result&&(week<state.week||access==='declined'||access==='locked'))return null;
  return {round,result,pending:access==='invite',opponent:result?teams.find(t=>t.id===result.opponentId):tournamentOpponent({...state,week},teams)};
}

export function simulateCalendarDay(state:CareerState,day:number,map:string):string{
  if(day===2){
    for(const player of state.players.slice(0,5))player.energy=Math.max(35,player.energy-2);
    const gain=1+shopBonuses(state).mapPractice;
    state.mapMastery[map]=Math.min(100,(state.mapMastery[map]??48)+gain);
    return `Treino coletivo: domínio de ${map} +${gain} e os titulares trabalharam em ritmo leve.`;
  }
  if(day===3){state.fans+=250;return 'Ações com a comunidade trouxeram 250 novos torcedores.'}
  if(day===4){
    const prospect=(state.academyProspects||[]).filter(item=>item.rating<item.potential).sort((a,b)=>(b.potential-b.rating)-(a.potential-a.rating))[0];
    if(prospect){prospect.rating++;return `${prospect.name} avançou um ponto de overall no treino da Academy.`}
    return 'A comissão revisou o plano de desenvolvimento da base.';
  }
  if(day===5){const gain=5+shopBonuses(state).energyRecovery;for(const player of state.players.slice(0,5))player.energy=Math.min(100,player.energy+gain);return `Dia de recuperação: os titulares recuperaram ${gain} pontos de energia.`}
  if(day===6){const gain=1+shopBonuses(state).preparationMorale;for(const player of state.players.slice(0,5))player.morale=Math.min(100,player.morale+gain);return `Reunião de equipe: moral dos titulares +${gain} antes da próxima série.`}
  if(day===7)return 'Dia de competição. A série fica disponível na agenda.';
  return 'Planejamento da semana concluído. Confira os compromissos do clube.';
}
