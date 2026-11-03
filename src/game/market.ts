import type { GameState, Player, Pos } from "./types";
import { clamp, ovr, playerValue, rand, wageDemand } from "./util";
import { add, msg, userWages } from "./engine";

export interface Filters { pos?: Pos | ""; minAge?: number; maxAge?: number; nat?: string; maxValue?: number; minPot?: number; minOvr?: number; attr?: number; attrMin?: number; free?: boolean; name?: string }

// scouted potential (less accurate with weak scouting)
export function scoutPot(st: GameState, p: Player): number {
  const lvl = st.userClub !== null ? st.clubs[st.userClub].fac.scouting : 1;
  if (p.club === st.userClub) return p.pot;
  const err = ((p.id * 7919) % 11) - 5;
  return clamp(Math.round(p.pot + err * (5 - lvl) * 0.5), 30, 99);
}

export function search(st: GameState, f: Filters): Player[] {
  const out: Player[] = [];
  const pool = f.free ? st.freeAgents.map((id) => st.players[id]) : Object.values(st.players);
  const q = f.name?.trim().toLowerCase();
  for (const p of pool) {
    if (!p || p.club === st.userClub) continue;
    if (q && !p.name.toLowerCase().includes(q)) continue;
    if (f.pos && p.pos !== f.pos) continue;
    if (f.minAge && p.age < f.minAge) continue;
    if (f.maxAge && p.age > f.maxAge) continue;
    if (f.nat && p.nat !== f.nat) continue;
    if (f.maxValue && playerValue(p) > f.maxValue) continue;
    if (f.minPot && scoutPot(st, p) < f.minPot) continue;
    if (f.minOvr && ovr(p) < f.minOvr) continue;
    if (f.attr !== undefined && f.attrMin && p.attr[f.attr] < f.attrMin) continue;
    out.push(p);
  }
  return out.sort((a, b) => ovr(b) - ovr(a)).slice(0, 80);
}

const K = { facil: 0.85, normal: 1, dificil: 1.1, realista: 1.2 };

function importance(st: GameState, p: Player) {
  if (p.club === null) return 99;
  const sorted = st.clubs[p.club].players.map((id) => st.players[id]).sort((a, b) => ovr(b) - ovr(a));
  return sorted.findIndex((x) => x.id === p.id) + 1;
}

export interface ClubReply { ok: boolean; counter?: number; counterOption?: number; text: string }

export function askingPrice(st: GameState, p: Player) {
  const imp = importance(st, p);
  let k = K[st.difficulty] * (imp <= 3 ? 1.45 : imp <= 8 ? 1.15 : 1);
  if (p.listed) k *= 0.85;
  return Math.round((playerValue(p) * k) / 10000) * 10000;
}

export function clubResponse(st: GameState, p: Player, kind: "compra" | "emprestimo", fee: number, option?: number, wagePct = 100): ClubReply {
  if (p.club === null) return { ok: true, text: "Jogador livre: negocie direto com ele." };
  const club = st.clubs[p.club];
  if (club.players.length <= 17) return { ok: false, text: `${club.name} não pode liberar mais jogadores agora (elenco curto).` };
  const ask = askingPrice(st, p);
  if (kind === "compra") {
    if (fee >= ask) return { ok: true, text: `${club.name} aceitou a proposta de R$ ${(fee / 1e6).toFixed(2)} mi.` };
    if (fee >= ask * 0.72) return { ok: false, counter: ask, text: `${club.name} fez uma contraproposta: R$ ${(ask / 1e6).toFixed(2)} mi.` };
    return { ok: false, text: `${club.name} recusou. Valor muito abaixo do esperado.` };
  }
  // loan
  const imp = importance(st, p);
  const minFee = Math.round(playerValue(p) * (p.listed ? 0.1 : imp <= 3 ? 0.35 : 0.15) * K[st.difficulty] / 10000) * 10000;
  const minOpt = Math.round(playerValue(p) * (p.listed ? 0.95 : 1.05) * K[st.difficulty] / 10000) * 10000;
  if (wagePct < 60) return { ok: false, text: `${club.name} exige que você pague pelo menos 60% do salário.` };
  if (option !== undefined && option > 0 && option < minOpt) return { ok: false, counterOption: minOpt, text: `${club.name} quer opção de compra de no mínimo R$ ${(minOpt / 1e6).toFixed(1)} mi.` };
  if (fee >= minFee) return { ok: true, text: `${club.name} aceita o empréstimo por uma temporada.` };
  return { ok: false, counter: minFee, text: `${club.name} pede taxa de empréstimo de R$ ${(minFee / 1e6).toFixed(2)} mi.` };
}

export interface ContractOffer { wage: number; years: number; luvas: number; goalBonus: number }
export function playerDemands(st: GameState, p: Player) {
  const rep = st.userClub !== null ? st.clubs[st.userClub].rep : 50;
  const wage = Math.max(wageDemand(p, rep), p.club === st.userClub ? Math.round(p.wage * 1.05) : 0);
  return { wage, luvas: p.club === null ? wage * 4 : wage * 1.5, years: p.age >= 31 ? 1 : p.age <= 23 ? 4 : 3 };
}

export function evaluateContract(st: GameState, p: Player, o: ContractOffer, attempt: number): { ok: boolean; text: string } {
  const d = playerDemands(st, p);
  const rep = st.userClub !== null ? st.clubs[st.userClub].rep : 50;
  let score = (o.wage / d.wage) * 0.75 + Math.min(1.5, o.luvas / Math.max(1, d.luvas)) * 0.15 + Math.min(0.08, o.goalBonus / Math.max(1, d.wage) * 0.4);
  score += o.years === d.years ? 0.06 : Math.abs(o.years - d.years) === 1 ? 0.02 : -0.04;
  score += (rep - ovr(p)) / 200;
  const need = { facil: 0.9, normal: 0.97, dificil: 1.02, realista: 1.05 }[st.difficulty] + attempt * 0.015;
  if (score >= need) return { ok: true, text: `${p.name} aceita os termos!` };
  if (score >= need - 0.15) return { ok: false, text: `${p.name} quer mais. Pede salário perto de R$ ${(d.wage / 1e3).toFixed(0)} mil/mês e luvas maiores.` };
  return { ok: false, text: `${p.name} considera a proposta muito baixa.` };
}

export function finishSigning(st: GameState, o: ContractOffer): { ok: boolean; text: string } {
  const pend = st.pending;
  if (!pend || st.userClub === null) return { ok: false, text: "Nenhuma negociação ativa." };
  const p = st.players[pend.playerId];
  const me = st.clubs[st.userClub];
  const wageCost = pend.kind === "emprestimo" ? Math.round(o.wage * (pend.wagePct ?? 100) / 100) : o.wage;
  const cost = pend.fee + o.luvas;
  if (cost > me.transferBudget) return { ok: false, text: `Orçamento de transferências insuficiente (disponível R$ ${(me.transferBudget / 1e6).toFixed(2)} mi).` };
  if (userWages(st) + wageCost > me.wageBudget) return { ok: false, text: `A folha salarial passaria do limite de R$ ${(me.wageBudget / 1e6).toFixed(1)} mi/mês.` };
  const from = p.club;
  if (from !== null) {
    st.clubs[from].players = st.clubs[from].players.filter((x) => x !== p.id);
    st.clubs[from].balance += pend.fee;
  } else st.freeAgents = st.freeAgents.filter((x) => x !== p.id);
  me.transferBudget -= cost;
  add(st, "exp", "Contratações", pend.fee);
  add(st, "exp", "Bônus e luvas", o.luvas);
  me.players.push(p.id);
  p.club = me.id;
  p.wage = o.wage;
  p.goalBonus = o.goalBonus;
  p.listed = false;
  p.mor = 80;
  if (pend.kind === "emprestimo") {
    p.loanFrom = from; p.loanOption = pend.optionPrice; p.loanWagePct = pend.wagePct ?? 100;
  } else { p.contract = o.years; p.loanFrom = null; }
  if (!st.tactic.bench.includes(p.id) && st.tactic.bench.length < 9) st.tactic.bench.push(p.id);
  st.board.fans = clamp(st.board.fans + Math.max(0, (ovr(p) - me.rep) / 3 + 1), 0, 100);
  st.cohesion = clamp(st.cohesion - 1.5, 0, 100);
  msg(st, `Contratado: ${p.name}`, `${p.name} ${pend.kind === "emprestimo" ? "chega por empréstimo" : "assina contrato"}${from !== null ? ` vindo do ${st.clubs[from].name}` : ""}. Custo: R$ ${(cost / 1e6).toFixed(2)} mi. Salário R$ ${(o.wage / 1e3).toFixed(0)} mil/mês.`, "noticia");
  st.pending = null;
  return { ok: true, text: "Contratação concluída!" };
}

export function exerciseOption(st: GameState, pid: number): { ok: boolean; text: string } {
  const p = st.players[pid];
  const me = st.clubs[st.userClub!];
  if (p.loanFrom == null || !p.loanOption) return { ok: false, text: "Sem opção de compra." };
  if (p.loanOption > me.transferBudget) return { ok: false, text: "Orçamento insuficiente para exercer a opção." };
  me.transferBudget -= p.loanOption;
  st.clubs[p.loanFrom].balance += p.loanOption;
  add(st, "exp", "Contratações", p.loanOption);
  msg(st, `Opção exercida: ${p.name}`, `${p.name} foi comprado em definitivo por R$ ${(p.loanOption / 1e6).toFixed(1)} mi.`, "noticia");
  p.loanFrom = null; p.loanOption = undefined; p.loanWagePct = undefined; p.contract = 3;
  return { ok: true, text: "Compra definitiva realizada." };
}

export function removeFromTactic(st: GameState, pid: number) {
  st.tactic.starters = st.tactic.starters.map((x) => (x === pid ? null : x));
  st.tactic.bench = st.tactic.bench.filter((x) => x !== pid);
  for (const k of ["captain", "pen", "fk", "corner"] as const) if (st.tactic.sp[k] === pid) st.tactic.sp[k] = undefined;
}

export function sellTo(st: GameState, pid: number, clubId: number, fee: number, loan = false) {
  const p = st.players[pid];
  const me = st.clubs[st.userClub!];
  const buyer = st.clubs[clubId];
  me.players = me.players.filter((x) => x !== pid);
  removeFromTactic(st, pid);
  buyer.players.push(pid);
  buyer.balance -= fee;
  add(st, "inc", "Venda de jogadores", fee);
  if (loan) { p.loanFrom = me.id; p.loanWagePct = 100; }
  else { me.transferBudget += Math.round(fee * 0.6); p.contract = Math.max(p.contract, 3); }
  p.club = clubId; p.listed = false;
  const star = ovr(p) >= me.rep;
  if (!loan) st.board.fans = clamp(st.board.fans - (star ? 6 : 1), 0, 100);
  msg(st, loan ? `${p.name} emprestado` : `Vendido: ${p.name}`, `${p.name} ${loan ? "foi emprestado" : "foi vendido"} ao ${buyer.name} por R$ ${(fee / 1e6).toFixed(2)} mi.${!loan && star ? " A torcida não gostou da saída." : ""}`, "noticia");
}

export function loanTargets(st: GameState, pid: number) {
  const p = st.players[pid];
  return st.clubs.filter((c) => c.id !== st.userClub && c.rep < ovr(p) + 5 && c.rep > ovr(p) - 25 && c.players.length < 28).slice(0, 200).sort(() => rand() - 0.5).slice(0, 6);
}

export function renew(st: GameState, pid: number, o: ContractOffer, attempt: number) {
  const p = st.players[pid];
  const r = evaluateContract(st, p, o, attempt);
  if (!r.ok) return r;
  const me = st.clubs[st.userClub!];
  if (userWages(st) - p.wage + o.wage > me.wageBudget) return { ok: false, text: "A renovação ultrapassa o limite da folha salarial." };
  if (o.luvas > me.transferBudget) return { ok: false, text: "Orçamento insuficiente para pagar as luvas." };
  me.transferBudget -= o.luvas;
  add(st, "exp", "Bônus e luvas", o.luvas);
  p.wage = o.wage; p.contract = o.years; p.goalBonus = o.goalBonus; p.mor = clamp(p.mor + 10, 0, 100);
  msg(st, `Renovação: ${p.name}`, `${p.name} renovou por ${o.years} temporada(s).`, "contrato");
  return { ok: true, text: "Contrato renovado!" };
}

export function release(st: GameState, pid: number) {
  const p = st.players[pid];
  const me = st.clubs[st.userClub!];
  const cost = Math.round(p.wage * 12 * p.contract * 0.5);
  me.players = me.players.filter((x) => x !== pid);
  removeFromTactic(st, pid);
  add(st, "exp", "Rescisões", cost);
  p.club = null; p.contract = 0;
  st.freeAgents.push(pid);
  msg(st, `Rescisão: ${p.name}`, `Contrato rescindido. Multa paga: R$ ${(cost / 1e6).toFixed(2)} mi.`, "contrato");
}
