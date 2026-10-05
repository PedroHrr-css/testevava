import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { MatchPlayer, Navigation, Point, Round } from '../types/game.ts';
import { clearSight } from './navigation.ts';
import { buildWalls, planFloor, safeCameraPosition, WALL_HEIGHT, worldPoint, type FloorGrid } from './arena-geometry.ts';
import { createPlayerModel } from './player-model.ts';

const COLORS = [0xff4655, 0x65d5b5];
const OVERVIEW = new THREE.Vector3(66, 92, 90);
export type CameraMode = 'tactical' | 'follow' | 'player';
export interface RenderFrame {
  map: string; round: Round; roundKey: string; elapsed: number; delta: number;
  positions: Point[]; headings: Point[]; dead: Set<number>; anchor: Point; navigation: Navigation;
}
export interface MatchRenderer {
  draw: (frame: RenderFrame) => void;
  zoom: (amount: number) => void;
  follow: (player: number | null) => void;
  cameraMode: (mode: CameraMode) => void;
  rotate: (direction: number) => void;
  destroy: () => void;
}

function disposeObjects(root: THREE.Object3D, disposeTextures = false) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (object instanceof THREE.InstancedMesh) object.dispose();
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
      if ('geometry' in object) geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        if (disposeTextures && 'map' in material && material.map instanceof THREE.Texture) textures.add(material.map);
      }
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  textures.forEach(texture => texture.dispose());
}

function playerLabel(player: MatchPlayer, id: number): THREE.Sprite {
  const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 88;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#09151ee8'; context.beginPath(); context.roundRect(0, 0, 384, 88, 12); context.fill();
  context.fillStyle = id < 5 ? '#ff4655' : '#65d5b5'; context.fillRect(0, 0, 7, 88);
  context.font = 'bold 34px system-ui'; context.fillText(`${String(id % 5 + 1).padStart(2, '0')}  ${player.alias}`, 20, 43, 346);
  context.fillStyle = '#a3bdc8'; context.font = '22px system-ui'; context.fillText(player.agent.toUpperCase(), 20, 72, 346);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true, sizeAttenuation: false }));
  label.scale.set(.115, .026, 1); label.renderOrder = 10;
  return label;
}

/** A roofless arena and spectator cameras; replay events still own all results. */
export function createMatchRenderer(parent: HTMLElement, maps: string[], players: MatchPlayer[], onSelect: (id: number) => void, navigation: Record<string, Navigation>): { renderer: MatchRenderer; ready: Promise<void> } {
  let disposed = false, mode: CameraMode = 'tactical', selected: number | null = null;
  let zoom = 1, yawOffset = 0, pitch = .5, overviewTransition = false;
  let currentMap = '', currentRound = '', floor: FloorGrid | null = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x09131d);
  scene.fog = new THREE.Fog(0x09131d, 135, 280);
  const camera = new THREE.PerspectiveCamera(48, 1, .08, 400);
  camera.position.copy(OVERVIEW); camera.lookAt(0, 0, 0); scene.add(camera);
  const webgl = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  webgl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  webgl.outputColorSpace = THREE.SRGBColorSpace;
  webgl.toneMapping = THREE.ACESFilmicToneMapping; webgl.toneMappingExposure = 1.25;
  webgl.shadowMap.enabled = true; webgl.shadowMap.type = THREE.PCFSoftShadowMap;
  webgl.domElement.setAttribute('aria-hidden', 'true');
  parent.append(webgl.domElement); parent.dataset.renderer = 'three'; parent.dataset.cameraMode = mode;
  const controls = new OrbitControls(camera, webgl.domElement);
  controls.enableDamping = !reducedMotion; controls.dampingFactor = .12;
  controls.minDistance = 8; controls.maxDistance = 330;
  controls.minPolarAngle = .05; controls.maxPolarAngle = Math.PI / 2 - .08;
  controls.screenSpacePanning = false; controls.rotateSpeed = .55;
  const resize = () => {
    if (disposed) return;
    const width = Math.max(1, parent.clientWidth), height = Math.max(1, parent.clientHeight);
    webgl.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    if (mode === 'tactical') overviewTransition = true;
  };
  const observer = new ResizeObserver(resize); observer.observe(parent); resize();
  scene.add(new THREE.HemisphereLight(0xb7d8ff, 0x263545, 2.1));
  const sun = new THREE.DirectionalLight(0xffe4c1, 3.2); sun.position.set(-35, 65, 25);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 140 });
  sun.shadow.bias = -.0008; scene.add(sun);
  const rim = new THREE.DirectionalLight(0x70b7ff, 1.5); rim.position.set(40, 25, -45); scene.add(rim);
  const base = new THREE.Mesh(new THREE.BoxGeometry(108, .9, 108), new THREE.MeshStandardMaterial({ color: 0x132330, roughness: .7, metalness: .35 }));
  base.position.y = -.6; base.receiveShadow = true; scene.add(base);
  const grid = new THREE.GridHelper(108, 36, 0x376277, 0x1e3747); grid.position.y = -.13; scene.add(grid);
  const arena = new THREE.Group(); scene.add(arena);
  let walls: THREE.InstancedMesh | null = null;
  const units = players.map((player, id) => {
    const model = createPlayerModel(COLORS[id < 5 ? 0 : 1], id, player.agent, player.alias);
    const label = playerLabel(player, id); label.position.y = 2.5;
    scene.add(model.group, label);
    return { ...model, label, heading: id < 5 ? Math.PI : 0, previous: new THREE.Vector3(), initialized: false, stride: id, poseTime: -1 };
  });
  const tracers = Array.from({ length: 10 }, () => {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 1, 5), new THREE.MeshBasicMaterial({ color: 0xffeab0, transparent: true }));
    beam.visible = false; scene.add(beam); return beam;
  });
  const spike = new THREE.Group();
  const spikeBody = new THREE.Mesh(new THREE.OctahedronGeometry(.4), new THREE.MeshStandardMaterial({ color: 0xffaa62, emissive: 0x9e4125, emissiveIntensity: 1.2 }));
  spikeBody.position.y = .65; spike.add(spikeBody);
  const spikeRing = new THREE.Mesh(new THREE.RingGeometry(.7, .82, 32), new THREE.MeshBasicMaterial({ color: 0xffaa62, side: THREE.DoubleSide, transparent: true }));
  spikeRing.rotation.x = -Math.PI / 2; spikeRing.position.y = .07; spike.add(spikeRing); scene.add(spike);
  const blast = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshBasicMaterial({ color: 0xffae75, transparent: true, opacity: .25, depthWrite: false }));
  blast.visible = false; scene.add(blast);
  const selectedRing = new THREE.Mesh(new THREE.RingGeometry(.7, .85, 32), new THREE.MeshBasicMaterial({ color: 0x8ae9ff, side: THREE.DoubleSide, depthTest: false }));
  selectedRing.rotation.x = -Math.PI / 2; selectedRing.visible = false; selectedRing.renderOrder = 12; scene.add(selectedRing);
  const viewGun = new THREE.Group();
  const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x253849, metalness: .6, roughness: .35 });
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(.12, .14, .45), gunMaterial); gunBody.position.set(.24, -.18, -.48);
  const gunBarrel = new THREE.Mesh(new THREE.BoxGeometry(.055, .055, .3), gunMaterial); gunBarrel.position.set(.24, -.14, -.8);
  viewGun.add(gunBody, gunBarrel); viewGun.visible = false; camera.add(viewGun);
  const textures = new Map<string, THREE.Texture>(), loader = new THREE.TextureLoader();
  const ready = Promise.all([...new Set(maps)].map(async map => {
    const texture = await loader.loadAsync(`/assets/maps/${map.toLowerCase()}-plan.png`);
    if (disposed) { texture.dispose(); return; }
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(4, webgl.capabilities.getMaxAnisotropy());
    textures.set(map, texture);
  })).then(() => { if (!disposed) webgl.render(scene, camera); });

  function loadArena(map: string) {
    disposeObjects(arena); arena.clear();
    const texture = textures.get(map);
    if (!texture) throw new Error('Map texture unavailable');
    const nav = navigation[map.toLowerCase()];
    const canvas = document.createElement('canvas'); canvas.width = nav.width; canvas.height = nav.height;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(texture.image as HTMLImageElement, 0, 0, nav.width, nav.height);
    floor = planFloor(context.getImageData(0, 0, nav.width, nav.height).data, nav);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ map: texture, color: 0xc1d0d5, transparent: true, alphaTest: .05, roughness: .94 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; arena.add(ground);
    const segments = buildWalls(floor);
    walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x648391, metalness: .18, roughness: .75 }), segments.length);
    const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
    segments.forEach((wall, index) => {
      matrix.compose(new THREE.Vector3(wall.x, WALL_HEIGHT / 2, wall.z), rotation, new THREE.Vector3(wall.width, WALL_HEIGHT, wall.depth));
      walls!.setMatrixAt(index, matrix);
      walls!.setColorAt(index, new THREE.Color(index % 4 === 0 ? 0x7698a7 : 0x547381));
    });
    walls.instanceMatrix.needsUpdate = true;
    walls.castShadow = true; walls.receiveShadow = true; arena.add(walls);
    currentMap = map;
  }

  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let pointerStart: { x: number; y: number; yaw: number; pitch: number } | null = null;
  let hovered: number | null = null;
  const onPointerDown = (event: PointerEvent) => {
    pointerStart = { x: event.clientX, y: event.clientY, yaw: yawOffset, pitch };
    if (mode !== 'tactical') webgl.domElement.setPointerCapture(event.pointerId);
  };
  const pick = (event: PointerEvent) => {
    const bounds = webgl.domElement.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(units.map(unit => unit.pick), false)[0]?.object.userData.playerId as number | undefined;
  };
  const onPointerMove = (event: PointerEvent) => {
    if (pointerStart && mode !== 'tactical') {
      yawOffset = pointerStart.yaw - (event.clientX - pointerStart.x) * .006;
      pitch = THREE.MathUtils.clamp(pointerStart.pitch + (event.clientY - pointerStart.y) * (mode === 'player' ? -.004 : .004), mode === 'player' ? -.85 : .2, mode === 'player' ? .85 : 1.1);
    } else if (!pointerStart) {
      hovered = pick(event) ?? null;
      webgl.domElement.style.cursor = hovered === null ? 'grab' : 'pointer';
    }
  };
  const onPointerUp = (event: PointerEvent) => {
    if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) < 5) {
      const id = pick(event); if (id !== undefined) onSelect(id);
    }
    if (webgl.domElement.hasPointerCapture(event.pointerId)) webgl.domElement.releasePointerCapture(event.pointerId);
    pointerStart = null;
  };
  const onPointerCancel = () => { pointerStart = null; };
  webgl.domElement.addEventListener('pointerdown', onPointerDown);
  webgl.domElement.addEventListener('pointermove', onPointerMove);
  webgl.domElement.addEventListener('pointerup', onPointerUp);
  webgl.domElement.addEventListener('pointercancel', onPointerCancel);
  const lookTarget = new THREE.Vector3(), forward = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

  function setMode(next: CameraMode) {
    mode = next; yawOffset = 0; pitch = next === 'player' ? 0 : .5;
    controls.enabled = next === 'tactical';
    overviewTransition = next === 'tactical';
    parent.dataset.cameraMode = mode;
  }
  function draw(frame: RenderFrame) {
    if (disposed || !textures.size) return;
    if (currentMap !== frame.map) loadArena(frame.map);
    if (currentRound !== frame.roundKey) {
      currentRound = frame.roundKey;
      units.forEach(unit => { unit.initialized = false; unit.stride = 0; });
    }
    const dt = Math.max(.001, Math.min(frame.delta, .1));
    const smoothing = reducedMotion ? 1 : 1 - Math.exp(-dt * 9);
    const { positions, dead, round, elapsed, anchor } = frame;
    const crowded: THREE.Vector3[] = [];
    units.forEach((unit, id) => {
      const point = worldPoint(positions[id]), position = new THREE.Vector3(point.x, 0, point.z);
      const motion = unit.initialized ? position.distanceTo(unit.previous) : 0;
      const heading = frame.headings[id];
      if (Math.hypot(heading.x, heading.y) > .001) {
        const desired = Math.atan2(heading.x, heading.y);
        unit.heading += Math.atan2(Math.sin(desired - unit.heading), Math.cos(desired - unit.heading)) * (unit.initialized ? smoothing : 1);
      }
      const target = round.events.find(event => event.killer === id && Math.abs(event.time - elapsed) < .12);
      if (target) {
        const victim = positions[target.victim];
        unit.heading = Math.atan2(victim.x - positions[id].x, victim.y - positions[id].y);
      }
      unit.group.position.copy(position); unit.group.rotation.y = unit.heading;
      const isDead = dead.has(id), walking = motion > .003 && !isDead;
      // Keep the exact pose while paused, even as the camera continues rendering.
      if(!unit.initialized || unit.poseTime!==elapsed) {
        if(walking)unit.stride += motion * 3.4;
        const gait = Math.sin(unit.stride);
        unit.leftLeg.rotation.x = isDead ? .9 : walking ? gait * .35 : 0;
        unit.rightLeg.rotation.x = isDead ? 1.2 : -unit.leftLeg.rotation.x;
        unit.leftKnee.rotation.x = isDead ? -.7 : walking ? -Math.max(0,-gait)*.55 : 0;
        unit.rightKnee.rotation.x = isDead ? -.7 : walking ? -Math.max(0,gait)*.55 : 0;
        const shotAge=target?elapsed-target.time:Infinity;
        const firing=!isDead && shotAge>=0 && shotAge<.035;
        unit.weapon.position.z=.37-(firing?.025:0);
        unit.muzzleFlash.visible=firing;
        unit.torso.rotation.z = isDead ? -Math.PI / 2 : walking ? gait*.018 : 0;
        unit.torso.rotation.x = isDead ? 0 : walking ? .045 : 0;
        unit.torso.position.y = isDead ? .24 : .83 + (walking ? Math.abs(gait) * .018 : 0);
        unit.poseTime=elapsed;
      }
      unit.group.visible = !(mode === 'player' && selected === id && !isDead);
      unit.ring.material.opacity = isDead ? .15 : .8;
      unit.label.position.copy(position).y = 2.5;
      const overlap = crowded.some(other => other.distanceTo(position) < 3.3);
      unit.label.visible = !isDead && selected !== id && (hovered === id || (!overlap && (mode === 'tactical' || position.distanceTo(camera.position) < 22)));
      if (unit.label.visible) crowded.push(position);
      unit.previous.copy(position); unit.initialized = true;
    });
    selectedRing.visible = selected !== null && mode !== 'player';
    if (selected !== null) selectedRing.position.copy(units[selected].group.position).y = .05;
    if (walls) walls.scale.y = mode === 'tactical' ? .58 : 1;
    tracers.forEach(beam => { beam.visible = false; });
    round.events.forEach((event, index) => {
      const age = elapsed - event.time;
      if (age < 0 || age > .28 || !clearSight(frame.navigation, positions[event.killer], positions[event.victim])) return;
      const from = units[event.killer].group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      const to = units[event.victim].group.position.clone().add(new THREE.Vector3(0, 1.1, 0));
      const beam = tracers[index % tracers.length], direction = to.clone().sub(from);
      beam.position.copy(from).lerp(to, .5); beam.scale.set(1, direction.length(), 1);
      beam.quaternion.setFromUnitVectors(up, direction.normalize()); beam.visible = true;
      beam.material.opacity = 1 - age / .28;
    });
    const origin = worldPoint(anchor); spike.position.set(origin.x, 0, origin.z);
    spike.visible = !!round.spike && elapsed >= round.spike.plantStart && elapsed < round.resolveAt;
    const defusing = round.spike?.defuseStart !== null && elapsed >= (round.spike?.defuseStart ?? Infinity);
    spikeRing.material.color.set(defusing ? 0x76e2f4 : 0xffaa62);
    spikeRing.scale.setScalar(reducedMotion ? 1 : 1 + Math.sin(elapsed * 8) * .15);
    spikeBody.rotation.y = elapsed;
    blast.visible = round.outcome === 'detonation' && elapsed >= round.resolveAt;
    if (blast.visible) {
      const t = Math.min(1, (elapsed - round.resolveAt) / 1.8);
      blast.position.set(origin.x, .2, origin.z); blast.scale.setScalar(reducedMotion ? 5 : 1 + t * 24);
      blast.material.opacity = (1 - t) * .3;
    }
    viewGun.visible = mode === 'player' && selected !== null && !dead.has(selected);
    if (mode === 'tactical') {
      const desired = OVERVIEW.clone().multiplyScalar(Math.max(1, 1.08 / camera.aspect)).divideScalar(zoom);
      if (overviewTransition) {
        camera.position.lerp(desired, smoothing); controls.target.lerp(new THREE.Vector3(), smoothing);
        controls.enabled = false;
        if (camera.position.distanceTo(desired) < .1) { overviewTransition = false; controls.enabled = true; }
      }
      controls.target.clamp(new THREE.Vector3(-50, 0, -50), new THREE.Vector3(50, 0, 50));
      camera.fov = 48; controls.update(dt);
    } else if (selected !== null) {
      const unit = units[selected], point = unit.group.position;
      const yaw = unit.heading + yawOffset;
      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      controls.enabled = false;
      if (mode === 'player' && !dead.has(selected)) {
        // Keep the eye on the navigable route: interpolating across a corner can enter a wall.
        camera.position.copy(point).y = 1.55;
        lookTarget.copy(camera.position).add(forward.clone().multiplyScalar(8)); lookTarget.y += Math.sin(pitch) * 8;
        camera.lookAt(lookTarget); camera.fov = THREE.MathUtils.clamp(70 * 2 / zoom, 40, 85);
      } else {
        const distance = 5 * 2 / zoom;
        const eye = point.clone().add(new THREE.Vector3(0, 1.2, 0));
        const desired = point.clone().addScaledVector(forward, -distance * Math.cos(pitch));
        desired.y = 1.2 + distance * Math.sin(Math.max(.2, pitch));
        let safe = floor ? safeCameraPosition(floor, eye, desired) : desired;
        if (Math.hypot(safe.x-eye.x,safe.y-eye.y,safe.z-eye.z)<1.4) {
          // In tight corridors, lift above the athlete instead of pressing the camera into their body.
          safe = { x: eye.x, y: WALL_HEIGHT + 1.8, z: eye.z };
        }
        camera.position.lerp(new THREE.Vector3(safe.x, safe.y, safe.z), smoothing);
        if (floor) { const corrected = safeCameraPosition(floor, eye, camera.position); camera.position.set(corrected.x, corrected.y, corrected.z); }
        lookTarget.lerp(eye.clone().addScaledVector(forward, .8), smoothing);
        camera.lookAt(lookTarget); camera.fov = 55;
      }
    }
    camera.updateProjectionMatrix();
    webgl.render(scene, camera);
  }
  return {
    ready,
    renderer: {
      draw,
      zoom: amount => { zoom = THREE.MathUtils.clamp(amount, 1, 3); if (mode === 'tactical') overviewTransition = true; },
      follow: id => {
        if (id !== null && id !== selected) lookTarget.copy(units[id].group.position).y = 1.2;
        selected = id; zoom = id === null ? 1 : 2; setMode(id === null ? 'tactical' : mode === 'player' ? 'player' : 'follow'); },
      cameraMode: setMode,
      rotate: direction => { if (mode === 'tactical') controls.rotateLeft(direction * Math.PI / 8); else yawOffset += direction * Math.PI / 8; },
      destroy: () => {
        if (disposed) return; disposed = true;
        observer.disconnect(); controls.dispose();
        webgl.domElement.removeEventListener('pointerdown', onPointerDown);
        webgl.domElement.removeEventListener('pointermove', onPointerMove);
        webgl.domElement.removeEventListener('pointerup', onPointerUp);
        webgl.domElement.removeEventListener('pointercancel', onPointerCancel);
        disposeObjects(scene, true); textures.forEach(texture => texture.dispose());
        sun.shadow.map?.dispose(); webgl.dispose(); webgl.forceContextLoss(); webgl.domElement.remove();
      },
    },
  };
}
