import fs from 'node:fs';
import {inflateSync} from 'node:zlib';
import {buildNavigation} from '../src/game/navigation.ts';

// Decode the 8-bit RGBA PNG plans without adding a build dependency.
export function readPlan(file) {
  const png=fs.readFileSync(file), width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  if(png[24]!==8||png[25]!==6||png[28]!==0)throw new Error('Expected non-interlaced RGBA PNG');
  const chunks=[];
  for(let offset=8;offset<png.length;) {
    const length=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);
    if(type==='IDAT')chunks.push(png.subarray(offset+8,offset+8+length));
    offset+=12+length;
  }
  const raw=inflateSync(Buffer.concat(chunks)),stride=width*4,data=new Uint8Array(height*stride);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++) {
    const filter=raw[y*(stride+1)];
    for(let x=0;x<stride;x++) {
      const i=y*stride+x,a=x>=4?data[i-4]:0,b=y?data[i-stride]:0,c=y&&x>=4?data[i-stride-4]:0;
      const predictor=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter];
      if(predictor===undefined)throw new Error('Invalid PNG filter');
      data[i]=(raw[y*(stride+1)+1+x]+predictor)&255;
    }
  }
  return {data,width,height};
}
if(process.argv.includes('--generate')) {
  const maps={};
  for(const file of fs.readdirSync('public/assets/maps').filter(f=>f.endsWith('-plan.png'))) {
    const nav=buildNavigation(readPlan(`public/assets/maps/${file}`));
    maps[file.replace('-plan.png','')]=nav;
    console.log(file,nav.walk.reduce((a,b)=>a+b,0),'walkable cells');
  }
  fs.writeFileSync('public/assets/maps/navigation.json',JSON.stringify(maps));
}
