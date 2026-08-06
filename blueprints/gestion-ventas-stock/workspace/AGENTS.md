# Gestión de Ventas y Stock — agent instructions

PWA mobile-first para un emprendimiento de dos personas: registra ventas, descuenta stock, anota
inversión en tela/mano de obra y comparte cada venta por WhatsApp. Google Sheets es la única base de
datos, detrás de una interfaz `DataRepo`.

## Commands

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Dev server | `pnpm dev` — http://localhost:3000 |
| Build | `pnpm build` |
| Typecheck | `pnpm typecheck` |
| Lint / format | `pnpm lint` · `pnpm format:check` |
| Unit tests | `pnpm test` |
| E2E | `pnpm test:e2e` |

## Non-negotiable

1. **`DataRepo` (`src/lib/data/repo.ts`) is the only door to storage.** Never call `googleapis` or a
   `*-repo.ts` file directly from `src/app/**` or `src/components/**`.
2. Every mutating Server Action re-validates its input with Zod, server-side, always.
3. Stock changes only go through `src/lib/data/stock.ts`'s retry-verify write — never negative, never
   double-decremented.
4. Never commit secrets, `.env`, or `.next/`.
5. Never mark a build step done with a failing gate command.

Full architecture, boundaries, and design tokens: see `CLAUDE.md` in this directory.
