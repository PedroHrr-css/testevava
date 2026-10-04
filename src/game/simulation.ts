import type { Simulation, Round, CombatEvent, Side } from '../types/game.ts';

// A compact tactical visualization, with shared round events and career statistics.
export function createMapSimulation<T>(win: boolean, players: T[], random = Math.random, ownStartsAttack=true): Simulation<T> {
  if (players.length !== 10) throw new Error('A partida precisa de dez jogadores.');
  const loserScore = 5 + Math.floor(random() * 8);
  const remaining = [win ? 13 : loserScore, win ? loserScore : 13];
  const rounds: Round[] = [], stats = Array.from({length:10}, () => ({kills:0,deaths:0,assists:0}));
  while (remaining[0] + remaining[1]) {
    const matchWinner = win ? 0 : 1;
    const winner: Side = remaining[matchWinner]===1 && remaining[1-matchWinner]>0 ? (matchWinner===0?1:0) : remaining[0] && remaining[1] ? (random() < remaining[0]/(remaining[0]+remaining[1]) ? 0 : 1) : remaining[0] ? 0 : 1;
    remaining[winner]--;
    const alive = [Array.from({length:5},(_,i)=>i),Array.from({length:5},(_,i)=>i+5)];
    const events: CombatEvent[] = [];
    const pick = (list: number[]) => list[Math.floor(random()*list.length)];
    const attacking: Side=(rounds.length<12)===ownStartsAttack?0:1;
    const planted=random()<.65;
    const planter=pick(alive[attacking]);
    const losses = Math.floor(random()*4);
    const winnerKills=planted?2+Math.floor(random()*3):5;
    for(let i=0;i<losses+winnerKills;i++) {
      const side = i < losses ? 1-winner : winner;
      const killer = pick(alive[side]), victim = pick(alive[1-side]);
      const helpers = alive[side].filter(id=>id!==killer);
      const assist = helpers.length && random()<.55 ? pick(helpers) : null;
      alive[1-side].splice(alive[1-side].indexOf(victim),1);
      stats[killer].kills++; stats[victim].deaths++;
      if(assist!==null) stats[assist].assists++;
      events.push({time:(planted?4.5:3)+i*.65,killer,victim,assist});
    }
    const outcome=planted?(winner===attacking?'detonation':'defuse'):'elimination';
    const resolveAt=planted?(outcome==='detonation'?12.2:events.at(-1)!.time+2.3):events.at(-1)!.time;
    const spike=planted?{planter,plantStart:2.85,plantAt:4.2,explodeAt:12.2,
      defuser:outcome==='defuse'?pick(alive[1-attacking]):null,
      defuseStart:outcome==='defuse'?resolveAt-1.6:null,
      casualties:outcome==='detonation'?[...alive[0],...alive[1]]:[]}:null;
    spike?.casualties.forEach(id=>stats[id].deaths++);
    rounds.push({winner,attacking,events,spike,outcome,resolveAt,duration:resolveAt+1.8,site:random()<.5?'A':'B',seed:random()});
  }
  return {rounds,stats,score:win ? [13,loserScore] : [loserScore,13],players};
}

