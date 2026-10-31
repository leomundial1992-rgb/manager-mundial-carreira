import { FastForward, Play } from "lucide-react";
import type { GameState } from "@/game/types";
import { mutate } from "@/game/store";
import { compName, finishDay, nextUserFixtures, userFixture } from "@/game/engine";
import { sortedTable } from "@/game/world";
import { Bar, Crest, Section, Stat } from "./ui";
import { goTab, notify } from "@/routes/jogo";
import { money } from "@/game/util";
import { userWages } from "@/game/engine";

export function HomeScreen({ st, onMatch }: { st: GameState; onMatch: () => void }) {
  const me = st.clubs[st.userClub!];
  const f = userFixture(st);
  const league = st.leagues[me.league];
  const table = sortedTable(league);
  const pos = table.indexOf(me.id) + 1;
  const upcoming = nextUserFixtures(st, 5);
  const day = st.schedule[st.day];

  const advance = () => {
    mutate((s) => finishDay(s));
    notify("Semana concluída. Resultados atualizados.");
  };

  return (
    <div>
      <div className="mm-card mm-hero mb-4 p-4">
        <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">{day?.label}</div>
        {f ? (
          <>
            <div className="mb-3 text-sm text-primary">{compName(st, f.comp)}</div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-1 flex-col items-center text-center"><Crest club={st.clubs[f.h]} size={56} /><span className="mt-1 font-bold">{st.clubs[f.h].name}</span></div>
              <span className="font-display text-3xl font-bold text-muted-foreground">VS</span>
              <div className="flex flex-1 flex-col items-center text-center"><Crest club={st.clubs[f.a]} size={56} /><span className="mt-1 font-bold">{st.clubs[f.a].name}</span></div>
            </div>
            <button onClick={onMatch} className="mm-btn-primary mt-4 min-h-14 w-full text-lg"><Play className="h-5 w-5" /> Ir para a partida</button>
          </>
        ) : (
          <>
            <p className="mb-3 text-muted-foreground">Seu time não joga nesta rodada. Os outros jogos serão simulados e o treino da semana será aplicado.</p>
            <button onClick={advance} className="mm-btn-primary min-h-14 w-full text-lg"><FastForward className="h-5 w-5" /> Avançar semana</button>
          </>
        )}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="Posição" value={`${pos}º`} sub={league.name} />
        <Stat label="Campanha" value={`${st.seasonStats.wins}-${st.seasonStats.draws}-${st.seasonStats.losses}`} sub="V-E-D" />
        <Stat label="Orçamento" value={money(me.transferBudget)} sub="transferências" />
      </div>

      <Section title="Diretoria e torcida">
        <div className="mm-card space-y-3">
          <p className="text-sm"><span className="text-muted-foreground">Objetivo:</span> <b>{st.board.objective.text}</b></p>
          <div><div className="mb-1 flex justify-between text-sm"><span>Confiança da diretoria</span><b>{st.board.confidence}%</b></div><Bar value={st.board.confidence} tone={st.board.confidence < 30 ? "destructive" : st.board.confidence < 50 ? "warning" : "primary"} /></div>
          <div><div className="mb-1 flex justify-between text-sm"><span>Humor da torcida</span><b>{st.board.fans}%</b></div><Bar value={st.board.fans} tone="gold" /></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Folha salarial</span><b>{money(userWages(st))} / {money(me.wageBudget)} por mês</b></div>
        </div>
      </Section>

      <Section title="Próximos jogos" right={<button className="text-sm text-primary" onClick={() => goTab("comps")}>Ver tudo</button>}>
        <div className="mm-card">
          {upcoming.map(({ day: d, f: x }) => {
            const home = x.h === me.id;
            const opp = st.clubs[home ? x.a : x.h];
            return (
              <div key={d} className="flex items-center gap-3 border-b py-2 last:border-b-0">
                <Crest club={opp} size={28} />
                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{home ? "vs" : "@"} {opp.name}</div><div className="text-xs text-muted-foreground">{st.schedule[d].label} · {compName(st, x.comp)}</div></div>
                {x.played && <b>{x.hg} x {x.ag}</b>}
              </div>
            );
          })}
          {!upcoming.length && <p className="text-sm text-muted-foreground">Sem jogos restantes na temporada.</p>}
        </div>
      </Section>

      <Section title="Últimos resultados">
        <div className="mm-card">
          {st.lastResults.slice(0, 5).map((r, i) => {
            const won = (r.h === me.id ? r.hg > r.ag : r.ag > r.hg);
            const lost = (r.h === me.id ? r.hg < r.ag : r.ag < r.hg);
            return (
              <div key={i} className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
                <span className={won ? "font-bold text-success" : lost ? "font-bold text-destructive" : "font-bold text-warning"}>{won ? "V" : lost ? "D" : "E"}</span>
                <span className="flex-1 truncate px-2">{st.clubs[r.h].short} {r.hg} x {r.ag} {st.clubs[r.a].short}</span>
                <span className="text-xs text-muted-foreground">{compName(st, r.comp)}</span>
              </div>
            );
          })}
          {!st.lastResults.length && <p className="text-sm text-muted-foreground">Nenhum jogo disputado ainda.</p>}
        </div>
      </Section>

      <Section title="Notícias" right={<button className="text-sm text-primary" onClick={() => goTab("news")}>Abrir</button>}>
        <div className="mm-card">
          {st.messages.slice(0, 3).map((m) => (
            <button key={m.id} onClick={() => goTab("news")} className="block w-full border-b py-2 text-left last:border-b-0">
              <div className="font-semibold">{m.title}</div>
              <div className="line-clamp-1 text-xs text-muted-foreground">{m.body}</div>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
