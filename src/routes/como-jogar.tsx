import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/como-jogar")({
  head: () => ({
    meta: [
      { title: "Como jogar — Manager Mundial" },
      { name: "description", content: "Instruções para instalar o Manager Mundial no Android e continuar sua carreira." },
      { property: "og:title", content: "Como jogar — Manager Mundial" },
      { property: "og:description", content: "Instalação no celular, salvamento automático e dicas de jogo." },
    ],
  }),
  component: Help,
});

function Help() {
  const items: [string, string][] = [
    ["Instalar no Android", "Abra o jogo no Chrome, toque no menu ⋮ e escolha “Adicionar à tela inicial” ou “Instalar app”. O ícone do Manager Mundial aparece junto aos seus apps."],
    ["Salvamento automático", "Toda ação é salva automaticamente no próprio celular. Para continuar, abra o jogo e toque em “Continuar carreira”. Limpar os dados do navegador apaga o save."],
    ["Avançar o tempo", "No Início, toque em “Ir para a partida” quando houver jogo. Nada começa sem sua confirmação. Sem jogo na rodada, use “Avançar semana”."],
    ["Partidas", "Acompanhe lance a lance, mude velocidade, pule para o intervalo ou o fim. Substituições e mudanças táticas só valem depois que você confirma."],
    ["Mercado", "Use os olheiros para filtrar jogadores. Primeiro negocie com o clube, depois o contrato com o jogador, e por fim confirme. O orçamento e a folha são respeitados."],
    ["Treino", "Monte a semana de treinos e descansos. Intensidade forte evolui mais, mas cansa e aumenta o risco de lesão."],
    ["Patrocínios e finanças", "Compare propostas, negocie e aceite. As receitas entram mês a mês e os bônus no fim da temporada."],
  ];
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <Link to="/" className="mm-btn-ghost mb-4">← Voltar</Link>
      <h1 className="mb-4 font-display text-4xl font-bold">Como jogar</h1>
      {items.map(([t, d]) => (
        <div key={t} className="mm-card mb-3">
          <h2 className="font-display text-xl font-bold text-primary">{t}</h2>
          <p className="text-sm text-muted-foreground">{d}</p>
        </div>
      ))}
    </main>
  );
}
