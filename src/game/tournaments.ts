import type {CareerState, Team} from '../types/career.ts';

export type TournamentScope = 'regional' | 'international' | 'americas';
export interface TournamentRound {
  week: number;
  id: string;
  name: string;
  phase: string;
  scope: TournamentScope;
  winPrize: number;
  winPoints: number;
  kind: 'invite' | 'regional' | 'qualified';
  requirement?: string;
}

// Fictional 14-week career, with one decisive BO3 in each playable slot.
export const TOURNAMENT_ROUNDS: TournamentRound[] = [
  {week:1,id:'tixinha',name:'Tixinha & Sacy Invitational',phase:'Pré-temporada',scope:'americas',winPrize:95,winPoints:0,kind:'invite'},
  {week:2,id:'homeground',name:'Red Bull Home Ground',phase:'Pré-temporada',scope:'international',winPrize:125,winPoints:0,kind:'invite'},
  {week:3,id:'kickoff',name:'VCT Kickoff',phase:'Abertura regional',scope:'regional',winPrize:45,winPoints:3,kind:'regional'},
  {week:4,id:'kickoff',name:'VCT Kickoff',phase:'Decisão regional',scope:'regional',winPrize:80,winPoints:3,kind:'regional'},
  {week:5,id:'santiago',name:'Masters Santiago',phase:'Etapa internacional',scope:'international',winPrize:260,winPoints:5,kind:'qualified',requirement:'Vencer ao menos uma série no Kickoff'},
  {week:6,id:'stage1',name:'VCT Stage 1',phase:'Rodada regional 1',scope:'regional',winPrize:50,winPoints:3,kind:'regional'},
  {week:7,id:'stage1',name:'VCT Stage 1',phase:'Rodada regional 2',scope:'regional',winPrize:50,winPoints:3,kind:'regional'},
  {week:8,id:'stage1',name:'VCT Stage 1',phase:'Playoffs regionais',scope:'regional',winPrize:100,winPoints:4,kind:'regional'},
  {week:9,id:'london',name:'Masters London',phase:'Etapa internacional',scope:'international',winPrize:300,winPoints:5,kind:'qualified',requirement:'Vencer duas séries no Stage 1'},
  {week:10,id:'ewc',name:'Esports World Cup',phase:'Etapa global',scope:'international',winPrize:240,winPoints:4,kind:'qualified',requirement:'Vencer duas séries no Stage 1'},
  {week:11,id:'stage2',name:'VCT Stage 2',phase:'Rodada regional 1',scope:'regional',winPrize:55,winPoints:3,kind:'regional'},
  {week:12,id:'stage2',name:'VCT Stage 2',phase:'Rodada regional 2',scope:'regional',winPrize:55,winPoints:3,kind:'regional'},
  {week:13,id:'stage2',name:'VCT Stage 2',phase:'Playoffs regionais',scope:'regional',winPrize:110,winPoints:4,kind:'regional'},
  {week:14,id:'champions',name:'Champions Shanghai',phase:'Mundial',scope:'international',winPrize:450,winPoints:7,kind:'qualified',requirement:'Vencer duas séries no Stage 2 e cinco regionais na temporada'},
];

export const tournamentRound = (week: number) => TOURNAMENT_ROUNDS[Math.max(0,Math.min(week-1,TOURNAMENT_ROUNDS.length-1))];
export type TournamentAccess = 'invite' | 'accepted' | 'declined' | 'qualified' | 'locked' | 'regional';

export function tournamentAccess(state: CareerState, round: TournamentRound): TournamentAccess {
  if(round.kind==='invite')return state.inviteResponses?.[round.id] ?? 'invite';
  if(round.kind==='regional')return 'regional';
  const results=state.tournamentResults||[];
  const wins=(id:string)=>results.filter(r=>r.eventId===id && r.win).length;
  const regionalWins=results.filter(r=>['kickoff','stage1','stage2'].includes(r.eventId) && r.win).length;
  if(round.id==='santiago')return wins('kickoff')>=1?'qualified':'locked';
  if(round.id==='london'||round.id==='ewc')return wins('stage1')>=2?'qualified':'locked';
  if(round.id==='champions')return wins('stage2')>=2&&regionalWins>=5?'qualified':'locked';
  return 'locked';
}

export const canPlayTournament = (state: CareerState) => ['accepted','regional','qualified'].includes(tournamentAccess(state,tournamentRound(state.week)));

export function tournamentOpponent(state: CareerState, teams: Team[]): Team {
  const round=tournamentRound(state.week);
  const own=teams.find(t=>t.id===state.team)!;
  let candidates=teams.filter(t=>t.id!==own.id && (
    round.scope==='regional' ? t.region===own.region :
    round.scope==='americas' ? t.region==='AMERICAS' :
    t.region!==own.region
  ));
  if(!candidates.length)candidates=teams.filter(t=>t.id!==own.id);
  const offset=teams.findIndex(t=>t.id===own.id);
  return candidates[(state.week-1+offset)%candidates.length];
}
