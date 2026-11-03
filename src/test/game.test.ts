import { describe, expect, it } from "vitest";
import { createWorld, startCareer } from "@/game/world";
import { finishSigning } from "@/game/market";

function spfc() {
  const st = createWorld("realista");
  const club = st.clubs.find((c) => c.name === "São Paulo")!;
  startCareer(st, club.id, "Teste", true);
  return { st, club };
}

describe("Carreira São Paulo FC", () => {
  it("começa com orçamento de R$ 12 mi, folha de R$ 18 mi e meta de Libertadores no realista", () => {
    const { st, club } = spfc();
    expect(club.transferBudget).toBe(12_000_000);
    expect(club.wageBudget).toBe(18_000_000);
    expect(st.difficulty).toBe("realista");
    expect(st.board.objective.text).toContain("Libertadores");
  });

  it("tem 12 países com competições e o elenco de referência", () => {
    const { st, club } = spfc();
    expect(new Set(Object.values(st.leagues).map((l) => l.country)).size).toBe(12);
    const names = club.players.map((id) => st.players[id].name);
    for (const n of ["Rafael", "Calleri", "Lucas Moura", "Arboleda", "Ryan Francisco"]) expect(names).toContain(n);
  });

  it("não conclui contratação acima do orçamento", () => {
    const { st, club } = spfc();
    const target = Object.values(st.players).find((p) => p.club !== null && p.club !== club.id)!;
    st.pending = { playerId: target.id, kind: "compra", fee: 13_000_000, clubAgreed: true };
    const r = finishSigning(st, { wage: 10000, years: 2, luvas: 0, goalBonus: 0 });
    expect(r.ok).toBe(false);
    expect(club.players).not.toContain(target.id);
    expect(club.transferBudget).toBe(12_000_000);
  });
});
