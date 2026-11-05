import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Facilities, GameState } from "@/game/types";
import { mutate, saveNow } from "@/game/store";
import { DEF_FOCUS, TRAINING_TYPES, userWages, add, msg } from "@/game/engine";
import { negotiateSponsor } from "@/game/sponsors";
import { donate } from "@/game/market";
import { SPONSOR_SLOTS } from "@/game/data";
import { money } from "@/game/util";
import { notify } from "@/game/events";
import { sortedTable } from "@/game/world";
import { Bar, Crest, Section, Stat } from "./ui";
import { cn } from "@/lib/utils";

const ITEMS = [
  { id: "taticas", label: "Táticas", icon: "📋" }, { id: "treino", label: "Treinamento", icon: "🏃" },
  { id: "patrocinios", label: "Patrocínios", icon: "🤝" }, { id: "financas", label: "Finanças", icon: "💰" },
  { id: "estadio", label: "Estádio e estrutura", icon: "🏟️" }, { id: "diretoria", label: "Diretoria e torcida", icon: "🏛️" },
  { id: "historico", label: "Histórico", icon: "📜" },
];

export function MoreScreen({ st, initial }: { st: GameState; initial?: string }) {
  const [view, setView] = useState<string | null>(initial ?? null);
  if (view === "taticas") { window.dispatchEvent(new CustomEvent("mm-tab", { detail: { tab: "squad", sub: "taticas" } })); return null; }
  if (!view)
    return (
      <div>
        <div className="grid grid-cols-2 gap-2">
          {ITEMS.map((i) => <button key={i.id} onClick={() => setView(i.id)} className="mm-card flex min-h-24 flex-col items-center justify-center gap-1 text-center font-semibold"><span className="text-3xl">{i.icon}</span>{i.label}</button>)}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button className="mm-btn-ghost" onClick={async () => { await saveNow(); notify("Carreira salva"); }}>💾 Salvar agora</button>
          <Link to="/" className="mm-btn-ghost">Menu principal</Link>
        </div>
      </div>
    );
  return (
    <div>
      <button className="mm-btn-ghost mb-3" onClick={() => setView(null)}>← Clube</button>
      {view === "treino" && <Training st={st} />}
      {view === "patrocinios" && <Sponsors st={st} />}
      {view === "financas" && <Finance st={st} />}
      {view === "estadio" && <Stadium st={st} />}
      {view === "diretoria" && <Board st={st} />}
      {view === "historico" && <History st={st} />}
    </div>
  );
}

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
function Training({ st }: { st: GameState }) {
  const t = st.training;
  return (
    <div>
      <Section title="Semana de treinos">
        <div className="mm-card space-y-2">
          {t.week.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-10 font-bold">{DAYS[i]}</span>
              <select className="mm-input flex-1" value={s} onChange={(e) => mutate((x) => { x.training.week[i] = e.target.value; })}>{TRAINING_TYPES.map((o) => <option key={o}>{o}</option>)}</select>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Intensidade">
        <div className="grid grid-cols-3 gap-2">
          {(["leve", "normal", "forte"] as const).map((i) => <button key={i} onClick={() => mutate((x) => { x.training.intensity = i; })} className={cn("mm-btn-ghost capitalize", t.intensity === i && "border-primary text-primary")}>{i}</button>)}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Forte: mais evolução, mais cansaço e risco de lesão. Leve: recuperação rápida.</p>
      </Section>
      <Section title="Foco do treino de defesa">
        <select className="mm-input" value={t.defFocus} onChange={(e) => mutate((x) => { x.training.defFocus = e.target.value; })}>{Object.keys(DEF_FOCUS).map((o) => <option key={o}>{o}</option>)}</select>
      </Section>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Entrosamento" value={`${Math.round(st.cohesion)}%`} sub="sobe com Entrosamento e Tática" />
        <Stat label="Físico médio" value={`${Math.round(st.clubs[st.userClub!].players.reduce((a, id) => a + st.players[id].fit, 0) / st.clubs[st.userClub!].players.length)}%`} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">O treino é aplicado a cada semana avançada: melhora atributos ligados ao foco (mais em jovens com potencial), altera o físico e pode causar lesões.</p>
    </div>
  );
}

function Sponsors({ st }: { st: GameState }) {
  const [cmp, setCmp] = useState<string>("master");
  const offers = st.sponsorOffers.filter((o) => o.slot === cmp);
  return (
    <div>
      <Section title="Contratos ativos">
        <div className="mm-card">
          {st.sponsors.map((s) => (
            <div key={s.id} className="border-b py-2 text-sm last:border-b-0">
              <div className="flex justify-between"><b style={{ color: s.color }}>{s.company}</b><span>{SPONSOR_SLOTS.find((x) => x.id === s.slot)?.name}</span></div>
              <div className="text-muted-foreground">{money(s.value)}/temp. ({s.payment}) · restam {s.left} temp. · Meta: {s.goal.text} (+{money(s.bonus)})</div>
            </div>
          ))}
          {!st.sponsors.length && <p className="text-sm text-muted-foreground">Nenhum patrocínio ativo.</p>}
        </div>
      </Section>
      <Section title="Propostas — compare por categoria">
        <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4">
          {SPONSOR_SLOTS.map((s) => <button key={s.id} onClick={() => setCmp(s.id)} className={cn("mm-chip shrink-0", cmp === s.id ? "border-primary bg-primary text-primary-foreground" : "bg-secondary")}>{s.name}</button>)}
        </div>
        {st.sponsors.some((s) => s.slot === cmp) && <p className="mm-card mb-2 text-sm">Categoria já ocupada por contrato ativo.</p>}
        {offers.map((o) => (
          <div key={o.id} className="mm-card mb-2">
            <div className="mb-1 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg font-display font-bold" style={{ background: o.color }}>{o.company[0]}</span><b className="text-lg">{o.company}</b></div>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <span className="text-muted-foreground">Valor fixo/temporada</span><b>{money(o.value)}</b>
              <span className="text-muted-foreground">Duração</span><b>{o.years} temporada(s)</b>
              <span className="text-muted-foreground">Pagamento</span><b className="capitalize">{o.payment}</b>
              <span className="text-muted-foreground">Bônus</span><b>{money(o.bonus)}</b>
              <span className="text-muted-foreground">Meta</span><b>{o.goal.text}</b>
              <span className="text-muted-foreground">Multa por descumprir</span><b>{o.penalty ? money(o.penalty) : "Nenhuma"}</b>
            </div>
            <div className="mt-2 flex gap-2">
              <button className="mm-btn-primary flex-1" disabled={st.sponsors.some((s) => s.slot === o.slot)} onClick={() => {
                if (!confirm(`Assinar com ${o.company}?`)) return;
                mutate((s) => {
                  s.sponsors.push({ ...o, left: o.years, start: s.season });
                  s.sponsorOffers = s.sponsorOffers.filter((x) => x.slot !== o.slot);
                  if (o.payment === "anual") add(s, "inc", "Patrocínios", o.value);
                  msg(s, `Novo patrocinador: ${o.company}`, `Contrato de ${money(o.value)}/temporada por ${o.years} temporada(s).`, "patrocinio");
                });
                notify("Patrocínio assinado!");
              }}>Aceitar</button>
              <button className="mm-btn-ghost flex-1" onClick={() => { let r = ""; mutate((s) => { r = negotiateSponsor(s, o.id); }); notify(r === "melhorou" ? "A empresa melhorou a proposta!" : r === "recusou" ? "A empresa manteve os valores." : "A empresa desistiu da negociação."); }}>Negociar</button>
              <button className="mm-btn-ghost" onClick={() => mutate((s) => { s.sponsorOffers = s.sponsorOffers.filter((x) => x.id !== o.id); })}>Rejeitar</button>
            </div>
          </div>
        ))}
        {!offers.length && !st.sponsors.some((s) => s.slot === cmp) && <p className="mm-card text-sm text-muted-foreground">Sem propostas nesta categoria. Novas chegam no início da temporada.</p>}
      </Section>
    </div>
  );
}

function Finance({ st }: { st: GameState }) {
  const me = st.clubs[st.userClub!];
  const ledger = [...st.ledger].reverse().filter((l) => Object.keys(l.inc).length || Object.keys(l.exp).length);
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  const last = ledger[0];
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Stat label="Saldo bancário" value={money(me.balance)} />
        <Stat label="Orçamento transferências" value={money(me.transferBudget)} />
        <Stat label="Folha salarial (mês)" value={money(userWages(st))} sub={`limite ${money(me.wageBudget)}`} />
        <Stat label="Resultado último mês" value={last ? money(sum(last.inc) - sum(last.exp)) : "-"} />
      </div>
      <Section title="Ajustar orçamento">
        <div className="mm-card text-sm">
          <p className="mb-2 text-muted-foreground">Transfira verba entre transferências e saldo do clube.</p>
          <div className="flex gap-2">
            <button className="mm-btn-ghost flex-1" onClick={() => mutate((s) => { const c = s.clubs[s.userClub!]; const v = Math.min(c.transferBudget, 2_000_000); c.transferBudget -= v; })}>− R$ 2 mi</button>
            <button className="mm-btn-ghost flex-1" onClick={() => { if (me.balance - me.transferBudget < 2_000_000) return notify("A diretoria não libera: saldo insuficiente."); mutate((s) => { s.clubs[s.userClub!].transferBudget += 2_000_000; }); }}>+ R$ 2 mi</button>
          </div>
        </div>
      </Section>
      <DonationBox st={st} />
      <Section title="Relatórios mensais">
        {ledger.slice(0, 12).map((l, i) => (
          <details key={i} className="mm-card mb-2" open={i === 0}>
            <summary className="flex cursor-pointer justify-between font-semibold"><span>{l.season} · mês {l.month + 1}</span><span className={sum(l.inc) - sum(l.exp) >= 0 ? "text-success" : "text-destructive"}>{money(sum(l.inc) - sum(l.exp))}</span></summary>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div><div className="mb-1 font-bold text-success">Receitas</div>{Object.entries(l.inc).map(([k, v]) => <div key={k} className="flex justify-between"><span>{k}</span><span>{money(v)}</span></div>)}</div>
              <div><div className="mb-1 font-bold text-destructive">Despesas</div>{Object.entries(l.exp).map(([k, v]) => <div key={k} className="flex justify-between"><span>{k}</span><span>{money(v)}</span></div>)}</div>
            </div>
          </details>
        ))}
        {!ledger.length && <p className="mm-card text-sm text-muted-foreground">Os relatórios aparecem após o primeiro mês.</p>}
      </Section>
    </div>
  );
}

const FAC: { k: keyof Facilities; name: string; d: string }[] = [
  { k: "stadium", name: "Estádio", d: "Aumenta a capacidade e a bilheteria" },
  { k: "training", name: "Centro de treinamento", d: "Acelera a evolução nos treinos" },
  { k: "medical", name: "Departamento médico", d: "Menos lesões e recuperação mais rápida" },
  { k: "youth", name: "Categorias de base", d: "Mais e melhores jovens a cada temporada" },
  { k: "scouting", name: "Departamento de olheiros", d: "Estimativa de potencial mais precisa" },
];
export const upgradeCost = (lvl: number, k: keyof Facilities) => Math.round((k === "stadium" ? 30e6 : 10e6) * lvl * lvl / 2);

function Stadium({ st }: { st: GameState }) {
  const me = st.clubs[st.userClub!];
  return (
    <div>
      <div className="mm-card mb-3"><div className="text-sm text-muted-foreground">Capacidade do estádio</div><div className="font-display text-3xl font-bold">{me.capacity.toLocaleString("pt-BR")} lugares</div></div>
      {FAC.map((f) => {
        const lvl = me.fac[f.k];
        const cost = upgradeCost(lvl, f.k);
        return (
          <div key={f.k} className="mm-card mb-2">
            <div className="flex justify-between"><b>{f.name}</b><span>Nível {lvl}/5</span></div>
            <Bar value={lvl} max={5} />
            <p className="my-1 text-xs text-muted-foreground">{f.d}. Manutenção sobe com o nível.</p>
            <button className="mm-btn-ghost w-full" disabled={lvl >= 5 || me.balance < cost} onClick={() => {
              if (!confirm(`Investir ${money(cost)} em ${f.name}?`)) return;
              mutate((s) => { const c = s.clubs[s.userClub!]; c.fac[f.k]++; add(s, "exp", "Obras e melhorias", cost); if (f.k === "stadium") c.capacity = Math.round(c.capacity * 1.15 / 500) * 500; });
              notify(`${f.name} melhorado!`);
            }}>{lvl >= 5 ? "Nível máximo" : `Melhorar (${money(cost)})`}</button>
          </div>
        );
      })}
    </div>
  );
}

function Board({ st }: { st: GameState }) {
  const me = st.clubs[st.userClub!];
  const pos = sortedTable(st.leagues[me.league]).indexOf(me.id) + 1;
  const mood = st.board.fans >= 70 ? "A torcida está empolgada e lota o estádio." : st.board.fans >= 45 ? "A torcida apoia, mas cobra resultados." : "A torcida protesta e pede mudanças!";
  return (
    <div>
      <div className="mm-card mb-3 space-y-3">
        <p><span className="text-muted-foreground">Objetivo da temporada:</span><br /><b className="text-lg">{st.board.objective.text}</b></p>
        <p className="text-sm">Situação atual: <b>{pos}º lugar</b></p>
        <div><div className="mb-1 flex justify-between text-sm"><span>Confiança da diretoria</span><b>{st.board.confidence}%</b></div><Bar value={st.board.confidence} tone={st.board.confidence < 30 ? "destructive" : "primary"} /></div>
        <p className="text-xs text-muted-foreground">Abaixo de 8% você pode ser demitido. Cumprir o objetivo garante +25% no fim da temporada.</p>
      </div>
      <div className="mm-card mb-3 space-y-2">
        <div className="mb-1 flex justify-between text-sm"><span>Humor da torcida</span><b>{st.board.fans}%</b></div><Bar value={st.board.fans} tone="gold" />
        <p className="text-sm">{mood}</p>
        <p className="text-xs text-muted-foreground">Reage a resultados, contratações de peso, vendas de ídolos e títulos. Influencia bilheteria e patrocínios.</p>
      </div>
      <div className="mm-card space-y-1 text-sm">
        <div className="font-display text-xl font-bold">{st.coach.name}</div>
        <div className="flex justify-between"><span>Reputação</span><b>{Math.round(st.coach.rep)}/99</b></div>
        <div className="flex justify-between"><span>Contrato</span><b>{st.coach.contract} temporada(s)</b></div>
        <div className="flex justify-between"><span>Salário</span><b>{money(st.coach.wage)}/mês</b></div>
        <div className="flex justify-between"><span>Títulos</span><b>{st.coach.titles.length}</b></div>
        <div className="flex justify-between"><span>Dificuldade</span><b className="capitalize">{st.difficulty}</b></div>
      </div>
    </div>
  );
}

function History({ st }: { st: GameState }) {
  return (
    <div>
      <Section title="Títulos do treinador">
        <div className="mm-card">{st.coach.titles.map((t, i) => <div key={i} className="border-b py-1.5 text-sm last:border-b-0">🏆 {t.season} · {t.name} · {st.clubs[t.club].name}</div>)}{!st.coach.titles.length && <p className="text-sm text-muted-foreground">Nenhum título ainda.</p>}</div>
      </Section>
      <Section title="Carreira">
        <div className="mm-card">{st.coach.history.map((h, i) => <div key={i} className="flex items-center gap-2 border-b py-2 text-sm last:border-b-0"><Crest club={st.clubs[h.club]} size={24} /><span className="flex-1">{h.season} · {st.clubs[h.club].name} · {h.league}</span><b>{h.pos}º</b></div>)}{!st.coach.history.length && <p className="text-sm text-muted-foreground">Primeira temporada em andamento.</p>}</div>
      </Section>
      <Section title="Campeões">
        <div className="mm-card max-h-96 overflow-y-auto">{[...st.honours].reverse().slice(0, 80).map((h, i) => <div key={i} className="flex justify-between border-b py-1.5 text-sm last:border-b-0"><span>{h.season} · {h.comp}</span><b>{st.clubs[h.club].name}</b></div>)}{!st.honours.length && <p className="text-sm text-muted-foreground">Os campeões aparecem conforme as competições terminam.</p>}</div>
      </Section>
    </div>
  );
}

function DonationBox({ st }: { st: GameState }) {
  const me = st.clubs[st.userClub!];
  const [q, setQ] = useState("");
  const [club, setClub] = useState<number | null>(null);
  const [mi, setMi] = useState(1);
  const [confirm, setConfirm] = useState(false);
  const found = q.length >= 2 ? st.clubs.filter((c) => c.id !== me.id && c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const amount = Math.round(mi * 1_000_000);
  return (
    <Section title="Doar dinheiro a outro clube">
      <div className="mm-card text-sm">
        <p className="mb-2 text-muted-foreground">Sai do saldo bancário. A diretoria perde um pouco de confiança com o gasto.</p>
        <input className="mm-input mb-2" placeholder="Buscar clube (ex.: Santos)" value={q} onChange={(e) => { setQ(e.target.value); setClub(null); setConfirm(false); }} />
        {found.map((c) => <button key={c.id} onClick={() => { setClub(c.id); setQ(c.name); }} className={cn("mm-chip mb-1 mr-1", club === c.id && "border-primary")}>{c.name}</button>)}
        <label className="mt-2 block text-xs text-muted-foreground">Valor (R$ mi)<input type="number" min={0.1} step={0.5} className="mm-input mt-1" value={mi} onChange={(e) => { setMi(Number(e.target.value)); setConfirm(false); }} /></label>
        {!confirm ? (
          <button className="mm-btn-primary mt-2 w-full" disabled={club === null || !(amount > 0)} onClick={() => setConfirm(true)}>Doar</button>
        ) : (
          <div className="mt-2 flex gap-2">
            <button className="mm-btn-ghost flex-1" onClick={() => setConfirm(false)}>Cancelar</button>
            <button className="mm-btn-primary flex-1" onClick={() => { let r = { ok: false, text: "" }; mutate((s) => { r = donate(s, club!, amount); }); notify(r.text); setConfirm(false); }}>Confirmar {money(amount)} ao {club !== null ? st.clubs[club].name : ""}</button>
          </div>
        )}
      </div>
    </Section>
  );
}
