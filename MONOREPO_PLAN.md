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
- Keep all generated shadcn primitives and their base design tokens in one `@dg/ui` workspace package.
- Keep composed, product-specific UI in the owning application's `src/components` directory.
- Use standard pnpm workspace scripts and app-local Vite configurations; do not adopt Vite+.

## Repository Constraints

The implementing agent must follow these constraints throughout the migration:

- Read `AGENTS.md` before making changes.
- Before changing Convex code, read `packages/backend/convex/_generated/ai/guidelines.md`.
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

Important authentication and attribution behavior that must survive the move:

- Better Auth users and application actor records are separate models.
- `convex/auth.ts` creates an application `users` record containing `authId` and `name` when a Better Auth user is created.
- The application `users` table is indexed by `by_authId` and its document IDs are used for `createdBy` and other historical attribution fields.
- `getCurrentUser` returns Better Auth user data plus the application user's `actorId`.
- Authenticated backend operations use `requireAppUser` when they need the application actor document.
- Deleting a Better Auth user intentionally retains the application actor record so historical attribution remains resolvable.

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
│   ├── drive/
│   │   ├── src/
│   │   └── package.json
│   └── ui/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── styles/
│       │   └── base.css
│       ├── components.json
│       ├── package.json
│       └── tsconfig.json
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
- `packages/ui`: all generated shadcn primitives, shared shadcn hooks and utilities, and the base semantic design tokens consumed by both apps.

All shadcn primitives belong to `packages/ui`, even when only one app currently consumes a primitive. Composed UI such as `ShopButton`, `AppSidebar`, job-order cards, inventory dialogs, and feature layouts belongs in the relevant app's `src/components` directory. Do not move product-specific components into `packages/ui`, and do not place generic UI primitives in `packages/drive`.

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

- [x] Run `git status --short` and note existing changes. Do not revert them.
- [x] Run the repository skill check required by `AGENTS.md` and load the TanStack Start skill.
- [x] Record the current production Convex deployment identifier and the variable names used locally and in Cloudflare. Do not print secret values into logs or this file.
- [x] Confirm whether `darcygraphix.com` currently has an active Worker, Pages project, redirect, or other origin before replacing its route.
- [x] Confirm the `system.darcygraphix.com` and `cfsystem.darcygraphix.com` DNS/custom-domain state.
- [x] Inventory `public/` assets and classify each as public-site, system/PWA, or genuinely shared.
- [x] Search all source files for `/app`, `/login`, `/signup`, `cfsystem`, `darcygraphix.com`, `SERVER_URL`, `VITE_CONVEX`, and absolute links. Save the list for use during route migration.
- [x] Search imports starting from the public shop and share routes to identify their complete dependency closures before moving files.

Checkpoint: domain ownership, environment names, route references, and asset ownership are known before structural changes begin.

## Step 1: Create The Workspace Skeleton

- [x] Add `pnpm-workspace.yaml` with `apps/*` and `packages/*`.
- [x] Add a strict shared `tsconfig.base.json` containing only compiler options that apply to every package.
- [x] Create `apps/public`, `apps/system`, `packages/auth`, `packages/backend`, `packages/drive`, and `packages/ui` package directories.
- [x] Give every workspace project a unique private package name: `@dg/public`, `@dg/system`, `@dg/auth`, `@dg/backend`, `@dg/drive`, and `@dg/ui`.
- [x] Keep the root package private and convert its scripts into workspace orchestration commands.
- [x] Preserve a single root lockfile.
- [x] Add root scripts for independent builds and deployments. Use pnpm filters rather than changing directories inside scripts where practical.
- [x] Keep Convex deployment separate from frontend deployment so deploying either frontend does not implicitly deploy Convex.

Recommended root script responsibilities:

```text
build              build backend types as needed, then both frontends
build:public       build only @dg/public
build:system       build only @dg/system
deploy:backend     deploy the shared Convex application once
deploy:public      build and deploy only the public Worker
deploy:system      build and deploy only the system Worker
cf:typegen         generate Worker types for both frontend apps
```

Do not preserve root scripts that assume one `.output`, one Vite config, or one Worker.

Checkpoint: pnpm recognizes all workspace packages, while the old application remains present and unchanged enough to build.

## Step 2: Extract Shared Authentication Definitions

Do this before moving Convex because `convex/auth.ts` currently reaches into the frontend source tree.

- [x] Move the access-control object and `admin`, `user`, and `cashier` role definitions from `src/lib/auth-utils.ts` into `packages/auth/src/`.
- [x] Export only the definitions needed by the Convex Better Auth setup and system auth client.
- [x] Add the narrow Better Auth dependencies required by this package.
- [x] Update the existing `convex/auth.ts` and `src/lib/auth-client.ts` imports to use `@dg/auth`.
- [x] Keep `authComponent`, `getCurrentUser`, `requireAppUser`, auth triggers, and application-user lookup logic in `@dg/backend`; `@dg/auth` owns only reusable Better Auth access-control and role definitions.
- [x] Avoid browser-only or server-only initialization at package module scope so the definitions remain safe in both environments.
- [x] Build the current application to confirm the extraction did not alter authentication behavior.

Checkpoint: Convex no longer imports anything from the root `src/` tree.

## Step 3: Move The Convex Application

- [x] Move the authored contents of `convex/` to `packages/backend/convex/`.
- [x] Do not manually edit generated files during the move. Configure the backend package and use Convex tooling to regenerate `_generated` output at its new location.
- [x] Ensure the Better Auth component, migrations component, R2 component, schema modules, HTTP routes, and all nested domain modules remain under the same Convex application.
- [x] Add `packages/backend/package.json` scripts for Convex code generation, deployment, and other non-server workflows required by the project.
- [x] Configure application imports to consume generated references through `@dg/backend` exports or a documented backend package subpath. Remove the root `@convex/*` path alias.
- [x] Ensure both frontend TypeScript and Vite resolution can consume generated API and data-model types without copying them.
- [x] Keep `schema.ts` as the assembled main schema and preserve domain schema locations.
- [x] Preserve the `users.authId` field and `by_authId` index exactly; do not replace application actor IDs with Better Auth IDs.
- [x] Preserve the Better Auth user triggers: create the application actor on auth-user creation, update its name through `by_authId`, and retain the actor on auth-user deletion.
- [x] Preserve `getCurrentUser` returning `actorId` and preserve `requireAppUser` for resolving the stable application actor used by `createdBy` fields.
- [x] Preserve the current authorization context name `authUser` in custom authenticated queries and mutations so role checks continue to use Better Auth role data.
- [x] Treat this as a source relocation, not an auth schema migration. Do not backfill, recreate, or delete application `users` records as part of the monorepo work.
- [x] Preserve the existing Convex deployment selection. Do not create a new production deployment.
- [x] Update environment synchronization scripts so they execute against `packages/backend` and still distinguish local and production deployments.
- [x] Run the appropriate Convex code-generation command, not a Convex dev server.
- [x] Build after generated references have been recreated.

Checkpoint: the same backend functions and schema build from `packages/backend`, and no frontend package owns backend source.

## Step 4: Create The Shared UI Package

Follow the useful package boundary from `mugnavo/tanstarter-monorepo` without adopting Vite+.

- [x] Create `packages/ui` with package name `@dg/ui`.
- [x] Move every generated shadcn primitive from `src/components/ui/**` into `packages/ui/components/`.
- [x] Move `cn` into `packages/ui/lib/utils.ts`.
- [x] Move shared shadcn hooks such as `use-mobile` into `packages/ui/hooks/`.
- [x] Move a theme provider into `packages/ui/lib/` only if both applications use the same behavior. Keep application-specific providers in their app.
- [x] Create `packages/ui/styles/base.css` containing Tailwind CSS initialization, shadcn styles, shared semantic tokens, dark-mode tokens, and a source directive covering `packages/ui` source files.
- [x] Keep public shop effects, typography, and product-specific tokens out of the shared base stylesheet.
- [x] Keep system-only PWA, printer, and authenticated-layout styles out of the shared base stylesheet.
- [x] Add `packages/ui/components.json` as the canonical shadcn installation configuration. Point its `components`, `ui`, `hooks`, `lib`, and `utils` aliases into `packages/ui`.
- [x] Export component, hook, utility, provider, and stylesheet subpaths from `@dg/ui/package.json` so consumers use imports such as `@dg/ui/components/button`, `@dg/ui/hooks/use-mobile`, `@dg/ui/lib/utils`, and `@dg/ui/styles/base.css`.
- [x] Put shadcn implementation dependencies such as `@base-ui/react`, `class-variance-authority`, `tw-animate-css`, and `shadcn` in `@dg/ui`.
- [x] Keep React and React DOM as peer dependencies of `@dg/ui`, with development types available to the package.
- [x] Add a standard pnpm script in `@dg/ui` for `pnpm dlx shadcn@latest`; do not use `vp`, `vpx`, Vite+, or a root Vite configuration.
- [x] Configure the root `ui` script to invoke the `@dg/ui` script with a pnpm workspace filter.
- [x] Update existing imports from `@/components/ui/*` to `@dg/ui/components/*` and imports of the old `cn` helper to `@dg/ui/lib/utils`.
- [x] Keep composed components in their owner, for example `apps/public/src/components/shop/**` and `apps/system/src/components/jo/**`.

Use this ownership model:

```text
packages/ui/components/*             generated shadcn primitives
packages/ui/hooks/*                  hooks shipped with shadcn components
packages/ui/lib/*                    shared primitive-level utilities
packages/ui/styles/base.css          shared Tailwind and semantic tokens
apps/public/src/components/*         public feature and composition components
apps/system/src/components/*         system feature and composition components
```

Checkpoint: the current application can consume all existing shadcn primitives through `@dg/ui`, and no generated primitive remains under an app-specific `components/ui` directory.

## Step 5: Create Independent TanStack Start Shells

Create both application shells before moving feature routes.

- [x] Copy the structural parts of the existing TanStack Start setup into each app: package metadata, `vite.config.ts`, `tsconfig.json`, router factory, root route, environment modules, stylesheet entry, and required error boundaries.
- [x] Configure each Vite instance to discover only its own route directory and generate only its own route tree.
- [x] Configure each app's `@/*` alias to point to that app's `src/`.
- [x] Configure workspace package imports explicitly rather than using aliases that reach into another app.
- [x] Give each app its own `components.json`. Point `components` at the app's `src/components`; point `ui`, shadcn hooks, and shadcn utilities at `@dg/ui`; and point `tailwind.css` to the relative filesystem path for `packages/ui/styles/base.css` as required by the shadcn CLI.
- [x] Add `@dg/ui`, `@dg/backend`, and other consumed workspace packages to each app explicitly with `workspace:*`.
- [x] Keep the Cloudflare/Nitro conditional build behavior only if non-Cloudflare local production builds are still useful. Otherwise use one clear Cloudflare production path consistently in both apps.
- [x] Preserve plugin ordering required by TanStack Start.

Create deliberately different root responsibilities:

### Public Root

- [x] Create a Convex Query client and React Query client for public loader/query support.
- [x] Provide a plain unauthenticated Convex client context sufficient for `useAction`, `useMutation`, and `useQuery` in public orders and shares.
- [x] Do not call `getToken` or mount `ConvexBetterAuthProvider`.
- [x] Do not register the system service worker.
- [x] Do not mount printer/device providers.
- [x] Use public-site title, description, theme metadata, and assets.
- [x] Keep production bundles free of TanStack devtool panels.

### System Root

- [x] Preserve the current Convex Query and React Query SSR integration.
- [x] Preserve server-side token loading and setting auth on the server HTTP client.
- [x] Mount `ConvexBetterAuthProvider` with the system auth client.
- [x] Preserve the current-user result including `actorId` in authenticated route context; do not reduce it to the Better Auth user shape.
- [x] Preserve the PWA, theme, device, printer, tooltip, and toast behavior needed by internal routes.
- [x] Use system-specific title and description metadata.
- [x] Keep production bundles free of TanStack devtool panels.

Checkpoint: both empty application shells build independently before feature files are moved.

## Step 6: Move The Public Shop

- [ ] Move the `_shop` routes into `apps/public/src/routes/_shop/` while preserving their visible URLs.
- [ ] Move `src/components/shop/**` into `apps/public/src/components/shop/`.
- [ ] Move shop-only modules such as `lib/services.ts` and `lib/shop-order.ts` into `apps/public`.
- [ ] Move the local-storage hook and other utilities used only by the shop into `apps/public`.
- [ ] Import shadcn primitives such as `Badge` and primitive-level utilities such as `cn` from `@dg/ui`; do not recreate them in the public app.
- [ ] Keep custom public compositions such as `ShopButton` in `apps/public/src/components/shop/`.
- [ ] Move Turnstile client validation into the public app's environment module.
- [ ] Preserve Convex calls to `api.shop.orders`, `api.shop.uploads`, and `api.shop.telegram` through the backend package import.
- [ ] Preserve `/`, `/showcase`, `/showcase/$service`, and `/order` URL behavior and search parameters.
- [ ] Move public marketing assets and fonts into `apps/public/public` or app-owned source directories.
- [ ] Remove shop imports from the system app after public extraction is complete.

Checkpoint: the public app builds and owns the marketing site and online-order flow without importing from `apps/system`.

## Step 7: Extract Shared Drive Code And Move Public Shares

The public share route currently depends on internal drive UI. Extract this dependency carefully rather than copying the entire system component tree.

- [x] Starting from `PublicShareBrowser`, recursively identify code used by both public shares and internal drive screens.
- [x] Move that genuinely shared subset into `packages/drive`.
- [x] Include shared drive types, share API references, file-list rendering, upload operations, and download helpers only where both applications need the same implementation.
- [x] Keep the public route component and public metadata in `apps/public`.
- [x] Keep authenticated drive layouts, system navigation, admin controls, and system-only mutations in `apps/system`.
- [x] Avoid making `packages/drive` depend on either application.
- [x] Add `@dg/ui` as an explicit dependency of `@dg/drive` for shared shadcn primitives.
- [x] Pass application-specific navigation, styling wrappers, or permissions into shared components through narrow props where necessary.
- [x] Import all generic primitives used by shared drive components from `@dg/ui`; do not place copies in `packages/drive`.
- [x] Ensure the public app's Tailwind CSS source discovery includes package files so shared component classes are emitted.
- [x] Move `share.$token.{-$itemId}.tsx` into the public app and retain `/share/$token/{-$itemId}`.
- [x] Preserve SSR preloading for shared roots, folders, and file previews.
- [x] Preserve anonymous uploads and downloads supported by the existing share APIs.

Checkpoint: `darcygraphix.com/share/*` builds from the public app, both apps consume shared drive code through `@dg/drive`, and shared drive UI consumes primitives through `@dg/ui`.

## Step 8: Move Authentication Into The System App

- [x] Move `_auth/login.tsx`, `_auth/signup.tsx`, and `_auth/route.tsx` into `apps/system`.
- [x] Move `/api/auth/$`, `auth-server.ts`, and `auth-client.ts` into `apps/system`.
- [x] Keep Better Auth requests same-origin at `system.darcygraphix.com/api/auth/*`.
- [x] Change the successful login fallback from `/app/jo` to `/jo`.
- [x] Validate `redirectUrl` as a local system path beginning with one `/` and reject protocol-relative or absolute URLs before passing it as a callback URL.
- [x] Change the authenticated-user redirect from the auth layout to `/jo`.
- [x] Preserve the signup feature flag in the system app only.
- [x] Keep auth cookies host-only to `system.darcygraphix.com`; do not configure a `.darcygraphix.com` parent cookie.
- [x] Set Convex `SERVER_URL` to `https://system.darcygraphix.com` in production so Better Auth uses the system origin.
- [x] Ensure public pages do not expose login/signup routes or the Better Auth proxy.

Checkpoint: authentication is entirely owned by the system app and requires no cross-origin cookie or API request from the public app.

## Step 9: Move System Features Behind A Pathless Layout

- [x] Create `apps/system/src/routes/_authenticated/route.tsx` from the current `src/routes/app/route.tsx`.
- [x] Keep its authentication check, current-user query, sidebar, breadcrumbs, printer handler, and outlet.
- [x] Change its route identity from visible `/app` to pathless `/_authenticated` while preserving a root visible URL.
- [x] Move all internal feature routes under `_authenticated` and update each `createFileRoute` path to its generated pathless-group route ID.
- [x] Preserve the nested pathless admin and cashier authorization layouts.
- [x] Add an authenticated index route at `/` that redirects to `/jo`.
- [x] Update all typed links, imperative navigation, breadcrumbs, hotkeys, and redirects from `/app/*` to their new root paths.
- [x] Update role-denied redirects to their new paths.
- [x] Update any code constructing URLs outside route files, including sidebar configuration and printer-related flows.
- [x] Use repository-wide searches until no intentional internal link still starts with `/app`.
- [x] Do not retain the public shop or public share routes in the system route tree.

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

## Step 10: Add URL Compatibility Redirects

- [x] Add a redirect for `/app` to `/jo`.
- [x] Add a catch-all redirect from `/app/*` to the equivalent root path while preserving the query string.
- [x] Ensure redirect path handling cannot create a protocol-relative or external URL.
- [x] Use permanent redirects only after the new paths are verified; temporary redirects are acceptable during initial rollout.
- [x] Keep a lightweight Worker or equivalent Cloudflare redirect on `cfsystem.darcygraphix.com` during the migration window.
- [x] Redirect `cfsystem.darcygraphix.com/app/*` to `https://system.darcygraphix.com/*`.
- [x] Redirect login and other non-`/app` system URLs from `cfsystem.darcygraphix.com` to the same path on `system.darcygraphix.com`.
- [x] Do not redirect old public `/share/*` links to the system domain; their canonical home is the public domain.

Checkpoint: bookmarks to old internal URLs reach the equivalent new system page without a redirect loop.

## Step 11: Split Styling And Assets

- [x] Create independent public and system stylesheet entries that each import `@dg/ui/styles/base.css` and add a Tailwind source directive for the app's source tree.
- [x] Move shop-specific custom properties, grain effects, typography, and layout styles into the public stylesheet.
- [x] Keep shared shadcn semantic variables and base styles in `packages/ui/styles/base.css`.
- [x] Keep printer styles and authenticated layout styles in the system stylesheet.
- [x] Allow either app to override shared semantic variables after importing the base stylesheet when its visual language requires different values.
- [x] Move `manifest.json`, `sw.js`, PWA icons, and printer/system assets into `apps/system/public`.
- [x] Move marketing images and public metadata assets into `apps/public/public`.
- [x] Ensure service-worker scope cannot affect `darcygraphix.com` because the service worker is served only from the system Worker.
- [x] Check that each app references only assets it owns.

Checkpoint: each app builds its own complete CSS and static asset bundle with no runtime dependency on the other app's domain.

## Step 12: Separate Environment Ownership

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

- [x] Remove public-only variables from the system client schema.
- [x] Remove auth and system-only variables from the public client schema.
- [x] Keep secrets out of `vars` and committed files; configure them through the appropriate Cloudflare or Convex secret mechanism.
- [x] Update `sync-env.js` or replace it with package-aware scripts that target `packages/backend`.
- [x] Preserve local environment workflows without committing `.env.local` or `.env.prod`.
- [x] Add `darcygraphix.com` to the allowed production hostnames for the existing Turnstile widget (Cloudflare Turnstile dashboard; apply before public cutover).
- [x] Do not add CORS between the two frontend domains unless a concrete cross-origin endpoint is introduced. Both apps communicate directly with the shared Convex endpoints.

Checkpoint: each frontend receives only its required variables, and Better Auth identifies the system domain as its production base URL.

## Step 13: Create Independent Cloudflare Workers

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

- [x] Preserve the required compatibility date and `nodejs_compat` flag in both configurations.
- [x] Preserve observability intentionally for both Workers.
- [x] Keep app-specific variables and secrets in the corresponding Worker configuration.
- [x] Generate app-specific Worker types rather than retaining one root `worker-configuration.d.ts`.
- [x] Give each app independent build, preview, dry-run, tail, and deploy scripts where those commands are still needed.
- [x] Ensure no app-local deploy command invokes `convex deploy`.
- [x] Disable or remove the obsolete single root Worker configuration after both app configurations are operational (root config retained while legacy remains the production Worker for rollback; removed by Step 17).
- [x] Keep Vercel deployment disabled unless hosting strategy changes explicitly.

Checkpoint: each Worker can be built and dry-run independently, and their names and custom domains do not overlap.

## Step 14: Handle Development-Only Routes

- [x] Classify `/convex`, `/testfruits`, `/testdnd`, and `/app/testtrello` before moving them.
- [x] Remove them if they are disposable experiments.
- [x] If one is still operationally useful, place it only in the owning app and guard it from production routing (all four classified disposable; none retained).
- [x] Do not let temporary routes block the separation of production route trees.

Checkpoint: neither production application unintentionally exposes experimental pages.

## Step 15: Build And Static Verification

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
- [ ] Search for generated shadcn primitives under either app; all should live in `packages/ui`.
- [ ] Confirm app-specific composed components remain under their owning app and are not exported from `@dg/ui`.
- [ ] Confirm backend code that writes `createdBy` resolves the application actor through `requireAppUser` rather than storing a Better Auth user ID.
- [ ] Confirm `getCurrentUser` still exposes the stable application `actorId` used by system forms and mutations.
- [ ] Confirm generated route trees contain only routes owned by their corresponding application.

Checkpoint: all packages build and both Worker dry-runs complete without relying on the old combined app.

## Step 16: Production Cutover

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

## Step 17: Remove The Combined Application

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
- Better Auth identities remain linked to stable application actor records through `users.authId`.
- Historical `createdBy` attribution remains valid when an auth user is deleted.
- Both apps build and deploy independently.
- Deploying either frontend does not deploy or replace the other frontend or Convex.
- Existing `/app/*` and `cfsystem.darcygraphix.com` links redirect safely.
- No app imports source directly from the other app.
- All generated shadcn primitives live in `@dg/ui`, while composed public and system components remain in their owning app.
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
