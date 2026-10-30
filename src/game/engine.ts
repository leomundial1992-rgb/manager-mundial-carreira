import { CONTINENTAL, COUNTRIES, COUNTRY } from "./data";
import { buildSide, MatchSim } from "./match";
import type { Cup, Fixture, GameState, League, Message, Player } from "./types";
import { A } from "./types";
import { choice, clamp, ovr, playerValue, rand, randInt, wageDemand } from "./util";
import { emptyRow, genPlayer, makeObjective, prepareDay, setupSeason, sortedTable, tierFactor, assignUserClub } from "./world";
import { genSponsorOffers } from "./sponsors";

export const DIFF_MULT = { facil: 0.6, normal: 1, dificil: 1.3, realista: 1.6 };

export function msg(st: GameState, title: string, body: string, kind: Message["kind"], action?: Message["action"]) {
  st.messages.unshift({ id: st.nextMsgId++, season: st.season, day: st.day, title, body, kind, action });
  if (st.messages.length > 120) st.messages.length = 120;
}

export function compName(st: GameState, comp: string) {
  return st.leagues[comp]?.name ?? st.cups[comp]?.name ?? comp;
}

export function dayFixtures(st: GameState, day = st.day): Fixture[] {
  const d = st.schedule[day];
  if (!d) return [];
  if (d.kind === "league") return Object.values(st.leagues).flatMap((l) => l.rounds[d.leagueRound!] ?? []);
  return (d.cups ?? []).flatMap((c) => st.cups[c].rounds[d.cupRound!] ?? []);
}

export function userFixture(st: GameState): Fixture | null {
  if (st.userClub === null) return null;
  return dayFixtures(st).find((f) => !f.played && (f.h === st.userClub || f.a === st.userClub)) ?? null;
}

export function nextUserFixtures(st: GameState, n = 6) {
  const out: { day: number; f: Fixture }[] = [];
  for (let d = st.day; d < st.schedule.length && out.length < n; d++) {
    const f = dayFixtures(st, d).find((x) => x.h === st.userClub || x.a === st.userClub);
    if (f) out.push({ day: d, f });
  }
  return out;
}

const isKnockout = (st: GameState, comp: string) => !!st.cups[comp];

export function createMatch(st: GameState, f: Fixture): MatchSim {
  const sides: [ReturnType<typeof buildSide>, ReturnType<typeof buildSide>] = [
    buildSide(st, f.h, f.h === st.userClub, st.tactic),
    buildSide(st, f.a, f.a === st.userClub, st.tactic),
  ];
  const neutral = st.cups[f.comp]?.kind === "mundial";
  return new MatchSim(st, sides, !neutral, isKnockout(st, f.comp), f.comp);
}

function scorersOf(st: GameState, comp: string): Record<number, number> {
  return st.leagues[comp]?.scorers ?? st.cups[comp]?.scorers ?? {};
}

export function applyResult(st: GameState, f: Fixture, sim: MatchSim) {
  f.hg = sim.score[0];
  f.ag = sim.score[1];
  f.pen = sim.pens;
  f.played = true;
  const league = st.leagues[f.comp];
  if (league) {
    const H = league.table[f.h] ?? (league.table[f.h] = emptyRow());
    const Aw = league.table[f.a] ?? (league.table[f.a] = emptyRow());
    H.p++; Aw.p++; H.gf += f.hg; H.ga += f.ag; Aw.gf += f.ag; Aw.ga += f.hg;
    if (f.hg > f.ag) { H.w++; H.pts += 3; Aw.l++; H.form.push("V"); Aw.form.push("D"); }
    else if (f.hg < f.ag) { Aw.w++; Aw.pts += 3; H.l++; H.form.push("D"); Aw.form.push("V"); }
    else { H.d++; Aw.d++; H.pts++; Aw.pts++; H.form.push("E"); Aw.form.push("E"); }
    H.form = H.form.slice(-5); Aw.form = Aw.form.slice(-5);
  }
  const sc = scorersOf(st, f.comp);
  // suspensions served
  for (const cid of [f.h, f.a]) for (const id of st.clubs[cid].players) { const p = st.players[id]; if (p.sus > 0) p.sus--; }
  for (const e of sim.events) {
    if (e.type === "goal" && e.pid !== undefined) {
      const p = st.players[e.pid];
      p.goals++;
      sc[e.pid] = (sc[e.pid] ?? 0) + 1;
      if (e.assist !== undefined) st.players[e.assist].assists++;
    }
    if (e.type === "yellow" && e.pid !== undefined) {
      const p = st.players[e.pid];
      p.yel++;
      if (p.yel >= 3) { p.yel = 0; p.sus = 1; }
    }
    if (e.type === "red" && e.pid !== undefined) st.players[e.pid].sus = randInt(1, 2);
    if (e.type === "injury" && e.pid !== undefined) {
      const p = st.players[e.pid];
      const club = p.club !== null ? st.clubs[p.club] : null;
      const med = club?.fac.medical ?? 2;
      p.inj = Math.max(1, Math.round(randInt(1, 6) * (1.1 - med * 0.08)));
      p.injName = choice(["Lesão muscular na coxa", "Entorse no tornozelo", "Contusão no joelho", "Estiramento na panturrilha", "Lesão no adutor"]);
      if (p.club === st.userClub) msg(st, `Lesão: ${p.name}`, `${p.name} sofreu ${p.injName.toLowerCase()} e deve ficar fora por ${p.inj} semana(s).`, "lesao");
    }
  }
  for (const side of sim.sides) {
    const won = (side === sim.sides[0] ? f.hg > f.ag : f.ag > f.hg) || (f.pen && (side === sim.sides[0] ? f.pen[0] > f.pen[1] : f.pen[1] > f.pen[0]));
    const lost = side === sim.sides[0] ? f.hg < f.ag : f.ag < f.hg;
    for (const pid of Object.keys(sim.minutesPlayed).map(Number)) {
      const p = st.players[pid];
      if (p.club !== side.club) continue;
      const mins = sim.minutesPlayed[pid];
      p.apps++;
      p.fit = clamp(Math.round(p.fit - (mins / 90) * (24 - p.attr[A.RES] * 0.12)), 20, 100);
      p.ratings = [...p.ratings, Math.round((sim.ratings[pid] ?? 6) * 10) / 10].slice(-5);
      p.mor = clamp(p.mor + (won ? 4 : lost ? -4 : 0) + 1, 10, 100);
    }
  }
  if (f.h === st.userClub || f.a === st.userClub) userAfterMatch(st, f, sim);
}

function userAfterMatch(st: GameState, f: Fixture, sim: MatchSim) {
  const home = f.h === st.userClub;
  const my = home ? f.hg! : f.ag!;
  const op = home ? f.ag! : f.hg!;
  const opp = st.clubs[home ? f.a : f.h];
  const me = st.clubs[st.userClub!];
  let res = my > op ? 1 : my < op ? 0 : 0.5;
  if (f.pen) res = (home ? f.pen[0] > f.pen[1] : f.pen[1] > f.pen[0]) ? 0.75 : 0.25;
  if (my > op) st.seasonStats.wins++; else if (my < op) st.seasonStats.losses++; else st.seasonStats.draws++;
  const expected = clamp(0.5 + (me.rep - opp.rep) / 60 + (home ? 0.06 : -0.06), 0.1, 0.9);
  const dm = DIFF_MULT[st.difficulty];
  st.board.confidence = clamp(Math.round(st.board.confidence + (res - expected) * 9 * dm), 0, 100);
  st.board.fans = clamp(Math.round(st.board.fans + (res - expected) * 10), 0, 100);
  st.coach.rep = clamp(st.coach.rep + (res - expected) * 0.8, 1, 99);
  st.cohesion = clamp(st.cohesion + 0.5, 0, 100);
  st.lastResults.unshift({ season: st.season, day: st.day, comp: f.comp, h: f.h, a: f.a, hg: f.hg!, ag: f.ag! });
  st.lastResults = st.lastResults.slice(0, 60);
  // home gate & prizes
  const led = curLedger(st);
  if (home) {
    const att = Math.round(me.capacity * clamp(0.35 + st.board.fans / 160 + (opp.rep > 75 ? 0.1 : 0), 0.2, 1));
    const price = 30 + me.rep * 0.8;
    add(st, "inc", "Bilheteria", Math.round(att * price));
  }
  const tf = tierFactor(st.leagues[me.league].tier);
  if (my > op) add(st, "inc", "Premiações", Math.round(400000 * tf * (st.cups[f.comp] ? 2 : 1)));
  void led;
  void sim;
}

export function curLedger(st: GameState) {
  if (!st.ledger.length) st.ledger.push({ season: st.season, month: 0, inc: {}, exp: {} });
  return st.ledger[st.ledger.length - 1];
}
export function add(st: GameState, kind: "inc" | "exp", cat: string, v: number) {
  if (st.userClub === null || !v) return;
  const l = curLedger(st);
  l[kind][cat] = (l[kind][cat] ?? 0) + v;
  st.clubs[st.userClub].balance += kind === "inc" ? v : -v;
}

export function quickSim(st: GameState, f: Fixture) {
  const sim = createMatch(st, f);
  if (f.h === st.userClub || f.a === st.userClub) {
    for (const s of sim.sides) if (s.user) s.autoSubs = true;
  }
  sim.runToEnd();
  applyResult(st, f, sim);
  return sim;
}

const CUP_ROUND_NAMES = (cup: Cup, r: number) => {
  const left = cup.entrants.length / Math.pow(2, r);
  return left === 2 ? "Final" : left === 4 ? "Semifinal" : left === 8 ? "Quartas de final" : left === 16 ? "Oitavas de final" : `${left} times`;
};
export const cupRoundName = CUP_ROUND_NAMES;

function resolveCups(st: GameState) {
  const d = st.schedule[st.day];
  if (d.kind !== "cup") return;
  for (const cid of d.cups ?? []) {
    const cup = st.cups[cid];
    const fx = cup.rounds[d.cupRound!];
    if (!fx || cup.winner !== undefined) continue;
    const winners = fx.map((f) => (f.hg! > f.ag! ? f.h : f.ag! > f.hg! ? f.a : f.pen && f.pen[0] > f.pen[1] ? f.h : f.a));
    if (st.userClub !== null && cup.alive.includes(st.userClub)) {
      const iWin = winners.includes(st.userClub);
      st.seasonStats.cupRounds[cid] = d.cupRound! + (iWin ? 1 : 0);
      if (iWin) add(st, "inc", "Premiações", Math.round(1_500_000 * (d.cupRound! + 1) * (cup.kind === "nacional" ? 1 : 2.5)));
      if (!iWin) msg(st, `Eliminado da ${cup.name}`, `O clube foi eliminado na fase ${CUP_ROUND_NAMES(cup, d.cupRound!)}.`, "noticia");
    }
    cup.alive = winners;
    if (winners.length === 1) {
      cup.winner = winners[0];
      st.honours.push({ season: st.season, comp: cup.name, club: winners[0] });
      if (winners[0] === st.userClub) {
        st.seasonStats.titles.push(cup.name);
        st.coach.titles.push({ season: st.season, name: cup.name, club: st.userClub });
        st.coach.rep = clamp(st.coach.rep + (cup.kind === "nacional" ? 4 : 8), 1, 99);
        st.board.confidence = clamp(st.board.confidence + 15, 0, 100);
        st.board.fans = clamp(st.board.fans + 15, 0, 100);
        msg(st, `🏆 CAMPEÃO da ${cup.name}!`, `Festa da torcida! ${st.clubs[st.userClub].name} conquista a ${cup.name} ${st.season}.`, "noticia");
      } else msg(st, `${st.clubs[winners[0]].name} vence a ${cup.name}`, `Título conquistado na temporada ${st.season}.`, "noticia");
    }
  }
}

// ---------- Training ----------
export const TRAINING_TYPES = ["Defesa", "Ataque", "Preparação física", "Finalização", "Passe", "Marcação", "Bolas paradas", "Tática", "Entrosamento", "Descanso"];
export const DEF_FOCUS: Record<string, number[]> = {
  "Posicionamento da defesa": [A.POS], Cobertura: [A.POS, A.VEL], Marcação: [A.MAR], Desarmes: [A.DES],
  "Bolas aéreas": [A.CAB, A.FOR], "Proteção da área": [A.POS, A.MAR], "Transição defensiva": [A.VEL, A.RES, A.DES],
};
const TRAIN_ATTR: Record<string, number[]> = {
  Defesa: [A.MAR, A.DES, A.POS], Ataque: [A.FIN, A.DRI, A.VIS], "Preparação física": [A.VEL, A.FOR, A.RES], Finalização: [A.FIN, A.CAB],
  Passe: [A.PAS, A.VIS], Marcação: [A.MAR, A.DES], "Bolas paradas": [A.CAB, A.FIN], Tática: [A.POS, A.VIS], Entrosamento: [],
};
const INT = { leve: { g: 0.6, f: -1, inj: 0.4 }, normal: { g: 1, f: -2.5, inj: 1 }, forte: { g: 1.5, f: -4.5, inj: 2.3 } };

export function ageGrowth(age: number) { return age <= 19 ? 1.8 : age <= 21 ? 1.5 : age <= 24 ? 1.1 : age <= 28 ? 0.7 : age <= 31 ? 0.35 : 0.12; }

export function applyTraining(st: GameState) {
  if (st.userClub === null) return { injuries: [] as string[] };
  const club = st.clubs[st.userClub];
  const t = st.training;
  const it = INT[t.intensity];
  const injuries: string[] = [];
  for (const id of club.players) {
    const p = st.players[id];
    if (p.inj > 0) continue;
    let fitDelta = 6;
    for (const sess of t.week) {
      if (sess === "Descanso") { fitDelta += 4; continue; }
      fitDelta += it.f;
      if (sess === "Entrosamento") st.cohesion = clamp(st.cohesion + 0.25 * it.g, 0, 100);
      if (sess === "Tática") st.cohesion = clamp(st.cohesion + 0.1 * it.g, 0, 100);
      let attrs = [...(TRAIN_ATTR[sess] ?? [])];
      if (sess === "Defesa") attrs = [...attrs, ...(DEF_FOCUS[t.defFocus] ?? []), ...(DEF_FOCUS[t.defFocus] ?? [])];
      if (p.pos === "GOL") attrs = [A.REF, A.POS, A.REF];
      const potF = ovr(p) >= p.pot ? 0.12 : 1;
      const g = 0.03 * it.g * ageGrowth(p.age) * potF * (0.8 + club.fac.training * 0.1);
      for (const a of attrs) p.attr[a] = clamp(p.attr[a] + g * (0.5 + rand()), 1, 99);
      const risk = 0.0012 * it.inj * (p.fit < 60 ? 2 : 1) * (1.1 - club.fac.medical * 0.08);
      if (rand() < risk) {
        p.inj = randInt(1, 3);
        p.injName = "Lesão no treino";
        injuries.push(p.name);
        break;
      }
    }
    p.fit = clamp(Math.round(p.fit + fitDelta), 20, 100);
  }
  if (injuries.length) msg(st, "Lesão no treinamento", `${injuries.join(", ")} se machucou durante os treinos da semana.`, "lesao");
  return { injuries };
}

// ---------- Finances ----------
export function monthlyFinances(st: GameState) {
  if (st.userClub === null) return;
  const club = st.clubs[st.userClub];
  const tf = tierFactor(st.leagues[club.league].tier);
  for (const s of st.sponsors) if (s.payment === "mensal") add(st, "inc", "Patrocínios", Math.round(s.value / 12));
  add(st, "inc", "Direitos de TV", Math.round(2600 * club.rep * club.rep * tf));
  add(st, "inc", "Produtos licenciados", Math.round(club.rep * st.board.fans * 700 * (0.5 + tf / 2)));
  const wages = club.players.reduce((s, id) => {
    const p = st.players[id];
    return s + (p.loanFrom != null ? p.wage * (p.loanWagePct ?? 100) / 100 : p.wage);
  }, 0);
  add(st, "exp", "Salários", wages);
  add(st, "exp", "Comissão técnica", st.coach.wage + Math.round(club.rep * 5000));
  add(st, "exp", "Estádio", club.fac.stadium * 180000);
  add(st, "exp", "Centro de treinamento", club.fac.training * 120000);
  add(st, "exp", "Departamento médico", club.fac.medical * 90000);
  add(st, "exp", "Categorias de base", club.fac.youth * 70000);
  add(st, "exp", "Olheiros", club.fac.scouting * 60000);
  const month = curLedger(st).month + 1;
  st.ledger.push({ season: st.season, month, inc: {}, exp: {} });
  if (st.ledger.length > 40) st.ledger.shift();
  if (club.balance < 0) {
    st.board.confidence = clamp(st.board.confidence - 3, 0, 100);
    msg(st, "Diretoria preocupada com as finanças", "O saldo bancário está negativo. Reduza a folha salarial ou venda jogadores.", "diretoria");
  }
}

export const userWages = (st: GameState) =>
  st.userClub === null ? 0 : st.clubs[st.userClub].players.reduce((s, id) => s + st.players[id].wage, 0);

// ---------- AI offers & events ----------
function aiOffers(st: GameState) {
  if (st.userClub === null) return;
  const me = st.clubs[st.userClub];
  if (rand() > 0.3) return;
  const pool = me.players.map((id) => st.players[id]).filter((p) => p.loanFrom == null);
  if (pool.length < 16) return;
  const p = pool.sort((a, b) => (b.listed ? 1000 : 0) + playerValue(b) - (a.listed ? 1000 : 0) - playerValue(a))[randInt(0, Math.min(7, pool.length - 1))];
  const val = playerValue(p);
  const bidders = st.clubs.filter((c) => c.id !== me.id && c.rep >= ovr(p) - 18 && c.balance > val * 0.9);
  if (!bidders.length) return;
  const b = choice(bidders);
  const loan = rand() < 0.12 && p.age < 23;
  const fee = loan ? Math.round(val * 0.1 / 10000) * 10000 : Math.round(val * (p.listed ? 0.85 : 0.8) * (0.9 + rand() * 0.45) / 10000) * 10000;
  msg(st, `Proposta por ${p.name}`, `${b.name} oferece ${loan ? "empréstimo de uma temporada por" : ""} R$ ${(fee / 1e6).toFixed(2)} mi por ${p.name} (valor de mercado R$ ${(val / 1e6).toFixed(1)} mi).`, "proposta", { type: "offerForPlayer", playerId: p.id, fromClub: b.id, fee, loan });
}

function jobOffer(st: GameState, force = false) {
  if (st.userClub === null && !force) return;
  const myRep = st.userClub !== null ? st.clubs[st.userClub].rep : 0;
  if (!force && (st.coach.rep < myRep + 3 || rand() > 0.12)) return;
  const cands = st.clubs.filter((c) => c.id !== st.userClub && Math.abs(c.rep - (st.coach.rep + (force ? -8 : 2))) < 8);
  if (!cands.length) return;
  const c = choice(cands);
  msg(st, `Proposta de emprego: ${c.name}`, `A diretoria do ${c.name} (${compName(st, c.league)}) quer contratar você como treinador.`, "emprego", { type: "jobOffer", clubId: c.id });
}

export function acceptJob(st: GameState, clubId: number) {
  const old = st.userClub;
  if (old !== null) closeHistory(st, old, true);
  st.coach.wage = Math.round(st.clubs[clubId].rep * 6000);
  st.coach.contract = 2;
  assignUserClub(st, clubId);
  st.fired = false;
  st.userMatchDone = false;
  st.ledger = [{ season: st.season, month: 0, inc: {}, exp: {} }];
  msg(st, `Novo desafio: ${st.clubs[clubId].name}`, `Você assumiu o comando. Objetivo: ${st.board.objective.text}.`, "diretoria");
}

function closeHistory(st: GameState, clubId: number, midSeason: boolean) {
  const lg = st.leagues[st.clubs[clubId].league];
  const pos = sortedTable(lg).indexOf(clubId) + 1;
  st.coach.history.push({ season: st.season, club: clubId, league: lg.name + (midSeason ? " (saiu)" : ""), pos, titles: [...st.seasonStats.titles] });
}

// ---------- Day advancement ----------
export function canAdvance(st: GameState) {
  return !userFixture(st);
}

export function finishDay(st: GameState) {
  const fx = dayFixtures(st).filter((f) => !f.played);
  for (const f of fx) quickSim(st, f);
  resolveCups(st);
  // weekly
  for (const p of Object.values(st.players)) {
    if (p.inj > 0) p.inj--;
    if (p.club !== st.userClub) p.fit = clamp(p.fit + 14, 20, 100);
  }
  applyTraining(st);
  aiOffers(st);
  if (st.day % 4 === 3) { monthlyFinances(st); jobOffer(st); }
  if (st.userClub !== null && !st.fired && st.day > 6 && st.board.confidence <= 8) fire(st);
  st.day++;
  st.userMatchDone = false;
  if (st.day >= st.schedule.length) endSeason(st);
  else prepareDay(st);
}

function fire(st: GameState) {
  const c = st.userClub!;
  closeHistory(st, c, true);
  msg(st, "Você foi demitido", `A diretoria do ${st.clubs[c].name} perdeu a confiança no seu trabalho. Aguarde propostas de outros clubes.`, "diretoria");
  st.coach.rep = clamp(st.coach.rep - 8, 1, 99);
  st.userClub = null;
  st.fired = true;
  st.unemployed = true;
  for (let i = 0; i < 3; i++) jobOffer(st, true);
}

// ---------- Season end ----------
function develop(p: Player, user: boolean) {
  const o = ovr(p);
  let d = 0;
  if (p.age <= 23) d = Math.max(0, (p.pot - o) * (user ? 0.18 : 0.35)) + rand() * 1.5;
  else if (p.age <= 28) d = (p.pot > o ? 1 : 0) + rand() * 1.4 - 0.5;
  else if (p.age <= 31) d = -0.4 - rand() * 1.2;
  else if (p.age <= 33) d = -1.2 - rand() * 1.8;
  else d = -2 - rand() * 2.5;
  const form = p.ratings.length ? p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length : 6.5;
  d += (form - 6.6) * 0.8;
  p.attr = p.attr.map((v, i) => (p.pos !== "GOL" && i === A.REF) || (p.pos === "GOL" && ![A.REF, A.POS, A.FOR, A.PAS].includes(i as 11)) ? v : clamp(v + d * (0.6 + rand() * 0.8), 5, 99));
  p.age++;
}

function evaluateSponsors(st: GameState) {
  if (st.userClub === null) return;
  const club = st.clubs[st.userClub];
  const lg = st.leagues[club.league];
  const pos = sortedTable(lg).indexOf(club.id) + 1;
  const nat = COUNTRY[club.country].cup.id;
  const contQual = lg.tier === 1 && CONTINENTAL.some((c) => (c.quotas[club.country] ?? 0) >= pos);
  for (const s of st.sponsors) {
    const g = s.goal;
    const ok = g.type === "pos" ? pos <= g.target : g.type === "wins" ? st.seasonStats.wins >= g.target : g.type === "title" ? st.seasonStats.titles.length >= 1 : g.type === "cup" ? (st.seasonStats.cupRounds[nat] ?? 0) >= g.target : contQual;
    if (ok) { add(st, "inc", "Patrocínios", s.bonus); msg(st, `Meta batida: ${s.company}`, `Meta "${g.text}" cumprida. Bônus de R$ ${(s.bonus / 1e6).toFixed(2)} mi recebido.`, "patrocinio"); }
    else if (s.penalty > 0) { add(st, "exp", "Multas contratuais", s.penalty); msg(st, `Meta não cumprida: ${s.company}`, `Multa de R$ ${(s.penalty / 1e6).toFixed(2)} mi aplicada por não cumprir "${g.text}".`, "patrocinio"); }
    s.left = (s.left ?? s.years) - 1;
  }
  const expiring = st.sponsors.filter((s) => (s.left ?? 0) <= 0);
  st.sponsors = st.sponsors.filter((s) => (s.left ?? 0) > 0);
  for (const s of expiring) {
    const nv = Math.round(s.value * (0.9 + st.board.fans / 300) / 10000) * 10000;
    st.sponsorOffers.unshift({ ...s, id: st.nextSponsorId++, value: nv, left: undefined, start: undefined });
    msg(st, `Renovação: ${s.company}`, `O contrato com ${s.company} terminou. A empresa propõe renovar por R$ ${(nv / 1e6).toFixed(1)} mi/temporada. Veja em Patrocínios.`, "patrocinio");
  }
  for (const s of st.sponsors) if (s.payment === "anual") add(st, "inc", "Patrocínios", s.value);
}

export function endSeason(st: GameState) {
  const user = st.userClub;
  // league champions & standings
  const finals: Record<string, number[]> = {};
  for (const l of Object.values(st.leagues)) {
    const order = sortedTable(l);
    finals[l.id] = order;
    st.honours.push({ season: st.season, comp: `${l.name} (${COUNTRY[l.country].name})`, club: order[0] });
    if (order[0] === user) {
      st.seasonStats.titles.push(l.name);
      st.coach.titles.push({ season: st.season, name: l.name, club: user! });
      st.coach.rep = clamp(st.coach.rep + 6, 1, 99);
    }
  }
  // board evaluation
  if (user !== null) {
    const lg = st.leagues[st.clubs[user].league];
    const pos = finals[lg.id].indexOf(user) + 1;
    const obj = st.board.objective;
    const ok = obj.key === "title" ? pos === 1 : pos <= obj.target;
    const dm = DIFF_MULT[st.difficulty];
    st.board.confidence = clamp(Math.round(st.board.confidence + (ok ? 25 : -28 * dm)), 0, 100);
    st.coach.rep = clamp(st.coach.rep + (ok ? 4 : -3), 1, 99);
    msg(st, "Avaliação da temporada", `Posição final: ${pos}º em ${lg.name}. Objetivo "${obj.text}": ${ok ? "CUMPRIDO" : "NÃO cumprido"}. Confiança da diretoria: ${st.board.confidence}%.`, "diretoria");
    evaluateSponsors(st);
    closeHistory(st, user, false);
    add(st, "inc", "Premiações", Math.round(Math.max(0, lg.clubs.length - pos + 1) * 1_200_000 * tierFactor(lg.tier)));
  }
  // promotion / relegation
  const moves: string[] = [];
  for (const c of COUNTRIES) {
    for (let t = 0; t < c.leagues.length - 1; t++) {
      const up = st.leagues[c.leagues[t].id], down = st.leagues[c.leagues[t + 1].id];
      const n = c.swap;
      const relegated = finals[up.id].slice(-n), promoted = finals[down.id].slice(0, n);
      up.clubs = up.clubs.filter((x) => !relegated.includes(x)).concat(promoted);
      down.clubs = down.clubs.filter((x) => !promoted.includes(x)).concat(relegated);
      for (const x of promoted) { st.clubs[x].league = up.id; st.clubs[x].rep = clamp(st.clubs[x].rep + 4, 10, 97); }
      for (const x of relegated) { st.clubs[x].league = down.id; st.clubs[x].rep = clamp(st.clubs[x].rep - 4, 10, 97); }
      if (user !== null && promoted.includes(user)) moves.push(`ACESSO! ${st.clubs[user].name} sobe para ${up.name}!`);
      if (user !== null && relegated.includes(user)) moves.push(`Rebaixamento: ${st.clubs[user].name} cai para ${down.name}.`);
    }
  }
  for (const m of moves) msg(st, m, m, "noticia");
  st.lastStandings = finals;
  // players: develop, contracts, retire, loans
  const removed = new Set<number>();
  for (const p of Object.values(st.players)) {
    develop(p, p.club === user);
    p.fit = 100; p.inj = 0; p.sus = 0; p.ratings = [];
    if (p.loanFrom != null) {
      const from = p.loanFrom;
      if (p.club !== null) st.clubs[p.club].players = st.clubs[p.club].players.filter((x) => x !== p.id);
      st.clubs[from].players.push(p.id);
      if (p.club === user) msg(st, `${p.name} retorna ao ${st.clubs[from].name}`, "Fim do empréstimo.", "contrato");
      if (from === user) msg(st, `${p.name} retorna de empréstimo`, "O jogador está de volta ao elenco.", "contrato");
      p.club = from; p.loanFrom = null; p.loanOption = undefined; p.loanWagePct = undefined;
      continue;
    }
    if (p.club === null) { p.contract = 0; continue; }
    p.contract--;
    if (p.age >= 34 && rand() < (p.age - 33) * 0.25) {
      if (p.club === user) msg(st, `${p.name} se aposenta`, `Aos ${p.age} anos, ${p.name} pendura as chuteiras.`, "noticia");
      st.clubs[p.club].players = st.clubs[p.club].players.filter((x) => x !== p.id);
      removed.add(p.id);
      continue;
    }
    if (p.contract <= 0) {
      if (p.club !== user && rand() < 0.8) { p.contract = randInt(1, 4); continue; }
      if (p.club === user) msg(st, `${p.name} deixa o clube`, "O contrato terminou sem renovação. Agora ele é um jogador livre.", "contrato");
      st.clubs[p.club].players = st.clubs[p.club].players.filter((x) => x !== p.id);
      p.club = null; p.contract = 0;
      st.freeAgents.push(p.id);
    }
  }
  for (const id of removed) delete st.players[id];
  // trim free agents
  st.freeAgents = st.freeAgents.filter((id) => st.players[id] && st.players[id].club === null);
  if (st.freeAgents.length > 250) {
    const sorted = st.freeAgents.sort((a, b) => ovr(st.players[b]) - ovr(st.players[a]));
    for (const id of sorted.slice(250)) delete st.players[id];
    st.freeAgents = sorted.slice(0, 250);
  }
  // youth & squad top-up
  for (const c of st.clubs) {
    const lvl = c.id === user ? c.fac.youth : Math.round(c.rep / 22);
    const youthN = c.id === user ? 2 + Math.floor(lvl / 2) : 2;
    const youngNames: string[] = [];
    for (let i = 0; i < youthN; i++) {
      const pos = choice(["GOL", "ZAG", "LAT", "VOL", "MEI", "PON", "ATA"] as const);
      const p = genPlayer(st, c.country, pos, clamp(Math.round(28 + c.rep * 0.35 + lvl * 2 + rand() * 6), 30, 75), randInt(16, 18), c.id);
      p.pot = clamp(p.pot + lvl * 2, 40, 95);
      p.contract = 3;
      c.players.push(p.id);
      youngNames.push(`${p.name} (${p.pos}, pot. ${p.pot})`);
    }
    if (c.id === user) msg(st, "Jovens promessas da base", `Subiram para o profissional: ${youngNames.join(", ")}.`, "noticia");
    if (c.id !== user) {
      while (c.players.length > 26) {
        const worst = [...c.players].sort((a, b) => ovr(st.players[a]) - ovr(st.players[b]))[0];
        c.players = c.players.filter((x) => x !== worst);
        delete st.players[worst];
      }
      while (c.players.length < 20) {
        const p = genPlayer(st, c.country, choice(["ZAG", "LAT", "VOL", "MEI", "PON", "ATA"] as const), clamp(Math.round(30 + c.rep * 0.55 + rand() * 4 - 2), 30, 90), undefined, c.id);
        c.players.push(p.id);
      }
    }
  }
  // coach contract
  if (user !== null) {
    st.coach.contract--;
    if (st.coach.contract <= 0) {
      if (st.board.confidence >= 45) {
        st.coach.contract = 2;
        st.coach.wage = Math.round(st.coach.wage * 1.1);
        msg(st, "Contrato renovado", `A diretoria renovou seu contrato por mais 2 temporadas com reajuste salarial.`, "contrato");
      } else {
        msg(st, "Contrato não renovado", "A diretoria decidiu não renovar. Você está livre no mercado.", "diretoria");
        st.userClub = null; st.unemployed = true;
        for (let i = 0; i < 3; i++) jobOffer(st, true);
      }
    } else if (st.board.confidence < 15) {
      fire(st);
    }
    for (let i = 0; i < 2; i++) if (rand() < st.coach.rep / 120) jobOffer(st, false);
  }
  st.season++;
  setupSeason(st);
  if (st.userClub !== null) {
    st.board.objective = makeObjective(st, st.userClub);
    st.board.confidence = clamp(Math.round(st.board.confidence * 0.6 + 25), 0, 100);
    st.sponsorOffers = [...st.sponsorOffers.filter((o) => !st.sponsors.some((s) => s.slot === o.slot)), ...genSponsorOffers(st)].slice(0, 24);
    const c = st.clubs[st.userClub];
    c.transferBudget = Math.max(c.transferBudget, Math.round(Math.max(0, c.balance) * 0.25));
    msg(st, `Temporada ${st.season} começou`, `Novo objetivo da diretoria: ${st.board.objective.text}. Orçamento de transferências: R$ ${(c.transferBudget / 1e6).toFixed(1)} mi.`, "diretoria");
    // fix lineup references
    const ids = new Set(c.players);
    st.tactic.starters = st.tactic.starters.map((x) => (x !== null && ids.has(x) ? x : null));
    st.tactic.bench = st.tactic.bench.filter((x) => ids.has(x));
  }
  st.ledger.push({ season: st.season, month: 0, inc: {}, exp: {} });
}

export function leagueOf(st: GameState, clubId: number): League { return st.leagues[st.clubs[clubId].league]; }
export function demandFor(st: GameState, p: Player) { return wageDemand(p, st.userClub !== null ? st.clubs[st.userClub].rep : 50); }
