import type { Player, Pos } from "./types";

export const rand = () => Math.random();
export const randInt = (a: number, b: number) => Math.floor(a + Math.random() * (b - a + 1));
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const gauss = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
export const choice = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export function weighted<T>(items: T[], w: (t: T) => number): T {
  const ws = items.map(w);
  const tot = ws.reduce((a, b) => a + b, 0);
  let r = Math.random() * tot;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// attr: fin,pas,dri,vel,for,mar,des,pos,cab,vis,res,ref
export const POS_WEIGHTS: Record<Pos, number[]> = {
  GOL: [0, 0.05, 0, 0, 0.05, 0, 0, 0.3, 0, 0, 0.05, 0.55],
  ZAG: [0, 0.05, 0, 0.05, 0.14, 0.22, 0.22, 0.17, 0.15, 0, 0, 0],
  LAT: [0, 0.13, 0.1, 0.18, 0.04, 0.15, 0.15, 0.1, 0, 0.03, 0.12, 0],
  VOL: [0, 0.18, 0, 0, 0.12, 0.15, 0.18, 0.14, 0, 0.1, 0.13, 0],
  MEI: [0.12, 0.22, 0.18, 0.06, 0, 0, 0, 0.1, 0, 0.22, 0.1, 0],
  PON: [0.15, 0.12, 0.24, 0.22, 0, 0, 0, 0.07, 0, 0.1, 0.1, 0],
  ATA: [0.3, 0.04, 0.12, 0.12, 0.1, 0, 0, 0.18, 0.14, 0, 0, 0],
};
export const POS_NAME: Record<Pos, string> = {
  GOL: "Goleiro", ZAG: "Zagueiro", LAT: "Lateral", VOL: "Volante", MEI: "Meia", PON: "Ponta", ATA: "Atacante",
};
export const POS_ORDER: Pos[] = ["GOL", "ZAG", "LAT", "VOL", "MEI", "PON", "ATA"];

export function ratingAt(p: Player, pos: Pos): number {
  const w = POS_WEIGHTS[pos];
  let s = 0;
  for (let i = 0; i < 12; i++) s += w[i] * p.attr[i];
  return s;
}
export const ovr = (p: Player) => Math.round(ratingAt(p, p.pos));

// how well a player fits a slot role
export function fitness(p: Player, role: Pos): number {
  if (p.pos === role) return 1;
  if (role === "GOL" || p.pos === "GOL") return 0.35;
  const near: Record<Pos, Pos[]> = {
    GOL: [], ZAG: ["VOL", "LAT"], LAT: ["ZAG", "PON"], VOL: ["ZAG", "MEI"], MEI: ["VOL", "PON", "ATA"], PON: ["MEI", "ATA", "LAT"], ATA: ["PON", "MEI"],
  };
  return near[role].includes(p.pos) ? 0.92 : 0.8;
}
export const slotRating = (p: Player, role: Pos) => ratingAt(p, role) * fitness(p, role);

export function playerValue(p: Player): number {
  const o = ovr(p);
  let v = 60e6 * Math.exp(0.139 * (o - 80));
  const gap = Math.max(0, p.pot - o);
  if (p.age <= 21) v *= 1.2 + gap * 0.05;
  else if (p.age <= 25) v *= 1.1 + gap * 0.03;
  else if (p.age <= 29) v *= 1;
  else if (p.age <= 31) v *= 0.7;
  else if (p.age <= 33) v *= 0.45;
  else v *= 0.22;
  if (p.contract <= 1) v *= 0.75;
  return Math.max(25000, Math.round(v / 5000) * 5000);
}
export function wageDemand(p: Player, clubRep = 60): number {
  const o = ovr(p);
  const base = 450000 * Math.exp(0.12 * (o - 80));
  const ageF = p.age > 31 ? 0.85 : 1;
  return Math.max(8000, Math.round((base * ageF * (0.8 + clubRep / 250)) / 1000) * 1000);
}

export function money(v: number): string {
  const s = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1e9) return `${s}R$ ${(a / 1e9).toFixed(2).replace(".", ",")} bi`;
  if (a >= 1e6) return `${s}R$ ${(a / 1e6).toFixed(1).replace(".", ",")} mi`;
  if (a >= 1e3) return `${s}R$ ${Math.round(a / 1e3)} mil`;
  return `${s}R$ ${Math.round(a)}`;
}
