import { KIT_SUPPLIERS, SPONSOR_COMPANIES, SPONSOR_SLOTS, CONTINENTAL } from "./data";
import type { GameState, Sponsor } from "./types";
import { choice, rand, randInt, shuffle } from "./util";

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#06b6d4", "#e11d48", "#14b8a6", "#64748b"];

function goalFor(st: GameState): Sponsor["goal"] {
  const club = st.clubs[st.userClub!];
  const l = st.leagues[club.league];
  const n = l.clubs.length;
  const obj = st.board.objective;
  const r = rand();
  if (r < 0.3) {
    const t = obj.key === "title" ? 3 : Math.max(1, Math.min(n, obj.target + randInt(-1, 2)));
    return { type: "pos", target: t, text: `Terminar entre os ${t} primeiros de ${l.name}` };
  }
  if (r < 0.5) {
    const t = Math.round(n * 0.9 * (club.rep / 100)) + randInt(2, 6);
    return { type: "wins", target: t, text: `Vencer pelo menos ${t} partidas na temporada` };
  }
  if (r < 0.7) {
    const t = randInt(1, 3);
    const names = ["1ª fase", "oitavas de final", "quartas de final", "semifinal", "final"];
    return { type: "cup", target: t, text: `Chegar às ${names[t]} da copa nacional` };
  }
  if (r < 0.85 && l.tier === 1 && CONTINENTAL.some((c) => c.quotas[club.country])) {
    return { type: "continental", target: 1, text: "Classificar para torneio continental" };
  }
  return { type: "title", target: 1, text: "Conquistar ao menos um título" };
}

export function genSponsorOffers(st: GameState, onlySlot?: string): Sponsor[] {
  const club = st.clubs[st.userClub!];
  const tier = st.leagues[club.league].tier;
  const tierF = [1, 0.35, 0.12, 0.05][tier - 1] ?? 0.05;
  const out: Sponsor[] = [];
  for (const slot of SPONSOR_SLOTS) {
    if (onlySlot && slot.id !== onlySlot) continue;
    if (st.sponsors.some((s) => s.slot === slot.id)) continue;
    const companies = shuffle(slot.id === "material" ? KIT_SUPPLIERS : SPONSOR_COMPANIES).slice(0, 3);
    for (const company of companies) {
      const base = club.rep * club.rep * 9000 * slot.mult * tierF * (0.8 + rand() * 0.45) * (0.8 + st.board.fans / 250);
      const goal = goalFor(st);
      out.push({
        id: st.nextSponsorId++, company, slot: slot.id, value: Math.round(base / 10000) * 10000, years: randInt(1, 3),
        payment: rand() < 0.6 ? "mensal" : "anual", bonus: Math.round((base * (0.15 + rand() * 0.35)) / 10000) * 10000,
        goal, penalty: Math.round((base * (rand() < 0.5 ? 0 : 0.05 + rand() * 0.15)) / 10000) * 10000, color: choice(COLORS),
      });
    }
  }
  return out;
}

export type NegResult = "melhorou" | "recusou" | "desistiu";
export function negotiateSponsor(st: GameState, id: number): NegResult {
  const o = st.sponsorOffers.find((s) => s.id === id);
  if (!o) return "recusou";
  const r = rand();
  const hard = st.difficulty === "realista" ? 0.12 : st.difficulty === "dificil" ? 0.06 : 0;
  if (r < 0.5 - hard) {
    o.value = Math.round((o.value * 1.08) / 10000) * 10000;
    o.bonus = Math.round((o.bonus * 1.05) / 10000) * 10000;
    return "melhorou";
  }
  if (r < 0.8 - hard / 2) return "recusou";
  st.sponsorOffers = st.sponsorOffers.filter((s) => s.id !== id);
  return "desistiu";
}
