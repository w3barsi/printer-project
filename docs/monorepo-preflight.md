# Monorepo Preflight Inventory

Recorded on 2026-08-27 before structural migration work. Secret values are intentionally omitted.

## Repository State

- The worktree was clean before Step 1 changes.
- pnpm version: `10.18.3`.
- TanStack Start skill loaded: `@tanstack/react-start#react-start`.
- Existing frontend source remains at the repository root during the workspace-skeleton checkpoint.

## Convex And Environment Ownership

- Current production Convex deployment identifier: `cool-wombat-664`.
- Local deployment selector is configured through `CONVEX_DEPLOYMENT`.
- Local variable names: `CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, `VITE_FLAG_SIGNUP`, `TRELLO_KEY`, `TRELLO_SECRET`, `TRELLO_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `VITE_TURNSTILE_SITE_KEY`, and `TURNSTILE_SECRET_KEY`.
- Production sync-file variable names: `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, and `SERVER_URL`.
- Cloudflare Worker variable names: `VITE_FLAG_SIGNUP`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, and `VITE_TURNSTILE_SITE_KEY`.
- Cloudflare Worker secret names: `TRELLO_KEY` and `TRELLO_TOKEN`.
- `sync-env.js` currently sends every selected env-file entry to the root Convex application and logs the full command. It must become package-aware when Convex moves in Step 3.

## Domain State

- `darcygraphix.com`: Cloudflare is authoritative, but the apex currently has no public A or CNAME answer. No Cloudflare Pages project owns this domain in the authenticated account.
- `system.darcygraphix.com`: active CNAME to Vercel (`5130d9f900692fc1.vercel-dns-017.com`) and currently serves the system application with `/` redirecting to `/jo` and then `/login`.
- `cfsystem.darcygraphix.com`: active proxied Cloudflare endpoint serving the `printer-project` Worker configured in root `wrangler.jsonc`.
- The authenticated Cloudflare account contains the active `printer-project` deployment. The only listed Pages project is unrelated (`airflow-simulator`).

## Asset Ownership

Public-site assets:

- `public/DG_SHORT_SVG.svg`
- `public/DG_Long.png`
- `public/DG_SHORT_BORDERED.png`
- `public/robots.txt`

System and PWA assets:

- `public/manifest.json`
- `public/sw.js`
- `public/logo192.png`
- `public/logo512.png`
- `public/logo.svg` for auth
- `public/logo-small.svg` for the system sidebar
- `public/logo.jpg` for printer output
- `public/favicon.ico`

No asset is currently proven to require runtime sharing between both applications. Duplicate brand files should remain app-owned unless later route extraction demonstrates genuine shared ownership.

## Route And URL References

The route migration must revisit these source areas:

- `src/routes/app/**`: route IDs, redirects, breadcrumbs, links, and navigation use `/app/*`.
- `src/components/sidebar/**`, `src/components/new-drive/**`, `src/components/jo/**`, and route-aware helpers under `src/lib/**`: internal links use `/app/*`.
- `src/routes/_auth/**`: `/login`, `/signup`, and the login fallback `/app/jo`.
- `src/routes/_shop/order.tsx`: staff job-order URL currently uses the public request origin plus `/app/jo/$joId`.
- `convex/drive/trelloSync.ts`: generated system URLs use `/app/newdrive/*`.
- `src/lib/constants.ts`: absolute `https://drive.darcygraphix.com` URL.
- `src/lib/auth-server.ts`, `src/router.tsx`, `src/env/**`, `convex/auth.ts`, and `convex/convex.config.ts`: `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, and `SERVER_URL` ownership.
- `src/styles.css` and `src/routes/__root.tsx`: absolute Google Fonts, jsDelivr, and inline data-URI resources.
- `src/components/shop/order/contact-payment-step.tsx`: absolute Cloudflare Turnstile script URL.
- `src/server/trello.ts`, `convex/trello.ts`, and `convex/drive/trelloSync.ts`: absolute Trello API URLs.
- `convex/shop/orders.ts`: absolute Turnstile verification URL.
- `convex/shop/telegram.ts`: absolute Telegram API URL.

Generated route-tree references were inventoried but must only be changed through TanStack tooling.

## Public Dependency Closures

Shop routes own:

- `src/routes/_shop/**`
- `src/components/shop/**`
- `src/lib/services.ts`
- `src/lib/shop-order.ts`
- `src/hooks/use-local-storage.tsx`
- Turnstile client configuration in `src/env/client.ts`
- Shop-specific portions of `src/styles.css`
- The `DG_*` public assets

The shop uses shared `Badge`, root-shell primitives, and `cn`, and calls `api.shop.orders`, `api.shop.uploads`, and `api.shop.telegram`.

Public shares start at `src/routes/share.$token.{-$itemId}.tsx` and reuse `src/components/new-drive/public-share-browser.tsx`, file-list/upload components, Drive hooks, download helpers, share API references, and many generated UI primitives. The closure currently includes internal route defaults and a static Trello attachment dependency even though Trello is disabled for public shares. Step 7 must isolate those seams instead of moving the full internal Drive tree.

Both public areas currently inherit `src/routes/__root.tsx`, which loads auth tokens, `ConvexBetterAuthProvider`, printer/device support, PWA registration, tooltips, theme, and development tools. The app-shell split must remove those system-only responsibilities from the public root.
