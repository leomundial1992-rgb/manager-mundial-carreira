import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { COUNTRIES } from "@/game/data";
import { createWorld, startCareer } from "@/game/world";
import { setGame } from "@/game/store";
import type { Difficulty, GameState } from "@/game/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/novo")({
  head: () => ({
    meta: [
      { title: "Nova carreira — Manager Mundial" },
      { name: "description", content: "Escolha país, divisão, clube e dificuldade para começar sua carreira de treinador." },
      { property: "og:title", content: "Nova carreira — Manager Mundial" },
      { property: "og:description", content: "Monte sua carreira de treinador em 12 países." },
    ],
  }),
  component: NewCareer,
});

const DIFFS: { id: Difficulty; label: string; d: string }[] = [
  { id: "facil", label: "Fácil", d: "Diretoria paciente, negociações mais fáceis" },
  { id: "normal", label: "Normal", d: "Equilíbrio" },
  { id: "dificil", label: "Difícil", d: "Clubes exigentes e diretoria cobra mais" },
  { id: "realista", label: "Realista", d: "Mercado duro e pouca paciência" },
];

function NewCareer() {
  const nav = useNavigate();
  const [country, setCountry] = useState("BRA");
  const [tier, setTier] = useState(0);
  const [club, setClub] = useState<string | null>(null);
  const [diff, setDiff] = useState<Difficulty>("normal");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  // preview world only for club names / rep ordering (deterministic list order)
  const [preview, setPreview] = useState<GameState | null>(null);
  useEffect(() => setPreview(createWorld("normal")), []);
  const c = COUNTRIES.find((x) => x.id === country)!;
  const clubs = preview ? preview.leagues[c.leagues[tier].id].clubs.map((id) => preview.clubs[id]).sort((a, b) => b.rep - a.rep) : [];

  const start = () => {
    if (!club) return;
    setBusy(true);
    setTimeout(() => {
      const st = createWorld(diff);
      const target = st.clubs.find((x) => x.name === club)!;
      startCareer(st, target.id, name.trim() || "Treinador", false);
      setGame(st);
      nav({ to: "/jogo" });
    }, 30);
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-6 pb-28">
      <Link to="/" className="mm-btn-ghost mb-4">← Voltar</Link>
      <h1 className="mb-4 font-display text-4xl font-bold">Nova carreira</h1>
      <label className="mb-1 block text-sm text-muted-foreground">Nome do treinador</label>
      <input className="mm-input mb-4" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" maxLength={30} />
      <h2 className="mb-2 font-display text-lg font-bold">País</h2>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {COUNTRIES.map((x) => (
          <button key={x.id} onClick={() => { setCountry(x.id); setTier(0); setClub(null); }} className={cn("mm-card py-2 text-sm", country === x.id && "border-primary")}>
            <div className="text-2xl">{x.flag}</div>{x.name}
          </button>
        ))}
      </div>
      <h2 className="mb-2 font-display text-lg font-bold">Campeonato / divisão</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        {c.leagues.map((l, i) => (
          <button key={l.id} onClick={() => { setTier(i); setClub(null); }} className={cn("mm-chip", tier === i ? "border-primary bg-primary text-primary-foreground" : "bg-secondary")}>{l.name}</button>
        ))}
      </div>
      <h2 className="mb-2 font-display text-lg font-bold">Clube</h2>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {clubs.map((x) => (
          <button key={x.id} onClick={() => setClub(x.name)} className={cn("mm-card flex items-center justify-between text-left text-sm", club === x.name && "border-primary")}>
            <span className="truncate font-semibold">{x.name}</span>
            <span className="text-xs text-muted-foreground">{"★".repeat(Math.max(1, Math.round(x.rep / 20)))}</span>
          </button>
        ))}
      </div>
      <h2 className="mb-2 font-display text-lg font-bold">Dificuldade</h2>
      <div className="mb-6 grid grid-cols-2 gap-2">
        {DIFFS.map((d) => (
          <button key={d.id} onClick={() => setDiff(d.id)} className={cn("mm-card text-left", diff === d.id && "border-primary")}>
            <div className="font-bold">{d.label}</div><div className="text-xs text-muted-foreground">{d.d}</div>
          </button>
        ))}
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-4">
        <button disabled={!club || busy} onClick={start} className="mm-btn-primary w-full min-h-14 text-lg">{busy ? "Criando mundo…" : club ? `Assumir o ${club}` : "Escolha um clube"}</button>
      </div>
    </main>
  );
}
