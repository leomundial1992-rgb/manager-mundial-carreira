import { useState } from "react";
import type { GameState, Player, Pos } from "@/game/types";
import { ATTR_NAMES } from "@/game/types";
import { mutate } from "@/game/store";
import { FORMATIONS, INSTRUCTIONS, PRESSING, STYLES } from "@/game/formations";
import { fixLineup, lineupIssues } from "@/game/match";
import { evaluateContract, exerciseOption, loanTargets, playerDemands, release, renew, sellTo } from "@/game/market";
import { money, ovr, playerValue, POS_ORDER, slotRating } from "@/game/util";
import { NAT_NAME } from "@/game/data";
import { notify } from "@/game/events";
import { Bar, Flag, OvrBadge, PlayerLine, Section, Sheet, Tabs } from "./ui";
import { cn } from "@/lib/utils";

const avgForm = (p: Player) => (p.ratings.length ? (p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length).toFixed(1) : "-");

export function SquadScreen({ st, initial }: { st: GameState; initial?: string }) {
  const [tab, setTab] = useState<"elenco" | "taticas">(initial === "taticas" ? "taticas" : "elenco");
  const [sel, setSel] = useState<number | null>(null);
  const me = st.clubs[st.userClub!];
  const players = me.players.map((id) => st.players[id]).sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || ovr(b) - ovr(a));
  return (
    <div>
      <Tabs value={tab} onChange={setTab} items={[{ id: "elenco", label: `Elenco (${players.length})` }, { id: "taticas", label: "Escalação e táticas" }]} />
      {tab === "elenco" ? (
        <div className="mm-card">
          {players.map((p) => (
            <PlayerLine key={p.id} st={st} p={p} onClick={() => setSel(p.id)} right={<div className="text-right text-xs"><div>Fís {Math.round(p.fit)}%</div><div className="text-muted-foreground">Forma {avgForm(p)}</div></div>} />
          ))}
        </div>
      ) : (
        <Tactics st={st} onPlayer={setSel} />
      )}
      {sel !== null && <PlayerSheet st={st} pid={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

export function PlayerSheet({ st, pid, onClose, children }: { st: GameState; pid: number; onClose: () => void; children?: React.ReactNode }) {
  const p = st.players[pid];
  const [mode, setMode] = useState<"info" | "renew" | "loan">("info");
  if (!p) return null;
  const mine = p.club === st.userClub;
  return (
    <Sheet open onClose={onClose} title={p.name}>
      <div className="mb-3 flex items-center gap-3">
        <OvrBadge v={ovr(p)} className="h-14 min-w-14 text-3xl" />
        <div className="text-sm">
          <div><Flag nat={p.nat} /> {NAT_NAME[p.nat] ?? p.nat} · {p.age} anos · {p.pos}</div>
          <div className="text-muted-foreground">Pé {p.foot === "D" ? "direito" : p.foot === "E" ? "esquerdo" : "ambos"} · Potencial {mine ? p.pot : "?"}{!mine && " (veja no mercado)"}</div>
          <div className="text-muted-foreground">{p.club !== null ? st.clubs[p.club].name : "Sem clube"}{p.loanFrom != null ? ` (emprestado por ${st.clubs[p.loanFrom].name})` : ""}</div>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="mm-card p-2"><div className="text-xs text-muted-foreground">Valor</div><b>{money(playerValue(p))}</b></div>
        <div className="mm-card p-2"><div className="text-xs text-muted-foreground">Salário/mês</div><b>{money(p.wage)}</b></div>
        <div className="mm-card p-2"><div className="text-xs text-muted-foreground">Contrato</div><b>{p.contract} temp.</b></div>
        <div className="mm-card p-2"><div className="text-xs text-muted-foreground">Físico</div><b>{Math.round(p.fit)}%</b></div>
        <div className="mm-card p-2"><div className="text-xs text-muted-foreground">Moral</div><b>{Math.round(p.mor)}%</b></div>
        <div className="mm-card p-2"><div className="text-xs text-muted-foreground">Forma</div><b>{avgForm(p)}</b></div>
        <div className="mm-card p-2"><div className="text-xs text-muted-foreground">Jogos</div><b>{p.apps}</b></div>
        <div className="mm-card p-2"><div className="text-xs text-muted-foreground">Gols</div><b>{p.goals}</b></div>
        <div className="mm-card p-2"><div className="text-xs text-muted-foreground">Assist.</div><b>{p.assists}</b></div>
      </div>
      {p.inj > 0 && <p className="mb-2 rounded-lg bg-destructive/20 p-2 text-sm">🩹 {p.injName} — {p.inj} semana(s) fora</p>}
      {p.sus > 0 && <p className="mb-2 rounded-lg bg-warning/20 p-2 text-sm">Suspenso por {p.sus} jogo(s)</p>}
      {mode === "info" && (
        <>
          <div className="mb-4 space-y-1.5">
            {ATTR_NAMES.map((n, i) => (p.pos === "GOL" || i !== 11) && (
              <div key={n} className="flex items-center gap-2 text-sm"><span className="w-32 shrink-0">{n}</span><Bar value={p.attr[i]} tone={p.attr[i] >= 75 ? "gold" : "primary"} /><b className="w-7 text-right">{Math.round(p.attr[i])}</b></div>
            ))}
          </div>
          {children}
          {mine && (
            <div className="grid grid-cols-2 gap-2">
              {p.loanFrom == null && <button className="mm-btn-ghost" onClick={() => setMode("renew")}>Renovar contrato</button>}
              {p.loanFrom == null && <button className="mm-btn-ghost" onClick={() => { mutate((s) => { s.players[pid].listed = !s.players[pid].listed; }); notify(p.listed ? "Retirado da lista de vendas" : "Colocado à venda: clubes farão propostas"); }}>{p.listed ? "Tirar da venda" : "Colocar à venda"}</button>}
              {p.loanFrom == null && <button className="mm-btn-ghost" onClick={() => setMode("loan")}>Emprestar</button>}
              <button className="mm-btn-ghost" onClick={() => { mutate((s) => { s.tactic.sp.captain = pid; }); notify(`${p.name} é o novo capitão`); }}>Definir capitão</button>
              {p.loanFrom != null && p.loanOption ? <button className="mm-btn-primary col-span-2" onClick={() => { if (!confirm(`Exercer opção de compra por ${money(p.loanOption!)}?`)) return; let r = { ok: false, text: "" }; mutate((s) => { r = exerciseOption(s, pid); }); notify(r.text); }}>Exercer opção ({money(p.loanOption)})</button> : null}
              {p.loanFrom == null && <button className="mm-btn-danger col-span-2" onClick={() => { const cost = Math.round(p.wage * 12 * p.contract * 0.5); if (!confirm(`Rescindir com ${p.name}? Multa: ${money(cost)}`)) return; mutate((s) => release(s, pid)); onClose(); notify("Contrato rescindido"); }}>Rescindir contrato</button>}
            </div>
          )}
        </>
      )}
      {mode === "renew" && <RenewForm st={st} p={p} onDone={() => setMode("info")} />}
      {mode === "loan" && (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">Clubes interessados no empréstimo de uma temporada (pagam 100% do salário):</p>
          {loanTargets(st, pid).map((c) => {
            const fee = Math.round(playerValue(p) * 0.06 / 10000) * 10000;
            return (
              <button key={c.id} className="mm-card mb-2 flex w-full justify-between" onClick={() => { if (!confirm(`Emprestar ${p.name} ao ${c.name} por ${money(fee)}?`)) return; mutate((s) => sellTo(s, pid, c.id, fee, true)); onClose(); notify("Empréstimo concluído"); }}>
                <span>{c.name}</span><b>{money(fee)}</b>
              </button>
            );
          })}
          <button className="mm-btn-ghost w-full" onClick={() => setMode("info")}>Voltar</button>
        </div>
      )}
    </Sheet>
  );
}

export function ContractInputs({ v, set }: { v: { wage: number; years: number; luvas: number; goalBonus: number }; set: (x: typeof v) => void }) {
  const row = (label: string, key: keyof typeof v, step: number) => (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1">
        <button className="mm-btn-ghost min-h-10 px-3" onClick={() => set({ ...v, [key]: Math.max(key === "years" ? 1 : 0, v[key] - step) })}>−</button>
        <b className="w-24 text-center text-sm">{key === "years" ? `${v.years} temp.` : money(v[key])}</b>
        <button className="mm-btn-ghost min-h-10 px-3" onClick={() => set({ ...v, [key]: key === "years" ? Math.min(5, v.years + 1) : v[key] + step })}>+</button>
      </div>
    </div>
  );
  const ws = Math.max(5000, Math.round(v.wage * 0.05 / 1000) * 1000);
  return <div className="mm-card mb-3">{row("Salário mensal", "wage", ws)}{row("Duração", "years", 1)}{row("Luvas", "luvas", ws * 4)}{row("Bônus por gol", "goalBonus", ws)}</div>;
}

function RenewForm({ st, p, onDone }: { st: GameState; p: Player; onDone: () => void }) {
  const d = playerDemands(st, p);
  const [v, set] = useState({ wage: Math.round(d.wage * 0.9 / 1000) * 1000, years: d.years, luvas: Math.round(d.luvas * 0.5 / 1000) * 1000, goalBonus: 0 });
  const [att, setAtt] = useState(0);
  const [msgT, setMsg] = useState("");
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">Pedida aproximada: {money(d.wage)}/mês por {d.years} temporada(s).</p>
      <ContractInputs v={v} set={set} />
      {msgT && <p className="mb-2 rounded-lg bg-secondary p-2 text-sm">{msgT}</p>}
      <div className="flex gap-2">
        <button className="mm-btn-primary flex-1" disabled={att >= 5} onClick={() => {
          if (!evaluateContract(st, p, v, att).ok) { setAtt(att + 1); setMsg(att >= 4 ? `${p.name} encerrou a conversa nesta temporada.` : evaluateContract(st, p, v, att).text); return; }
          if (!confirm(`Confirmar renovação: ${money(v.wage)}/mês, ${v.years} temporada(s), luvas ${money(v.luvas)}?`)) return;
          let r = { ok: false, text: "" };
          mutate((s) => { r = renew(s, p.id, v, att); });
          notify(r.text);
          if (r.ok) onDone(); else setMsg(r.text);
        }}>Propor</button>
        <button className="mm-btn-ghost" onClick={onDone}>Voltar</button>
      </div>
    </div>
  );
}

function Tactics({ st, onPlayer }: { st: GameState; onPlayer: (id: number) => void }) {
  const t = st.tactic;
  const slots = FORMATIONS[t.formation];
  const me = st.clubs[st.userClub!];
  const [pick, setPick] = useState<number | null>(null);
  const issues = lineupIssues(st);
  const all = me.players.map((id) => st.players[id]);
  const assign = (slot: number, pid: number) => mutate((s) => {
    const tt = s.tactic;
    const prev = tt.starters[slot];
    const at = tt.starters.indexOf(pid);
    if (at >= 0) tt.starters[at] = prev ?? null;
    tt.bench = tt.bench.filter((x) => x !== pid);
    if (at < 0 && prev != null && tt.bench.length < 9) tt.bench.push(prev);
    tt.starters[slot] = pid;
  });
  const toggleBench = (pid: number) => mutate((s) => {
    const b = s.tactic.bench;
    if (b.includes(pid)) s.tactic.bench = b.filter((x) => x !== pid);
    else if (b.length < 9 && !s.tactic.starters.includes(pid)) b.push(pid);
    else notify("Banco cheio (máx. 9) ou jogador já é titular");
  });
  const sel = (label: string, value: string, opts: string[], on: (v: string) => void) => (
    <label className="block text-sm"><span className="text-muted-foreground">{label}</span>
      <select className="mm-input mt-1" value={value} onChange={(e) => on(e.target.value)}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
    </label>
  );
  const spSel = (label: string, key: "captain" | "pen" | "fk" | "corner") => (
    <label className="block text-sm"><span className="text-muted-foreground">{label}</span>
      <select className="mm-input mt-1" value={t.sp[key] ?? ""} onChange={(e) => mutate((s) => { s.tactic.sp[key] = e.target.value ? Number(e.target.value) : undefined; })}>
        <option value="">—</option>{all.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </label>
  );
  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {sel("Formação", t.formation, Object.keys(FORMATIONS), (v) => mutate((s) => { s.tactic.formation = v; s.tactic.instr = {}; }))}
        {sel("Estilo", t.style, STYLES, (v) => mutate((s) => { s.tactic.style = v; }))}
        {sel("Pressão", t.pressing, PRESSING, (v) => mutate((s) => { s.tactic.pressing = v; }))}
      </div>
      {issues.length > 0 && (
        <div className="mb-3 rounded-lg border border-warning p-2 text-sm">
          {issues.map((i) => <div key={i}>⚠️ {i}</div>)}
          <button className="mm-btn-primary mt-2 w-full" onClick={() => mutate((s) => fixLineup(s))}>Completar automaticamente</button>
        </div>
      )}
      <div className="mm-pitch relative mb-3 aspect-[3/4] w-full overflow-hidden rounded-xl border">
        <div className="absolute inset-x-0 top-1/2 h-px bg-pitch-line" />
        <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-pitch-line" />
        {slots.map((s, i) => {
          const p = t.starters[i] != null ? st.players[t.starters[i]!] : null;
          return (
            <button key={i} onClick={() => setPick(i)} className="absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-full border-2 font-display text-lg font-bold", p && p.inj === 0 && p.sus === 0 ? "border-primary bg-card" : "border-destructive bg-destructive/40")}>{p ? Math.round(slotRating(p, s.role)) : "+"}</span>
              <span className="mt-0.5 max-w-full truncate rounded bg-background/80 px-1 text-[11px] font-semibold">{p ? p.name.split(" ").slice(-1)[0] : s.label}</span>
              <span className="text-[10px] text-foreground/80">{s.label}{t.sp.captain === p?.id ? " ©" : ""}</span>
            </button>
          );
        })}
      </div>
      <Section title="Instruções individuais">
        <div className="mm-card space-y-2">
          {slots.map((s, i) => s.role !== "GOL" && t.starters[i] != null && (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-28 truncate"><b>{s.label}</b> {st.players[t.starters[i]!]?.name.split(" ").slice(-1)[0]}</span>
              <select className="mm-input min-h-10 flex-1" value={t.instr[i] ?? "Padrão"} onChange={(e) => mutate((x) => { x.tactic.instr[i] = e.target.value; })}>
                {INSTRUCTIONS[s.role as Pos].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Bolas paradas e capitão">
        <div className="mm-card grid grid-cols-2 gap-2">{spSel("Capitão", "captain")}{spSel("Pênaltis", "pen")}{spSel("Faltas", "fk")}{spSel("Escanteios", "corner")}</div>
      </Section>
      <Section title={`Reservas (${t.bench.length}/9) — toque para incluir/remover`}>
        <div className="mm-card">
          {all.filter((p) => !t.starters.includes(p.id)).sort((a, b) => ovr(b) - ovr(a)).map((p) => (
            <PlayerLine key={p.id} st={st} p={p} onClick={() => toggleBench(p.id)} right={<span className={cn("mm-chip", t.bench.includes(p.id) ? "border-primary text-primary" : "text-muted-foreground")}>{t.bench.includes(p.id) ? "No banco" : "Fora"}</span>} />
          ))}
        </div>
      </Section>
      <Sheet open={pick !== null} onClose={() => setPick(null)} title={pick !== null ? `Escolher: ${slots[pick].label}` : ""}>
        {pick !== null && all.slice().sort((a, b) => slotRating(b, slots[pick].role) - slotRating(a, slots[pick].role)).map((p) => (
          <PlayerLine key={p.id} st={st} p={p} onClick={() => { assign(pick, p.id); setPick(null); }} right={<div className="text-right text-xs"><b className="text-base">{Math.round(slotRating(p, slots[pick].role))}</b><div>na posição</div><button className="text-primary underline" onClick={(e) => { e.stopPropagation(); onPlayer(p.id); }}>perfil</button></div>} />
        ))}
      </Sheet>
    </div>
  );
}
