import type { GameState, Player, Pos, Tactic } from "./types";
import { FORMATIONS } from "./formations";
import { clamp, choice, rand, randInt, slotRating, weighted } from "./util";

export interface LineSlot { pid: number; role: Pos; instr: string }
export interface Side {
  club: number;
  lineup: LineSlot[];
  bench: number[];
  sentOff: Set<number>;
  injured: Set<number>;
  subsUsed: number;
  formation: string;
  style: string;
  pressing: string;
  sp: { pen?: number; fk?: number; corner?: number; captain?: number };
  bonus: number;
  cohesion: number;
  user: boolean;
  autoSubs: boolean;
}
export interface MEvent {
  min: number; side: 0 | 1; type: string; text: string; pid?: number; assist?: number; key?: boolean;
}
export interface SideStats {
  poss: number; shots: number; onT: number; corners: number; fouls: number; passes: number; passOk: number;
  saves: number; off: number; big: number; yel: number; red: number;
}
const emptyStats = (): SideStats => ({ poss: 0, shots: 0, onT: 0, corners: 0, fouls: 0, passes: 0, passOk: 0, saves: 0, off: 0, big: 0, yel: 0, red: 0 });

const ATT: Record<Pos, number> = { ATA: 1, PON: 0.8, MEI: 0.6, VOL: 0.2, LAT: 0.25, ZAG: 0.05, GOL: 0 };
const MID: Record<Pos, number> = { MEI: 1, VOL: 0.9, PON: 0.5, LAT: 0.3, ATA: 0.2, ZAG: 0.1, GOL: 0 };
const DEF: Record<Pos, number> = { ZAG: 1, LAT: 0.7, VOL: 0.7, MEI: 0.2, PON: 0.15, ATA: 0.05, GOL: 0 };
const SHOOT: Record<Pos, number> = { ATA: 5, PON: 3, MEI: 2, VOL: 0.8, LAT: 0.5, ZAG: 0.4, GOL: 0 };

export function autoLineup(state: GameState, clubId: number, formation = "4-3-3"): { starters: number[]; bench: number[] } {
  const club = state.clubs[clubId];
  const avail = club.players.map((id) => state.players[id]).filter((p) => p && p.inj === 0 && p.sus === 0);
  const used = new Set<number>();
  const starters: number[] = [];
  for (const slot of FORMATIONS[formation]) {
    let best: Player | null = null;
    let bestV = -1;
    for (const p of avail) {
      if (used.has(p.id)) continue;
      const v = slotRating(p, slot.role) * (0.7 + 0.3 * (p.fit / 100));
      if (v > bestV) { bestV = v; best = p; }
    }
    if (best) { used.add(best.id); starters.push(best.id); } else starters.push(-1);
  }
  const bench = avail.filter((p) => !used.has(p.id)).sort((a, b) => slotRating(b, b.pos) - slotRating(a, a.pos)).slice(0, 9).map((p) => p.id);
  return { starters, bench };
}

export function isAvailable(state: GameState, pid: number, clubId: number) {
  const p = state.players[pid];
  return !!p && p.club === clubId && p.inj === 0 && p.sus === 0;
}

// fill empty/unavailable starter slots with best available players (only when the user asks)
export function fixLineup(state: GameState) {
  const clubId = state.userClub!;
  const t = state.tactic;
  const slots = FORMATIONS[t.formation];
  const used = new Set<number>();
  t.starters = slots.map((_, i) => {
    const id = t.starters[i];
    if (id != null && isAvailable(state, id, clubId) && !used.has(id)) { used.add(id); return id; }
    return null;
  });
  const avail = state.clubs[clubId].players.map((id) => state.players[id]).filter((p) => isAvailable(state, p.id, clubId));
  slots.forEach((s, i) => {
    if (t.starters[i] != null) return;
    const best = avail.filter((p) => !used.has(p.id)).sort((a, b) => slotRating(b, s.role) * (0.7 + 0.3 * b.fit / 100) - slotRating(a, s.role) * (0.7 + 0.3 * a.fit / 100))[0];
    if (best) { used.add(best.id); t.starters[i] = best.id; }
  });
  t.bench = [...t.bench.filter((id) => isAvailable(state, id, clubId) && !used.has(id)), ...avail.filter((p) => !used.has(p.id) && !t.bench.includes(p.id)).sort((a, b) => slotRating(b, b.pos) - slotRating(a, a.pos)).map((p) => p.id)].slice(0, 9);
}

export function lineupIssues(state: GameState): string[] {
  const clubId = state.userClub!;
  const t = state.tactic;
  const out: string[] = [];
  const slots = FORMATIONS[t.formation];
  slots.forEach((s, i) => {
    const id = t.starters[i];
    if (id == null) out.push(`Posição ${s.label} sem jogador`);
    else if (!isAvailable(state, id, clubId)) out.push(`${state.players[id]?.name ?? "Jogador"} indisponível (${s.label})`);
  });
  const ids = t.starters.filter((x) => x != null);
  if (new Set(ids).size !== ids.length) out.push("Jogador repetido na escalação");
  return out;
}

export function buildSide(state: GameState, clubId: number, user: boolean, tactic?: Tactic): Side {
  const club = state.clubs[clubId];
  const diffBonus = { facil: 1.06, normal: 1, dificil: 0.97, realista: 0.97 }[state.difficulty];
  if (user && tactic) {
    const slots = FORMATIONS[tactic.formation];
    return {
      club: clubId,
      lineup: slots.map((s, i) => ({ pid: tactic.starters[i] ?? -1, role: s.role, instr: tactic.instr[i] ?? "Padrão" })).filter((l) => l.pid >= 0 && isAvailable(state, l.pid, clubId)),
      bench: tactic.bench.filter((id) => isAvailable(state, id, clubId)), sentOff: new Set(), injured: new Set(), subsUsed: 0,
      formation: tactic.formation, style: tactic.style, pressing: tactic.pressing, sp: { ...tactic.sp },
      bonus: diffBonus, cohesion: state.cohesion, user: true, autoSubs: false,
    };
  }
  const formation = choice(["4-3-3", "4-2-3-1", "4-4-2", "4-3-3", "3-5-2", "4-1-4-1"]);
  const { starters, bench } = autoLineup(state, clubId, formation);
  const slots = FORMATIONS[formation];
  const rep = club.rep;
  return {
    club: clubId,
    lineup: slots.map((s, i) => ({ pid: starters[i], role: s.role, instr: "Padrão" })).filter((l) => l.pid >= 0),
    bench, sentOff: new Set(), injured: new Set(), subsUsed: 0, formation,
    style: rep > 75 ? choice(["Ofensivo", "Posse de bola", "Equilibrado"]) : choice(["Equilibrado", "Contra-ataque", "Defensivo"]),
    pressing: choice(["Pressão média", "Pressão alta", "Bloco baixo"]), sp: {}, bonus: 1, cohesion: 60, user: false, autoSubs: true,
  };
}

const goalTexts = [
  "GOOOL! {p} finaliza com categoria e balança a rede!",
  "GOL! {p} aparece livre e não perdoa!",
  "É GOL! {p} bate firme no canto!",
  "GOLAÇO de {p}! Que pintura!",
  "GOL! {p} empurra para o fundo da rede!",
];
const missTexts = ["{p} finaliza, mas a bola sai à direita.", "{p} chuta por cima do gol.", "{p} arrisca de longe, para fora.", "{p} cabeceia sem direção."];
const saveTexts = ["{gk} faz grande defesa no chute de {p}!", "{p} bate e {gk} segura firme.", "Defesaça de {gk} em finalização de {p}!"];

export class MatchSim {
  minute = 0;
  score: [number, number] = [0, 0];
  stats: [SideStats, SideStats] = [emptyStats(), emptyStats()];
  events: MEvent[] = [];
  ratings: Record<number, number> = {};
  minutesPlayed: Record<number, number> = {};
  enteredAt: Record<number, number> = {};
  fatigue: Record<number, number> = {};
  finished = false;
  pens?: [number, number];
  length = 90 + randInt(2, 5);
  private cache: { att: number; mid: number; def: number; gk: number }[] = [];
  private dirty = true;

  constructor(public state: GameState, public sides: [Side, Side], public homeAdv: boolean, public knockout: boolean, public comp: string) {
    for (const s of sides) for (const l of s.lineup) { this.ratings[l.pid] = 6.2; this.enteredAt[l.pid] = 0; this.fatigue[l.pid] = state.players[l.pid].fit; }
  }

  p(id: number) { return this.state.players[id]; }
  name(id?: number) { return id !== undefined ? this.state.players[id]?.name ?? "?" : "?"; }
  active(s: 0 | 1) { return this.sides[s].lineup.filter((l) => !this.sides[s].sentOff.has(l.pid) && !this.sides[s].injured.has(l.pid)); }
  markDirty() { this.dirty = true; }

  strength(si: 0 | 1) {
    if (!this.dirty && this.cache[si]) return this.cache[si];
    for (const k of [0, 1] as const) {
      const s = this.sides[k];
      const act = this.active(k);
      let att = 0, mid = 0, def = 0, wa = 0, wm = 0, wd = 0, gk = 40;
      for (const l of act) {
        const pl = this.p(l.pid);
        const cond = 0.8 + 0.2 * ((this.fatigue[l.pid] ?? pl.fit) / 100);
        const mor = 0.95 + pl.mor / 1000;
        const r = slotRating(pl, l.role) * cond * mor;
        let a = ATT[l.role], m = MID[l.role], d = DEF[l.role];
        if (l.instr === "Apoiar o ataque") { a += 0.25; d -= 0.2; }
        if (l.instr === "Ficar na defesa") { a -= 0.15; d += 0.2; }
        if (l.instr === "Ajudar na marcação") { a -= 0.2; d += 0.3; }
        if (l.instr === "Ficar adiantado") { a += 0.2; d -= 0.1; }
        if (l.instr === "Proteger a defesa") { d += 0.3; m -= 0.1; }
        if (l.instr === "Sair para o jogo") { m += 0.2; a += 0.15; d -= 0.15; }
        if (l.instr === "Liberdade para criar") { m += 0.25; a += 0.15; d -= 0.1; }
        if (l.instr === "Chegar na área") { a += 0.3; m -= 0.1; }
        if (l.instr === "Recuar para armar") { m += 0.3; a -= 0.15; }
        if (l.role === "GOL") gk = r;
        att += r * a; wa += a; mid += r * m; wm += m; def += r * d; wd += d;
      }
      const n = act.length;
      const missing = Math.pow(n / 11, 1.4);
      let A = (att / Math.max(wa, 1)) * missing, M = (mid / Math.max(wm, 1)) * missing, D = (def / Math.max(wd, 1)) * missing;
      const st = s.style;
      if (st === "Ofensivo") { A *= 1.07; D *= 0.94; }
      if (st === "Defensivo") { A *= 0.92; D *= 1.07; }
      if (st === "Posse de bola") { M *= 1.06; A *= 0.98; }
      if (st === "Contra-ataque") { M *= 0.94; A *= 1.04; }
      if (s.pressing === "Bloco baixo") { D *= 1.04; A *= 0.96; }
      const home = this.homeAdv && k === 0 ? 1.04 : 1;
      const coh = 0.95 + s.cohesion / 1000;
      const f = home * coh * s.bonus;
      this.cache[k] = { att: A * f, mid: M * f, def: D * f, gk: gk * f };
    }
    // pressing reduces opponent mid
    for (const k of [0, 1] as const) {
      const o = this.sides[k === 0 ? 1 : 0];
      if (o.pressing === "Pressão alta") this.cache[k].mid *= 0.95;
      if (o.lineup.some((l) => l.instr === "Pressionar defensores")) this.cache[k].mid *= 0.98;
    }
    this.dirty = false;
    return this.cache[si];
  }

  ev(e: MEvent) { this.events.push(e); return e; }
  bump(pid: number | undefined, v: number) { if (pid !== undefined && this.ratings[pid] !== undefined) this.ratings[pid] = clamp(this.ratings[pid] + v, 3, 10); }

  pickShooter(s: 0 | 1) {
    const act = this.active(s).filter((l) => l.role !== "GOL");
    return weighted(act, (l) => SHOOT[l.role] * (this.p(l.pid).attr[0] / 50) ** 2 * (l.instr === "Chegar na área" ? 1.5 : 1)).pid;
  }
  pickAssist(s: 0 | 1, exclude: number) {
    const act = this.active(s).filter((l) => l.pid !== exclude && l.role !== "GOL");
    if (!act.length) return undefined;
    return weighted(act, (l) => (MID[l.role] + 0.3) * (this.p(l.pid).attr[1] / 50) ** 2).pid;
  }
  gkOf(s: 0 | 1) { return this.active(s).find((l) => l.role === "GOL")?.pid; }

  shot(s: 0 | 1, opts: { big?: boolean; header?: boolean; pen?: boolean; shooter?: number; assist?: number }) {
    const o = s === 0 ? 1 : 0;
    const st = this.stats[s];
    const shooter = opts.shooter ?? this.pickShooter(s);
    const sp = this.p(shooter);
    const assist = opts.pen ? undefined : opts.assist ?? (rand() < 0.72 ? this.pickAssist(s, shooter) : undefined);
    const gkId = this.gkOf(o);
    const S = this.strength(o);
    st.shots++;
    if (opts.big) st.big++;
    const fin = opts.header ? sp.attr[8] : sp.attr[0];
    const onT = opts.pen ? 0.85 : 0.3 + fin / 260 + (opts.big ? 0.2 : 0);
    if (rand() > onT) {
      this.bump(shooter, opts.big ? -0.3 : -0.05);
      this.ev({ min: this.minute, side: s, type: "miss", pid: shooter, text: opts.pen ? `${sp.name} cobra o pênalti e manda para fora!` : choice(missTexts).replace("{p}", sp.name), key: opts.big });
      return;
    }
    st.onT++;
    let gp = opts.pen ? 0.86 : (opts.big ? 0.5 : 0.27) * Math.pow(fin / Math.max(S.gk, 30), 1.1);
    if (this.sides[s].style === "Contra-ataque") gp *= 1.08;
    if (rand() < clamp(gp, 0.05, 0.92)) {
      this.score[s]++;
      this.bump(shooter, 1.1);
      this.bump(assist, 0.6);
      this.bump(gkId, -0.3);
      for (const l of this.active(o)) if (l.role === "ZAG" || l.role === "LAT") this.bump(l.pid, -0.15);
      let t = opts.pen ? `GOL de pênalti! ${sp.name} desloca o goleiro.` : opts.header ? `GOL de cabeça! ${sp.name} sobe mais que todos!` : choice(goalTexts).replace("{p}", sp.name);
      if (assist !== undefined) t += ` Assistência de ${this.name(assist)}.`;
      this.ev({ min: this.minute, side: s, type: "goal", pid: shooter, assist, text: t, key: true });
    } else {
      this.stats[o].saves++;
      this.bump(gkId, 0.25);
      this.ev({ min: this.minute, side: s, type: "save", pid: shooter, text: opts.pen ? `${this.name(gkId)} DEFENDE o pênalti de ${sp.name}!` : choice(saveTexts).replace("{p}", sp.name).replace("{gk}", this.name(gkId)), key: opts.big || opts.pen });
    }
  }

  card(side: 0 | 1, red: boolean) {
    const act = this.active(side).filter((l) => l.role !== "GOL");
    if (!act.length) return;
    const l = weighted(act, (x) => DEF[x.role] + 0.2);
    const pl = this.p(l.pid);
    const s = this.sides[side];
    const st = this.stats[side];
    const already = this.events.some((e) => e.type === "yellow" && e.pid === l.pid);
    if (red || already) {
      st.red++;
      s.sentOff.add(l.pid);
      this.bump(l.pid, -1.5);
      this.markDirty();
      this.ev({ min: this.minute, side, type: "red", pid: l.pid, text: already ? `Segundo amarelo! ${pl.name} está expulso!` : `CARTÃO VERMELHO direto para ${pl.name}!`, key: true });
    } else {
      st.yel++;
      this.bump(l.pid, -0.3);
      this.ev({ min: this.minute, side, type: "yellow", pid: l.pid, text: `Cartão amarelo para ${pl.name}.` });
    }
  }

  substitute(side: 0 | 1, outId: number, inId: number): boolean {
    const s = this.sides[side];
    if (s.subsUsed >= 5) return false;
    const idx = s.lineup.findIndex((l) => l.pid === outId);
    if (idx < 0 || s.sentOff.has(outId) || !s.bench.includes(inId)) return false;
    this.minutesPlayed[outId] = this.minute - (this.enteredAt[outId] ?? 0);
    s.lineup[idx] = { ...s.lineup[idx], pid: inId };
    s.bench = s.bench.filter((b) => b !== inId);
    s.injured.delete(outId);
    s.subsUsed++;
    this.ratings[inId] = 6.2;
    this.enteredAt[inId] = this.minute;
    this.fatigue[inId] = this.p(inId).fit;
    this.markDirty();
    this.ev({ min: this.minute, side, type: "sub", pid: inId, text: `Substituição: sai ${this.name(outId)}, entra ${this.name(inId)}.` });
    return true;
  }

  aiSubs(side: 0 | 1) {
    const s = this.sides[side];
    if (!s.autoSubs || s.subsUsed >= 5) return;
    const injured = s.lineup.find((l) => s.injured.has(l.pid));
    const tired = this.minute >= 58 && rand() < 0.08 ? [...s.lineup].filter((l) => !s.sentOff.has(l.pid) && l.role !== "GOL").sort((a, b) => this.fatigue[a.pid] - this.fatigue[b.pid])[0] : undefined;
    const out = injured ?? tired;
    if (!out || !s.bench.length) return;
    const cand = s.bench.map((id) => this.p(id)).sort((a, b) => slotRating(b, out.role) - slotRating(a, out.role))[0];
    if (cand) this.substitute(side, out.pid, cand.id);
  }

  step(): MEvent[] {
    if (this.finished) return [];
    const startLen = this.events.length;
    this.minute++;
    const m = this.minute;
    if (m === 1) this.ev({ min: 0, side: 0, type: "info", text: "Rola a bola! Começa a partida." });
    // fatigue
    for (const k of [0, 1] as const) {
      const s = this.sides[k];
      const drain = s.pressing === "Pressão alta" ? 0.32 : s.pressing === "Bloco baixo" ? 0.2 : 0.25;
      for (const l of s.lineup) {
        const pl = this.p(l.pid);
        const res = pl.attr[10] / 100;
        const extra = l.instr === "Pressionar defensores" || l.instr === "Apoiar o ataque" ? 0.06 : 0;
        this.fatigue[l.pid] = Math.max(10, (this.fatigue[l.pid] ?? pl.fit) - (drain + extra) * (1.3 - res));
      }
    }
    if (m % 5 === 0) this.markDirty();
    const S0 = this.strength(0), S1 = this.strength(1);
    const p0 = clamp(S0.mid ** 2 / (S0.mid ** 2 + S1.mid ** 2), 0.25, 0.75);
    const s: 0 | 1 = rand() < p0 ? 0 : 1;
    const o: 0 | 1 = s === 0 ? 1 : 0;
    const As = s === 0 ? S0 : S1, Do = s === 0 ? S1 : S0;
    this.stats[s].poss++;
    const passes = randInt(4, 7);
    this.stats[s].passes += passes;
    this.stats[s].passOk += Math.round(passes * clamp(0.62 + As.mid / 330, 0.6, 0.93));
    const chanceP = 0.14 * Math.pow(As.att / Math.max(Do.def, 20), 2.2);
    if (rand() < chanceP) {
      if (rand() < 0.05) this.stats[s].off++, this.ev({ min: m, side: s, type: "offside", text: `Impedimento marcado contra ${this.state.clubs[this.sides[s].club].short}.` });
      else this.shot(s, { big: rand() < 0.17 });
    }
    if (rand() < 0.11) {
      // foul by defending side
      this.stats[o].fouls++;
      const r = rand();
      if (r < 0.025) {
        this.ev({ min: m, side: s, type: "pen", text: `PÊNALTI para ${this.state.clubs[this.sides[s].club].short}!`, key: true });
        const taker = this.sides[s].sp.pen && this.active(s).some((l) => l.pid === this.sides[s].sp.pen) ? this.sides[s].sp.pen : undefined;
        this.shot(s, { pen: true, shooter: taker });
      } else if (r < 0.17) this.card(o, false);
      else if (r < 0.176) this.card(o, true);
      else if (r < 0.23) {
        const fk = this.sides[s].sp.fk && this.active(s).some((l) => l.pid === this.sides[s].sp.fk) ? this.sides[s].sp.fk : undefined;
        if (fk !== undefined) { this.ev({ min: m, side: s, type: "info", text: `Falta perigosa. ${this.name(fk)} vai para a cobrança...` }); this.shot(s, { shooter: fk }); }
      }
    }
    if (rand() < 0.055) {
      this.stats[s].corners++;
      if (rand() < 0.28) {
        const act = this.active(s).filter((l) => l.role !== "GOL");
        const header = weighted(act, (l) => (this.p(l.pid).attr[8] / 50) ** 3).pid;
        const ck = this.sides[s].sp.corner;
        this.shot(s, { header: true, shooter: header, assist: ck && this.active(s).some((l) => l.pid === ck) ? ck : undefined });
      } else if (rand() < 0.2) this.ev({ min: m, side: s, type: "corner", text: `Escanteio para ${this.state.clubs[this.sides[s].club].short}.` });
    }
    // injuries
    for (const k of [0, 1] as const) {
      if (rand() < 0.0022) {
        const act = this.active(k);
        if (!act.length) continue;
        const l = choice(act);
        this.sides[k].injured.add(l.pid);
        this.markDirty();
        this.ev({ min: m, side: k, type: "injury", pid: l.pid, text: `${this.name(l.pid)} sente uma lesão e não tem condições de continuar.`, key: true });
      }
      this.aiSubs(k);
    }
    if (m === 45) this.ev({ min: 45, side: 0, type: "half", text: `Fim do primeiro tempo: ${this.score[0]} x ${this.score[1]}.` });
    if (m === 90) this.ev({ min: 90, side: 0, type: "info", text: `Acréscimos: +${this.length - 90} minutos.` });
    if (m >= this.length) this.finish();
    return this.events.slice(startLen);
  }

  finish() {
    if (this.finished) return;
    if (this.knockout && this.score[0] === this.score[1]) {
      const pen: [number, number] = [0, 0];
      for (let i = 0; i < 5; i++) { if (rand() < 0.76) pen[0]++; if (rand() < 0.76) pen[1]++; }
      while (pen[0] === pen[1]) { if (rand() < 0.75) pen[0]++; if (rand() < 0.75) pen[1]++; }
      this.pens = pen;
      this.ev({ min: this.minute, side: 0, type: "info", text: `Disputa de pênaltis: ${pen[0]} x ${pen[1]}!`, key: true });
    }
    this.finished = true;
    const winner = this.score[0] > this.score[1] ? 0 : this.score[1] > this.score[0] ? 1 : -1;
    for (const k of [0, 1] as const) {
      for (const l of this.sides[k].lineup) {
        if (this.minutesPlayed[l.pid] === undefined) this.minutesPlayed[l.pid] = this.minute - (this.enteredAt[l.pid] ?? 0);
        if (winner === k) this.bump(l.pid, 0.35); else if (winner >= 0) this.bump(l.pid, -0.25);
        if (this.score[k === 0 ? 1 : 0] === 0 && (l.role === "GOL" || l.role === "ZAG")) this.bump(l.pid, 0.5);
      }
    }
    this.ev({ min: this.minute, side: 0, type: "end", text: `Fim de jogo! ${this.state.clubs[this.sides[0].club].name} ${this.score[0]} x ${this.score[1]} ${this.state.clubs[this.sides[1].club].name}.`, key: true });
  }

  runToEnd() { while (!this.finished) this.step(); }
  runTo(min: number) { while (!this.finished && this.minute < min) this.step(); }
}
