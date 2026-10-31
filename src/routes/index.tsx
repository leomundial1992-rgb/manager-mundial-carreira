import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play, Plus, BookOpen, Trash2 } from "lucide-react";
import { deleteSave, hasSaveHint, loadSave, setGame } from "@/game/store";
import { createWorld, startCareer } from "@/game/world";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Manager Mundial — Jogo de treinador de futebol" },
      { name: "description", content: "Comande clubes de 12 países: escalação, táticas, mercado, patrocínios, finanças e várias temporadas." },
      { property: "og:title", content: "Manager Mundial" },
      { property: "og:description", content: "Jogo de gerenciamento de futebol para celular, em português." },
    ],
  }),
  component: Index,
});

function Index() {
  const nav = useNavigate();
  const [hasSave, setHasSave] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setHasSave(hasSaveHint()), []);

  const cont = async () => {
    setBusy(true);
    const s = await loadSave();
    if (s) { setGame(s); nav({ to: "/jogo" }); } else { setHasSave(false); setBusy(false); }
  };
  const demo = () => {
    if (hasSave && !confirm("Isso substitui a carreira salva. Continuar?")) return;
    setBusy(true);
    setTimeout(() => {
      const st = createWorld("realista");
      const sp = st.clubs.find((c) => c.name === "São Paulo")!;
      startCareer(st, sp.id, "Treinador", true);
      setGame(st);
      nav({ to: "/jogo" });
    }, 30);
  };

  return (
    <main className="mm-hero flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <img src="/icon-512.png" alt="Manager Mundial" width={140} height={140} className="mb-4 rounded-3xl" />
      <h1 className="font-display text-5xl font-extrabold uppercase tracking-tight">Manager <span className="text-primary">Mundial</span></h1>
      <p className="mt-2 text-center text-muted-foreground">12 países · 35 divisões · copas e continentais</p>
      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        {hasSave && <button disabled={busy} onClick={cont} className="mm-btn-primary min-h-14 text-lg"><Play className="h-5 w-5" /> Continuar carreira</button>}
        <button disabled={busy} onClick={demo} className={hasSave ? "mm-btn-ghost min-h-14" : "mm-btn-primary min-h-14 text-lg"}>⚽ Carreira demo: São Paulo FC</button>
        <Link to="/novo" className="mm-btn-ghost min-h-14"><Plus className="h-5 w-5" /> Nova carreira</Link>
        <Link to="/como-jogar" className="mm-btn-ghost"><BookOpen className="h-5 w-5" /> Como jogar e instalar</Link>
        {hasSave && <button onClick={async () => { if (confirm("Apagar a carreira salva?")) { await deleteSave(); setHasSave(false); } }} className="mm-btn text-muted-foreground"><Trash2 className="h-4 w-4" /> Apagar carreira salva</button>}
        {busy && <p className="text-center text-sm text-muted-foreground">Carregando o mundo do futebol…</p>}
      </div>
    </main>
  );
}
