# DARCYGRAPHiX — Printer/Signage Business System

Monorepo (pnpm workspaces) with two independently deployable TanStack Start frontends, one shared Convex backend, and a transient redirect Worker.

## Domains

| Surface                                   | URL                                 | Worker                    | Backend                           |
| ----------------------------------------- | ----------------------------------- | ------------------------- | --------------------------------- |
| Storefront, online ordering, drive shares | `https://darcygraphix.com`          | `darcygraphix-storefront` | shared Convex (`cool-wombat-664`) |
| Login, auth proxy, internal system        | `https://system.darcygraphix.com`   | `darcygraphix-system`     | shared Convex (`cool-wombat-664`) |
| Legacy redirect (migration window)        | `https://cfsystem.darcygraphix.com` | `cfsystem-redirect`       | —                                 |

Internal URLs are root-level (no `/app`): `/jo`, `/inventory`, `/cashflow`, `/drive`, `/newdrive`, `/trello`, `/admin`. Old `/app/*` and `cfsystem.darcygraphix.com` links redirect. Public shares live at `/share/$token/{-$itemId}` on the public domain. Development Convex deployment: `rosy-rabbit-645`.

## Packages

- `apps/storefront` — `@dg/storefront`: marketing site, shop/order flow, public shares.
- `apps/system` — `@dg/system`: Better Auth proxy, login/signup, authenticated system + PWA.
- `packages/backend` — `@dg/backend`: the Convex application (`convex/`) and generated API types.
- `packages/auth` — `@dg/auth`: Better Auth access-control/role definitions.
- `packages/drive` — `@dg/drive`: shared drive implementation (public shares + system drive).
- `packages/ui` — `@dg/ui`: shadcn primitives, hooks, base design tokens.
- `workers/cfsystem-redirect` — `@dg/cfsystem-redirect`: legacy-domain redirect Worker.

## Commands (root)

- `pnpm build` — backend codegen, then both frontend builds
- `pnpm build:storefront` / `pnpm build:system` — build one frontend (Nitro output in `.output/`)
- `pnpm deploy:backend` — deploy the shared Convex backend
- `pnpm deploy:storefront` / `pnpm deploy:system` — Cloudflare build + deploy one Worker
- `pnpm deploy:cfsystem` — deploy the redirect Worker
- `pnpm cf:typegen` — regenerate per-app Worker types
- `pnpm env` / `pnpm env:prod` — sync `.env.local`/`.env.prod` vars to the dev/production Convex deployments (`sync-env.js` targets `@dg/backend`)
- `pnpm dryrun` — Convex deploy dry-run
- `pnpm --filter @dg/ui ui` — shadcn CLI for `@dg/ui`
- `pnpm --filter @dg/backend dev` — Convex dev watcher (pushes function changes to the dev deployment `rosy-rabbit-645` as you edit; reads `.env.local`). Run it bare, or combined with a frontend: `convex dev --start 'pnpm --filter @dg/system dev'` (or `--filter @dg/storefront dev` for port 3000).
- `pnpm --filter @dg/system dev` / `--filter @dg/storefront dev` — local frontend dev servers (ports 3001 / 3000); the system dev server loads `../../.env.local` into its process so server-side vars (`TRELLO_KEY`, `TRELLO_TOKEN`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`) are available in addition to Vite's `import.meta.env`. Without the watcher, push backend changes once with `pnpm build:backend` (codegen).

Local env lives in `.env.local` (dev) and `.env.prod` (production) — both gitignored. `vite build --mode prod` loads `.env.prod` for Worker builds; plain `vite build` loads `.env.local` for local previews. Secrets (Trello, Telegram, Turnstile) are set via Worker/Convex secret mechanisms, never committed.

## Todos

### Implement Favorites Feature

- [ ] Define favorites schema in packages/backend/convex/schema.ts (e.g., table linking users to products)
- [ ] Create convex mutations for adding/removing favorites (addFavorite, removeFavorite)
- [ ] Create convex query to fetch user's favorites
- [ ] Add favorite toggle button to product components
- [ ] Implement UI state for favorite status (use optimistic updates)
- [ ] Create favorites page or section in the app
- [ ] Update navigation/sidebar to include favorites link
- [ ] Add loading states and error handling for favorites operations
