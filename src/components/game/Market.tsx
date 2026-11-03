import { useMemo, useState } from "react";
import type { GameState, Pos } from "@/game/types";
import { ATTR_NAMES } from "@/game/types";
import { mutate } from "@/game/store";
import { askingPrice, clubResponse, evaluateContract, finishSigning, playerDemands, scoutPot, search, type Filters } from "@/game/market";
import { money, ovr, playerValue } from "@/game/util";
import { userWages } from "@/game/engine";
import { NAT_NAME } from "@/game/data";
import { notify } from "@/game/events";
import { PlayerLine, Section, Sheet, Stat, Tabs } from "./ui";
import { ContractInputs, PlayerSheet } from "./Squad";

export function MarketScreen({ st, initialPlayer }: { st: GameState; initialPlayer?: number }) {
  const me = st.clubs[st.userClub!];
  const [tab, setTab] = useState<"busca" | "livres" | "lista">("busca");
  const [f, setF] = useState<Filters>({ pos: "", maxAge: 0, minPot: 0, minOvr: 0 });
  const [applied, setApplied] = useState<Filters>({ minOvr: Math.max(50, me.rep - 15) });
  const [sel, setSel] = useState<number | null>(initialPlayer ?? null);
  const [neg, setNeg] = useState<number | null>(null);
  const results = useMemo(() => tab === "lista" ? st.shortlist.map((id) => st.players[id]).filter(Boolean) : search(st, { ...applied, free: tab === "livres" }), [st, applied, tab, st.shortlist.length]);
  const num = (k: keyof Filters, label: string, ph: string) => (
    <label className="text-xs text-muted-foreground">{label}<input inputMode="numeric" className="mm-input mt-1" placeholder={ph} value={(f[k] as number) || ""} onChange={(e) => setF({ ...f, [k]: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></label>
  );
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Stat label="Orçamento transferências" value={money(me.transferBudget)} />
        <Stat label="Folha / limite (mês)" value={money(userWages(st))} sub={`limite ${money(me.wageBudget)}`} />
      </div>
      <Tabs value={tab} onChange={setTab} items={[{ id: "busca", label: "Olheiros" }, { id: "livres", label: "Jogadores livres" }, { id: "lista", label: `Observados (${st.shortlist.length})` }]} />
      {tab !== "lista" && (
        <div className="mm-card mb-3 grid grid-cols-2 gap-2">
          <label className="col-span-2 text-xs text-muted-foreground">Nome<input className="mm-input mt-1" value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Garro" /></label>
          <label className="text-xs text-muted-foreground">Posição<select className="mm-input mt-1" value={f.pos} onChange={(e) => setF({ ...f, pos: e.target.value as Pos | "" })}><option value="">Todas</option>{["GOL", "ZAG", "LAT", "VOL", "MEI", "PON", "ATA"].map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">Nacionalidade<select className="mm-input mt-1" value={f.nat ?? ""} onChange={(e) => setF({ ...f, nat: e.target.value || undefined })}><option value="">Todas</option>{Object.entries(NAT_NAME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          {num("maxAge", "Idade máxima", "ex. 23")}
          {num("minOvr", "Nota mínima", "ex. 70")}
          {num("minPot", "Potencial mínimo", "ex. 80")}
          <label className="text-xs text-muted-foreground">Valor máximo (mi)<input inputMode="numeric" className="mm-input mt-1" placeholder="ex. 10" value={f.maxValue ? f.maxValue / 1e6 : ""} onChange={(e) => setF({ ...f, maxValue: (Number(e.target.value.replace(/\D/g, "")) || 0) * 1e6 })} /></label>
          <label className="text-xs text-muted-foreground">Atributo<select className="mm-input mt-1" value={f.attr ?? ""} onChange={(e) => setF({ ...f, attr: e.target.value === "" ? undefined : Number(e.target.value) })}><option value="">—</option>{ATTR_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select></label>
          {num("attrMin", "Atributo mínimo", "ex. 75")}
          <button className="mm-btn-primary col-span-2" onClick={() => setApplied({ ...f })}>Buscar com olheiros</button>
        </div>
      )}
      <Section title={`${results.length} jogadores`}>
        <div className="mm-card">
          {results.map((p) => <PlayerLine key={p.id} st={st} p={p} onClick={() => setSel(p.id)} right={<div className="text-right text-xs"><b>{money(playerValue(p))}</b><div className="text-muted-foreground">pot. ~{scoutPot(st, p)}</div></div>} />)}
        </div>
      </Section>
      {sel !== null && neg === null && (
        <PlayerSheet st={st} pid={sel} onClose={() => setSel(null)}>
          {st.players[sel]?.club !== st.userClub && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <p className="col-span-2 text-sm text-muted-foreground">Potencial estimado pelos olheiros: <b>{scoutPot(st, st.players[sel])}</b> · Pedida do clube: <b>{st.players[sel].club !== null ? money(askingPrice(st, st.players[sel])) : "livre"}</b></p>
              <button className="mm-btn-primary col-span-2" onClick={() => setNeg(sel)}>Negociar</button>
              <button className="mm-btn-ghost col-span-2" onClick={() => mutate((s) => { s.shortlist = s.shortlist.includes(sel) ? s.shortlist.filter((x) => x !== sel) : [...s.shortlist, sel]; })}>{st.shortlist.includes(sel) ? "Remover dos observados" : "Adicionar aos observados"}</button>
            </div>
          )}
        </PlayerSheet>
      )}
      {neg !== null && <Negotiation st={st} pid={neg} onClose={() => { setNeg(null); setSel(null); }} />}
    </div>
  );
}

function Negotiation({ st, pid, onClose }: { st: GameState; pid: number; onClose: () => void }) {
  const p = st.players[pid];
  const free = p.club === null;
  const [kind, setKind] = useState<"compra" | "emprestimo">("compra");
  const val = playerValue(p);
  const r10 = (x: number) => Math.round(x / 10000) * 10000;
  const [fee, setFee] = useState(free ? 0 : r10(val * 0.9));
  const [opt, setOpt] = useState(r10(val * 1.1));
  const [wagePct, setWagePct] = useState(100);
  const [stage, setStage] = useState<"clube" | "contrato" | "confirmar">(free ? "contrato" : "clube");
  const [reply, setReply] = useState("");
  const d = playerDemands(st, p);
  const [c, setC] = useState({ wage: Math.round(d.wage * 0.9 / 1000) * 1000, years: kind === "emprestimo" ? 1 : d.years, luvas: Math.round(d.luvas * 0.5 / 1000) * 1000, goalBonus: 0 });
  const [att, setAtt] = useState(0);
  const step = Math.max(50000, r10(val * 0.05));
  const me = st.clubs[st.userClub!];

  const money3 = (label: string, v: number, set: (n: number) => void) => (
    <div className="flex items-center justify-between py-1.5"><span className="text-sm">{label}</span><div className="flex items-center gap-1"><button className="mm-btn-ghost min-h-10 px-3" onClick={() => set(Math.max(0, v - step))}>−</button><b className="w-24 text-center text-sm">{money(v)}</b><button className="mm-btn-ghost min-h-10 px-3" onClick={() => set(v + step)}>+</button></div></div>
  );
  return (
    <Sheet open onClose={onClose} title={`Negociação: ${p.name}`}>
      <p className="mb-3 text-sm text-muted-foreground">Valor de mercado {money(val)} · Nota {ovr(p)} · {p.club !== null ? st.clubs[p.club].name : "Jogador livre"}</p>
      {stage === "clube" && (
        <>
          <Tabs value={kind} onChange={(k) => { setKind(k); setFee(k === "compra" ? r10(val * 0.9) : r10(val * 0.1)); setC({ ...c, years: k === "emprestimo" ? 1 : d.years }); }} items={[{ id: "compra", label: "Compra" }, { id: "emprestimo", label: "Empréstimo (1 temporada)" }]} />
          <div className="mm-card mb-3">
            {money3(kind === "compra" ? "Valor da proposta" : "Taxa de empréstimo", fee, setFee)}
            {kind === "emprestimo" && money3("Opção de compra", opt, setOpt)}
            {kind === "emprestimo" && <div className="flex items-center justify-between py-1.5"><span className="text-sm">Salário pago por você</span><select className="mm-input w-28" value={wagePct} onChange={(e) => setWagePct(Number(e.target.value))}>{[50, 60, 75, 100].map((x) => <option key={x} value={x}>{x}%</option>)}</select></div>}
          </div>
          {reply && <p className="mb-2 rounded-lg bg-secondary p-2 text-sm">{reply}</p>}
          <button className="mm-btn-primary w-full" onClick={() => {
            const r = clubResponse(st, p, kind, fee, kind === "emprestimo" ? opt : undefined, wagePct);
            setReply(r.text);
            if (r.counter) setFee(r.counter);
            if (r.counterOption) setOpt(r.counterOption);
            if (r.ok) { mutate((s) => { s.pending = { playerId: pid, kind, fee, optionPrice: kind === "emprestimo" ? opt : undefined, wagePct, clubAgreed: true }; }); setStage("contrato"); setReply(""); }
          }}>Enviar proposta ao clube</button>
        </>
      )}
      {stage === "contrato" && (
        <>
          <p className="mb-2 text-sm">Clube de acordo ✅. Agora negocie com o jogador. Pedida aproximada: <b>{money(d.wage)}/mês</b>, {d.years} temporada(s).</p>
          <ContractInputs v={c} set={setC} />
          {reply && <p className="mb-2 rounded-lg bg-secondary p-2 text-sm">{reply}</p>}
          <button className="mm-btn-primary w-full" disabled={att >= 5} onClick={() => {
            const r = evaluateContract(st, p, c, att);
            setReply(att >= 4 && !r.ok ? `${p.name} encerrou as negociações.` : r.text);
            setAtt(att + 1);
            if (r.ok) {
              if (free) mutate((s) => { s.pending = { playerId: pid, kind: "livre", fee: 0, clubAgreed: true }; });
              setStage("confirmar");
              setReply("");
            }
          }}>Oferecer contrato</button>
        </>
      )}
      {stage === "confirmar" && (
        <>
          <div className="mm-card mb-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Tipo</span><b>{free ? "Jogador livre" : kind === "compra" ? "Compra" : "Empréstimo"}</b></div>
            {!free && <div className="flex justify-between"><span>{kind === "compra" ? "Valor" : "Taxa"}</span><b>{money(fee)}</b></div>}
            {kind === "emprestimo" && !free && <div className="flex justify-between"><span>Opção de compra</span><b>{money(opt)}</b></div>}
            <div className="flex justify-between"><span>Salário</span><b>{money(c.wage)}/mês{kind === "emprestimo" && !free ? ` (você paga ${wagePct}%)` : ""}</b></div>
            <div className="flex justify-between"><span>Luvas</span><b>{money(c.luvas)}</b></div>
            <div className="flex justify-between"><span>Bônus por gol</span><b>{money(c.goalBonus)}</b></div>
            <div className="flex justify-between"><span>Duração</span><b>{kind === "emprestimo" && !free ? "1 temporada" : `${c.years} temporada(s)`}</b></div>
            <div className="flex justify-between border-t pt-1"><span>Orçamento após</span><b>{money(me.transferBudget - fee - c.luvas)}</b></div>
          </div>
          <button className="mm-btn-primary w-full min-h-14" onClick={() => {
            let r = { ok: false, text: "" };
            mutate((s) => { r = finishSigning(s, c); });
            notify(r.text);
            if (r.ok) onClose(); else setReply(r.text);
          }}>✅ Confirmar contratação</button>
          {reply && <p className="mt-2 rounded-lg bg-destructive/20 p-2 text-sm">{reply}</p>}
          <button className="mm-btn-ghost mt-2 w-full" onClick={() => { mutate((s) => { s.pending = null; }); onClose(); }}>Cancelar negociação</button>
        </>
      )}
    </Sheet>
  );
}
