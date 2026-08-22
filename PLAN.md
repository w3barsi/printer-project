# Public and System Monorepo Migration Plan

## Objective

Split the existing TanStack Start application into independently buildable and deployable applications while retaining one shared Convex backend:

- `https://darcygraphix.com` serves the public website, online ordering, and public drive shares.
- `https://system.darcygraphix.com` serves authentication and the internal business system.
- Internal system routes lose the redundant `/app` prefix. For example, `/app/jo` becomes `/jo`.
- Existing Convex data and the current production Convex deployment remain shared by both applications.

This document is an implementation runbook. Complete the steps in order and leave the repository buildable at every checkpoint.

## Confirmed Decisions

- Use a pnpm workspace monorepo.
- Keep both frontends on TanStack Start and Cloudflare Workers.
- Deploy the public and system applications as separate Workers.
- Keep one Convex deployment; do not clone or migrate production data.
- Host unauthenticated `/share/*` routes on `darcygraphix.com`.
- Host login and the Better Auth proxy only on `system.darcygraphix.com`.
- Change system URLs from `/app/*` to root paths such as `/jo` and `/inventory`.
- Add compatibility redirects for existing `/app/*` and `cfsystem.darcygraphix.com` URLs.
- Do not introduce a broad shared UI package. Share only code that both applications actually require.

## Repository Constraints

The implementing agent must follow these constraints throughout the migration:

- Read `AGENTS.md` before making changes.
- Before changing Convex code, read `convex/_generated/ai/guidelines.md`.
- Do not run `pnpm dev`, `convex dev`, or any other development server.
- Do not run lint commands or `pnpm check`.
- Do not create, modify, or plan automated tests.
- Do not manually edit any `routeTree.gen.ts` file.
- Do not manually edit files under a Convex `_generated` directory.
- Let TanStack and Convex tooling regenerate generated files when required.
- Do not overwrite unrelated worktree changes.
- Use the smallest package boundary that provides genuine ownership or reuse.

## Current-State Context

The repository currently has:

- One root `package.json` and one TanStack Start application under `src/`.
- One Convex backend under `convex/`.
- One Cloudflare Worker configured by root `wrangler.jsonc` as `printer-project` on `cfsystem.darcygraphix.com`.
- A conditional Vite build that uses Cloudflare when `CLOUDFLARE_DEPLOY=true` and Nitro otherwise.
- Better Auth proxied through `/api/auth/$` using `src/lib/auth-server.ts`.
- Authentication loaded globally in `src/routes/__root.tsx`, including for public pages.
- Public shop routes in `src/routes/_shop/`.
- Internal routes in `src/routes/app/`.
- Login and signup routes in `src/routes/_auth/`.
- Public drive shares in `src/routes/share.$token.{-$itemId}.tsx`.
- Development-only routes including `/convex`, `/testfruits`, `/testdnd`, and `/app/testtrello`.

Important existing coupling:

- `convex/auth.ts` imports role definitions from `src/lib/auth-utils.ts`.
- Both frontend areas import generated Convex APIs through `@convex/*`.
- The public share browser reuses internal drive components, hooks, UI primitives, and download helpers.
- The current root mounts `ConvexBetterAuthProvider`, device support, system PWA behavior, and authentication for every route.
- The login callback defaults to `/app/jo` and accepts a `redirectUrl` query value.

## Target Structure

Use this structure unless an installed framework tool requires a minor configuration-specific adjustment:

```text
printer-project/
├── apps/
│   ├── public/
│   │   ├── public/
│   │   ├── src/
│   │   ├── components.json
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── wrangler.jsonc
│   └── system/
│       ├── public/
│       ├── src/
│       ├── components.json
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── wrangler.jsonc
├── packages/
│   ├── auth/
│   │   ├── src/
│   │   └── package.json
│   ├── backend/
│   │   ├── convex/
│   │   └── package.json
│   └── drive/
│       ├── src/
│       └── package.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── pnpm-lock.yaml
```

Package responsibilities:

- `apps/public`: public marketing pages, showcase, online order flow, and the public share route shell.
- `apps/system`: Better Auth proxy, login/signup, authenticated layouts, and all internal workflows.
- `packages/backend`: the existing Convex application and generated API types.
- `packages/auth`: Better Auth access-control and role definitions used by Convex and the system client.
- `packages/drive`: the smallest dependency closure genuinely shared by the public share browser and internal drive UI.

Do not move generic shop UI or system UI into `packages/drive`. If a primitive is only needed by one application, it belongs to that application.

## Final Route Ownership

### Public Application

| Existing route             | Final route                |
| -------------------------- | -------------------------- |
| `/_shop/`                  | `/`                        |
| `/_shop/showcase`          | `/showcase`                |
| `/_shop/showcase/$service` | `/showcase/$service`       |
| `/_shop/order`             | `/order`                   |
| `/share/$token/{-$itemId}` | `/share/$token/{-$itemId}` |

The `_shop` directory is currently a pathless route group, so its visible URLs already omit `_shop`. Preserve the visible public URLs.

### System Application

| Existing route       | Final route                 |
| -------------------- | --------------------------- |
| `/login`             | `/login`                    |
| `/signup`            | `/signup`                   |
| `/app`               | `/`, then redirect to `/jo` |
| `/app/jo`            | `/jo`                       |
| `/app/jo/$joId`      | `/jo/$joId`                 |
| `/app/inventory`     | `/inventory`                |
| `/app/inventory/$id` | `/inventory/$id`            |
| `/app/cashflow`      | `/cashflow`                 |
| `/app/admin/*`       | `/admin/*`                  |
| `/app/drive/*`       | `/drive/*`                  |
| `/app/newdrive/*`    | `/newdrive/*`               |
| `/app/trello/*`      | `/trello/*`                 |

Use a pathless `_authenticated` route group in `apps/system` to replace the current visible `/app` layout segment.

## Step 0: Preflight Inventory

- [ ] Run `git status --short` and note existing changes. Do not revert them.
- [ ] Run the repository skill check required by `AGENTS.md` and load the TanStack Start skill.
- [ ] Record the current production Convex deployment identifier and the variable names used locally and in Cloudflare. Do not print secret values into logs or this file.
- [ ] Confirm whether `darcygraphix.com` currently has an active Worker, Pages project, redirect, or other origin before replacing its route.
- [ ] Confirm the `system.darcygraphix.com` and `cfsystem.darcygraphix.com` DNS/custom-domain state.
- [ ] Inventory `public/` assets and classify each as public-site, system/PWA, or genuinely shared.
- [ ] Search all source files for `/app`, `/login`, `/signup`, `cfsystem`, `darcygraphix.com`, `SERVER_URL`, `VITE_CONVEX`, and absolute links. Save the list for use during route migration.
- [ ] Search imports starting from the public shop and share routes to identify their complete dependency closures before moving files.

Checkpoint: domain ownership, environment names, route references, and asset ownership are known before structural changes begin.

## Step 1: Create The Workspace Skeleton

- [ ] Add `pnpm-workspace.yaml` with `apps/*` and `packages/*`.
- [ ] Add a strict shared `tsconfig.base.json` containing only compiler options that apply to every package.
- [ ] Create `apps/public`, `apps/system`, `packages/auth`, `packages/backend`, and `packages/drive` package directories.
- [ ] Give every workspace project a unique private package name such as `@darcy/public`, `@darcy/system`, `@darcy/auth`, `@darcy/backend`, and `@darcy/drive`.
- [ ] Keep the root package private and convert its scripts into workspace orchestration commands.
- [ ] Preserve a single root lockfile.
- [ ] Add root scripts for independent builds and deployments. Use pnpm filters rather than changing directories inside scripts where practical.
- [ ] Keep Convex deployment separate from frontend deployment so deploying either frontend does not implicitly deploy Convex.

Recommended root script responsibilities:

```text
build              build backend types as needed, then both frontends
build:public       build only @darcy/public
build:system       build only @darcy/system
deploy:backend     deploy the shared Convex application once
deploy:public      build and deploy only the public Worker
deploy:system      build and deploy only the system Worker
cf:typegen         generate Worker types for both frontend apps
```

Do not preserve root scripts that assume one `.output`, one Vite config, or one Worker.

Checkpoint: pnpm recognizes all workspace packages, while the old application remains present and unchanged enough to build.

## Step 2: Extract Shared Authentication Definitions

Do this before moving Convex because `convex/auth.ts` currently reaches into the frontend source tree.

- [ ] Move the access-control object and `admin`, `user`, and `cashier` role definitions from `src/lib/auth-utils.ts` into `packages/auth/src/`.
- [ ] Export only the definitions needed by the Convex Better Auth setup and system auth client.
- [ ] Add the narrow Better Auth dependencies required by this package.
- [ ] Update the existing `convex/auth.ts` and `src/lib/auth-client.ts` imports to use `@darcy/auth`.
- [ ] Avoid browser-only or server-only initialization at package module scope so the definitions remain safe in both environments.
- [ ] Build the current application to confirm the extraction did not alter authentication behavior.

Checkpoint: Convex no longer imports anything from the root `src/` tree.

## Step 3: Move The Convex Application

- [ ] Move the authored contents of `convex/` to `packages/backend/convex/`.
- [ ] Do not manually edit generated files during the move. Configure the backend package and use Convex tooling to regenerate `_generated` output at its new location.
- [ ] Ensure the Better Auth component, migrations component, R2 component, schema modules, HTTP routes, and all nested domain modules remain under the same Convex application.
- [ ] Add `packages/backend/package.json` scripts for Convex code generation, deployment, and other non-server workflows required by the project.
- [ ] Configure application imports to consume generated references through `@darcy/backend` exports or a documented backend package subpath. Remove the root `@convex/*` path alias.
- [ ] Ensure both frontend TypeScript and Vite resolution can consume generated API and data-model types without copying them.
- [ ] Keep `schema.ts` as the assembled main schema and preserve domain schema locations.
- [ ] Preserve the existing Convex deployment selection. Do not create a new production deployment.
- [ ] Update environment synchronization scripts so they execute against `packages/backend` and still distinguish local and production deployments.
- [ ] Run the appropriate Convex code-generation command, not a Convex dev server.
- [ ] Build after generated references have been recreated.

Checkpoint: the same backend functions and schema build from `packages/backend`, and no frontend package owns backend source.

## Step 4: Create Independent TanStack Start Shells

Create both application shells before moving feature routes.

- [ ] Copy the structural parts of the existing TanStack Start setup into each app: package metadata, `vite.config.ts`, `tsconfig.json`, router factory, root route, environment modules, stylesheet entry, and required error boundaries.
- [ ] Configure each Vite instance to discover only its own route directory and generate only its own route tree.
- [ ] Configure each app's `@/*` alias to point to that app's `src/`.
- [ ] Configure workspace package imports explicitly rather than using aliases that reach into another app.
- [ ] Give each app its own `components.json` with aliases rooted in that app.
- [ ] Keep the Cloudflare/Nitro conditional build behavior only if non-Cloudflare local production builds are still useful. Otherwise use one clear Cloudflare production path consistently in both apps.
- [ ] Preserve plugin ordering required by TanStack Start.

Create deliberately different root responsibilities:

### Public Root

- [ ] Create a Convex Query client and React Query client for public loader/query support.
- [ ] Provide a plain unauthenticated Convex client context sufficient for `useAction`, `useMutation`, and `useQuery` in public orders and shares.
- [ ] Do not call `getToken` or mount `ConvexBetterAuthProvider`.
- [ ] Do not register the system service worker.
- [ ] Do not mount printer/device providers.
- [ ] Use public-site title, description, theme metadata, and assets.
- [ ] Keep production bundles free of TanStack devtool panels.

### System Root

- [ ] Preserve the current Convex Query and React Query SSR integration.
- [ ] Preserve server-side token loading and setting auth on the server HTTP client.
- [ ] Mount `ConvexBetterAuthProvider` with the system auth client.
- [ ] Preserve the PWA, theme, device, printer, tooltip, and toast behavior needed by internal routes.
- [ ] Use system-specific title and description metadata.
- [ ] Keep production bundles free of TanStack devtool panels.

Checkpoint: both empty application shells build independently before feature files are moved.

## Step 5: Move The Public Shop

- [ ] Move the `_shop` routes into `apps/public/src/routes/_shop/` while preserving their visible URLs.
- [ ] Move `src/components/shop/**` into `apps/public/src/components/shop/`.
- [ ] Move shop-only modules such as `lib/services.ts` and `lib/shop-order.ts` into `apps/public`.
- [ ] Move the local-storage hook and other utilities used only by the shop into `apps/public`.
- [ ] Move or recreate only the small UI primitives the public shop actually uses, currently including utilities such as `cn` and the badge used by order selection.
- [ ] Move Turnstile client validation into the public app's environment module.
- [ ] Preserve Convex calls to `api.shop.orders`, `api.shop.uploads`, and `api.shop.telegram` through the backend package import.
- [ ] Preserve `/`, `/showcase`, `/showcase/$service`, and `/order` URL behavior and search parameters.
- [ ] Move public marketing assets and fonts into `apps/public/public` or app-owned source directories.
- [ ] Remove shop imports from the system app after public extraction is complete.

Checkpoint: the public app builds and owns the marketing site and online-order flow without importing from `apps/system`.

## Step 6: Extract Shared Drive Code And Move Public Shares

The public share route currently depends on internal drive UI. Extract this dependency carefully rather than copying the entire system component tree.

- [ ] Starting from `PublicShareBrowser`, recursively identify code used by both public shares and internal drive screens.
- [ ] Move that genuinely shared subset into `packages/drive`.
- [ ] Include shared drive types, share API references, file-list rendering, upload operations, and download helpers only where both applications need the same implementation.
- [ ] Keep the public route component and public metadata in `apps/public`.
- [ ] Keep authenticated drive layouts, system navigation, admin controls, and system-only mutations in `apps/system`.
- [ ] Avoid making `packages/drive` depend on either application.
- [ ] Pass application-specific navigation, styling wrappers, or permissions into shared components through narrow props where necessary.
- [ ] If shared components need common primitives, place only those primitives in `packages/drive`; do not create a catch-all UI library.
- [ ] Ensure the public app's Tailwind CSS source discovery includes package files so shared component classes are emitted.
- [ ] Move `share.$token.{-$itemId}.tsx` into the public app and retain `/share/$token/{-$itemId}`.
- [ ] Preserve SSR preloading for shared roots, folders, and file previews.
- [ ] Preserve anonymous uploads and downloads supported by the existing share APIs.

Checkpoint: `darcygraphix.com/share/*` builds from the public app, and both apps consume shared drive code only through `@darcy/drive`.

## Step 7: Move Authentication Into The System App

- [ ] Move `_auth/login.tsx`, `_auth/signup.tsx`, and `_auth/route.tsx` into `apps/system`.
- [ ] Move `/api/auth/$`, `auth-server.ts`, and `auth-client.ts` into `apps/system`.
- [ ] Keep Better Auth requests same-origin at `system.darcygraphix.com/api/auth/*`.
- [ ] Change the successful login fallback from `/app/jo` to `/jo`.
- [ ] Validate `redirectUrl` as a local system path beginning with one `/` and reject protocol-relative or absolute URLs before passing it as a callback URL.
- [ ] Change the authenticated-user redirect from the auth layout to `/jo`.
- [ ] Preserve the signup feature flag in the system app only.
- [ ] Keep auth cookies host-only to `system.darcygraphix.com`; do not configure a `.darcygraphix.com` parent cookie.
- [ ] Set Convex `SERVER_URL` to `https://system.darcygraphix.com` in production so Better Auth uses the system origin.
- [ ] Ensure public pages do not expose login/signup routes or the Better Auth proxy.

Checkpoint: authentication is entirely owned by the system app and requires no cross-origin cookie or API request from the public app.

## Step 8: Move System Features Behind A Pathless Layout

- [ ] Create `apps/system/src/routes/_authenticated/route.tsx` from the current `src/routes/app/route.tsx`.
- [ ] Keep its authentication check, current-user query, sidebar, breadcrumbs, printer handler, and outlet.
- [ ] Change its route identity from visible `/app` to pathless `/_authenticated` while preserving a root visible URL.
- [ ] Move all internal feature routes under `_authenticated` and update each `createFileRoute` path to its generated pathless-group route ID.
- [ ] Preserve the nested pathless admin and cashier authorization layouts.
- [ ] Add an authenticated index route at `/` that redirects to `/jo`.
- [ ] Update all typed links, imperative navigation, breadcrumbs, hotkeys, and redirects from `/app/*` to their new root paths.
- [ ] Update role-denied redirects to their new paths.
- [ ] Update any code constructing URLs outside route files, including sidebar configuration and printer-related flows.
- [ ] Use repository-wide searches until no intentional internal link still starts with `/app`.
- [ ] Do not retain the public shop or public share routes in the system route tree.

Suggested route layout:

```text
apps/system/src/routes/
├── __root.tsx
├── api/auth.$.ts
├── _auth/
│   ├── route.tsx
│   ├── login.tsx
│   └── signup.tsx
├── _authenticated/
│   ├── route.tsx
│   ├── index.tsx
│   ├── jo.index.tsx
│   ├── jo.$joId.tsx
│   ├── inventory.tsx
│   ├── inventory_.$id.tsx
│   ├── drive.{-$drive}.tsx
│   ├── newdrive*
│   ├── trello*
│   ├── _admin/
│   └── _cashier/
├── app.index.tsx
└── app.$.tsx
```

The final `app.index.tsx` and `app.$.tsx` entries are compatibility redirects, not authenticated feature layouts.

Checkpoint: all internal features build under their new root URLs and still inherit authentication and role authorization.

## Step 9: Add URL Compatibility Redirects

- [ ] Add a redirect for `/app` to `/jo`.
- [ ] Add a catch-all redirect from `/app/*` to the equivalent root path while preserving the query string.
- [ ] Ensure redirect path handling cannot create a protocol-relative or external URL.
- [ ] Use permanent redirects only after the new paths are verified; temporary redirects are acceptable during initial rollout.
- [ ] Keep a lightweight Worker or equivalent Cloudflare redirect on `cfsystem.darcygraphix.com` during the migration window.
- [ ] Redirect `cfsystem.darcygraphix.com/app/*` to `https://system.darcygraphix.com/*`.
- [ ] Redirect login and other non-`/app` system URLs from `cfsystem.darcygraphix.com` to the same path on `system.darcygraphix.com`.
- [ ] Do not redirect old public `/share/*` links to the system domain; their canonical home is the public domain.

Checkpoint: bookmarks to old internal URLs reach the equivalent new system page without a redirect loop.

## Step 10: Split Styling And Assets

- [ ] Create independent public and system stylesheet entries.
- [ ] Move shop-specific custom properties, grain effects, typography, and layout styles into the public stylesheet.
- [ ] Keep shadcn/system variables, printer styles, and authenticated layout styles in the system stylesheet.
- [ ] Duplicate only foundational tokens when that is simpler and safer than coupling the applications through a style package.
- [ ] Move `manifest.json`, `sw.js`, PWA icons, and printer/system assets into `apps/system/public`.
- [ ] Move marketing images and public metadata assets into `apps/public/public`.
- [ ] Ensure service-worker scope cannot affect `darcygraphix.com` because the service worker is served only from the system Worker.
- [ ] Check that each app references only assets it owns.

Checkpoint: each app builds its own complete CSS and static asset bundle with no runtime dependency on the other app's domain.

## Step 11: Separate Environment Ownership

Create explicit environment schemas for each application and retain Convex environment validation in `packages/backend/convex/convex.config.ts`.

Public Worker variables:

```text
VITE_CONVEX_URL
VITE_CONVEX_SITE_URL (only if required by retained public integration)
VITE_TURNSTILE_SITE_KEY
```

System Worker variables and secrets:

```text
VITE_CONVEX_URL
VITE_CONVEX_SITE_URL
VITE_FLAG_SIGNUP
TRELLO_KEY
TRELLO_TOKEN
```

Shared Convex deployment variables:

```text
SERVER_URL=https://system.darcygraphix.com
TRELLO_KEY
TRELLO_TOKEN
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
TURNSTILE_SECRET_KEY
existing R2 and Better Auth values
```

- [ ] Remove public-only variables from the system client schema.
- [ ] Remove auth and system-only variables from the public client schema.
- [ ] Keep secrets out of `vars` and committed files; configure them through the appropriate Cloudflare or Convex secret mechanism.
- [ ] Update `sync-env.js` or replace it with package-aware scripts that target `packages/backend`.
- [ ] Preserve local environment workflows without committing `.env.local` or `.env.prod`.
- [ ] Add `darcygraphix.com` to the allowed production hostnames for the existing Turnstile widget.
- [ ] Do not add CORS between the two frontend domains unless a concrete cross-origin endpoint is introduced. Both apps communicate directly with the shared Convex endpoints.

Checkpoint: each frontend receives only its required variables, and Better Auth identifies the system domain as its production base URL.

## Step 12: Create Independent Cloudflare Workers

Create an app-local `wrangler.jsonc` for each frontend.

Public Worker:

```text
name: darcygraphix-public
custom domain: darcygraphix.com
entry: @tanstack/react-start/server-entry
```

System Worker:

```text
name: darcygraphix-system
custom domain: system.darcygraphix.com
entry: @tanstack/react-start/server-entry
```

- [ ] Preserve the required compatibility date and `nodejs_compat` flag in both configurations.
- [ ] Preserve observability intentionally for both Workers.
- [ ] Keep app-specific variables and secrets in the corresponding Worker configuration.
- [ ] Generate app-specific Worker types rather than retaining one root `worker-configuration.d.ts`.
- [ ] Give each app independent build, preview, dry-run, tail, and deploy scripts where those commands are still needed.
- [ ] Ensure no app-local deploy command invokes `convex deploy`.
- [ ] Disable or remove the obsolete single root Worker configuration after both app configurations are operational.
- [ ] Keep Vercel deployment disabled unless hosting strategy changes explicitly.

Checkpoint: each Worker can be built and dry-run independently, and their names and custom domains do not overlap.

## Step 13: Handle Development-Only Routes

- [ ] Classify `/convex`, `/testfruits`, `/testdnd`, and `/app/testtrello` before moving them.
- [ ] Remove them if they are disposable experiments.
- [ ] If one is still operationally useful, place it only in the owning app and guard it from production routing.
- [ ] Do not let temporary routes block the separation of production route trees.

Checkpoint: neither production application unintentionally exposes experimental pages.

## Step 14: Build And Static Verification

Do not run lint or automated test commands.

- [ ] Run the backend generation/build workflow required for generated Convex references.
- [ ] Run the public production build independently.
- [ ] Run the system production build independently.
- [ ] Run the root aggregate build.
- [ ] Run Cloudflare dry-run deployment for the public Worker.
- [ ] Run Cloudflare dry-run deployment for the system Worker.
- [ ] Search public output/source for system-only routes, auth proxy code, Trello secrets, printer code, and service-worker registration.
- [ ] Search system output/source for shop routes and public-only Turnstile client configuration.
- [ ] Search the repository for stale `/app/*` links, allowing only compatibility redirect code and migration documentation.
- [ ] Search for imports crossing directly between `apps/public` and `apps/system`; there should be none.
- [ ] Confirm generated route trees contain only routes owned by their corresponding application.

Checkpoint: all packages build and both Worker dry-runs complete without relying on the old combined app.

## Step 15: Production Cutover

Perform rollout in this order to minimize downtime:

- [ ] Deploy the shared Convex backend once from `packages/backend` with `SERVER_URL` set to the final system origin.
- [ ] Deploy the system Worker without removing the old `cfsystem` route yet.
- [ ] Attach and verify `system.darcygraphix.com`.
- [ ] Manually validate login, logout, session persistence, `/jo`, inventory, cashier authorization, admin authorization, drive access, printer behavior, and PWA assets.
- [ ] Verify old `/app/*` paths redirect to the equivalent new system paths.
- [ ] Deploy the public Worker.
- [ ] Attach and verify `darcygraphix.com` only after confirming its previous origin can be replaced safely.
- [ ] Manually validate public home, showcase navigation, online order submission, uploads, Turnstile, and order confirmation.
- [ ] Manually validate public share folder browsing, previews, uploads, downloads, unavailable shares, and `noindex` metadata.
- [ ] Enable the `cfsystem.darcygraphix.com` redirect behavior.
- [ ] Observe both Workers and Convex logs for auth callback failures, missing environment variables, upload errors, and redirect loops.
- [ ] Convert temporary redirects to permanent redirects after the rollout is stable.

Checkpoint: production traffic is served by two Workers using one unchanged Convex dataset.

## Step 16: Remove The Combined Application

Only perform cleanup after both production domains are stable.

- [ ] Delete the old root `src/`, root frontend `public/`, root Vite config, root Wrangler config, root component config, and other files superseded by app-local versions.
- [ ] Remove dependencies from the root package that now belong to workspace packages.
- [ ] Remove obsolete single-app scripts and environment handling.
- [ ] Remove temporary aliases that reach from apps into old root paths.
- [ ] Remove old build artifacts locally without touching source changes.
- [ ] Refresh setup and deployment documentation with the final workspace commands and domain ownership.
- [ ] Run the independent builds, aggregate build, and both Cloudflare dry-runs once more.

Final checkpoint: the repository has no remaining combined frontend, either frontend can be changed and deployed independently, and backend deployment remains an explicit separate action.

## Completion Criteria

The migration is complete when all of the following are true:

- `darcygraphix.com` serves only public routes.
- `system.darcygraphix.com` serves authentication and internal routes without `/app`.
- `/share/*` remains public and functional.
- `/api/auth/*` exists only on the system domain.
- Public requests do not perform Better Auth token loading.
- Both apps use the same existing Convex deployment and data.
- Both apps build and deploy independently.
- Deploying either frontend does not deploy or replace the other frontend or Convex.
- Existing `/app/*` and `cfsystem.darcygraphix.com` links redirect safely.
- No app imports source directly from the other app.
- Generated TanStack and Convex files are produced by tooling rather than hand-edited.
- System PWA, printer, admin, and cashier behavior remains owned by the system app.
- Online ordering, Turnstile, Telegram notifications, and public drive shares remain owned by the public app and shared backend.

## Rollback Strategy

Keep rollback operational until the final cleanup step:

- Retain the old combined Worker deployment while validating the two new Workers.
- Do not delete or recreate the Convex production deployment.
- Do not perform schema or data migrations as part of this frontend separation unless an independently identified requirement makes one necessary.
- If the system cutover fails, route system traffic back to the old Worker and restore the prior Convex `SERVER_URL` value if it was changed.
- If the public cutover fails, route `darcygraphix.com` back to its previous origin without changing Convex.
- Remove the old Worker only after both new domains and compatibility redirects have been stable for an agreed observation period.
