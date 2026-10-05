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
  portrait?: number;
}
export interface MarketPlayer extends Player { price: number }
export interface Ping { id: string; type: string; label: string; x: number; y: number }
export interface Tactic { id: string; map: string; name: string; attack: string; defense: string; pings?: Ping[] }
export interface ManagerEmail {
  id:string; from:string; address:string; subject:string; preview:string; body:string;
  category:'general'|'sponsor'|'player'|'transfer'|'streamer'; week:number; read:boolean;
  offer?:{playerId:string; fee:number; status:'pending'|'accepted'|'declined'};
}
export interface StaffContract {id:string; candidateId:string; name:string; role:'coach'|'analyst'|'scout'|'fitness'; quality:number; weeklySalary:number; contractWeeks:number; lastDevelopmentWeek?:number}
export interface AcademyProspect {id:string;name:string;age:number;role:string;rating:number;potential:number;weeksInAcademy:number;lastTrainingWeek?:number;portrait?:number}
export interface CareerState {
  team: string; manager: string; managerAvatar?: string; managerNationality?: string; managerBackground?: string; managerContract?: {weeksRemaining:number;weeklySalary:number;signedAt?:string}; difficulty: string; week: number; day?: number; money: number; fans: number;
  points: number; wins: number; losses: number; players: Player[]; market: MarketPlayer[];
  marketCatalogVersion?: number;
  shopItems?: string[];
  shopPurchases?: {itemId:string;week:number;price:number}[];
  kit: string; focus: string; trainingMap: string; mapMastery: Record<string, number>;
  trainingUsage?: Record<string,{week:number;count:number}>; trainingAthletes?: string[]; trainingKind?: TrainingKind; trainingHistory?: TrainingResult[];
  trainingPlayer: string; captain: string; tactics: Tactic[]; activeTactics: Record<string, string>;
  scoutReports: Record<string, { week: number }>;
  streamerContract?: { id: string; weeksRemaining: number };
  marketingFans?: number;
  sponsorDeal?: { id: string; weeksRemaining: number };
  sponsorIncome?: number;
  sponsorItems?: string[];
  equippedSponsorItem?: string;
  emails?: ManagerEmail[];
  staff?: StaffContract[];
  academyLevel?: number;
  academyProspects?: AcademyProspect[];
  inviteResponses?: Record<string,'accepted'|'declined'>;
  tournamentResults?: {week:number; eventId:string; eventName:string; opponentId:string; win:boolean; score:string; prize:number; points:number}[];
  log: { kind: string; title: string; body: string }[];
  lastMatch: null | {
    opp: string; score: string; win: boolean; veto: Veto | null; eventName?: string;
    maps: { map: string; win: boolean; ownStartsAttack: boolean; score: [number, number] }[];
  };
}
export type View = 'overview' | 'mail' | 'squad' | 'staff' | 'training' | 'strategy' | 'scouting' | 'market' | 'competition' | 'ranking' | 'basecamp' | 'shop' | 'sponsors' | 'finances' | 'settings';
