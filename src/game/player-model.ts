import * as THREE from 'three';

export interface PlayerModel {
  group: THREE.Group;
  torso: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  weapon: THREE.Group;
  muzzleFlash: THREE.Mesh;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  pick: THREE.Mesh;
}

// Original stylized characters with articulated hips/knees and agent-inspired equipment.
export function createPlayerModel(color: number, id: number, agent = '', alias = ''): PlayerModel {
  const group = new THREE.Group(), torso = new THREE.Group();
  const seed = [...agent].reduce((n, c) => n + c.charCodeAt(0), 0);
  group.userData.agent = agent;
  const material = (value: number, metalness = .1) => new THREE.MeshStandardMaterial({color: value, roughness: .68, metalness});
  const team = material(color, .25), dark = material(0x18212e), cloth = material(0x344355);
  const skin = material([0xdba889, 0xb77a58, 0x8c5946, 0xedc4a6][seed % 4]);
  const hair = material(['jett','sova','deadlock','sage'].includes(agent) ? (agent === 'sage' ? 0x19252a : 0xdce9ee) : [0x25212b,0x503a2c,0x703936][seed % 3]);
  const accents: Record<string,number> = {jett:0x77dce5,sage:0x51c6ac,viper:0x6ea949,omen:0x7065b5,phoenix:0xf1a756,raze:0xef9951,reyna:0x9f69c8,neon:0x538cfa,sova:0x74b5d2,breach:0xc18c63,cypher:0xd2c9ad,killjoy:0xe3c956};
  const accent = material(accents[agent] ?? [0x78a9c9,0x8fae83,0xb48bbf,0xd5ae75][seed % 4]);
  const glow = new THREE.MeshStandardMaterial({color:0xa9f5ee,emissive:0x4dcfc0,emissiveIntensity:.35,roughness:.25,metalness:.4});
  const add = (geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Group, x:number,y:number,z:number) => {
    const mesh = new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const ellipsoid = (parent:THREE.Group,mat:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number) => {
    const mesh=add(new THREE.SphereGeometry(1,16,12),mat,parent,x,y,z);mesh.scale.set(sx,sy,sz);return mesh;
  };
  const limb = (parent:THREE.Group,mat:THREE.Material,from:THREE.Vector3,to:THREE.Vector3,radius:number) => {
    const mesh=add(new THREE.CapsuleGeometry(radius,Math.max(.01,from.distanceTo(to)-radius*2),3,8),mat,parent,0,0,0);
    mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.clone().sub(from).normalize());return mesh;
  };
  function leg(x:number) {
    const hip=new THREE.Group(),knee=new THREE.Group();hip.position.set(x,.83,0);knee.position.y=-.35;hip.add(knee);group.add(hip);
    limb(hip,cloth,new THREE.Vector3(),new THREE.Vector3(0,-.35,0),.095);
    limb(knee,dark,new THREE.Vector3(),new THREE.Vector3(0,-.33,0),.075);
    ellipsoid(knee,team,0,-.02,.06,.09,.085,.06);
    add(new THREE.BoxGeometry(.16,.13,.29),dark,knee,0,-.4,.04);
    add(new THREE.BoxGeometry(.17,.035,.3),cloth,knee,0,-.465,.04);
    return {hip,knee};
  }
  const left=leg(-.13),right=leg(.13);
  torso.position.y=.83;group.add(torso);
  ellipsoid(torso,cloth,0,.25,0,.225,.30,.135);
  ellipsoid(torso,dark,0,.02,0,.23,.11,.15);
  add(new THREE.BoxGeometry(.4,.28,.07),team,torso,0,.28,.145);
  add(new THREE.BoxGeometry(.34,.12,.08),accent,torso,0,.46,.12);
  // Chest straps, magazine pouches and a radio make the silhouettes readable up close.
  for(const x of [-.16,.16])add(new THREE.BoxGeometry(.055,.43,.04),dark,torso,x,.3,.19);
  for(const x of [-.11,0,.11])add(new THREE.BoxGeometry(.085,.12,.055),dark,torso,x,.16,.2);
  add(new THREE.BoxGeometry(.09,.14,.045),glow,torso,-.17,.38,.215);
  add(new THREE.BoxGeometry(.3,.32,.12),dark,torso,0,.29,-.18);
  add(new THREE.BoxGeometry(.3,.07,.14),accent,torso,0,.43,-.18);
  // Local name patch; texture belongs to the model and is disposed with it.
  if(typeof document!=='undefined' && alias) {
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
    const ctx=canvas.getContext('2d');
    if(ctx) {
      ctx.fillStyle='#18212e';ctx.fillRect(0,0,256,128);ctx.fillStyle='#f0f5ed';
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 30px sans-serif';
      ctx.fillText(alias.toUpperCase().slice(0,14),128,48,232);
      ctx.font='bold 24px sans-serif';ctx.fillText(agent.toUpperCase(),128,88,232);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const patch=add(new THREE.PlaneGeometry(.28,.14),new THREE.MeshStandardMaterial({map:texture,roughness:.85}),torso,0,.30,-.245);
      patch.rotation.y=Math.PI;
    }
  }
  limb(torso,skin,new THREE.Vector3(0,.49,0),new THREE.Vector3(0,.59,0),.067);
  ellipsoid(torso,skin,0,.72,.015,.132,.172,.123);
  ellipsoid(torso,hair,0,.82,-.035,.14,.1,.13);
  // Jaw, brows and hair strands give the face a stronger silhouette.
  ellipsoid(torso,skin,0,.646,.03,.095,.045,.084);
  for(const x of [-.052,.052])add(new THREE.BoxGeometry(.048,.01,.016),hair,torso,x,.772,.13).rotation.z=x>0?-.12:.12;
  if(!['omen','viper','cypher','kayo','kay-o','brimstone','breach','killjoy'].includes(agent)) {
    for(let i=0;i<5;i++) {
      const strand=add(new THREE.ConeGeometry(.028,.09,5),hair,torso,-.10+i*.05,.867,.047);
      strand.rotation.z=-.25;strand.rotation.x=-.35;
    }
  }
  // Facial landmarks instead of a featureless helmet.
  for(const x of [-.052,.052])add(new THREE.BoxGeometry(.035,.018,.018),dark,torso,x,.744,.141);
  ellipsoid(torso,skin,0,.708,.15,.025,.03,.023);
  add(new THREE.BoxGeometry(.047,.008,.016),dark,torso,0,.661,.135);
  for(const x of [-.148,.148])ellipsoid(torso,skin,x,.727,0,.025,.048,.032);
  if(['omen','viper','cypher','kayo','kay-o'].includes(agent)) {
    ellipsoid(torso,accent,0,.77,-.025,.172,.2,.15);
    add(new THREE.BoxGeometry(.23,.05,.045),glow,torso,0,.75,.145);
    add(new THREE.BoxGeometry(.21,.1,.04),dark,torso,0,.65,.145);
  } else if(['brimstone','breach','killjoy'].includes(agent)) {
    ellipsoid(torso,accent,0,.84,0,.17,.09,.16);
    add(new THREE.BoxGeometry(.25,.025,.15),accent,torso,0,.818,.13);
  } else if(['jett','sage','neon','reyna'].includes(agent)) {
    ellipsoid(torso,hair,0,.84,-.15,.075,.095,.08);
    limb(torso,hair,new THREE.Vector3(0,.84,-.17),new THREE.Vector3(.04,.63,-.22),.047);
  }
  // Agent-specific silhouettes and signature equipment, independent of roster slot.
  const signatures:Record<string,[number,string]>={
    astra:[0xa66de0,'stars'],breach:[0xd28c4d,'arms'],brimstone:[0xd88646,'pack'],
    chamber:[0xd8b76a,'glasses'],clove:[0xd78ddc,'wings'],cypher:[0xe5d9b6,'hat'],
    deadlock:[0xb8d8de,'arm'],fade:[0x8b91ba,'cloak'],gekko:[0xa8d653,'pack'],
    harbor:[0x43b8ad,'bracelet'],iso:[0x9176db,'collar'],jett:[0x80e2eb,'knives'],
    kayo:[0x778adb,'robot'],killjoy:[0xe9cb4a,'glasses'],neon:[0x427aef,'bolts'],
    omen:[0x7062b2,'cloak'],phoenix:[0xef9446,'collar'],raze:[0xeb944a,'grenades'],
    reyna:[0xa953c0,'orb'],sage:[0x5ddab8,'orbs'],skye:[0x709451,'band'],
    sova:[0x74b4d8,'bow'],tejo:[0xc69a64,'pack'],viper:[0x6aad49,'tanks'],
    vyse:[0xae94c9,'horns'],waylay:[0xf2db91,'wings'],yoru:[0x466bd0,'horns'],
    veto:[0x9fb989,'arms'],miks:[0xc58acb,'headphones']
  };
  const [signatureColor,gear]=signatures[agent==='kay-o'?'kayo':agent]??[0x80aabb,'pack'];
  const signature=material(signatureColor,.3);
  ellipsoid(torso,signature,0,.25,-.02,.257,.29,.15);
  if(['cloak','wings','collar'].includes(gear)){
    const coat=add(new THREE.ConeGeometry(.34,.72,gear==='wings'?4:8,1,true),signature,torso,0,.05,-.09);coat.rotation.y=Math.PI/4;
    for(const side of [-1,1])add(new THREE.BoxGeometry(.12,.23,.07),signature,torso,side*.18,.49,-.04).rotation.z=side*.3;
  }
  if(gear==='hat'){add(new THREE.CylinderGeometry(.3,.3,.035,16),signature,torso,0,.88,0);add(new THREE.CylinderGeometry(.16,.2,.2,12),signature,torso,0,.98,0);}
  if(['glasses','headphones','band'].includes(gear))for(const side of [-1,1])add(new THREE.BoxGeometry(.1,.055,.045),gear==='glasses'?dark:signature,torso,side*.08,.755,.15);
  if(gear==='horns')for(const side of [-1,1])add(new THREE.ConeGeometry(.055,.22,6),signature,torso,side*.13,.94,0).rotation.z=-side*.45;
  if(['tanks','bow','pack'].includes(gear))for(const side of [-1,1])add(new THREE.CylinderGeometry(.06,.06,gear==='bow'?.65:.32,8),signature,torso,side*.16,.3,-.24).rotation.z=side*.25;
  if(['arms','arm','robot','bracelet'].includes(gear))for(const side of gear==='arm'?[1]:[-1,1])add(new THREE.BoxGeometry(.15,.3,.17),signature,torso,side*.3,.28,.06);
  if(['stars','orb','orbs','grenades'].includes(gear))for(let n=0;n<(gear==='orb'?1:3);n++)ellipsoid(torso,signature,(n-1)*.1,.05,.21,.043,.043,.043);
  if(['knives','bolts'].includes(gear))for(const side of [-1,1])add(new THREE.ConeGeometry(.04,.28,4),signature,torso,side*.2,.3,-.21).rotation.z=side*.35;
  group.userData.signature=gear;
  // Two bent arms hold the rifle; shoulder pads carry the team's color.
  for(const side of [-1,1]) {
    const shoulder=new THREE.Vector3(side*.27,.43,0),elbow=new THREE.Vector3(side*.32,.19,.16),hand=new THREE.Vector3(side===1?.18:-.04,.28,side===1?.35:.49);
    const shoulderPad=add(new THREE.CapsuleGeometry(.072,.07,3,8),team,torso,shoulder.x,shoulder.y,0);
    shoulderPad.rotation.z=side*.4;shoulderPad.scale.z=1.15;
    add(new THREE.BoxGeometry(.10,.055,.035),accent,torso,side*.285,.43,.08);
    limb(torso,accent,shoulder,elbow,.073);limb(torso,skin,elbow,hand,.06);
    ellipsoid(torso,dark,hand.x,hand.y,hand.z,.063,.055,.075);
  }
  const weapon=new THREE.Group();weapon.position.set(.13,.3,.37);torso.add(weapon);
  add(new THREE.BoxGeometry(.1,.105,.48),dark,weapon,0,0,.1);
  add(new THREE.BoxGeometry(.09,.07,.19),cloth,weapon,0,0,-.22);
  add(new THREE.BoxGeometry(.055,.14,.09),dark,weapon,0,-.1,.1).rotation.x=-.2;
  add(new THREE.BoxGeometry(.05,.1,.05),dark,weapon,0,-.085,-.08).rotation.x=.25;
  const barrel=add(new THREE.CylinderGeometry(.025,.025,.28,8),dark,weapon,0,0,.48);barrel.rotation.x=Math.PI/2;
  add(new THREE.BoxGeometry(.06,.045,.12),accent,weapon,0,.075,.05);
  const muzzleFlash=add(new THREE.ConeGeometry(.065,.22,6),new THREE.MeshBasicMaterial({color:0xffdf91,transparent:true,opacity:.9}),weapon,0,0,.69);
  muzzleFlash.rotation.x=Math.PI/2;muzzleFlash.visible=false;
  const ring=add(new THREE.RingGeometry(.48,.55,32),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.7}),group,0,.025,0) as PlayerModel['ring'];ring.rotation.x=-Math.PI/2;
  const pick=add(new THREE.SphereGeometry(1.1,8,6),new THREE.MeshBasicMaterial({visible:false}),group,0,1,0);pick.userData.playerId=id;
  return {group,torso,leftLeg:left.hip,rightLeg:right.hip,leftKnee:left.knee,rightKnee:right.knee,weapon,muzzleFlash,ring,pick};
}
