import type {AcademyProspect} from '../types/career.ts';

const NAMES=['Kai Moreira','Nico Alves','Yuri Costa','Dante Lima','Theo Santos','Noah Ferreira','Renan Souza','Luan Martins','Enzo Rocha','Iago Silva','Ravi Oliveira','Cael Nunes'];
const EASTER_EGGS=["Pedro 'Supreme'","Igor 'deluxyn'","Giuliano 'nanashi'","Miguel 'G3'"];
const ROLES=['Duelista','Iniciador','Controlador','Sentinela','Flex'];

function prospectName(existing:string[]=[]):{name:string;easterEgg:boolean}{
  const rare=EASTER_EGGS.filter(name=>!existing.includes(name));
  if(rare.length&&Math.random()<.04)return {name:rare[Math.floor(Math.random()*rare.length)],easterEgg:true};
  const regular=NAMES.filter(name=>!existing.includes(name));
  return {name:regular.length?regular[Math.floor(Math.random()*regular.length)]:NAMES[Math.floor(Math.random()*NAMES.length)],easterEgg:false};
}

export function createAcademyProspects(teamId:string,power:number):AcademyProspect[]{
  const prospects:AcademyProspect[]=[];
  for(let index=0;index<6;index++){
    const {name,easterEgg}=prospectName(prospects.map(prospect=>prospect.name));
    const potential=easterEgg?90+Math.floor(Math.random()*8):81+Math.floor(Math.random()*16);
    const rating=Math.min(potential-5,Math.round(57+Math.random()*13+(power-80)*.18));
    prospects.push({id:`academy-${teamId}-${index+1}`,name,age:16+Math.floor(Math.random()*4),role:ROLES[index%ROLES.length],rating,potential,weeksInAcademy:0,portrait:8+index});
  }
  return prospects;
}

export function discoverAcademyProspect(teamId:string,power:number,existing:AcademyProspect[],reservedIds:string[]=[]):AcademyProspect{
  const used=new Set([...existing.map(prospect=>prospect.id),...reservedIds]);
  let slot=1;while(used.has(`academy-${teamId}-${slot}`))slot++;
  const {name,easterEgg}=prospectName(existing.map(prospect=>prospect.name));
  const potential=easterEgg?90+Math.floor(Math.random()*8):81+Math.floor(Math.random()*16);
  const rating=Math.min(potential-5,Math.round(57+Math.random()*13+(power-80)*.18));
  const portraits=new Set(existing.map(prospect=>prospect.portrait));
  const portrait=Array.from({length:8},(_,index)=>index+8).find(index=>!portraits.has(index))??8;
  return {id:`academy-${teamId}-${slot}`,name,age:16+Math.floor(Math.random()*4),role:ROLES[Math.floor(Math.random()*ROLES.length)],rating,potential,weeksInAcademy:0,portrait};
}

export const academyTrainingCost=45;
export const academyScoutingCost=90;
export const academyPromotionMinimum=70;
export const academyUpgradeCost=(level:number)=>level===1?420:level===2?760:Infinity;
export const academyGrowthInterval=(level:number)=>level>=3?1:level===2?2:3;
