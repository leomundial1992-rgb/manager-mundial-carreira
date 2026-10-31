import { Link } from "@tanstack/react-router";
import type { GameState } from "@/game/types";
import { MessageActions } from "./News";
import { mutate } from "@/game/store";
import { finishDay } from "@/game/engine";

export function Unemployed({ st }: { st: GameState }) {
  const offers = st.messages.filter((m) => m.action?.type === "jobOffer" && !m.action.done);
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <h1 className="font-display text-3xl font-bold">Sem clube</h1>
      <p className="mb-4 text-muted-foreground">{st.coach.name}, você está desempregado. Reputação: {Math.round(st.coach.rep)}. Aceite uma proposta para voltar ao trabalho.</p>
      {offers.map((m) => (
        <div key={m.id} className="mm-card mb-2"><div className="font-semibold">{m.title}</div><p className="text-sm">{m.body}</p><MessageActions st={st} m={m} /></div>
      ))}
      {!offers.length && <p className="mm-card mb-3 text-sm">Nenhuma proposta no momento. Avance o tempo para receber novas ofertas.</p>}
      <button className="mm-btn-ghost mb-2 w-full" onClick={() => mutate((s) => { finishDay(s); if (Math.random() < 0.5) { const c = s.clubs.filter((x) => Math.abs(x.rep - s.coach.rep + 6) < 10); const club = c[Math.floor(Math.random() * c.length)]; if (club) s.messages.unshift({ id: s.nextMsgId++, season: s.season, day: s.day, title: `Proposta de emprego: ${club.name}`, body: `O ${club.name} quer você como treinador.`, kind: "emprego", action: { type: "jobOffer", clubId: club.id } }); } })}>Aguardar uma semana</button>
      <Link to="/" className="mm-btn-ghost w-full">Menu principal</Link>
    </main>
  );
}
