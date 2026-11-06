import { type CountryDef, CLUB_COLORS, CONTINENTAL, COUNTRIES, COUNTRY, FOREIGN_NATS, GARRO, KIT_COLORS, SPFC_SQUAD, WORLD_CUP, type RefPlayer } from "./data";
import type { Club, Cup, DayPlan, Difficulty, Fixture, GameState, League, Objective, Player, Pos, Row } from "./types";
import { choice, clamp, gauss, ovr, POS_WEIGHTS, rand, randInt, shuffle, wageDemand } from "./util";
import { autoLineup } from "./match";
import { REAL_SQUADS, type RealEntry } from "./realSquads";
import { genSponsorOffers } from "./sponsors";

const SQUAD_TEMPLATE: Pos[] = ["GOL", "GOL", "ZAG", "ZAG", "ZAG", "ZAG", "LAT", "LAT", "LAT", "VOL", "VOL", "VOL", "MEI", "MEI", "MEI", "PON", "PON", "PON", "ATA", "ATA"];

export function makeAttrs(pos: Pos, target: number): number[] {
  const w = POS_WEIGHTS[pos];
  return w.map((wi, i) => {
    let v = wi > 0 ? target + randInt(-4, 5) : target - randInt(10, 26);
    if (pos !== "GOL" && i === 11) v = randInt(10, 25);
    if (pos === "GOL" && i !== 11 && i !== 7 && i !== 4 && i !== 1) v = randInt(15, 40);
    return clamp(v, 10, 98);
  });
}

function nameFor(nat: string): string {
  const c = COUNTRY[nat] ?? COUNTRY[choice(["BRA", "ESP", "ARG", "FRA"])];
  return `${choice(c.first)} ${choice(c.last)}`;
}

export function genPlayer(st: GameState, nat: string, pos: Pos, target: number, age?: number, club: number | null = null, name?: string): Player {
  const a = age ?? clamp(Math.round(26 + gauss() * 4), 17, 36);
  let pot = target;
  if (a <= 20) pot = target + randInt(4, 18);
  else if (a <= 23) pot = target + randInt(2, 10);
  else if (a <= 26) pot = target + randInt(0, 4);
  const p: Player = {
    id: st.nextPlayerId++, name: name ?? nameFor(nat), age: a, nat, pos, foot: rand() < 0.72 ? "D" : rand() < 0.9 ? "E" : "A",
    attr: makeAttrs(pos, target), pot: clamp(pot, 30, 95), wage: 0, contract: randInt(1, 4), fit: randInt(88, 100), mor: randInt(60, 80),
    ratings: [], inj: 0, sus: 0, yel: 0, club, goals: 0, assists: 0, apps: 0,
  };
  p.pot = Math.max(p.pot, ovr(p));
  p.wage = Math.round(wageDemand(p, club !== null ? st.clubs[club]?.rep ?? 50 : 50) * (0.85 + rand() * 0.3) / 1000) * 1000;
  st.players[p.id] = p;
  return p;
}

/** Potential from age: young players have room to grow, veterans are at their ceiling. */
export function potFor(age: number, o: number): number {
  if (age <= 21) return clamp(o + randInt(8, 16), o, 95);
  if (age <= 25) return clamp(o + randInt(2, 6), o, 95);
  if (age <= 29) return clamp(o + randInt(0, 2), o, 95);
  return o;
}

const MIN_POS: Partial<Record<Pos, number>> = { GOL: 2, ZAG: 3, LAT: 2, VOL: 2, MEI: 2, PON: 2, ATA: 2 };

/** Real squad from the user's list: keeps every listed player and explicit ratings; fills missing positions with generated players. */
export function buildRealSquad(st: GameState, club: Club, list: RealEntry[]) {
  const mean = 30 + club.rep * 0.55;
  for (const [name, pos, given, nat] of list) {
    const age = clamp(Math.round(26 + gauss() * 4), 17, 36);
    const o = given > 0 ? given : clamp(Math.round(mean + gauss() * 4), 35, 90);
    const p = refPlayer(st, { name, pos, age, ovr: o, pot: potFor(age, o), nat: nat || club.country, foot: rand() < 0.75 ? "D" : "E" }, club.id, club.rep);
    if (name === GARRO.name) { Object.assign(p, { age: GARRO.age, pot: GARRO.pot, nat: GARRO.nat, foot: GARRO.foot, contract: 1, listed: true }); }
    club.players.push(p.id);
  }
  const count = (ps: Pos) => club.players.filter((id) => st.players[id].pos === ps).length;
  for (const [ps, n] of Object.entries(MIN_POS) as [Pos, number][]) {
    while (count(ps) < n) club.players.push(genPlayer(st, club.country, ps, clamp(Math.round(mean - 3 + gauss() * 4), 30, 88), undefined, club.id).id);
  }
  let k = 0;
  while (club.players.length < 18) club.players.push(genPlayer(st, club.country, SQUAD_TEMPLATE[k++ % SQUAD_TEMPLATE.length], clamp(Math.round(mean - 3 + gauss() * 4), 30, 88), undefined, club.id).id);
}

function refPlayer(st: GameState, r: RefPlayer, club: number, rep = 76): Player {
  const p = genPlayer(st, r.nat, r.pos as Pos, r.ovr, r.age, club, r.name);
  // nudge to exact overall
  for (let k = 0; k < 6; k++) {
    const d = r.ovr - ovr(p);
    if (d === 0) break;
    const w = POS_WEIGHTS[p.pos];
    p.attr = p.attr.map((v, i) => (w[i] > 0 ? clamp(v + d, 10, 99) : v));
  }
  p.pot = Math.max(r.pot, ovr(p));
  p.foot = r.foot;
  p.wage = Math.round(wageDemand(p, rep) * 0.9 / 1000) * 1000;
  p.contract = randInt(1, 4);
  return p;
}

const TIER_F = [1, 0.4, 0.15, 0.06];
export const tierFactor = (t: number) => TIER_F[t - 1] ?? 0.05;

export function createWorld(difficulty: Difficulty): GameState {
  const st: GameState = {
    version: 1, difficulty, season: 2026, day: 0, schedule: [], userClub: null,
    coach: { name: "Treinador", rep: 50, titles: [], history: [], contract: 2, wage: 300000 },
    clubs: [], players: {}, nextPlayerId: 1, leagues: {}, cups: {}, freeAgents: [],
    tactic: { formation: "4-3-3", style: "Equilibrado", pressing: "Pressão média", starters: [], bench: [], instr: {}, sp: {} },
    training: { week: ["Tática", "Preparação física", "Ataque", "Defesa", "Descanso", "Entrosamento", "Descanso"], intensity: "normal", defFocus: "Posicionamento da defesa" },
    cohesion: 55, board: { confidence: 60, objective: { key: "pos", text: "", target: 10 }, fans: 60 },
    sponsors: [], sponsorOffers: [], nextSponsorId: 1, ledger: [], messages: [], nextMsgId: 1, pending: null,
    seasonStats: { wins: 0, draws: 0, losses: 0, cupRounds: {}, titles: [] }, honours: [], lastResults: [], shortlist: [],
    userMatchDone: false, lastStandings: {},
  };
  for (const c of COUNTRIES) addCountry(st, c);
  // free agents
  for (let i = 0; i < 80; i++) {
    const pos = choice(SQUAD_TEMPLATE);
    const p = genPlayer(st, choice(["BRA", "ARG", "ESP", "POR", "FRA", "ITA", "URU", "COL"]), pos, randInt(48, 72), randInt(19, 34), null);
    p.contract = 0;
    st.freeAgents.push(p.id);
  }
  setupSeason(st);
  return st;
}


/** Builds a country's leagues, clubs and squads. Exported so old saves can gain new countries. */
export function addCountry(st: GameState, c: CountryDef) {
  const taken = new Set(st.clubs.map((x) => x.name));
    const used = new Set<string>(taken);
    const names: string[] = [];
    const total = c.leagues.reduce((s, l) => s + l.teams, 0);
    for (const n of c.clubs) if (names.length < total && !used.has(n)) { names.push(n); used.add(n); }
    let i = 0;
    while (names.length < total) {
      let n = c.pattern(c.cities[i % c.cities.length], Math.floor(i / c.cities.length) + i);
      if (i > c.cities.length * 6) n = `${n} ${Math.floor(i / c.cities.length)}`;
      i++;
      if (used.has(n)) continue;
      used.add(n); names.push(n);
    }
    let idx = 0;
    c.leagues.forEach((ld, ti) => {
      const tier = ti + 1;
      const league: League = { id: ld.id, name: ld.name, country: c.id, tier, clubs: [], rounds: [], table: {}, scorers: {}, promo: c.swap };
      for (let r = 0; r < ld.teams; r++) {
        const name = names[idx++];
        const rep = clamp(Math.round(c.strength * (94 - (tier - 1) * 14 - r * (17 / ld.teams)) + randInt(-2, 2)), 15, 97);
        const club: Club = {
          id: st.clubs.length, name, short: shortName(name), country: c.id, league: ld.id, rep,
          colors: CLUB_COLORS[name] ?? [choice(KIT_COLORS), choice(KIT_COLORS)],
          players: [], balance: Math.round(rep * rep * 18000 * (tier === 1 ? 1 : 0.5)), transferBudget: 0, wageBudget: 0,
          capacity: Math.round((8000 + rep * rep * 9) / 500) * 500,
          fac: { stadium: clamp(Math.round(rep / 20), 1, 5), training: clamp(Math.round(rep / 20), 1, 5), medical: clamp(Math.round(rep / 22), 1, 5), youth: clamp(Math.round(rep / 22), 1, 5), scouting: clamp(Math.round(rep / 24), 1, 5) },
        };
        club.transferBudget = Math.round(club.balance * 0.2);
        st.clubs.push(club);
        league.clubs.push(club.id);
        if (name === "São Paulo") {
          for (const rp of SPFC_SQUAD) club.players.push(refPlayer(st, rp, club.id).id);
        } else if (REAL_SQUADS[name]) {
          buildRealSquad(st, club, REAL_SQUADS[name]);
        } else {
          const mean = 30 + rep * 0.55;
          for (const pos of SQUAD_TEMPLATE) {
            const nat = rand() < (c.id === "ARA" || c.id === "EUA" ? 0.3 : 0.18) ? choice(FOREIGN_NATS) : c.id;
            const p = genPlayer(st, nat, pos, clamp(Math.round(mean + gauss() * 4.5), 30, 92), undefined, club.id);
            club.players.push(p.id);
          }
          if (name === "Corinthians" && !REAL_SQUADS[name]) {
            const g = refPlayer(st, GARRO, club.id);
            g.contract = 1;
            g.listed = true;
            club.players.push(g.id);
          }
        }
        club.wageBudget = Math.round(club.players.reduce((s, id) => s + st.players[id].wage, 0) * 1.25);
      }
      st.leagues[ld.id] = league;
    });
  }

/** Migrates older saves: adds countries that did not exist when the career started. */
export function ensureWorld(st: GameState): boolean {
  let changed = false;
  for (const c of COUNTRIES) {
    if (st.leagues[c.leagues[0].id]) continue;
    addCountry(st, c);
    for (const ld of c.leagues) {
      const l = st.leagues[ld.id];
      l.rounds = roundRobin(l.clubs, l.id);
      l.table = Object.fromEntries(l.clubs.map((id) => [id, emptyRow()]));
    }
    changed = true;
  }
  st.transferLog ??= [];
  if (changed) st.version = Math.max(st.version, 2);
  return changed;
}

export function shortName(n: string) {
  const words = n.split(/[\s-]+/).filter((w) => !["FC", "SC", "EC", "AA", "CD", "UD", "SD", "CF", "AC", "US", "SS", "AS", "VfB", "SV", "TSV", "Club", "Atlético", "de", "da", "do", "Real", "Al"].includes(w));
  const w = (words[0] ?? n).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return w.slice(0, 3).toUpperCase();
}

function roundRobin(ids: number[], comp: string): Fixture[][] {
  const t = shuffle(ids);
  if (t.length % 2) t.push(-1);
  const n = t.length;
  const rounds: Fixture[][] = [];
  const arr = [...t];
  for (let r = 0; r < n - 1; r++) {
    const fx: Fixture[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a < 0 || b < 0) continue;
      fx.push(r % 2 === 0 ? { h: a, a: b, comp } : { h: b, a, comp });
    }
    rounds.push(fx);
    arr.splice(1, 0, arr.pop()!);
  }
  const second = rounds.map((r) => r.map((f) => ({ h: f.a, a: f.h, comp })));
  return [...rounds, ...second];
}

export const emptyRow = (): Row => ({ p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] });

export function sortedTable(l: League): number[] {
  return [...l.clubs].sort((a, b) => {
    const A = l.table[a], B = l.table[b];
    return B.pts - A.pts || B.w - A.w || (B.gf - B.ga) - (A.gf - A.ga) || B.gf - A.gf;
  });
}

export function setupSeason(st: GameState) {
  st.day = 0;
  st.userMatchDone = false;
  for (const l of Object.values(st.leagues)) {
    l.rounds = roundRobin(l.clubs, l.id);
    l.table = Object.fromEntries(l.clubs.map((c) => [c, emptyRow()]));
    l.scorers = {};
  }
  st.cups = {};
  // national cups
  for (const c of COUNTRIES) {
    const ids = c.leagues.flatMap((ld) => st.leagues[ld.id].clubs.map((id) => ({ id, t: st.leagues[ld.id].tier })))
      .sort((a, b) => a.t - b.t || st.clubs[b.id].rep - st.clubs[a.id].rep).map((x) => x.id);
    ids.length = Math.min(32, 2 ** Math.floor(Math.log2(ids.length)));
    const cup: Cup = { id: c.cup.id, name: c.cup.name, kind: "nacional", country: c.id, alive: ids, rounds: [], scorers: {}, entrants: ids };
    st.cups[cup.id] = cup;
  }
  // continental
  const usedByConf: Record<string, Set<number>> = {};
  for (const cd of CONTINENTAL) {
    const used = (usedByConf[cd.conf] ??= new Set());
    const entrants: number[] = [];
    for (const [cid, q] of Object.entries(cd.quotas)) {
      const top = COUNTRY[cid].leagues[0].id;
      const order = st.lastStandings[top]?.filter((id) => st.clubs[id].league === top || true) ?? [...st.leagues[top].clubs].sort((a, b) => st.clubs[b].rep - st.clubs[a].rep);
      let n = 0;
      for (const id of order) {
        if (n >= q) break;
        if (used.has(id)) continue;
        used.add(id); entrants.push(id); n++;
      }
    }
    if (entrants.length < 32) {
      const extra = st.clubs.filter((c) => COUNTRY[c.country]?.conf === cd.conf && st.leagues[c.league].tier === 1 && !used.has(c.id)).sort((a, b) => b.rep - a.rep);
      for (const c of extra) { if (entrants.length >= 32) break; used.add(c.id); entrants.push(c.id); }
    }
    st.cups[cd.id] = makeGroupCup(st, cd.id, cd.name, entrants.slice(0, 32));
  }
  st.cups[WORLD_CUP.id] = { id: WORLD_CUP.id, name: WORLD_CUP.name, kind: "mundial", alive: [], rounds: [], scorers: {}, entrants: [] };
  // schedule
  const days: DayPlan[] = [];
  const natCup = COUNTRIES.map((c) => c.cup.id);
  const cont = CONTINENTAL.map((c) => c.id);
  const natAfter = [3, 9, 15, 21, 27];
  const contAfter = [2, 5, 8, 11, 14, 17, 21, 25, 29, 33];
  const natNames = ["1ª fase", "Oitavas de final", "Quartas de final", "Semifinal", "Final"];
  const contNames = ["Grupos 1ª rodada", "Grupos 2ª rodada", "Grupos 3ª rodada", "Grupos 4ª rodada", "Grupos 5ª rodada", "Grupos 6ª rodada", "Oitavas de final", "Quartas de final", "Semifinal", "Final"];
  for (let r = 0; r < 38; r++) {
    days.push({ kind: "league", leagueRound: r, label: `Rodada ${r + 1}` });
    const ni = natAfter.indexOf(r);
    if (ni >= 0) days.push({ kind: "cup", cups: natCup, cupRound: ni, label: `Copas nacionais · ${natNames[ni]}` });
    const ci = contAfter.indexOf(r);
    if (ci >= 0) days.push({ kind: "cup", cups: cont, cupRound: ci, label: `Continentais · ${contNames[ci]}` });
  }
  ["Quartas", "Semifinal", "Final"].forEach((lab, i) => days.push({ kind: "cup", cups: [WORLD_CUP.id], cupRound: i, label: `Mundial de Clubes · ${lab}` }));
  st.schedule = days;
  st.seasonStats = { wins: 0, draws: 0, losses: 0, cupRounds: {}, titles: [] };
  for (const p of Object.values(st.players)) { p.goals = 0; p.assists = 0; p.apps = 0; p.yel = 0; p.sus = 0; }
  prepareDay(st);
}

// create cup draws for current day
export function prepareDay(st: GameState) {
  const d = st.schedule[st.day];
  if (!d || d.kind !== "cup") return;
  for (const cid of d.cups ?? []) {
    const cup = st.cups[cid];
    if (cup.winner !== undefined || cup.rounds[d.cupRound!]) continue;
    if (cup.kind === "mundial" && d.cupRound === 0) {
      const ent: number[] = [];
      for (const cd of CONTINENTAL) { const w = st.cups[cd.id].winner; if (w !== undefined && !ent.includes(w)) ent.push(w); }
      const others = st.clubs.filter((c) => !ent.includes(c.id) && st.leagues[c.league].tier === 1).sort((a, b) => b.rep - a.rep);
      while (ent.length < 8) ent.push(others.shift()!.id);
      cup.alive = shuffle(ent);
      cup.entrants = [...ent];
    }
    // after the group stage, `alive` is already ordered in knockout pairs
    const alive = cup.groups && d.cupRound === cup.groupRounds ? [...cup.alive] : shuffle(cup.alive);
    const fx: Fixture[] = [];
    for (let i = 0; i + 1 < alive.length; i += 2) fx.push({ h: alive[i], a: alive[i + 1], comp: cid });
    cup.rounds[d.cupRound!] = fx;
  }
}

export function makeObjective(st: GameState, clubId: number): Objective {
  const club = st.clubs[clubId];
  const l = st.leagues[club.league];
  const rank = [...l.clubs].sort((a, b) => st.clubs[b].rep - st.clubs[a].rep).indexOf(clubId) + 1;
  const n = l.clubs.length;
  if (l.tier > 1) {
    if (rank <= l.promo + 2) return { key: "pos", target: l.promo, text: `Conquistar o acesso (terminar no top ${l.promo})` };
    if (rank <= n / 2) return { key: "pos", target: Math.ceil(n / 2), text: `Terminar na primeira metade da tabela` };
    return { key: "pos", target: n - l.promo, text: `Evitar o rebaixamento` };
  }
  if (rank <= 2) return { key: "title", target: 1, text: `Conquistar o título de ${l.name}` };
  const cont = CONTINENTAL.find((c) => c.offset === 0 && c.quotas[club.country]);
  if (cont && rank <= cont.quotas[club.country] + 2) {
    const q = cont.quotas[club.country];
    return { key: "pos", target: q, text: `Classificar para a ${cont.name} (top ${q})` };
  }
  if (rank <= n / 2 + 2) return { key: "pos", target: Math.ceil(n / 2), text: `Terminar na primeira metade da tabela` };
  return { key: "pos", target: n - l.promo, text: `Evitar o rebaixamento` };
}

export function assignUserClub(st: GameState, clubId: number) {
  st.userClub = clubId;
  const lu = autoLineup(st, clubId, st.tactic.formation);
  st.tactic.starters = lu.starters;
  st.tactic.bench = lu.bench.slice(0, 9);
  st.tactic.instr = {};
  st.tactic.sp = {};
  const players = st.clubs[clubId].players.map((id) => st.players[id]).sort((a, b) => ovr(b) - ovr(a));
  st.tactic.sp = { captain: players[0]?.id, pen: players.find((p) => p.pos === "ATA")?.id ?? players[0]?.id, fk: players.find((p) => p.pos === "MEI")?.id, corner: players.find((p) => p.pos === "MEI" || p.pos === "PON")?.id };
  st.board.objective = makeObjective(st, clubId);
  st.board.confidence = 60;
  st.cohesion = 55;
  st.sponsors = [];
  st.sponsorOffers = genSponsorOffers(st);
  st.unemployed = false;
}

export function startCareer(st: GameState, clubId: number, coachName: string, spfcPreset = false) {
  st.coach.name = coachName || "Treinador";
  st.coach.rep = clamp(st.clubs[clubId].rep - 10, 30, 80);
  st.coach.wage = Math.round(st.clubs[clubId].rep * 6000);
  assignUserClub(st, clubId);
  const club = st.clubs[clubId];
  if (spfcPreset) {
    club.transferBudget = 12_000_000;
    club.wageBudget = 18_000_000;
    club.balance = 40_000_000;
    st.board.objective = { key: "pos", target: 8, text: "Classificar para a Libertadores (top 8 da Série A)" };
  }
  st.ledger = [{ season: st.season, month: 0, inc: {}, exp: {} }];
  const pushMsg = (title: string, body: string, kind: GameState["messages"][number]["kind"], action?: GameState["messages"][number]["action"]) =>
    st.messages.unshift({ id: st.nextMsgId++, season: st.season, day: 0, title, body, kind, action });
  pushMsg(`Bem-vindo ao ${club.name}!`, `A diretoria apresenta ${st.coach.name} como novo treinador. Objetivo da temporada: ${st.board.objective.text}. Orçamento de transferências: R$ ${(club.transferBudget / 1e6).toFixed(1).replace(".", ",")} mi.`, "diretoria");
  pushMsg("Patrocinadores interessados", "Empresas enviaram propostas de patrocínio. Confira na área de Patrocínios.", "patrocinio");
  const garro = Object.values(st.players).find((p) => p.name === "Rodrigo Garro");
  if (garro && garro.club !== clubId) {
    pushMsg("Mercado: Rodrigo Garro disponível para empréstimo", "O Corinthians aceita ouvir propostas de empréstimo por uma temporada pelo meia Rodrigo Garro, com opção de compra. Toque para abrir a negociação.", "proposta", { type: "openPlayer", playerId: garro.id });
  }
}

const GROUP_RR = [[0, 1, 2, 3], [2, 0, 3, 1], [0, 3, 1, 2]];
/** Builds a 32-club cup with 8 seeded groups of 4 (6 matchdays, top 2 advance to a 16-club knockout). */
export function makeGroupCup(st: GameState, id: string, name: string, entrants: number[]): Cup {
  const seeded = [...entrants].sort((a, b) => st.clubs[b].rep - st.clubs[a].rep);
  const nG = Math.floor(seeded.length / 4);
  const groups: number[][] = Array.from({ length: nG }, () => []);
  for (let pot = 0; pot < 4; pot++) shuffle(seeded.slice(pot * nG, pot * nG + nG)).forEach((c, g) => groups[g].push(c));
  const rounds: Fixture[][] = Array.from({ length: 6 }, () => []);
  groups.forEach((g, gi) => GROUP_RR.forEach(([a, b, c, d], r) => {
    rounds[r].push({ h: g[a], a: g[b], comp: id, grp: gi }, { h: g[c], a: g[d], comp: id, grp: gi });
    rounds[r + 3].push({ h: g[b], a: g[a], comp: id, grp: gi }, { h: g[d], a: g[c], comp: id, grp: gi });
  }));
  const all = groups.flat();
  return { id, name, kind: "continental", alive: all, rounds, scorers: {}, entrants: all, groups, groupRounds: 6, gtable: Object.fromEntries(all.map((c) => [c, emptyRow()])) };
}

export function sortGroup(cup: Cup, g: number[]): number[] {
  const t = cup.gtable ?? {};
  return [...g].sort((a, b) => {
    const A = t[a] ?? emptyRow(), B = t[b] ?? emptyRow();
    return B.pts - A.pts || (B.gf - B.ga) - (A.gf - A.ga) || B.gf - A.gf;
  });
}
