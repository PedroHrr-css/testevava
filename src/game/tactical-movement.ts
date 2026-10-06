import type {MatchPlayer,Navigation,Point,ReplayTactic,Round} from '../types/game.ts';
import {cellPoint,findPath,nearestCell,pathPosition,roundPaths,sitePoint} from './navigation.ts';

export interface TacticalRoute {
  opening:number[]; execution:number[]; delay:number; arriveAt:number; releaseAt:number; finishAt:number;
  assignment:string;
}
const DUELISTS=new Set(['jett','raze','phoenix','reyna','neon','yoru','iso','waylay']);
const SENTINELS=new Set(['sage','cypher','killjoy','chamber','deadlock','vyse']);
function roleRank(player:MatchPlayer){
  if(player.role)return ({Duelista:0,Iniciador:1,Controlador:2,Sentinela:4} as Record<string,number>)[player.role]??3;
  if(DUELISTS.has(player.agent))return 0;
  if(SENTINELS.has(player.agent))return 4;
  return 3;
}
const bounded=(value:number)=>Math.max(0,Math.min(100,value));

/** Plans select positions and timing; navigation still owns all collision-safe movement. */
export function planRoundMovement(nav:Navigation,map:string,round:Round,attacksOwn:boolean,players:MatchPlayer[],tactic?:ReplayTactic,mastery=48):TacticalRoute[]{
  const direct=roundPaths(nav,map,round,attacksOwn);
  const target=sitePoint(nav,map,round.site),other=sitePoint(nav,map,round.site==='A'?'B':'A');
  const middle={x:(target.x+other.x)/2,y:(target.y+other.y)/2};
  const ranks=players.map((_,id)=>id);
  for(const side of [0,1]){
    const order=ranks.slice(side*5,side*5+5).sort((a,b)=>roleRank(players[a])-roleRank(players[b])||a-b);
    order.forEach((id,rank)=>ranks[id]=rank);
  }
  return players.map((player,id)=>{
    const own=id<5,attacking=own===attacksOwn,rank=ranks[id];
    const pattern=own?(attacking?tactic?.attack:tactic?.defense):undefined;
    const attack=pattern??(['default','split','late','fast'][Math.floor(round.seed*100)%4]);
    const defense=pattern??(['default','hold','retake','aggressive'][Math.floor(round.seed*73)%4]);
    const start=direct[id][0],spawn=cellPoint(nav,start);
    const trained=Math.max(0,Math.min(100,own?(player.mapMastery?.[map]??mastery)*.7+(player.agentMastery?.[player.agent]??48)*.3:55));
    const variation=(1-trained/100)*.2*((id+Math.floor(round.seed*100))%5);
    let position:Point,assignment:string;
    if(attacking){
      const flank=attack==='fast'?rank===4:attack==='split'?rank>=2:rank>=3;
      if(flank){
        position=rank===4?{x:other.x*.65+middle.x*.35,y:other.y*.65+middle.y*.35}:middle;
        assignment=rank===4?'VIGIAR FLANCO':'CONTROLE DE MEIO';
      }else{
        position={x:spawn.x*.3+target.x*.7+(rank-1)*7,y:spawn.y*.3+target.y*.7};
        assignment=rank===0?'ENTRADA':'APOIO À ENTRADA';
      }
    }else{
      position=rank<2?target:rank<4?other:middle;
      position={x:position.x+(rank%2?5:-5),y:position.y+(rank%2?-4:4)};
      assignment=rank<2?`ÂNCORA ${round.site}`:rank<4?`ÂNCORA ${round.site==='A'?'B':'A'}`:'ROTAÇÃO / MEIO';
      if(defense==='aggressive')position={x:position.x*.65+middle.x*.35,y:position.y*.65+spawn.y*.35};
      if(defense==='retake'&&rank<2)position={x:position.x*.7+spawn.x*.3,y:position.y*.7+spawn.y*.3};
    }
    const pingType=attacking?'attack':'defense';
    const pings=own?tactic?.pings?.filter(ping=>ping.type===pingType||ping.type==='position'):undefined;
    if(pings?.length){position=pings[rank%pings.length];assignment='POSIÇÃO DO PLANO';}
    const checkpoint=nearestCell(nav,bounded(position.x),bounded(position.y));
    // Spread the final positions around the objective, rather than sharing one destination.
    const angle=(rank/5*Math.PI*2)+(own?0:Math.PI),spread=attacking?5:8;
    let end=nearestCell(nav,bounded(target.x+Math.cos(angle)*spread),bounded(target.y+Math.sin(angle)*spread));
    if(round.spike?.defuser===id){
      const planter=round.spike.planter,plantAngle=ranks[planter]/5*Math.PI*2+(planter<5?0:Math.PI);
      end=nearestCell(nav,bounded(target.x+Math.cos(plantAngle)*5),bounded(target.y+Math.sin(plantAngle)*5));
    }
    const opening=findPath(nav,start,checkpoint),execution=findPath(nav,checkpoint,end);
    const firstContact=round.events.filter(event=>event.killer===id||event.victim===id||event.assist===id).reduce((time,event)=>Math.min(time,event.time),round.resolveAt);
    const objectiveTime=round.spike?.planter===id?round.spike.plantStart:round.spike?.defuser===id?round.spike.defuseStart??round.resolveAt:round.resolveAt;
    const contact=Math.max(.15,Math.min(firstContact,objectiveTime));
    const delay=Math.min(contact*.08,(attacking?rank*.07:rank*.035)+variation);
    const arriveAt=Math.min(contact*.4,attacking?1.15:1.0)+delay;
    const desiredRelease=attacking?(attack==='fast'?1.2:attack==='late'?2.5:1.8)+(rank===4?.55:rank*.08):
      defense==='aggressive'?1.35:defense==='retake'?round.spike?.plantAt??2.7:rank<2?2.6:round.spike?.plantStart??2.4;
    const releaseAt=Math.max(arriveAt,Math.min(contact*.7,desiredRelease+variation));
    const finishAt=Math.max(releaseAt+.05,contact-.1);
    return {opening:opening.length?opening:[start],execution:execution.length?execution:[checkpoint],delay,arriveAt,releaseAt,finishAt,assignment};
  });
}

export function tacticalPosition(nav:Navigation,route:TacticalRoute,time:number):Point {
  if(time<=route.arriveAt)return pathPosition(nav,route.opening,(time-route.delay)/Math.max(.01,route.arriveAt-route.delay));
  if(time<route.releaseAt)return cellPoint(nav,route.opening.at(-1)!);
  return pathPosition(nav,route.execution,(time-route.releaseAt)/Math.max(.01,route.finishAt-route.releaseAt));
}
