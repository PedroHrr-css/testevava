import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readPlan} from './scripts/map-navigation.mjs';
import {findPath,roundPaths,pathPosition,cellPoint,clearSight} from './src/game/navigation.ts';

// A wall forces a detour through the only doorway. Diagonal shortcuts are forbidden.
const fixture={columns:7,rows:7,cellSize:1,width:7,height:7,walk:Array(49).fill(1)};
for(let y=0;y<6;y++)fixture.walk[y*7+3]=0;
const detour=findPath(fixture,7,13);
assert.ok(detour.length>7);
assert.ok(detour.includes(45));
assert.equal(clearSight(fixture,cellPoint(fixture,7),cellPoint(fixture,13)),false);
assert.deepEqual(findPath(fixture,3,13),[]);

const maps=JSON.parse(fs.readFileSync('public/assets/maps/navigation.json','utf8'));
assert.equal(Object.keys(maps).length,13);
for(const [map,nav] of Object.entries(maps)) {
  const pixels=readPlan(`public/assets/maps/${map}-plan.png`);
  const floor=(x,y)=>{
    assert.ok(x>=0&&y>=0&&x<pixels.width&&y<pixels.height);
    const i=(y*pixels.width+x)*4,r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
    return pixels.data[i+3]>200&&Math.min(r,g,b)>55&&Math.max(r,g,b)<175&&Math.abs(r-g)<25&&r-b>=-20&&r-b<75;
  };
  for(const site of ['A','B'])for(const attacksOwn of [true,false]) {
    const title=map[0].toUpperCase()+map.slice(1);
    const routes=roundPaths(nav,title,{site,seed:.4},attacksOwn);
    assert.equal(routes.length,10);
    for(const path of routes) {
      assert.ok(path.length>1,`${map} has a usable route`);
      for(let j=0;j<path.length;j++) {
        assert.equal(nav.walk[path[j]],1);
        if(j) {
          const a=path[j-1],b=path[j];
          assert.equal(Math.abs(a%nav.columns-b%nav.columns)+Math.abs(Math.floor(a/nav.columns)-Math.floor(b/nav.columns)),1);
        }
        // Check centers AND interpolation, with the rendered marker's radius.
        for(const offset of [0,.5]) {
          const p=pathPosition(nav,path,(j+offset)/(path.length-1));
          const x=Math.floor(p.x/100*nav.width),y=Math.floor(p.y/100*nav.height);
          for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++)if(dx*dx+dy*dy<=25)
            assert.ok(floor(x+dx,y+dy),`${map}: marker overlaps a wall at ${x},${y}`);
        }
      }
      assert.deepEqual(pathPosition(nav,path,2),cellPoint(nav,path.at(-1)));
    }
  }
}
console.log('Navigation OK: all 13 maps, both sites and sides, corridor turns and marker clearance');
