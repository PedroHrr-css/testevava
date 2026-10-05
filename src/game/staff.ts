import type {StaffContract} from '../types/career.ts';

export type StaffRole=StaffContract['role'];
export interface StaffCandidate {id:string;name:string;role:StaffRole;quality:number;weeklySalary:number;signingFee:number;bio:string}

export const STAFF_CANDIDATES:readonly StaffCandidate[]=[
  {id:'coach-murilo',name:'Murilo “Muri” Alves',role:'coach',quality:84,weeklySalary:48,signingFee:110,bio:'Especialista em preparação de séries e liderança de elenco.'},
  {id:'coach-rafa',name:'Rafaela “Rafa” Costa',role:'coach',quality:91,weeklySalary:73,signingFee:185,bio:'Ex-treinadora de alto nível, forte em leitura de adaptação.'},
  {id:'analyst-luiz',name:'Luiz “LZ” Nogueira',role:'analyst',quality:82,weeklySalary:39,signingFee:85,bio:'Analista de VOD e tendências de mapas.'},
  {id:'analyst-bia',name:'Beatriz “Bia” Mendes',role:'analyst',quality:90,weeklySalary:61,signingFee:155,bio:'Constrói planos de veto e relatórios de adversários.'},
  {id:'scout-igor',name:'Igor “Iggy” Santos',role:'scout',quality:80,weeklySalary:32,signingFee:70,bio:'Observa talentos emergentes e negociações de mercado.'},
  {id:'scout-malu',name:'Malu “Malu” Ferreira',role:'scout',quality:89,weeklySalary:54,signingFee:135,bio:'Rede internacional de talentos e avaliação de potencial.'},
  {id:'fitness-caio',name:'Caio “Caiin” Ribeiro',role:'fitness',quality:83,weeklySalary:36,signingFee:80,bio:'Cuida de energia, rotina e recuperação entre partidas.'},
  {id:'fitness-lia',name:'Lia “Lia” Azevedo',role:'fitness',quality:92,weeklySalary:63,signingFee:165,bio:'Psicóloga do esporte e especialista em performance.'},
];

export const STAFF_ROLE_LABELS:Record<StaffRole,string>={coach:'Treinador',analyst:'Analista',scout:'Olheiro',fitness:'Preparação física'};
export const STAFF_EFFECTS:Record<StaffRole,string>={coach:'Aumenta a força do time nas séries.',analyst:'Melhora leitura de mapa e bônus de olheiro.',scout:'Reduz o preço das contratações no mercado.',fitness:'Reduz o desgaste de energia após as partidas.'};
export const staffEffect=(quality:number)=>Math.max(1,Math.round((quality-65)/5));
export const staffEffectLabel=(role:StaffRole,quality:number)=>role==='coach'?`+${staffEffect(quality)} de força nas séries`:role==='analyst'?`+${Math.round(quality*.025)} de leitura tática`:role==='scout'?`${Number((quality/10).toFixed(1)).toLocaleString('pt-BR')}% de desconto no mercado`:`+${staffEffect(quality)} de energia recuperada`;
