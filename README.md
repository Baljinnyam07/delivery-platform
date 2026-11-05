# Delivery Management Platform

Delivery management for small and medium-sized delivery businesses:
an admin web app and a courier mobile app on top of Supabase.

> Status: **Phase 0 — architecture proposal.** See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

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
- Supabase CLI (Phase 1)

## Scripts

```bash
pnpm dev:admin      # Next.js admin
pnpm dev:courier    # Expo courier app
pnpm build:admin
pnpm typecheck
```
