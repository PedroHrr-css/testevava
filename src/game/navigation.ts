import type { Navigation, Point, Round } from '../types/game.ts';

// Floors on the bundled plans are gray/olive; voids are transparent and walls
// are bright outlines. Keep clearance from both before searching any routes.
export function buildNavigation({data,width,height}: {data: Uint8Array | Uint8ClampedArray; width: number; height: number}, cellSize=4, clearance=5): Navigation {
  const columns=Math.floor(width/cellSize), rows=Math.floor(height/cellSize);
  const blocked=new Uint8Array(width*height), integral=new Uint32Array((width+1)*(height+1));
  for(let y=0;y<height;y++) {
    let sum=0;
    for(let x=0;x<width;x++) {
      const i=(y*width+x)*4, r=data[i],g=data[i+1],b=data[i+2];
      const floor=data[i+3]>200 && Math.min(r,g,b)>55 && Math.max(r,g,b)<175 && Math.abs(r-g)<25 && r-b>=-20 && r-b<75;
      blocked[y*width+x]=floor?0:1;
      sum+=blocked[y*width+x];
      integral[(y+1)*(width+1)+x+1]=integral[y*(width+1)+x+1]+sum;
    }
  }
  const walk=new Uint8Array(columns*rows);
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++) {
    const x0=x*cellSize-clearance,y0=y*cellSize-clearance;
    const x1=(x+1)*cellSize+clearance,y1=(y+1)*cellSize+clearance;
    if(x0<0||y0<0||x1>width||y1>height)continue;
    const count=integral[y1*(width+1)+x1]-integral[y0*(width+1)+x1]-integral[y1*(width+1)+x0]+integral[y0*(width+1)+x0];
    if(!count)walk[y*columns+x]=1;
  }
  // Discard enclosed boxes and disconnected decorative geometry.
  const visited=new Uint8Array(walk.length);let largest: number[]=[];
  for(let i=0;i<walk.length;i++)if(walk[i]&&!visited[i]) {
    const cells=[i];visited[i]=1;
    for(let j=0;j<cells.length;j++)for(const n of neighbors(cells[j],columns,rows))if(walk[n]&&!visited[n]){visited[n]=1;cells.push(n);}
    if(cells.length>largest.length)largest=cells;
  }
  walk.fill(0);for(const i of largest)walk[i]=1;
  return {columns,rows,cellSize,width,height,walk:Array.from(walk)};
}
function neighbors(i: number,columns: number,rows: number) {
  const x=i%columns,y=Math.floor(i/columns), out=[];
  if(x>0)out.push(i-1);if(x+1<columns)out.push(i+1);
  if(y>0)out.push(i-columns);if(y+1<rows)out.push(i+columns);
  return out;
}
export function cellPoint(nav: Navigation,index: number): Point {
  return {x:((index%nav.columns)+.5)*nav.cellSize/nav.width*100,y:(Math.floor(index/nav.columns)+.5)*nav.cellSize/nav.height*100};
}
export function nearestCell(nav: Navigation,x: number,y: number): number {
  let best=-1,distance=Infinity;
  for(let i=0;i<nav.walk.length;i++)if(nav.walk[i]) {
    const p=cellPoint(nav,i),d=(p.x-x)**2+(p.y-y)**2;
    if(d<distance){distance=d;best=i;}
  }
  return best;
}
export function findPath(nav: Navigation,start: number,end: number): number[] {
  if(!nav.walk[start]||!nav.walk[end])return [];
  const parents=new Int32Array(nav.walk.length).fill(-1), queue=[end];parents[end]=end;
  for(let j=0;j<queue.length&&parents[start]===-1;j++)for(const n of neighbors(queue[j],nav.columns,nav.rows))if(nav.walk[n]&&parents[n]===-1){parents[n]=queue[j];queue.push(n);}
  if(parents[start]===-1)return [];
  const path=[start];while(path.at(-1)!==end)path.push(parents[path.at(-1)!]);
  return path;
}
export function pathPosition(nav: Navigation,path: number[],progress: number): Point {
  if(!path.length)throw new Error('Rota vazia');
  const step=Math.max(0,Math.min(1,progress))*(path.length-1),i=Math.floor(step);
  const a=cellPoint(nav,path[i]),b=cellPoint(nav,path[Math.min(i+1,path.length-1)]),t=step-i;
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
}
export function clearSight(nav: Navigation,a: Point,b: Point): boolean {
  const steps=Math.ceil(Math.max(Math.abs(a.x-b.x)*nav.width,Math.abs(a.y-b.y)*nav.height)/100*2);
  for(let i=0;i<=steps;i++) {
    const t=steps?i/steps:0,x=Math.floor((a.x+(b.x-a.x)*t)/100*nav.width/nav.cellSize),y=Math.floor((a.y+(b.y-a.y)*t)/100*nav.height/nav.cellSize);
    if(x<0||y<0||x>=nav.columns||y>=nav.rows||!nav.walk[y*nav.columns+x])return false;
  }
  return true;
}
const SPAWNS: Record<string, [PointTuple, PointTuple]>={Icebox:[[8,58],[96,56]],Haven:[[8,40],[92,54]]};
type PointTuple = [number, number];
const SITES: Record<string, Record<string, PointTuple>>={
  Ascent:{A:[28,80],B:[30,15]},Bind:{A:[72,31],B:[28,27]},
  Summit:{A:[92,43],B:[12,30]},Haven:{A:[36,85],B:[42,49]},
  Abyss:{A:[38,91],B:[40,8]},Split:{A:[32,81],B:[33,9]},
  Lotus:{A:[89,32],B:[47,43]},Sunset:{A:[80,38],B:[18,40]},
  Icebox:{A:[73,80],B:[59,22]}
};
export function roundPaths(nav: Navigation,map: string,round: Pick<Round, 'site' | 'seed'>,attacksOwn: boolean): number[][] {
  const spawns=SPAWNS[map]||[[50,90],[50,8]];
  const site=SITES[map]?.[round.site]||[round.site==='A'?30:70,round.site==='A'?30:55];
  const goal=nearestCell(nav,...site),center=cellPoint(nav,goal);
  return Array.from({length:10},(_,i)=>{
    const attacking=(i<5)===attacksOwn,lane=i%5;
    const spawn=spawns[attacking?0:1];
    const start=nearestCell(nav,spawn[0]+(lane-2)*1.4,spawn[1]+(round.seed-.5)*3);
    let end=nearestCell(nav,center.x+(lane-2)*.8,center.y+(i<5?-1:1));
    // Keep the final firefight in one unobstructed patch of floor.
    if(!clearSight(nav,center,cellPoint(nav,end)))end=goal;
    const path=findPath(nav,start,end);
    return path.length?path:[start];
  });
}
