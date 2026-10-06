export type Side = 0 | 1;
export type Point = { x: number; y: number };
export interface Navigation {
  columns: number; rows: number; cellSize: number;
  width: number; height: number; walk: number[];
}
export interface MatchPlayer { alias: string; agent: string; role?:string; mapMastery?:Record<string,number>; agentMastery?:Record<string,number> }
export interface ReplayTactic {
  name:string; attack:string; defense:string;
  pings?:{type:string;x:number;y:number}[];
}
export type MatchWeapon = 'classic' | 'vandal' | 'phantom' | 'operator';
export interface CombatEvent {
  time: number; killer: number; victim: number; assist: number | null;
  weapon?: MatchWeapon; headshot?: boolean;
}
export interface Spike {
  planter: number; plantStart: number; plantAt: number; explodeAt: number;
  defuser: number | null; defuseStart: number | null; casualties: number[];
}
export interface Round {
  winner: Side; attacking: Side; events: CombatEvent[]; spike: Spike | null;
  outcome: 'elimination' | 'defuse' | 'detonation';
  resolveAt: number; duration: number; site: 'A' | 'B'; seed: number;
}
export interface MatchStats { kills: number; deaths: number; assists: number }
export interface Simulation<T = MatchPlayer> {
  rounds: Round[]; stats: MatchStats[]; score: [number, number]; players: T[];
}
export interface SeriesMap {
  map: string; win: boolean; ownStartsAttack: boolean; simulation: Simulation;
}
export interface WatchOptions {
  maps: SeriesMap[]; players: MatchPlayer[]; own: string; opponent: string;
  ownLogo?: string; opponentLogo?: string; competition?: string; stage?: string;
  tactics?:Record<string,ReplayTactic>; mapMastery?:Record<string,number>;
  escape: (value: unknown) => string; onFinish: () => void;
}
export type VetoSlot = 'A' | 'B';
export interface VetoMap { map: string; picker: VetoSlot | 'decider'; ownStartsAttack?: boolean }
export interface VetoEntry {
  slot: VetoSlot | null; action: 'ban' | 'pick' | 'side' | 'decider'; map: string; value?: string;
}
export interface Veto { ownSlot: VetoSlot; step: number; available: string[]; maps: VetoMap[]; history: VetoEntry[] }
