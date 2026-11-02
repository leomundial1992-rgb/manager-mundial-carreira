import { useEffect, useRef, useState } from "react";
import { Pause, Play, FastForward, ArrowLeftRight, Settings2 } from "lucide-react";
import type { Pos } from "@/game/types";
import { getGame, mutate } from "@/game/store";
import { applyResult, compName, createMatch, finishDay, quickSim, userFixture } from "@/game/engine";
import { fixLineup, lineupIssues, type MatchSim } from "@/game/match";
import { FORMATIONS, INSTRUCTIONS, PRESSING, STYLES } from "@/game/formations";
import { slotRating } from "@/game/util";
import { goTab, notify } from "@/game/events";
import { Crest, Sheet } from "./ui";
import { cn } from "@/lib/utils";

export function MatchCenter({ onClose }: { onClose: () => void }) {
  const st = getGame()!;
  const f = userFixture(st);
  const [phase, setPhase] = useState<"pre" | "live" | "post">("pre");
  const [assist, setAssist] = useState(false);
  const simRef = useRef<MatchSim | null>(null);
  const [, force] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [panel, setPanel] = useState<"none" | "sub" | "tatica">("none");
  const [tab, setTab] = useState<"lances" | "stats" | "times">("lances");
  const [subOut, setSubOut] = useState<number | null>(null);
  const [subIn, setSubIn] = useState<number | null>(null);
  const tick = () => force((x) => x + 1);

  useEffect(() => {
    if (!running || phase !== "live") return;
    const iv = setInterval(() => {
      const sim = simRef.current!;
      const evs = sim.step();
      const userSide = sim.sides[0].user ? 0 : 1;
      if (evs.some((e) => e.type === "injury" && e.side === userSide)) { setRunning(false); notify("Jogador lesionado! Faça uma substituição."); }
      if (evs.some((e) => e.type === "half")) setRunning(false);
      if (sim.finished) { setRunning(false); setPhase("post"); }
      tick();
    }, [700, 250, 60][speed - 1] ?? 250);
    return () => clearInterval(iv);
  }, [running, speed, phase]);

  if (!f) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <p className="mb-4">Nenhuma partida pendente.</p>
        <button className="mm-btn-primary w-full" onClick={onClose}>Voltar</button>
      </div>
    );
  }
  const home = st.clubs[f.h], away = st.clubs[f.a];
  const issues = lineupIssues(st);

  if (phase === "pre") {
    return (
      <div className="mm-hero mx-auto min-h-screen max-w-lg p-4">
        <button className="mm-btn-ghost mb-4" onClick={onClose}>← Voltar</button>
        <div className="mb-2 text-center text-sm text-primary">{compName(st, f.comp)} · {st.schedule[st.day].label}</div>
        <div className="mb-6 flex items-center justify-around">
          <div className="flex flex-col items-center"><Crest club={home} size={72} /><b className="mt-2">{home.name}</b></div>
          <span className="font-display text-3xl">VS</span>
          <div className="flex flex-col items-center"><Crest club={away} size={72} /><b className="mt-2">{away.name}</b></div>
        </div>
        <div className="mm-card mb-3 text-sm">
          <div>Formação: <b>{st.tactic.formation}</b> · {st.tactic.style} · {st.tactic.pressing}</div>
          {issues.length > 0 ? (
            <div className="mt-2 rounded-lg border border-warning p-2">{issues.map((i) => <div key={i}>⚠️ {i}</div>)}
              <button className="mm-btn-primary mt-2 w-full" onClick={() => { mutate((s) => fixLineup(s)); tick(); }}>Completar escalação automaticamente</button>
            </div>
          ) : <div className="mt-1 text-success">✅ Escalação pronta</div>}
        </div>
        <button className="mm-btn-ghost mb-2 w-full" onClick={() => { onClose(); goTab("squad", "taticas"); }}>Ajustar escalação e táticas</button>
        <button className="mm-btn-primary mb-2 min-h-14 w-full text-lg" disabled={issues.length > 0} onClick={() => { simRef.current = createMatch(st, f); setPhase("live"); setRunning(true); }}>
          <Play className="h-5 w-5" /> Iniciar partida (lance a lance)
        </button>
        <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={assist} onChange={(e) => setAssist(e.target.checked)} className="h-5 w-5" /> Autorizo o auxiliar a fazer substituições na simulação rápida</label>
        <button className="mm-btn-ghost w-full" disabled={issues.length > 0} onClick={() => {
          if (!confirm("Simular a partida inteira agora?")) return;
          let txt = "";
          mutate((s) => { const fx = userFixture(s)!; const sim = quickSim(s, fx, assist); txt = `${s.clubs[fx.h].short} ${sim.score[0]} x ${sim.score[1]} ${s.clubs[fx.a].short}`; finishDay(s); });
          notify(`Resultado: ${txt}`);
          onClose();
        }}>Simular resultado rápido</button>
      </div>
    );
  }

  const sim = simRef.current!;
  const us: 0 | 1 = sim.sides[0].user ? 0 : 1;
  const side = sim.sides[us];
  const s0 = sim.stats[0], s1 = sim.stats[1];
  const totalPoss = s0.poss + s1.poss || 1;
  const statRows: [string, number | string, number | string][] = [
    ["Posse de bola", `${Math.round((s0.poss / totalPoss) * 100)}%`, `${Math.round((s1.poss / totalPoss) * 100)}%`],
    ["Finalizações", s0.shots, s1.shots], ["No alvo", s0.onT, s1.onT], ["Grandes chances", s0.big, s1.big],
    ["Escanteios", s0.corners, s1.corners], ["Faltas", s0.fouls, s1.fouls], ["Passes certos", `${s0.passOk}/${s0.passes}`, `${s1.passOk}/${s1.passes}`],
    ["Defesas", s0.saves, s1.saves], ["Impedimentos", s0.off, s1.off], ["Amarelos", s0.yel, s1.yel], ["Vermelhos", s0.red, s1.red],
  ];
  const events = [...sim.events].reverse();
  const icon: Record<string, string> = { goal: "⚽", yellow: "🟨", red: "🟥", injury: "🩹", sub: "🔄", save: "🧤", miss: "❌", pen: "❗", half: "⏸️", end: "🏁", corner: "🚩", offside: "🚫", info: "🎙️" };

  const finish = () => {
    mutate((s) => { const fx = userFixture(s); if (fx) applyResult(s, fx, sim); finishDay(s); });
    notify("Rodada concluída. Tabela atualizada.");
    onClose();
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-28">
      <div className="sticky top-0 z-20 border-b bg-card px-4 py-3">
        <div className="text-center text-xs text-muted-foreground">{compName(st, f.comp)}</div>
        <div className="flex items-center justify-between">
          <div className="flex w-24 flex-col items-center"><Crest club={home} size={40} /><span className="truncate text-xs font-bold">{home.short}</span></div>
          <div className="text-center">
            <div className="font-display text-5xl font-extrabold tabular-nums">{sim.score[0]} - {sim.score[1]}</div>
            {sim.pens && <div className="text-xs">Pênaltis {sim.pens[0]}-{sim.pens[1]}</div>}
            <div className={cn("font-display text-lg", sim.finished ? "text-muted-foreground" : "text-primary")}>{sim.finished ? "Encerrado" : `${sim.minute}'`}</div>
          </div>
          <div className="flex w-24 flex-col items-center"><Crest club={away} size={40} /><span className="truncate text-xs font-bold">{away.short}</span></div>
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span className="w-1/2 truncate">{sim.events.filter((e) => e.type === "goal" && e.side === 0).map((e) => `${sim.name(e.pid).split(" ").slice(-1)} ${e.min}'`).join(", ")}</span>
          <span className="w-1/2 truncate text-right">{sim.events.filter((e) => e.type === "goal" && e.side === 1).map((e) => `${sim.name(e.pid).split(" ").slice(-1)} ${e.min}'`).join(", ")}</span>
        </div>
      </div>

      <div className="px-4 pt-3">
        <div className="mb-3 flex gap-2">
          {(["lances", "stats", "times"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={cn("mm-chip flex-1", tab === t ? "border-primary bg-primary text-primary-foreground" : "bg-secondary")}>{t === "lances" ? "Narração" : t === "stats" ? "Estatísticas" : "Times"}</button>)}
        </div>
        {tab === "lances" && (
          <div className="space-y-1.5">
            {events.map((e, i) => (
              <div key={i} className={cn("flex gap-2 rounded-lg p-2 text-sm", e.type === "goal" ? "bg-primary text-primary-foreground font-bold" : e.key ? "bg-accent" : "")}>
                <span className="w-8 shrink-0 font-display font-bold">{e.min}'</span><span>{icon[e.type] ?? "•"}</span><span>{e.text}</span>
              </div>
            ))}
          </div>
        )}
        {tab === "stats" && (
          <div className="mm-card space-y-2">
            {statRows.map(([l, a, b]) => <div key={l} className="flex justify-between text-sm"><b className="w-16">{a}</b><span className="text-muted-foreground">{l}</span><b className="w-16 text-right">{b}</b></div>)}
          </div>
        )}
        {tab === "times" && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {sim.sides.map((sd, k) => (
              <div key={k} className="mm-card p-2">
                <b className="mb-1 block">{st.clubs[sd.club].short} · {sd.formation}</b>
                {sd.lineup.map((l) => (
                  <div key={l.pid} className={cn("flex justify-between py-0.5", (sd.sentOff.has(l.pid) || sd.injured.has(l.pid)) && "line-through opacity-50")}>
                    <span className="truncate">{l.role} {sim.name(l.pid)}</span><b>{(sim.ratings[l.pid] ?? 6).toFixed(1)}</b>
                  </div>
                ))}
                <div className="mt-1 text-muted-foreground">Subs: {sd.subsUsed}/5</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card p-3">
        <div className="mx-auto max-w-lg">
          {phase === "post" ? (
            <button className="mm-btn-primary min-h-14 w-full text-lg" onClick={finish}>Continuar — concluir rodada</button>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              <button className="mm-btn-primary col-span-1 px-0" onClick={() => setRunning(!running)} aria-label={running ? "Pausar" : "Continuar"}>{running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
              <button className="mm-btn-ghost px-0 text-sm" onClick={() => setSpeed((speed % 3) + 1)}>{speed === 1 ? "1x" : speed === 2 ? "3x" : "10x"}</button>
              <button className="mm-btn-ghost px-0" onClick={() => { setRunning(false); setPanel("sub"); }} aria-label="Substituição"><ArrowLeftRight className="h-5 w-5" /></button>
              <button className="mm-btn-ghost px-0" onClick={() => { setRunning(false); setPanel("tatica"); }} aria-label="Tática"><Settings2 className="h-5 w-5" /></button>
              <button className="mm-btn-ghost px-0" onClick={() => { const target = sim.minute < 45 ? 45 : sim.length; sim.runTo(target); if (sim.minute >= sim.length) sim.finish(); if (sim.finished) setPhase("post"); setRunning(false); tick(); }} aria-label="Avançar período"><FastForward className="h-5 w-5" /></button>
            </div>
          )}
          {phase !== "post" && <p className="mt-1 text-center text-[11px] text-muted-foreground">⏩ avança até o {sim.minute < 45 ? "intervalo" : "fim do jogo"}</p>}
        </div>
      </div>

      <Sheet open={panel === "sub"} onClose={() => setPanel("none")} title={`Substituição (${side.subsUsed}/5)`}>
        <p className="mb-2 text-sm text-muted-foreground">1. Quem sai</p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {side.lineup.filter((l) => !side.sentOff.has(l.pid)).map((l) => (
            <button key={l.pid} onClick={() => setSubOut(l.pid)} className={cn("mm-card p-2 text-left text-sm", subOut === l.pid && "border-primary", side.injured.has(l.pid) && "border-destructive")}>
              <b>{l.role}</b> {sim.name(l.pid)}<div className="text-xs text-muted-foreground">Físico {Math.round(sim.fatigue[l.pid] ?? 0)}% · nota {(sim.ratings[l.pid] ?? 6).toFixed(1)}{side.injured.has(l.pid) ? " · LESIONADO" : ""}</div>
            </button>
          ))}
        </div>
        <p className="mb-2 text-sm text-muted-foreground">2. Quem entra</p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {side.bench.map((id) => {
            const p = st.players[id];
            const role = side.lineup.find((l) => l.pid === subOut)?.role as Pos | undefined;
            return <button key={id} onClick={() => setSubIn(id)} className={cn("mm-card p-2 text-left text-sm", subIn === id && "border-primary")}><b>{p.pos}</b> {p.name}<div className="text-xs text-muted-foreground">{role ? `Nota na posição ${Math.round(slotRating(p, role))}` : ""}</div></button>;
          })}
          {!side.bench.length && <p className="text-sm text-muted-foreground">Sem reservas disponíveis.</p>}
        </div>
        <button className="mm-btn-primary w-full" disabled={subOut === null || subIn === null || side.subsUsed >= 5} onClick={() => {
          if (sim.substitute(us, subOut!, subIn!)) { notify("Substituição confirmada"); setSubOut(null); setSubIn(null); setPanel("none"); tick(); }
        }}>Confirmar substituição</button>
      </Sheet>

      <Sheet open={panel === "tatica"} onClose={() => setPanel("none")} title="Mudanças táticas">
        <label className="mb-2 block text-sm">Formação
          <select className="mm-input mt-1" value={side.formation} onChange={(e) => {
            const slots = FORMATIONS[e.target.value];
            side.formation = e.target.value;
            const outfield = side.lineup.filter((l) => l.role !== "GOL");
            const gk = side.lineup.find((l) => l.role === "GOL");
            const used = new Set<number>();
            const newLine = slots.filter((s) => s.role !== "GOL").map((s) => {
              const best = outfield.filter((l) => !used.has(l.pid)).sort((a, b) => slotRating(st.players[b.pid], s.role) - slotRating(st.players[a.pid], s.role))[0];
              if (best) used.add(best.pid);
              return best ? { pid: best.pid, role: s.role, instr: "Padrão" } : null;
            }).filter((x): x is NonNullable<typeof x> => !!x);
            side.lineup = gk ? [gk, ...newLine] : newLine;
            sim.markDirty(); tick();
          }}>{Object.keys(FORMATIONS).map((o) => <option key={o}>{o}</option>)}</select>
        </label>
        <label className="mb-2 block text-sm">Estilo de jogo<select className="mm-input mt-1" value={side.style} onChange={(e) => { side.style = e.target.value; sim.markDirty(); tick(); }}>{STYLES.map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="mb-3 block text-sm">Pressão<select className="mm-input mt-1" value={side.pressing} onChange={(e) => { side.pressing = e.target.value; sim.markDirty(); tick(); }}>{PRESSING.map((o) => <option key={o}>{o}</option>)}</select></label>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <button className="mm-btn-ghost" onClick={() => { side.style = "Ofensivo"; side.pressing = "Pressão alta"; sim.markDirty(); tick(); notify("Time vai para cima!"); }}>Buscar o resultado</button>
          <button className="mm-btn-ghost" onClick={() => { side.style = "Defensivo"; side.pressing = "Bloco baixo"; sim.markDirty(); tick(); notify("Time recua para segurar"); }}>Segurar o placar</button>
        </div>
        <p className="mb-1 text-sm font-bold">Instruções individuais</p>
        {side.lineup.filter((l) => l.role !== "GOL" && !side.sentOff.has(l.pid)).map((l) => (
          <div key={l.pid} className="mb-1 flex items-center gap-2 text-sm">
            <span className="w-28 truncate">{l.role} {sim.name(l.pid).split(" ").slice(-1)}</span>
            <select className="mm-input min-h-10 flex-1" value={l.instr} onChange={(e) => { l.instr = e.target.value; sim.markDirty(); tick(); }}>{INSTRUCTIONS[l.role].map((o) => <option key={o}>{o}</option>)}</select>
          </div>
        ))}
        <button className="mm-btn-primary mt-3 w-full" onClick={() => setPanel("none")}>Aplicar e voltar ao jogo</button>
      </Sheet>
    </div>
  );
}
