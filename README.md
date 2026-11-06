# Delivery Management Platform

Delivery management for small and medium-sized delivery businesses:
an admin web app and a courier mobile app on top of Supabase.

> Status: **Phase 5 — courier app ready** (login, my/available/history, claim, start, complete, return, payment, Maps, realtime). Next: push notifications. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Workspace

| Path | What | Stack |
|------|------|-------|
| `apps/admin` | Admin web app | Next.js, Tailwind, shadcn/ui, Lucide |
| `apps/courier` | Courier mobile app | Expo, React Native, Expo Router |
| `packages/shared` | `@delivery/shared` — types, enums, zod schemas | TypeScript |
| `supabase` | Migrations, RLS, RPC functions, seed, tests | PostgreSQL |
| `docs` | Brief, design system, architecture, design references | — |

## Docs

- [Project brief](docs/PROJECT_BRIEF.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Architecture](docs/ARCHITECTURE.md)

## Requirements

- Node.js 22+
- pnpm 10 (`corepack enable`)
- Docker Desktop (local Supabase)

## Scripts

```bash
pnpm install
pnpm db:start       # local Supabase (API http://127.0.0.1:55321, DB port 55322)
pnpm db:reset       # re-apply migrations + seed
pnpm db:test        # pgTAP tests (RLS, RPCs, payments, notifications)
pnpm db:test:race   # concurrency test: N couriers claim one delivery
pnpm db:types       # generate TS types into packages/shared (after any migration change)
pnpm typecheck
pnpm test           # Vitest (shared package)
pnpm dev:admin      # Next.js admin → http://localhost:3000 (needs apps/admin/.env.local)
pnpm dev:courier    # Expo courier app (needs apps/courier/.env.local)
```

Admin env: copy `apps/admin/.env.example` to `apps/admin/.env.local` and fill it from `pnpm supabase status -o env` (`API_URL`, `PUBLISHABLE_KEY`, and the server-only `SECRET_KEY`).

Courier env: copy `apps/courier/.env.example` to `apps/courier/.env.local`. On a physical phone use your computer's LAN IP instead of `127.0.0.1` (phone and computer on the same Wi-Fi), then scan the QR code from `pnpm dev:courier` with Expo Go.

Local ports use 553xx to avoid clashing with other local Supabase projects.

### Local test accounts (seed only)

Defined in [supabase/seed.sql](supabase/seed.sql): one admin and three couriers on `@delivery.test`.
Never used outside local development.
