# Convex Upgrade Plan

## Goal

Upgrade this project from `convex@^1.31.7` to the latest Convex release while preserving the current app behavior and avoiding unrelated dependency churn.

At the time this plan was written, the latest Convex package on npm is `convex@1.41.0`.

## Hard Constraints

- Do not run `pnpm dev`.
- Do not run `convex dev`.
- Do not run `pnpm check`.
- Do not modify `convex/_generated/**` manually.
- Do not modify `routeTree.gen.ts`.
- Keep changes minimal and focused on Convex compatibility.
- Do not refactor unrelated Convex code unless required by the upgrade.

## Current Project State

Current Convex-related dependencies from `package.json`:

- `convex`: `^1.31.7`
- `@convex-dev/better-auth`: `^0.10.6`
- `@convex-dev/migrations`: `^0.2.9`
- `@convex-dev/r2`: `^0.7.3`
- `@convex-dev/react-query`: `0.1.0`
- `convex-helpers`: `^0.1.104`

Current Convex integration files to inspect:

- `convex/convex.config.ts`
- `convex/schema.ts`
- `convex/http.ts`
- `convex/auth.ts`
- `convex/auth.config.ts`
- `convex/migrations.ts`
- `convex/r2.ts`
- `convex/betterAuth/**`
- `src/routes/convex.tsx`
- `src/types/convex.ts`

## Compatibility Findings

Latest target:

- `convex@1.41.0`
- `convex@1.41.0` requires Node `>=18.0.0`.
- `convex@1.41.0` supports React `^18.0.0 || ^19.0.0-0 || ^19.0.0`.

Installed related packages checked against `convex@1.41.0`:

- `@convex-dev/better-auth@0.10.6` accepts `convex@1.41.0` because it requires `convex: ^1.25.0`.
- `@convex-dev/migrations@0.2.9` rejects `convex@1.41.0` because it requires `convex: ~1.16.5 || >=1.17.0 <1.35.0`.
- `@convex-dev/r2@0.7.3` rejects `convex@1.41.0` because it requires `convex: ~1.16.5 || >=1.17.0 <1.35.0`.
- `@convex-dev/react-query@0.1.0` accepts `convex@1.41.0` because it requires `convex: ^1.29.3`.
- `convex-helpers@0.1.104` accepts `convex@1.41.0` because it requires `convex: ^1.24.0`.

Latest related packages checked against `convex@1.41.0`:

- `@convex-dev/better-auth@0.12.4` accepts `convex: ^1.25.0`, but requires `better-auth >=1.6.11 <1.7.0`. This project currently pins `better-auth: 1.4.7`, so do not upgrade `@convex-dev/better-auth` unless also planning a Better Auth upgrade.
- `@convex-dev/migrations@0.3.5` accepts `convex: ^1.35.0` and requires `convex-helpers: ^0.1.115`.
- `@convex-dev/r2@0.10.2` accepts `convex: ^1.24.8`.
- `@convex-dev/react-query@0.1.0` is already latest and accepts `convex: ^1.29.3`.
- `convex-helpers@0.1.119` accepts `convex: ^1.32.0`.

Required package upgrades for `convex@1.41.0`:

- Upgrade `convex` to `1.41.0` or `latest`.
- Upgrade `@convex-dev/migrations` to at least `0.3.5`.
- Upgrade `@convex-dev/r2` to at least `0.10.2`.
- Upgrade `convex-helpers` to at least `0.1.115`, because latest `@convex-dev/migrations` requires it. Prefer `0.1.119` or `latest`.

Avoid unless deliberately expanding scope:

- Do not upgrade `@convex-dev/better-auth` to latest in the same change unless also upgrading `better-auth`, because latest `@convex-dev/better-auth` requires a newer Better Auth range than this project currently uses.

## Recommended Minimal Upgrade Set

Use this package set:

```bash
pnpm add convex@latest @convex-dev/migrations@latest @convex-dev/r2@latest convex-helpers@latest
```

Do not include `@convex-dev/better-auth` in the first pass.

Do not include `@convex-dev/react-query`; it is already latest.

## Step-by-Step Agent Instructions

1. Confirm the worktree state.

   Run:

   ```bash
   git status --short
   ```

   If there are existing unrelated changes, leave them alone. Do not revert them.

2. Reconfirm latest versions from npm.

   Run:

   ```bash
   pnpm view convex version
   pnpm view convex@latest peerDependencies dependencies engines
   pnpm view @convex-dev/migrations@latest version peerDependencies dependencies
   pnpm view @convex-dev/r2@latest version peerDependencies dependencies
   pnpm view convex-helpers@latest version peerDependencies dependencies
   pnpm view @convex-dev/better-auth@latest version peerDependencies dependencies
   pnpm view @convex-dev/react-query@latest version peerDependencies dependencies
   ```

   Verify that the findings in this plan still hold. If latest versions changed, use the same decision rules:

   - Every installed Convex-related package must accept the target `convex` version by peer dependency range.
   - Do not upgrade `@convex-dev/better-auth` unless its peer dependency on `better-auth` matches this project's `better-auth` version, or unless the task explicitly includes upgrading Better Auth.
   - Upgrade the smallest set of related packages required to satisfy peer dependencies.

3. Review likely migration surfaces before changing packages.

   Read these files:

   - `convex/convex.config.ts`
   - `convex/migrations.ts`
   - `convex/r2.ts`
   - `convex/http.ts`
   - `convex/betterAuth/convex.config.ts`
   - `convex/betterAuth/adapter.ts`
   - `src/routes/convex.tsx`

   Look for APIs imported from:

   - `convex/server`
   - `convex/values`
   - `@convex-dev/migrations`
   - `@convex-dev/r2`
   - `convex-helpers`

4. Apply the minimal dependency upgrade.

   Run:

   ```bash
   pnpm add convex@latest @convex-dev/migrations@latest @convex-dev/r2@latest convex-helpers@latest
   ```

   Expected files changed:

   - `package.json`
   - `pnpm-lock.yaml`

5. Inspect the dependency diff immediately.

   Run:

   ```bash
   git diff -- package.json pnpm-lock.yaml
   ```

   Confirm:

   - `convex` upgraded to the intended latest version.
   - `@convex-dev/migrations` upgraded to a version accepting the new Convex version.
   - `@convex-dev/r2` upgraded to a version accepting the new Convex version.
   - `convex-helpers` upgraded to a version satisfying `@convex-dev/migrations`.
   - `@convex-dev/better-auth` did not change unless intentionally scoped in.
   - `better-auth` did not change unless intentionally scoped in.

6. Run static verification.

   Run:

   ```bash
   pnpm lint
   ```

   If lint fails because of changed APIs, fix only the affected files. Do not run `pnpm check`.

7. Run production build verification.

   Run:

   ```bash
   pnpm build
   ```

   If the build fails, inspect the first TypeScript or bundler error and update only the relevant Convex integration code.

8. Run Convex deployment dry run if environment is configured.

   Run:

   ```bash
   pnpm dryrun
   ```

   This maps to `pnpx convex deploy --dry-run`. It does not start the Convex dev server.

   If this fails because required environment variables or credentials are missing, record that as skipped due to environment. Do not run `convex dev` as a fallback.

9. Fix any compatibility errors.

   Expected possible areas:

   - `convex/convex.config.ts`, especially component registration through `defineApp` and `app.use(...)`.
   - `convex/migrations.ts`, because `@convex-dev/migrations` must be upgraded across a peer dependency boundary.
   - `convex/r2.ts`, because `@convex-dev/r2` must be upgraded across a peer dependency boundary.
   - `convex/betterAuth/**`, if transitive Convex type changes expose stricter types.
   - frontend Convex client setup in `src/routes/convex.tsx`.

   Keep fixes minimal and directly tied to errors from lint/build/dry-run.

10. Do a final dependency compatibility check.

    Run:

    ```bash
    pnpm list convex @convex-dev/migrations @convex-dev/r2 convex-helpers @convex-dev/better-auth @convex-dev/react-query
    ```

    Confirm there is a single coherent Convex version in the lockfile where possible, and no peer dependency warnings reject the selected Convex version.

11. Final review.

    Run:

    ```bash
    git status --short
    git diff --stat
    git diff -- package.json pnpm-lock.yaml
    ```

    If code files changed, also inspect:

    ```bash
    git diff -- convex src
    ```

12. Final response checklist.

    Report:

    - Old Convex version.
    - New Convex version.
    - Related packages upgraded and why.
    - Whether `@convex-dev/better-auth` was intentionally left unchanged.
    - Verification commands run.
    - Any skipped verification and exact reason.
    - Any remaining risks.

## Rollback Guidance

If the upgrade causes unresolved compatibility issues, do not use destructive git commands. Instead, revert only the dependency changes with a normal package install command using the previous versions:

```bash
pnpm add convex@1.31.7 @convex-dev/migrations@0.2.9 @convex-dev/r2@0.7.3 convex-helpers@0.1.104
```

Then inspect the resulting diff and verify that `package.json` and `pnpm-lock.yaml` returned to the expected state.
