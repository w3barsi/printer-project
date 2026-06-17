# Parallel Cloudflare Migration Plan

Target: keep the current Vercel deployment working while adding a Cloudflare Workers deployment at `https://cfsystem.darcygraphix.com`.

## Target Architecture

- Vercel remains the current production/fallback deployment during migration.
- Cloudflare Workers hosts the parallel TanStack Start app deployment.
- Static assets are deployed with the Worker.
- TanStack Start server functions run in the Workers runtime.
- Convex remains the backend/database/auth integration.
- `SERVER_URL` becomes the canonical public app URL for Convex/Better Auth.
- `VERCEL_URL` remains as a fallback for the existing Vercel deployment.
- Trello secrets exist in Cloudflare Worker secrets and Convex env if both runtimes call Trello.

## Phase 1: Add Cloudflare Tooling

1. Add Cloudflare dev dependencies:

```bash
pnpm add -D wrangler @cloudflare/vite-plugin
```

2. Use local Wrangler through `pnpm exec`, not a global install:

```bash
pnpm exec wrangler whoami
```

3. If not authenticated, login:

```bash
pnpm exec wrangler login
```

## Phase 2: Add Parallel Cloudflare Scripts

Keep existing Vercel/Node scripts such as `build` and `start`. Add Cloudflare-specific scripts instead of replacing them:

```json
{
  "preview:cf": "vite preview",
  "deploy:cf": "pnpm build && wrangler deploy",
  "deploy:cf:dry": "pnpm build && wrangler deploy --dry-run",
  "cf:typegen": "wrangler types",
  "cf:tail": "wrangler tail printer-project"
}
```

## Phase 3: Add Wrangler Config

Create `wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "printer-project",
  "compatibility_date": "2026-06-17",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry",
  "observability": {
    "enabled": true,
  },
  "routes": [
    {
      "pattern": "cfsystem.darcygraphix.com",
      "custom_domain": true,
    },
  ],
  "vars": {
    "VITE_FLAG_SIGNUP": "false",
    "VITE_CONVEX_URL": "<production-convex-url>",
    "VITE_CONVEX_SITE_URL": "<production-convex-site-url>",
  },
  "secrets": {
    "required": ["TRELLO_KEY", "TRELLO_TOKEN"],
  },
}
```

Notes:

- `nodejs_compat` is required because `src/server/trello.ts` uses `Buffer`.
- `routes` attaches the Worker to `cfsystem.darcygraphix.com`.
- `TRELLO_KEY` and `TRELLO_TOKEN` must be secrets, not plaintext `vars`.
- `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` can be vars because they are already client-facing values.

## Phase 4: Update Vite Config Without Breaking Vercel

Because this is a parallel migration, keep the current Nitro/Vercel path available. Add Cloudflare support conditionally.

Use an environment switch:

```ts
const isCloudflare = process.env.CLOUDFLARE_DEPLOY === "true";
```

Then conditionally include Cloudflare or Nitro plugins:

```ts
plugins: [
  devtools(),
  tsConfigPaths({
    projects: ["./tsconfig.json"],
  }),
  ...(isCloudflare ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : [nitro()]),
  tanstackStart(),
  viteReact({
    babel: {
      plugins: [
        [
          "babel-plugin-react-compiler",
          {
            target: "19",
          },
        ],
      ],
    },
  }),
  tailwindcss(),
];
```

Update Cloudflare scripts to set the switch:

```json
{
  "build:cf": "CLOUDFLARE_DEPLOY=true vite build",
  "preview:cf": "CLOUDFLARE_DEPLOY=true vite preview",
  "deploy:cf": "pnpm build:cf && wrangler deploy",
  "deploy:cf:dry": "pnpm build:cf && wrangler deploy --dry-run"
}
```

## Phase 5: Fix Provider-Specific Auth URL

`convex/auth.ts` currently derives the Better Auth `baseURL` from `VERCEL_URL`. That will fail on Cloudflare because `VERCEL_URL` is not available.

Change the URL selection to prefer explicit `SERVER_URL`, then fallback to Vercel, then localhost:

```ts
const URL =
  process.env.SERVER_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");
```

Set Convex production env:

```txt
SERVER_URL=https://cfsystem.darcygraphix.com
```

During parallel operation, keep any existing Vercel URL allowlisting until Cloudflare is fully cut over.

## Phase 6: Configure Cloudflare Vars And Secrets

Required Cloudflare Worker vars:

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `VITE_FLAG_SIGNUP`

Required Cloudflare Worker secrets:

- `TRELLO_KEY`
- `TRELLO_TOKEN`

Set secrets interactively:

```bash
pnpm exec wrangler secret put TRELLO_KEY
pnpm exec wrangler secret put TRELLO_TOKEN
```

Required Convex production env:

- `SERVER_URL=https://cfsystem.darcygraphix.com`
- `TRELLO_KEY`
- `TRELLO_TOKEN`

Existing `sync-env.js` only syncs env values to Convex. It does not configure Cloudflare Worker vars or secrets.

## Phase 7: DNS And Custom Domain

1. Ensure `darcygraphix.com` is active in Cloudflare DNS.
2. Add `cfsystem.darcygraphix.com` as the Worker custom domain through `wrangler.jsonc` route config or the Cloudflare dashboard.
3. If DNS records already exist for `cfsystem.darcygraphix.com`, verify they do not conflict with the Worker custom domain.
4. Deploy once with the route config and confirm Cloudflare provisions the custom domain successfully.

## Phase 8: Local Verification

Run type generation:

```bash
pnpm exec wrangler types
```

Build the existing Vercel/Node path:

```bash
pnpm build
```

Build the Cloudflare path:

```bash
pnpm build:cf
```

Lint:

```bash
pnpm lint
```

Preview Cloudflare runtime locally:

```bash
pnpm preview:cf
```

Test key flows:

- Login.
- Logout.
- Auth persistence after refresh.
- Authenticated route redirects.
- Convex reads and writes.
- Trello list fetch.
- Trello attachment download.
- File upload flow through the Convex R2 component.
- Service worker registration.

## Phase 9: Dry Run Deploy

Run:

```bash
pnpm deploy:cf:dry
```

Check for:

- Worker entrypoint errors.
- Static asset upload errors.
- Missing required secrets.
- Unsupported Node API usage.
- Bundle size or startup warnings.

If startup warnings appear, run:

```bash
pnpm exec wrangler check startup
```

## Phase 10: First Cloudflare Deploy

Deploy:

```bash
pnpm deploy:cf
```

Tail logs while testing:

```bash
pnpm cf:tail
```

Test `https://cfsystem.darcygraphix.com`:

- Landing redirect.
- Login.
- Signup if enabled.
- Auth cookies and session persistence.
- Main app pages.
- Admin pages if applicable.
- Convex queries/mutations.
- Trello server functions.
- Uploads.
- PWA/service worker behavior.

## Phase 11: Convex And Auth Validation

1. Confirm Convex production env has `SERVER_URL=https://cfsystem.darcygraphix.com`.
2. Confirm Better Auth cookies are scoped correctly for `cfsystem.darcygraphix.com`.
3. Confirm auth callbacks no longer point to Vercel.
4. Keep Vercel URL valid during parallel operation if users may still use the Vercel deployment.
5. Re-test login/logout after changing Convex env.

## Phase 12: CI/CD

Use Cloudflare Workers Builds or GitHub Actions.

Recommended for this migration: Cloudflare Workers Builds.

Build settings:

```bash
pnpm install --frozen-lockfile
pnpm build:cf
```

Deploy command:

```bash
pnpm exec wrangler deploy
```

Required CI env/secrets:

- Cloudflare account access configured by Workers Builds, or `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` if using GitHub Actions.
- App secrets should remain in Cloudflare Worker secrets where possible.

## Phase 13: Parallel Run

1. Keep Vercel live.
2. Keep Cloudflare live at `https://cfsystem.darcygraphix.com`.
3. Use Cloudflare logs to monitor runtime errors.
4. Compare behavior between Vercel and Cloudflare for a full business workflow.
5. Do not remove Vercel config or scripts until Cloudflare is stable.

## Phase 14: Final Cutover Later

Only after the Cloudflare deployment is stable:

1. Move users to `https://cfsystem.darcygraphix.com` or make it the canonical app URL.
2. Remove Vercel-specific deployment assumptions if no longer needed.
3. Remove `.vercel` local metadata if desired.
4. Update README deployment docs.
5. Keep `SERVER_URL` as the provider-neutral production URL variable.

## Main Risks

- Better Auth may fail if `SERVER_URL` or callback origins still point to Vercel.
- Trello features may fail if Worker secrets are missing even though Convex env is configured.
- Some npm dependency may use unsupported Node APIs in Workers despite `nodejs_compat`.
- Conditional Vite plugin ordering may need adjustment if TanStack Start, Nitro, and Cloudflare plugin interact unexpectedly.
- `sync-env.js` can create a false sense of completion because it does not configure Cloudflare.

## Success Criteria

- Existing Vercel deployment still builds and starts with current scripts.
- Cloudflare build succeeds with `CLOUDFLARE_DEPLOY=true`.
- `pnpm deploy:cf:dry` succeeds.
- `pnpm deploy:cf` deploys successfully.
- `https://cfsystem.darcygraphix.com` serves the app.
- Login/logout works on Cloudflare.
- Convex authenticated queries work on Cloudflare.
- Trello server functions work on Cloudflare.
- Vercel remains available as fallback during the migration window.
