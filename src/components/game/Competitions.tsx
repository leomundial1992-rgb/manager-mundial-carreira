import { useState } from "react";
import type { GameState } from "@/game/types";
import { COUNTRIES, COUNTRY } from "@/game/data";
import { compName, cupRoundName, dayFixtures } from "@/game/engine";
import { sortedTable } from "@/game/world";
import { Crest, Section, Tabs } from "./ui";
import { cn } from "@/lib/utils";

export function CompetitionsScreen({ st }: { st: GameState }) {
  const me = st.clubs[st.userClub!];
  const [comp, setComp] = useState(me.league);
  const [view, setView] = useState<"tabela" | "rodadas" | "artilharia" | "calendario">("tabela");
  const [country, setCountry] = useState(me.country);
  const league = st.leagues[comp];
  const cup = st.cups[comp];
  const myComps = [me.league, ...Object.values(st.cups).filter((c) => c.entrants.includes(me.id)).map((c) => c.id)];
  const scorers = Object.entries(league?.scorers ?? cup?.scorers ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 20);
  const curRound = st.schedule[st.day]?.leagueRound ?? st.schedule.slice(0, st.day).filter((d) => d.kind === "league").length;
  const [round, setRound] = useState(Math.min(curRound ?? 0, 37));

  return (
    <div>
      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {myComps.map((c) => <button key={c} onClick={() => setComp(c)} className={cn("mm-chip shrink-0", comp === c ? "border-primary bg-primary text-primary-foreground" : "bg-secondary")}>{compName(st, c)}</button>)}
      </div>
      <details className="mb-3">
        <summary className="cursor-pointer text-sm text-primary">Outras competições e países</summary>
        <div className="mt-2 flex flex-wrap gap-1">{COUNTRIES.map((c) => <button key={c.id} onClick={() => setCountry(c.id)} className={cn("mm-chip", country === c.id && "border-primary")}>{c.flag}</button>)}</div>
        <div className="mt-2 flex flex-wrap gap-1">
          {COUNTRY[country].leagues.map((l) => <button key={l.id} onClick={() => setComp(l.id)} className="mm-chip bg-secondary">{l.name}</button>)}
          <button onClick={() => setComp(COUNTRY[country].cup.id)} className="mm-chip bg-secondary">{COUNTRY[country].cup.name}</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">{Object.values(st.cups).filter((c) => c.kind !== "nacional").map((c) => <button key={c.id} onClick={() => setComp(c.id)} className="mm-chip bg-secondary">{c.name}</button>)}</div>
      </details>
      <Tabs value={view} onChange={setView} items={[{ id: "tabela", label: league ? "Classificação" : "Chaveamento" }, ...(league ? [{ id: "rodadas" as const, label: "Rodadas" }] : []), { id: "artilharia", label: "Artilharia" }, { id: "calendario", label: "Meu calendário" }]} />

      {view === "tabela" && league && (
        <div className="mm-card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="p-2 text-left">#</th><th className="text-left">Clube</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th className="pr-2">P</th></tr></thead>
            <tbody>
              {sortedTable(league).map((id, i) => {
                const r = league.table[id];
                const n = league.clubs.length;
                const zone = league.tier > 1 && i < league.promo ? "border-l-success" : i >= n - league.promo && league.tier < COUNTRY[league.country].leagues.length ? "border-l-destructive" : league.tier === 1 && i < 4 ? "border-l-primary" : "border-l-transparent";
                return (
                  <tr key={id} className={cn("border-t border-l-4", zone, id === me.id && "bg-accent")}>
                    <td className="p-2">{i + 1}</td>
                    <td><div className="flex items-center gap-2 py-1"><Crest club={st.clubs[id]} size={22} /><span className="max-w-[9rem] truncate">{st.clubs[id].name}</span></div></td>
                    <td className="text-center">{r.p}</td><td className="text-center">{r.w}</td><td className="text-center">{r.d}</td><td className="text-center">{r.l}</td><td className="text-center">{r.gf - r.ga}</td><td className="pr-2 text-center font-bold">{r.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="p-2 text-xs text-muted-foreground">Verde: acesso · Vermelho: rebaixamento · {league.promo} sobem e {league.promo} caem.</p>
        </div>
      )}
      {view === "tabela" && cup && (
        <div>
          {cup.winner !== undefined && <div className="mm-card mb-3 text-center">🏆 Campeão: <b>{st.clubs[cup.winner].name}</b></div>}
          {cup.rounds.map((r, i) => (
            <Section key={i} title={cupRoundName(cup, i)}>
              <div className="mm-card">{r.map((f, j) => <FixtureRow key={j} st={st} f={f} />)}</div>
            </Section>
          ))}
          {!cup.rounds.length && <p className="mm-card text-sm text-muted-foreground">{cup.entrants.length ? `${cup.entrants.length} clubes classificados. O sorteio acontece na data da primeira fase.` : "Os participantes são definidos ao fim das competições continentais."}</p>}
        </div>
      )}
      {view === "rodadas" && league && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <button className="mm-btn-ghost" onClick={() => setRound(Math.max(0, round - 1))}>‹</button>
            <b>Rodada {round + 1} / {league.rounds.length}</b>
            <button className="mm-btn-ghost" onClick={() => setRound(Math.min(league.rounds.length - 1, round + 1))}>›</button>
          </div>
          <div className="mm-card">{(league.rounds[round] ?? []).map((f, j) => <FixtureRow key={j} st={st} f={f} />)}</div>
        </div>
      )}
      {view === "artilharia" && (
        <div className="mm-card">
          {scorers.map(([id, g], i) => { const p = st.players[+id]; return p ? <div key={id} className="flex justify-between border-b py-2 text-sm last:border-b-0"><span>{i + 1}. {p.name} <span className="text-muted-foreground">({p.club !== null ? st.clubs[p.club].short : "—"})</span></span><b>{g}</b></div> : null; })}
          {!scorers.length && <p className="text-sm text-muted-foreground">Nenhum gol marcado ainda.</p>}
        </div>
      )}
      {view === "calendario" && (
        <div className="mm-card">
          {st.schedule.map((d, i) => {
            const f = dayFixtures(st, i).find((x) => x.h === me.id || x.a === me.id);
            return (
              <div key={i} className={cn("flex items-center justify-between border-b py-2 text-sm last:border-b-0", i === st.day && "text-primary")}>
                <span className="w-28 shrink-0 text-xs text-muted-foreground">Sem. {i + 1} · {d.label}</span>
                {f ? <span className="flex-1 truncate text-right">{st.clubs[f.h].short} {f.played ? `${f.hg} x ${f.ag}` : "x"} {st.clubs[f.a].short}</span> : <span className="flex-1 text-right text-muted-foreground">{d.kind === "cup" ? "Sem jogo / a definir" : "—"}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FixtureRow({ st, f }: { st: GameState; f: { h: number; a: number; hg?: number; ag?: number; played?: boolean; pen?: [number, number] } }) {
  const me = st.userClub;
  return (
    <div className={cn("flex items-center gap-2 border-b py-2 text-sm last:border-b-0", (f.h === me || f.a === me) && "font-bold text-primary")}>
      <span className="flex flex-1 items-center justify-end gap-1 truncate text-right">{st.clubs[f.h].name}<Crest club={st.clubs[f.h]} size={20} /></span>
      <span className="w-16 text-center font-display text-base">{f.played ? `${f.hg} - ${f.ag}` : "vs"}{f.pen && <span className="block text-[10px]">pên {f.pen[0]}-{f.pen[1]}</span>}</span>
      <span className="flex flex-1 items-center gap-1 truncate"><Crest club={st.clubs[f.a]} size={20} />{st.clubs[f.a].name}</span>
    </div>
  );
}
