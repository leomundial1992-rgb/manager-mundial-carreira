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

  it("tem 24 países com competições e o elenco de referência", () => {
    const { st, club } = spfc();
    expect(new Set(Object.values(st.leagues).map((l) => l.country)).size).toBe(24);
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

describe("Competições continentais", () => {
  it("Champions e Libertadores têm 32 clubes em 8 grupos de 4", () => {
    const { st } = spfc();
    for (const id of ["UCL", "UEL", "UECL", "LIB", "SUL"]) {
      expect(st.cups[id].entrants.length).toBe(32);
      expect(st.cups[id].groups!.length).toBe(8);
      expect(st.cups[id].rounds.slice(0, 6).every((r) => r.length === 16)).toBe(true);
    }
  });
});

describe("Doação", () => {
  it("não doa mais que o saldo bancário", async () => {
    const { donate } = await import("@/game/market");
    const { st, club } = spfc();
    const other = st.clubs.find((c) => c.name === "Santos")!;
    const before = other.balance;
    expect(donate(st, other.id, club.balance + 1).ok).toBe(false);
    expect(donate(st, other.id, 1_000_000).ok).toBe(true);
    expect(other.balance).toBe(before + 1_000_000);
  });
});
