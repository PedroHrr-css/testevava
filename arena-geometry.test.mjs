import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readPlan } from './scripts/map-navigation.mjs';
import { buildWalls, isFloor, planFloor, safeCameraPosition, worldPoint } from './src/game/arena-geometry.ts';

assert.deepEqual(worldPoint({ x: 0, y: 0 }), { x: -50, y: 0, z: -50 });
assert.deepEqual(worldPoint({ x: 100, y: 100 }), { x: 50, y: 0, z: 50 });
const room = { columns: 3, rows: 3, floor: new Uint8Array([0, 0, 0, 0, 1, 0, 0, 0, 0]) };
assert.equal(buildWalls(room).length, 4);
assert.equal(isFloor(room, { x: 0, y: 1, z: 0 }), true);
assert.equal(isFloor(room, { x: 25, y: 1, z: 0 }), false);
const target = { x: 0, y: 1.2, z: 0 };
const blocked = safeCameraPosition(room, target, { x: 35, y: 2, z: 0 });
assert.ok(blocked.x < 100 / 6);
assert.ok(isFloor(room, blocked));
const elevated = { x: 35, y: 15, z: 0 };
assert.deepEqual(safeCameraPosition(room, target, elevated), elevated);
assert.ok(safeCameraPosition(room, target, { x: -90, y: 2, z: 0 }).x > -100 / 6);

const maps = JSON.parse(fs.readFileSync('public/assets/maps/navigation.json', 'utf8'));
for (const [name, nav] of Object.entries(maps)) {
  const grid = planFloor(readPlan(`public/assets/maps/${name}-plan.png`).data, nav);
  const walls = buildWalls(grid);
  assert.ok(walls.length > 4);
  for (const wall of walls) {
    assert.ok(wall.width > 0 && wall.depth > 0);
    assert.ok(Math.abs(wall.x) <= 50 && Math.abs(wall.z) <= 50);
  }
  nav.walk.forEach((walkable, id) => {
    if (walkable) assert.equal(grid.floor[id], 1, `${name}: a navigable player position must remain inside the 3D floor`);
  });
}
console.log('3D arena OK: all 13 map floors, merged walls, coordinate alignment and chase camera collision');

// Joint pivots keep boots on the floor and knees independent of the upper body.
const {createPlayerModel}=await import('./src/game/player-model.ts');
for(const agent of ['jett','sage','omen','viper','brimstone','cypher','raze']) {
  const model=createPlayerModel(0xb2e441,0,agent);
  assert.equal(model.leftKnee.parent,model.leftLeg);
  assert.equal(model.rightKnee.parent,model.rightLeg);
  assert.equal(model.weapon.parent,model.torso);
  const torsoPosition=model.torso.position.clone();
  model.leftLeg.rotation.x=.4;model.leftKnee.rotation.x=-.3;
  assert.ok(model.torso.position.equals(torsoPosition));
  assert.equal(model.pick.userData.playerId,0);
}
console.log('Articulated player models OK: independent hips, knees and held weapons');
// Every available agent has signature equipment and a deterministic identity.
const agentCatalog=JSON.parse((await import('node:fs')).readFileSync('agents.json','utf8'));
for(const agent of agentCatalog){const model=createPlayerModel(0xb2e441,0,agent.id);assert.equal(model.group.userData.agent,agent.id);assert.ok(model.group.userData.signature);}
