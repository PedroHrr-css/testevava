import * as THREE from 'three';

type Landscape = 'city'|'coast'|'snow'|'forest'|'desert'|'industrial'|'abyss';
interface Theme { sky:string; horizon:string; ground:number; stone:number; accent:number; sun:number; landscape:Landscape }
const THEMES:Record<string,Theme>={
  Ascent:{sky:'#65a8dc',horizon:'#f4dfc5',ground:0xb7c5af,stone:0xddb49a,accent:0xae735e,sun:0xffe4c1,landscape:'city'},
  Sunset:{sky:'#8067ae',horizon:'#ffc4a0',ground:0xb99782,stone:0xe3b18d,accent:0xa779ba,sun:0xffbc87,landscape:'city'},
  Split:{sky:'#8daec9',horizon:'#e2edf0',ground:0x8caaa4,stone:0xc2cdd0,accent:0xe79caa,sun:0xffeee1,landscape:'city'},
  Pearl:{sky:'#247bb0',horizon:'#a0e2df',ground:0x739daa,stone:0xafd4dc,accent:0x49cdd3,sun:0xb6eaff,landscape:'coast'},
  Breeze:{sky:'#43b9e0',horizon:'#c0f1e7',ground:0xead5a2,stone:0xbbc4aa,accent:0x359b70,sun:0xffefd0,landscape:'coast'},
  Icebox:{sky:'#90bad9',horizon:'#effaff',ground:0xe3eff4,stone:0xc1d7e5,accent:0x618eae,sun:0xe1f6ff,landscape:'snow'},
  Summit:{sky:'#a5bde0',horizon:'#f0e8ff',ground:0xd1d8e3,stone:0x9aabc6,accent:0xb995d6,sun:0xf1e5ff,landscape:'snow'},
  Lotus:{sky:'#88b7a3',horizon:'#e2e8bc',ground:0x88a66a,stone:0xbfae83,accent:0x487854,sun:0xffe9b1,landscape:'forest'},
  Haven:{sky:'#93bfd4',horizon:'#f4e3ce',ground:0x9aaa77,stone:0xcab799,accent:0xc084a4,sun:0xffe7bf,landscape:'forest'},
  Bind:{sky:'#d2ad85',horizon:'#ffe9c2',ground:0xd5b284,stone:0xc49c73,accent:0xd28755,sun:0xffdda1,landscape:'desert'},
  Fracture:{sky:'#a2c2b0',horizon:'#eae3c3',ground:0xa7aa80,stone:0x9bada1,accent:0xd1a95e,sun:0xffe1b4,landscape:'industrial'},
  Corrode:{sky:'#b3bab5',horizon:'#ece1c3',ground:0xa7a58a,stone:0xb0a591,accent:0xc17c50,sun:0xffe0b0,landscape:'industrial'},
  Abyss:{sky:'#547baf',horizon:'#c6d5ee',ground:0x718aa7,stone:0x899bb9,accent:0x76d0db,sun:0xd5e7ff,landscape:'abyss'},
};

/** Scenery stays outside the playable square and never participates in navigation. */
export function createMapEnvironment(map:string){
  const theme=THEMES[map]??THEMES.Ascent;
  const group=new THREE.Group();group.name=`environment-${map}`;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext('2d')!;
  const gradient=ctx.createLinearGradient(0,0,0,512);
  gradient.addColorStop(0,theme.sky);gradient.addColorStop(.52,theme.horizon);gradient.addColorStop(1,theme.sky);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,512);
  // Soft cloud bands, rather than an empty solid sky.
  for(let i=0;i<14;i++){
    ctx.fillStyle='#ffffff18';ctx.beginPath();ctx.ellipse(i*79,120+(i%4)*29,95,9,0,0,Math.PI*2);ctx.fill();
  }
  const sky=new THREE.CanvasTexture(canvas);sky.colorSpace=THREE.SRGBColorSpace;sky.mapping=THREE.EquirectangularReflectionMapping;
  const materials=new Map<number,THREE.MeshStandardMaterial>();
  const material=(color:number)=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.93}));return materials.get(color)!};
  const mesh=(geometry:THREE.BufferGeometry,color:number,x:number,y:number,z:number)=>{
    const object=new THREE.Mesh(geometry,material(color));object.position.set(x,y,z);group.add(object);return object;
  };
  const terrainCanvas=document.createElement('canvas');terrainCanvas.width=1024;terrainCanvas.height=1024;
  const terrainContext=terrainCanvas.getContext('2d')!;
  terrainContext.fillStyle=`#${theme.ground.toString(16).padStart(6,'0')}`;terrainContext.fillRect(0,0,1024,1024);
  let seed=[...map].reduce((value,char)=>value+char.charCodeAt(0),1);
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<12000;i++){
    terrainContext.fillStyle=i%2?'#ffffff10':'#12201c12';
    const size=2+random()*12;terrainContext.fillRect(random()*1024,random()*1024,size,size);
  }
  // Broad, uneven patches break up the empty flat ground around the diorama.
  for(let i=0;i<100;i++){
    terrainContext.fillStyle=theme.landscape==='snow'?'#ffffff24':'#30432815';
    terrainContext.beginPath();terrainContext.ellipse(random()*1024,random()*1024,15+random()*70,10+random()*40,random()*Math.PI,0,Math.PI*2);terrainContext.fill();
  }
  const terrainTexture=new THREE.CanvasTexture(terrainCanvas);terrainTexture.colorSpace=THREE.SRGBColorSpace;
  const terrainMaterial=new THREE.MeshStandardMaterial({map:terrainTexture,roughness:1});
  const floating=map==='Ascent'||map==='Abyss';
  if(!floating){
    const terrain=new THREE.Mesh(new THREE.CircleGeometry(290,64),terrainMaterial);terrain.rotation.x=-Math.PI/2;terrain.position.y=-1.15;terrain.receiveShadow=true;group.add(terrain);
  }else{
    const island=mesh(new THREE.CylinderGeometry(86,54,28,12),theme.stone,0,-15,0);
    island.rotation.y=Math.PI/12;
    const terrain=new THREE.Mesh(new THREE.CircleGeometry(86,48),terrainMaterial);terrain.rotation.x=-Math.PI/2;terrain.position.y=-.95;group.add(terrain);
  }
  for(let i=0;i<32;i++){
    const angle=i/32*Math.PI*2;
    const radius=88+random()*64;
    const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
    const height=13+random()*27;
    if(theme.landscape==='snow'||theme.landscape==='desert'||theme.landscape==='abyss'){
      mesh(new THREE.ConeGeometry(16+i%6,height,5),theme.stone,x,height/2-1,z).rotation.y=angle;
      if(theme.landscape==='snow')mesh(new THREE.ConeGeometry(7,height*.42,5),0xf0f6fa,x,height*.8-1,z).rotation.y=angle;
      if(theme.landscape==='abyss'){
        mesh(new THREE.OctahedronGeometry(4),theme.accent,x,6+(i%3)*5,z);
        mesh(new THREE.CylinderGeometry(4,12,38,6),theme.stone,x,-20,z);
      }
    }else if(theme.landscape==='forest'||theme.landscape==='coast'){
      mesh(new THREE.CylinderGeometry(.6,1.1,9,5),0x89765c,x,3.5,z);
      if(theme.landscape==='coast'){
        const crown=mesh(new THREE.SphereGeometry(1,8,5),theme.accent,x,8,z);crown.scale.set(8,1.4,6);
      }else{
        for(let branch=0;branch<3;branch++){
          const crown=mesh(new THREE.IcosahedronGeometry(4.5,1),map==='Haven'&&i%4===0?theme.accent:0x527759,x+(branch-1)*2,9+branch*1.6,z+(branch%2)*2);
          crown.scale.set(1.2,.85,1);
        }
      }
      if(i%3===0){
        mesh(new THREE.BoxGeometry(12,8,12),theme.stone,x+12,3,z+9);
        const roof=mesh(new THREE.ConeGeometry(11,4,4),map==='Haven'?0x665965:theme.accent,x+12,9,z+9);roof.rotation.y=Math.PI/4;
      }
    }else{
      mesh(new THREE.BoxGeometry(12+i%5,height,13),theme.stone,x,height/2-1,z);
      mesh(new THREE.BoxGeometry(14,1.5,15),theme.accent,x,height-.5,z);
      for(let level=4;level<height-2;level+=5)mesh(new THREE.BoxGeometry(10,.9,13.1),theme.landscape==='city'?0xe3e8d2:theme.accent,x,level,z);
      if(theme.landscape==='industrial'&&i%4===0)mesh(new THREE.CylinderGeometry(2.5,3,height+10,8),theme.accent,x+9,(height+10)/2-1,z);
    }
  }
  const building=(x:number,z:number,width:number,height:number,color=theme.stone)=>{
    mesh(new THREE.BoxGeometry(width,height,width),color,x,height/2-1,z);
    mesh(new THREE.BoxGeometry(width+2,1,width+2),theme.accent,x,height-.5,z);
  };
  // Recognizable landmarks: every map gets its own silhouette, not only a palette.
  if(map==='Ascent'){
    building(-94,-68,9,43,0xcf987c);
    for(const height of [27,36,44])mesh(new THREE.BoxGeometry(12,1.5,12),0xe6d8ba,-94,height,-68);
    mesh(new THREE.ConeGeometry(8,16,4),0x98645a,-94,52,-68).rotation.y=Math.PI/4;
    mesh(new THREE.SphereGeometry(11,20,12),0xd2c7b7,95,12,-85).scale.y=.65;
  }else if(map==='Sunset'||map==='Split'){
    for(let i=0;i<5;i++)building(-100-i*16,-75+i*19,10,28+i*8,map==='Split'?0x8c9eaa:0xc19c82);
    mesh(new THREE.BoxGeometry(24,9,1),theme.accent,95,20,-65);
    for(const x of [86,104])mesh(new THREE.CylinderGeometry(.6,.6,20,6),0x687887,x,9,-65);
  }else if(map==='Haven'||map==='Lotus'){
    for(let level=0;level<3;level++){
      const width=22-level*5,y=level*7;
      mesh(new THREE.BoxGeometry(width,6,width),theme.stone,-96,y+2,-70);
      mesh(new THREE.ConeGeometry(width*.9,5,4),map==='Haven'?0x74505a:0x5b8270,-96,y+8,-70).rotation.y=Math.PI/4;
    }
    for(let i=0;i<8;i++)mesh(new THREE.CylinderGeometry(1,1.5,14,8),theme.stone,83+i*5,6,-80);
    mesh(new THREE.BoxGeometry(43,2,5),theme.stone,100,14,-80);
  }else if(map==='Bind'){
    building(-96,-70,14,15);
    mesh(new THREE.CylinderGeometry(3,4,36,12),0xd4b183,-86,17,-73);
    mesh(new THREE.SphereGeometry(4,12,8),0xa98562,-86,36,-73).scale.y=.7;
    for(let i=0;i<10;i++){const dune=mesh(new THREE.SphereGeometry(25,12,8),theme.ground,-155+i*32,-8,-160);dune.scale.set(1.7,.6,1)}
  }else if(map==='Icebox'||map==='Summit'){
    for(let i=0;i<9;i++){
      const container=mesh(new THREE.BoxGeometry(17,7,8),i%2?0x829eac:0xc78652,-108+(i%3)*19,2.5+Math.floor(i/3)*7,-72);
      container.castShadow=true;
    }
    for(const x of [83,111])mesh(new THREE.BoxGeometry(2,35,2),0x728a9d,x,16,-72);
    mesh(new THREE.BoxGeometry(32,2,3),0x728a9d,97,34,-72);
    if(map==='Summit')mesh(new THREE.SphereGeometry(14,16,10),0xe8eef3,104,10,-105).scale.y=.6;
  }else if(map==='Pearl'){
    const dome=mesh(new THREE.SphereGeometry(160,32,16,0,Math.PI*2,0,Math.PI/2),0x80cbd5,0,-7,0);
    dome.material=new THREE.MeshStandardMaterial({color:0x80cbd5,transparent:true,opacity:.1,side:THREE.BackSide,depthWrite:false});
    materials.set(-1,dome.material);
    for(let i=0;i<3;i++){
      const arch=mesh(new THREE.TorusGeometry(150-i*7,.7,6,64,Math.PI),0x80a7b6,0,-7,0);arch.rotation.y=i*Math.PI/3;
    }
  }else if(map==='Breeze'){
    for(let i=0;i<5;i++){building(-110+i*13,-75,10,8+i%3*4);mesh(new THREE.CylinderGeometry(4,5,22,12),theme.stone,94+i*8,10,-92)}
  }else if(map==='Fracture'||map==='Corrode'){
    for(let i=0;i<4;i++){
      mesh(new THREE.CylinderGeometry(6,6,17,16),i%2?0xb29476:0x859e94,-105+i*16,7.5,-74);
      mesh(new THREE.TorusGeometry(6,.45,6,20),theme.accent,-105+i*16,14,-74).rotation.x=Math.PI/2;
    }
    mesh(new THREE.BoxGeometry(38,3,8),theme.accent,99,17,-90);
    for(const x of [83,114])mesh(new THREE.BoxGeometry(3,20,3),theme.stone,x,9,-90);
  }else if(map==='Abyss'){
    for(let i=0;i<6;i++){
      const pillar=mesh(new THREE.CylinderGeometry(7,12,65+i*8,6),theme.stone,-135+i*50,4,-140);
      pillar.rotation.z=(i%2?.12:-.12);
      const crystal=mesh(new THREE.OctahedronGeometry(5),theme.accent,-135+i*50,10,-132);crystal.scale.y=2;
    }
    building(98,-72,23,12,0x637a93);
    mesh(new THREE.BoxGeometry(24,.6,2),0x79d3dd,98,7,-60);
  }
  for(let i=0;i<48;i++){
    const angle=i/48*Math.PI*2,radius=79+(i%5)*11;
    const rock=mesh(new THREE.IcosahedronGeometry(1.6+i%3,0),i%3===0?theme.stone:theme.ground,Math.cos(angle)*radius,0,Math.sin(angle)*radius);
    rock.scale.set(1.7,.7,1);rock.rotation.y=angle;
  }
  if(theme.landscape==='coast'){
    const sea=mesh(new THREE.CircleGeometry(275,64),0x51b6c5,0,-1.05,0);
    sea.rotation.x=-Math.PI/2;
    // The island keeps the water clear of the arena.
    mesh(new THREE.CylinderGeometry(77,85,.8,48),theme.ground,0,-.9,0);
  }
  return {group,sky,theme,terrainTexture,dispose:()=>{
    group.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose()});
    materials.forEach(value=>value.dispose());terrainMaterial.dispose();terrainTexture.dispose();sky.dispose();
  }};
}
