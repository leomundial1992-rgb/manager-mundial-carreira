import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home as HomeIcon, Users, Trophy, ShoppingCart, LayoutGrid, Bell } from "lucide-react";
import { getGame, loadSave, setGame, useGame } from "@/game/store";
import { Crest, Toast } from "@/components/game/ui";
import { HomeScreen } from "@/components/game/Home";
import { SquadScreen } from "@/components/game/Squad";
import { CompetitionsScreen } from "@/components/game/Competitions";
import { MarketScreen } from "@/components/game/Market";
import { MoreScreen } from "@/components/game/More";
import { MatchCenter } from "@/components/game/Match";
import { NewsScreen } from "@/components/game/News";
import { Unemployed } from "@/components/game/Unemployed";
import { money } from "@/game/util";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jogo")({
  head: () => ({
    meta: [
      { title: "Carreira — Manager Mundial" },
      { name: "description", content: "Sua carreira de treinador: elenco, jogos, mercado e clube." },
      { property: "og:title", content: "Carreira — Manager Mundial" },
      { property: "og:description", content: "Gerencie seu clube rodada a rodada." },
    ],
  }),
  component: Game,
});

type TabId = "home" | "squad" | "comps" | "market" | "more" | "news";


function Game() {
  const st = useGame();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("home");
  const [sub, setSub] = useState<string | undefined>();
  const [match, setMatch] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (getGame()) { setLoading(false); return; }
    loadSave().then((s) => {
      if (s) setGame(s); else nav({ to: "/" });
      setLoading(false);
    });
  }, [nav]);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const h = (e: Event) => { setToast((e as CustomEvent).detail); clearTimeout(t); t = setTimeout(() => setToast(null), 2600); };
    const g = (e: Event) => { const d = (e as CustomEvent).detail; setTab(d.tab); setSub(d.sub); if (d.tab === "match") { setMatch(true); setTab("home"); } window.scrollTo(0, 0); };
    window.addEventListener("mm-toast", h);
    window.addEventListener("mm-tab", g);
    return () => { window.removeEventListener("mm-toast", h); window.removeEventListener("mm-tab", g); };
  }, []);

  if (loading || !st) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando carreira…</div>;
  if (st.userClub === null) return <><Unemployed st={st} /><Toast text={toast} /></>;
  const club = st.clubs[st.userClub];
  const unread = st.messages.filter((m) => !m.read).length;

  if (match) return <><MatchCenter onClose={() => setMatch(false)} /><Toast text={toast} /></>;

  const nav5: { id: TabId; label: string; icon: typeof HomeIcon }[] = [
    { id: "home", label: "Início", icon: HomeIcon },
    { id: "squad", label: "Elenco", icon: Users },
    { id: "comps", label: "Jogos", icon: Trophy },
    { id: "market", label: "Mercado", icon: ShoppingCart },
    { id: "more", label: "Clube", icon: LayoutGrid },
  ];
  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 py-2.5 backdrop-blur">
        <Crest club={club} size={34} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-bold leading-tight">{club.name}</div>
          <div className="truncate text-xs text-muted-foreground">Temporada {st.season} · {st.schedule[st.day]?.label ?? "Fim"} · Saldo {money(club.balance)}</div>
        </div>
        <button onClick={() => setTab("news")} className="relative mm-btn-ghost min-h-10 px-3" aria-label="Notícias">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">{unread}</span>}
        </button>
      </header>
      <main className="px-4 pt-4">
        {tab === "home" && <HomeScreen st={st} onMatch={() => setMatch(true)} />}
        {tab === "squad" && <SquadScreen st={st} initial={sub} />}
        {tab === "comps" && <CompetitionsScreen st={st} />}
        {tab === "market" && <MarketScreen st={st} initialPlayer={sub ? Number(sub) : undefined} />}
        {tab === "more" && <MoreScreen st={st} initial={sub} />}
        {tab === "news" && <NewsScreen st={st} />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {nav5.map((n) => (
            <button key={n.id} onClick={() => { setTab(n.id); setSub(undefined); window.scrollTo(0, 0); }} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold", tab === n.id ? "text-primary" : "text-muted-foreground")}>
              <n.icon className="h-6 w-6" />
              {n.label}
            </button>
          ))}
        </div>
      </nav>
      <Toast text={toast} />
    </div>
  );
}
