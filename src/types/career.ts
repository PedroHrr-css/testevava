import type { TrainingKind, TrainingResult } from '../game/training.ts';
import type { MatchStats, Veto } from './game.ts';
export interface RawPlayer { alias: string; real: string; image: string }
export interface Team { id: string; name: string; tag: string; region: string; color: string; secondary: string; power: number }
export interface Player {
  id: string; source: string; alias: string; real: string; image: boolean;
  role: string; rating: number; salary: number; number: number; energy: number; morale: number;
  mapMastery?: Record<string, number>;
  agent: string; agentMastery: Record<string, number>;
  stats: MatchStats & { matches: number; maps?: number };
  price?: number;
}
export interface MarketPlayer extends Player { price: number }
export interface Ping { id: string; type: string; label: string; x: number; y: number }
export interface Tactic { id: string; map: string; name: string; attack: string; defense: string; pings?: Ping[] }
export interface CareerState {
  team: string; manager: string; difficulty: string; week: number; money: number; fans: number;
  points: number; wins: number; losses: number; players: Player[]; market: MarketPlayer[];
  kit: string; focus: string; trainingMap: string; mapMastery: Record<string, number>;
  trainingUsage?: Record<string,{week:number;count:number}>; trainingAthletes?: string[]; trainingKind?: TrainingKind; trainingHistory?: TrainingResult[];
  trainingPlayer: string; captain: string; tactics: Tactic[]; activeTactics: Record<string, string>;
  scoutReports: Record<string, { week: number }>;
  log: { kind: string; title: string; body: string }[];
  lastMatch: null | {
    opp: string; score: string; win: boolean; veto: Veto | null;
    maps: { map: string; win: boolean; ownStartsAttack: boolean; score: [number, number] }[];
  };
}
export type View = 'overview' | 'squad' | 'ranking' | 'market' | 'training' | 'strategy' | 'competition';
