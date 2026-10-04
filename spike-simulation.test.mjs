import assert from 'node:assert/strict';
import {createMapSimulation} from './src/game/simulation.ts';
let seed=23;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const outcomes=new Set();
for(const ownStartsAttack of [true,false])for(const win of [true,false]) {
  const replay=createMapSimulation(win,Array(10).fill({}),random,ownStartsAttack);
  const kills=Array(10).fill(0),deaths=Array(10).fill(0),assists=Array(10).fill(0);
  replay.rounds.forEach((round,index)=>{
    outcomes.add(round.outcome);
    assert.equal(round.attacking,((index<12)===ownStartsAttack)?0:1);
    const alive=new Set(Array.from({length:10},(_,i)=>i));
    round.events.forEach(e=>{assert.ok(alive.has(e.killer)&&alive.has(e.victim));alive.delete(e.victim);kills[e.killer]++;deaths[e.victim]++;if(e.assist!==null)assists[e.assist]++;});
    assert.ok(round.resolveAt<round.duration);
    if(round.spike) {
      assert.ok(round.spike.plantStart>=2.8); // movement reaches the site first
      assert.ok(round.spike.plantStart<round.spike.plantAt);
      assert.ok(round.spike.plantAt<round.events[0].time);
      assert.equal(round.spike.planter<5?0:1,round.attacking);
      if(round.outcome==='detonation') {
        assert.equal(round.winner,round.attacking);
        assert.equal(round.resolveAt,round.spike.explodeAt);
        assert.deepEqual(new Set(round.spike.casualties),alive);
        round.spike.casualties.forEach(id=>deaths[id]++);
      } else {
        assert.notEqual(round.winner,round.attacking);
        assert.ok(alive.has(round.spike.defuser));
        assert.equal(round.spike.defuser<5?0:1,round.winner);
        assert.ok(round.spike.defuseStart>round.events.at(-1).time);
        assert.ok(round.resolveAt<round.spike.explodeAt);
        assert.equal(round.spike.casualties.length,0);
      }
    }
  });
  replay.stats.forEach((stats,i)=>assert.deepEqual(stats,{kills:kills[i],deaths:deaths[i],assists:assists[i]}));
}
assert.deepEqual(outcomes,new Set(['elimination','detonation','defuse']));
console.log('Spike OK: plant, detonation, defuse, halftime sides and career statistics');
