# Aplicar o que combinamos: elencos reais + reunião com a diretoria

## 1. Elencos reais (50 clubes do seu arquivo + São Paulo)
- Ler o arquivo enviado e transformar cada clube em lista de jogadores (nome, posição, nota quando informada).
- Ligar cada clube do arquivo ao clube do jogo (corrigindo grafias, ex.: "Como 1907" → "Como"). Clubes do arquivo que não existem no jogo (ex.: times do Norte, Série D) entram na divisão mais adequada do país, substituindo um clube gerado.
- Notas explícitas do arquivo são mantidas exatamente. Jogadores sem nota recebem nota conforme a força do clube/divisão.
- Posições faltantes completadas com jogadores gerados até o elenco mínimo (2 goleiros, defesa, meio, ataque).
- Nenhum jogador duplicado ou removido; demais clubes continuam com jogadores gerados por país.

## 2. Nota x Potencial por idade
- Até 21 anos: nota atual abaixo, potencial bem acima (+8 a +16).
- 22–25: potencial +2 a +6. 26–29: potencial ≈ nota. 30+: potencial = nota (tende a cair).
- Idade estimada quando não informada.

## 3. Reunião com a diretoria (Clube → Diretoria)
- Pedidos: aumentar teto da folha salarial, aumentar orçamento de transferências.
- Você escolhe o tamanho do pedido (+10%, +20%, +35%) e um argumento (resultados, objetivo, vender jogador depois).
- Resposta depende de confiança da diretoria, saldo em caixa e posição na tabela: aprova, aprova parcialmente ou recusa.
- Recusa custa um pouco de confiança; só 1 pedido a cada 8 rodadas. Confirmação antes de enviar.

## 4. Carreiras salvas
- Elencos reais valem para carreiras novas (inclusive a demo). Carreiras salvas seguem funcionando, com a reunião da diretoria disponível.

## Detalhes técnicos
- Script em /tmp converte o markdown em `src/game/realSquads.ts` (`REAL_SQUADS: Record<clubName, RefPlayer[]>`); `addCountry` usa `refPlayer` quando o clube existe ali, completando com `SQUAD_TEMPLATE`.
- Novos nomes de clubes adicionados a `c.clubs` em `data.ts` para entrar na geração.
- `requestBoard(st, kind, pct, arg)` em `engine.ts`; `board.lastRequestDay` em types; UI em `More.tsx`.
- Testes: notas do arquivo preservadas (ex.: Carnesecchi 70), sem duplicados, pedido recusado sem caixa, limite de 8 rodadas.
