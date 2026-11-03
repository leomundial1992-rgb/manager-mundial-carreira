<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Game logic lives in `src/game/` as pure TS (world, match, engine, market, sponsors); UI in `src/components/game/` only calls these via `mutate()` from `src/game/store.ts` — keeps the simulation testable without React.
- Careers are saved client-side in IndexedDB (state is ~4–5 MB, too big for localStorage); no backend is used.
- One live game route (`/jogo`) with in-component tabs; cross-component navigation/toasts go through `src/game/events.ts` custom events to avoid importing route files.
- Installability is manifest-only (`public/manifest.webmanifest`); no service worker.
- Shared button/card styles are Tailwind v4 `@utility` classes (`mm-*`) in `src/styles.css`; `@apply` of custom classes inside `@layer` breaks the build.
