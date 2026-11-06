export type Pos = "GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "PON" | "ATA";
export type Foot = "D" | "E" | "A";
export type Difficulty = "facil" | "normal" | "dificil" | "realista";

// attr indices
export const A = {
  FIN: 0, PAS: 1, DRI: 2, VEL: 3, FOR: 4, MAR: 5, DES: 6, POS: 7, CAB: 8, VIS: 9, RES: 10, REF: 11,
} as const;
export const ATTR_NAMES = [
  "Finalização", "Passe", "Drible", "Velocidade", "Força", "Marcação",
  "Desarme", "Posicionamento", "Cabeceio", "Visão de jogo", "Resistência", "Reflexos",
];

export interface Player {
  id: number;
  name: string;
  age: number;
  nat: string; // country code
  pos: Pos;
  foot: Foot;
  attr: number[];
  pot: number;
  wage: number; // monthly
  contract: number; // seasons left
  fit: number; // 0-100
  mor: number; // 0-100
  ratings: number[]; // last match ratings
  inj: number; // weeks out
  injName?: string;
  sus: number; // matches suspended
  yel: number;
  club: number | null;
  loanFrom?: number | null;
  loanOption?: number; // option-to-buy price
  loanWagePct?: number; // % wage paid by borrower
  goals: number;
  assists: number;
  apps: number;
  listed?: boolean;
  goalBonus?: number;
}

export interface Facilities {
  stadium: number; training: number; medical: number; youth: number; scouting: number;
}

export interface Club {
  id: number;
  name: string;
  short: string;
  country: string;
  league: string;
  rep: number;
  colors: [string, string];
  players: number[];
  balance: number;
  transferBudget: number;
  wageBudget: number;
  capacity: number;
  fac: Facilities;
}

export interface Fixture {
  h: number; a: number; hg?: number; ag?: number; pen?: [number, number]; played?: boolean; comp: string; grp?: number;
}

export interface Row { p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number; form: string[] }

export interface League {
  id: string; name: string; country: string; tier: number; clubs: number[];
  rounds: Fixture[][]; table: Record<number, Row>; scorers: Record<number, number>; promo: number;
}

export interface Cup {
  id: string; name: string; kind: "nacional" | "continental" | "mundial"; country?: string;
  alive: number[]; rounds: Fixture[][]; winner?: number; scorers: Record<number, number>; entrants: number[];
  /** group stage: clubs per group and their tables (first `groupRounds` rounds are group matchdays) */
  groups?: number[][]; gtable?: Record<number, Row>; groupRounds?: number;
}

export interface DayPlan { kind: "league" | "cup"; leagueRound?: number; cups?: string[]; cupRound?: number; label: string }

export interface SetPieces { captain?: number; pen?: number; fk?: number; corner?: number }

export interface Tactic {
  formation: string;
  style: string;
  pressing: string;
  starters: (number | null)[];
  bench: number[];
  instr: Record<number, string>;
  sp: SetPieces;
}

export interface Message {
  id: number; season: number; day: number; title: string; body: string;
  kind: "noticia" | "proposta" | "diretoria" | "patrocinio" | "torcida" | "lesao" | "emprego" | "contrato";
  read?: boolean;
  action?:
    | { type: "offerForPlayer"; playerId: number; fromClub: number; fee: number; loan?: boolean; done?: boolean }
    | { type: "jobOffer"; clubId: number; done?: boolean }
    | { type: "openPlayer"; playerId: number }
    | { type: "sponsorRenew"; sponsorId: number; value: number; done?: boolean };
}

export type GoalType = "pos" | "title" | "continental" | "wins" | "cup";
export interface Sponsor {
  id: number; company: string; slot: string; value: number; years: number; payment: "mensal" | "anual";
  bonus: number; goal: { type: GoalType; target: number; text: string }; penalty: number;
  start?: number; left?: number; color: string;
}

export interface Ledger {
  season: number; month: number;
  inc: Record<string, number>; exp: Record<string, number>;
}

export interface CoachHistory { season: number; club: number; league: string; pos: number; titles: string[] }

export interface Coach {
  name: string; rep: number; titles: { season: number; name: string; club: number }[];
  history: CoachHistory[]; contract: number; wage: number;
}

export interface Objective { key: string; text: string; target: number }

export interface Training {
  week: string[]; // 7 sessions
  intensity: "leve" | "normal" | "forte";
  defFocus: string;
}

export interface Pending {
  // negotiation in progress
  playerId: number; kind: "compra" | "emprestimo" | "livre"; fee: number; optionPrice?: number; wagePct?: number;
  clubAgreed: boolean;
}

export interface GameState {
  version: number;
  difficulty: Difficulty;
  season: number;
  day: number;
  schedule: DayPlan[];
  userClub: number | null;
  coach: Coach;
  clubs: Club[];
  players: Record<number, Player>;
  nextPlayerId: number;
  leagues: Record<string, League>;
  cups: Record<string, Cup>;
  freeAgents: number[];
  tactic: Tactic;
  training: Training;
  cohesion: number;
  board: { confidence: number; objective: Objective; fans: number; lastRequestDay?: number; lastRequestSeason?: number };
  sponsors: Sponsor[];
  sponsorOffers: Sponsor[];
  nextSponsorId: number;
  ledger: Ledger[];
  messages: Message[];
  nextMsgId: number;
  pending?: Pending | null;
  seasonStats: { wins: number; draws: number; losses: number; cupRounds: Record<string, number>; titles: string[] };
  honours: { season: number; comp: string; club: number }[];
  lastResults: { season: number; day: number; comp: string; h: number; a: number; hg: number; ag: number }[];
  shortlist: number[];
  unemployed?: boolean;
  userMatchDone: boolean;
  lastStandings: Record<string, number[]>;
  fired?: boolean;
  transferLog?: TransferRecord[];
}

export interface TransferRecord { season: number; day: number; pid: number; name: string; pos: Pos; ovr: number; from: number | null; to: number | null; fee: number; kind: "compra" | "emprestimo" | "livre" | "doacao" }
