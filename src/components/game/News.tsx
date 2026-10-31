import { useEffect } from "react";
import type { GameState, Message } from "@/game/types";
import { mutate } from "@/game/store";
import { acceptJob } from "@/game/engine";
import { sellTo } from "@/game/market";
import { goTab, notify } from "@/routes/jogo";
import { money } from "@/game/util";
import { Section } from "./ui";

const ICON: Record<Message["kind"], string> = { noticia: "📰", proposta: "💼", diretoria: "🏛️", patrocinio: "🤝", torcida: "📣", lesao: "🩹", emprego: "🧥", contrato: "📝" };

export function MessageActions({ st, m }: { st: GameState; m: Message }) {
  const a = m.action;
  if (!a) return null;
  if (a.type === "openPlayer") return <button className="mm-btn-primary mt-2 w-full" onClick={() => goTab("market", String(a.playerId))}>Abrir negociação</button>;
  if (a.type === "offerForPlayer") {
    const p = st.players[a.playerId];
    if (a.done || !p || p.club !== st.userClub) return <p className="mt-2 text-xs text-muted-foreground">Proposta encerrada.</p>;
    return (
      <div className="mt-2 flex gap-2">
        <button className="mm-btn-primary flex-1" onClick={() => {
          if (!confirm(`Confirmar ${a.loan ? "empréstimo" : "venda"} de ${p.name} ao ${st.clubs[a.fromClub].name} por ${money(a.fee)}?`)) return;
          mutate((s) => { sellTo(s, a.playerId, a.fromClub, a.fee, a.loan); (s.messages.find((x) => x.id === m.id)!.action as typeof a).done = true; });
          notify("Negócio concluído.");
        }}>Aceitar</button>
        <button className="mm-btn-ghost flex-1" onClick={() => mutate((s) => { (s.messages.find((x) => x.id === m.id)!.action as typeof a).done = true; s.players[a.playerId].mor = Math.min(100, s.players[a.playerId].mor + 2); })}>Recusar</button>
      </div>
    );
  }
  if (a.type === "jobOffer") {
    if (a.done) return <p className="mt-2 text-xs text-muted-foreground">Proposta encerrada.</p>;
    return (
      <div className="mt-2 flex gap-2">
        <button className="mm-btn-primary flex-1" onClick={() => {
          if (!confirm(`Deixar o clube atual e assumir o ${st.clubs[a.clubId].name}?`)) return;
          mutate((s) => { acceptJob(s, a.clubId); (s.messages.find((x) => x.id === m.id)!.action as typeof a).done = true; });
          goTab("home");
        }}>Aceitar emprego</button>
        <button className="mm-btn-ghost flex-1" onClick={() => mutate((s) => { (s.messages.find((x) => x.id === m.id)!.action as typeof a).done = true; })}>Recusar</button>
      </div>
    );
  }
  return null;
}

export function NewsScreen({ st }: { st: GameState }) {
  useEffect(() => {
    const t = setTimeout(() => mutate((s) => s.messages.forEach((m) => (m.read = true))), 800);
    return () => clearTimeout(t);
  }, []);
  return (
    <Section title="Notícias e caixa de entrada">
      {st.messages.map((m) => (
        <div key={m.id} className={`mm-card mb-2 ${m.read ? "" : "border-primary"}`}>
          <div className="flex items-start gap-2">
            <span className="text-xl">{ICON[m.kind]}</span>
            <div className="flex-1">
              <div className="font-semibold">{m.title}</div>
              <div className="text-xs text-muted-foreground">Temporada {m.season} · semana {m.day + 1}</div>
              <p className="mt-1 text-sm">{m.body}</p>
              <MessageActions st={st} m={m} />
            </div>
          </div>
        </div>
      ))}
    </Section>
  );
}
