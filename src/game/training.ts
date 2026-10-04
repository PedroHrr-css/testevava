import type { CareerState } from '../types/career.ts';
export type TrainingKind = 'aim' | 'agent-match' | 'ability-names' | 'map-guess';
export interface TrainingResult { id: string; kind: TrainingKind; score: number; targets: { playerId: string; agentId: string }[]; map: string; completedAt: string; durationMs?: number; accuracyScore?: number; speedBonus?: number; rewards?: string[] }
export const trainingLabels: Record<TrainingKind,string> = {aim:'Mira e reflexos','agent-match':'Habilidade → agente','ability-names':'Nome → habilidade','map-guess':'Reconhecimento de mapas'};
export function aimScore(hits:number, misses:number):number {const activity=Math.min(1,hits/30);return Math.round(100*activity*(.65*(hits/Math.max(1,hits+misses))+.35*activity));}
export function rewardTraining(state:CareerState,result:TrainingResult):string[] {
  state.trainingHistory??=[];
  if(state.trainingHistory.some(r=>r.id===result.id))return [];
  for(const player of state.players)player.mapMastery??={...state.mapMastery};
  const gain=Math.floor(Math.max(0,Math.min(100,result.score))/12.5), rewards:string[]=[];
  for(const target of result.targets.filter((t,i,a)=>a.findIndex(x=>x.playerId===t.playerId)===i)) {
    const player=state.players.find(p=>p.id===target.playerId);if(!player)continue;
    const values=result.kind==='map-guess'?(player.mapMastery??={...state.mapMastery}):player.agentMastery;
    const key=result.kind==='map-guess'?result.map:target.agentId,before=values[key]??48;
    values[key]=Math.min(100,before+gain);rewards.push(`${player.alias} · ${key} +${values[key]-before} → ${values[key]}%`);
  }
  if(result.kind==='map-guess')state.mapMastery[result.map]=Math.round(state.players.slice(0,5).reduce((n,p)=>n+(p.mapMastery?.[result.map]??state.mapMastery[result.map]??48),0)/Math.min(5,state.players.length));
  state.trainingHistory.unshift({...result,rewards});state.trainingHistory=state.trainingHistory.slice(0,12);return rewards;
}

export const TRAINING_WEEKLY_LIMIT = 3;
export const TRAINING_COST = 40;
export function trainingUsed(state:CareerState,id:string):number {
  return state.trainingUsage?.[id]?.week===state.week ? state.trainingUsage[id].count : 0;
}
export function trainingBlock(state:CareerState,ids:string[]):string {
  const unique=[...new Set(ids)];
  if(!unique.length)return 'Selecione pelo menos um atleta.';
  if(unique.some(id=>!state.players.some(p=>p.id===id)))return 'Atleta indisponível.';
  if(unique.some(id=>trainingUsed(state,id)>=TRAINING_WEEKLY_LIMIT))return 'Um atleta selecionado atingiu o limite semanal.';
  if(state.money<unique.length*TRAINING_COST)return 'Saldo insuficiente para este treino.';
  return '';
}
export function beginTraining(state:CareerState,ids:string[]):boolean {
  if(trainingBlock(state,ids))return false;
  state.trainingUsage??={};
  for(const id of new Set(ids))state.trainingUsage[id]={week:state.week,count:trainingUsed(state,id)+1};
  state.money-=new Set(ids).size*TRAINING_COST;
  return true;
}
export function timedScore(accuracy:number,durationMs:number,referenceMs:number):number {
  return Math.round(Math.max(0,Math.min(100,accuracy))*(.7+.3*Math.max(0,1-durationMs/referenceMs)));
}
