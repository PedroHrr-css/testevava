import type {AcademyProspect} from '../types/career.ts';

const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export function academyPortraitIndex(name:string):number {
  let hash=0;
  for(const character of name)hash=(hash*31+character.charCodeAt(0))>>>0;
  return 8+hash%8;
}

export function genericPortrait(name:string,index=academyPortraitIndex(name)):string {
  const safe=Math.max(0,Math.min(15,Math.trunc(index)));
  return `<span class="generic-portrait" role="img" aria-label="Retrato de ${escape(name)}" style="--portrait-x:${safe%4};--portrait-y:${Math.floor(safe/4)}"></span>`;
}

export function assignAcademyPortraits(prospects:AcademyProspect[]):boolean {
  const used=new Set(prospects.filter(person=>person.portrait!==undefined).map(person=>person.portrait!));
  let changed=false;
  for(const person of prospects){
    if(person.portrait!==undefined)continue;
    const preferred=academyPortraitIndex(person.name);
    person.portrait=!used.has(preferred)?preferred:Array.from({length:8},(_,index)=>index+8).find(index=>!used.has(index))??preferred;
    used.add(person.portrait);changed=true;
  }
  return changed;
}
