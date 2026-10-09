# COSS UI Migration Plan — System Pilot First

> Goal: fully migrate UI components from current shadcn `base-vega` in `packages/ui` to https://coss.com/ui.
> Source of truth: `https://coss.com/ui/llms.txt` + canonical migration doc `https://coss.com/ui/docs/migrating-from-radix` (note: `llms.txt` link to `/docs/radix-shadcn-migration.md` 404s — use `/docs/migrating-from-radix`).
> Method: side-by-side, route-by-route, system-first. No big-bang overwrite.

## 0. Locked decisions (from grill — do not relitigate)

- [x] Q1 Visuals: adopt COSS visuals wholesale (density, radius, neutral + color-mix borders, Inter fonts, info/success/warning tokens). Do not preserve `base-vega` look.
- [x] Q2 Scope: pilot `apps/system` first (100+ usages). Freeze `apps/storefront` + its `shop-*` theme until system passes gate.
- [x] Q3 Toast: migrate `sonner` → COSS `ToastProvider + toastManager.add()`. No sonner island.
- [x] Q4/Q10 Orphans: delete only zero-hit files. Keep + migrate everything with ≥1 hit.
- [x] Q5/Q11 Mechanics: new package slot alongside `@dg/ui`. Migrate imports file-by-file. Delete legacy when empty.
- [x] Q6 Roots: accept changing both `__root.tsx` files for `isolate` wrapper + iOS Safari 26 backdrop fix + monorepo `@base-ui/react` dedupe.
- [x] Q7 Fonts: switch to Inter (sans+heading) + Geist Mono + `--radius: 0.625rem` + `--font-heading` during system pilot.
- [x] Q8 Storefront: frozen during pilot. Port `shop-*` later, do not touch now except root wrapper.
- [x] Q9 UploadToast: rebuild `toast.custom(<UploadToast Progress>)` inside COSS Toast. Spike Progress-in-toast support first.
- [x] Q12 Gate: strict gate + freeze new UI PRs during pilot.
- [x] Q13 Color-picker: carry `color-picker.tsx` verbatim as `legacy/color-picker`. Do not rebuild now.
- [x] Q14 Bulk renames: codemod script first, then hand-fix edge cases. Do not do fully manual.
- [x] Q15 Drive: migrate shared `packages/drive` (file-list + UploadToast + toast calls) now as part of system pilot. Storefront absorbs it.

## 1. Current inventory (verified — do not re-ask user)

- `packages/ui`: 52 files, `style: base-vega`, `neutral`, Tailwind v4 CSS-first only, already on `@base-ui/react ^1.8.0`. No `tailwind.config.js`. See `packages/ui/components.json`, `packages/ui/package.json`, `packages/ui/styles/base.css`.
- Consumers: `apps/system/src` ~100+ hits (button 58, input 24, card 19, spinner 17, field 17, dialog 16, badge 15, table 12, dropdown-menu 11), `apps/storefront/src` ~17 hits, `packages/drive/src` ~30 hits. All via `@dg/ui/components/<name>`, `@dg/ui/lib/utils` (`cn`), `@dg/ui/hooks/use-mobile`.
- CSS: `apps/system/src/styles.css` + `apps/storefront/src/styles.css` both `@import "@dg/ui/styles/base.css"` then `@source "./"` + `@source "../../../packages/drive/src"`. Storefront adds `@theme` shop fonts + ~350 lines `shop-*` utilities.
- Dark mode: class-based `.dark` via `@custom-variant dark (&:is(.dark *))`. Custom `ThemeProvider` duplicated in both apps (`apps/system/src/contexts/theme-context.tsx`, `apps/storefront/src/contexts/theme-context.tsx`), not `next-themes`.
- Toast: 2 render sites (`apps/storefront/src/routes/__root.tsx:48` bare `<Toaster/>`, `apps/system/src/components/themed-toaster.tsx:1` via `__root.tsx:120`). `toast.*` in ~25 system files + 3 drive files + 1 storefront file (`public-share-browser.tsx`). Only Progress-in-toast: `packages/drive/src/components/upload-toast.tsx:41` driven by `packages/drive/src/use-upload.tsx:106,126,138,150` with `toast.custom(..., {duration: Infinity})` + XHR `onprogress`.
- Zero-hit (safe to delete): `chart`, `carousel`, `menubar`, `navigation-menu`, `resizable`, `aspect-ratio`, `hover-card`, `command` (no file), `input-otp` (no app import). Verified via grep `from "@dg/ui/components/<name>"`.
- Must-migrate (has hits): `dropdown-menu` 11 → COSS `Menu`, `context-menu` 1, `calendar` 2 (`date-and-time-picker.tsx:2`, `cashflow.tsx:4`), `combobox` 4, `field` 17, `color-picker` 1 (`apps/system/src/components/3d/color-picker-popover.tsx:9`), `sonner` 2, `dialog` 16, etc.
- COSS model: no npm UI package, copy-paste-own via `shadcn` CLI registry `@coss/*`. Requires React + Tailwind v4 + `@base-ui/react`. Primitives ~53 + Particles + Atoms. No `chart/carousel/menubar/navigation-menu/resizable/aspect-ratio`. Toast is `ToastProvider`, not `sonner`. Command is Autocomplete+Dialog, not `cmdk`. OTP is `OTPField`, not `input-otp`.

## 2. Agent constraints (from AGENTS.md — obey always)

- Do NOT run `pnpm dev`, `convex dev`, or any dev server.
- Do NOT run lint commands. Rely on LSP. Do NOT run `pnpm check`.
- Do NOT modify `routeTree.gen.ts`. Do NOT modify anything in `convex/_generated/`.
- Do NOT create, modify, or plan tests. No test deps/config/scripts/files.
- Imports: `@/` for `src/`, `@convex` for `convex/`. Lucide with `Icon` suffix. Tabs (2), no semicolons, double quotes. Full strict TypeScript. `function ComponentName()` not `React.FC<>`. Tailwind + shadcn. No translate/lift on hover. Convex: `v` validator, new `query/mutation({args, returns, handler})` syntax, infer `returns` when possible.
- Route loader pattern: `loader: ({context: {queryClient: qc}})`.

## 3. Phase 0 — Branch, freeze, baseline (stop if dirty)

1. `git status` must be clean. `git checkout -b coss-pilot-system`.
2. Announce freeze: no new UI PRs to `packages/ui`, `apps/system/src/components`, `packages/drive/src/components` until pilot gate passes.
3. Record baseline (no dev server): capture `tsc --noEmit` status per workspace (expect clean before starting), list `packages/ui/components/*.tsx` (expect 52), screenshot checklist for later manual visual pass (light/dark): system login, sidebar (`sidebar/app-sidebar.tsx`), `inventory/item-dialogs.tsx`, `drive.$spaceId` file-list, upload toast progress.
4. Do NOT proceed if baseline `tsc` is red — fix first on `main`.

## 4. Phase 1 — Scaffold COSS side-by-side (keep shipping)

Goal: new import slot works, old `@dg/ui` untouched and still the default.

1. Create new package dir (e.g. `packages/ui-coss/` with `package.json` name `@dg/ui-coss`, same `exports` map shape as `packages/ui/package.json`: `./components/*`, `./hooks/*`, `./lib/*`, `./styles/base.css`).
2. Inside the new package, run:
   - `npx shadcn@latest add @coss/ui @coss/style` (all primitives + full theme: colors + sidebar + fonts + base styles)
   - If CLI prompts for style/theme, choose COSS defaults (neutral, `Inter` + `Geist Mono`).
   - Single-component form for reference: `npx shadcn@latest add @coss/button`.
3. Set new `components.json`: `style` from COSS (not `base-vega`), `tailwind.css` points at new `styles/base.css`, aliases point at `@dg/ui-coss/...` (do not reuse `@dg/ui` paths).
4. Deps: ensure `@base-ui/react`, `class-variance-authority`, `lucide-react`, `tailwindcss@^4.3.3`, `tw-animate-css` present. Re-export dedupe utils: use `@coss/ui/base-ui/{use-render,merge-props,csp-provider,direction-provider}` instead of importing `@base-ui/react` directly in monorepo packages (prevents duplicates).
5. Wire Tailwind v4: new `styles/base.css` must keep `@import "tailwindcss"`, `@source "../components"`, `@source "../hooks"`, `@source "../lib"`, `@custom-variant dark (&:is(.dark *))`. In `apps/system/src/styles.css`, add `@source "../../../packages/ui-coss/src"` (or components path) alongside existing `@source` lines — do NOT remove `@dg/ui` source yet.
6. Add workspace dep: `apps/system/package.json` gets `@dg/ui-coss: workspace:*`. Run `pnpm install`. Verify `tsc --noEmit -p packages/ui-coss/tsconfig.json` passes (create tsconfig mirroring `packages/ui/tsconfig.json` includes).
7. Stop condition: both `@dg/ui` and `@dg/ui-coss` resolve. No app file imports `@dg/ui-coss` yet.

## 5. Phase 2 — Theme tokens (system pilot only)

1. Copy full COSS theme from `@coss/style` into new `styles/base.css`: `@theme inline { --color-*: var(--*) ... --font-sans/--font-heading/--font-mono }` + `:root` + `.dark` blocks.
2. Required extra vars (add if CLI missed): `--destructive-foreground`, `--info/--info-foreground`, `--success/--success-foreground`, `--warning/--warning-foreground`, all `--sidebar-*` tokens. Colors: neutral system, opaque borders via `--alpha(black/white / 4-10%)` + `color-mix()` shadows. `destructive: red-500`, `info: blue-500`, `success: emerald-500`, `warning: amber-500`.
3. Set `--radius: 0.625rem` (replaces `0.5rem`). Set `--font-sans` (body/buttons) + `--font-mono` (code/kbd) + `--font-heading` (Dialog/AlertDialog/Sheet/Empty titles, defaults to `var(--font-sans)`). Install Inter + Geist Mono with `variable` exactly `--font-sans/--font-mono/--font-heading` (not `--font-geist-sans` default). Remove Geist/Georgia references in system path only.
4. Keep system custom CSS (`animate-dot-appear`, `animate-border-pulse`, `scrollbar-themed`, `pwa-padding` in `apps/system/src/styles.css`) on top. Do NOT port `shop-*` (storefront frozen).
5. Verify: light `:root` white/neutral-800, dark neutral-950-mix/neutral-100, class-based `.dark` selector. LSP shows no unknown `--color-*` / `--sidebar-*`.

## 6. Phase 3 — Root wrappers + providers

1. `apps/system/src/routes/__root.tsx`: wrap `<body className="relative"><div className="isolate relative flex min-h-svh flex-col">{children}</div></body>` (`isolate` = portal stacking, `relative` on body = iOS Safari 26+ backdrop fix). Do same shape in storefront `__root.tsx` now (cheap, prevents later portal bugs) but leave its `<Toaster/>` until its turn, except drive-shared toast (Phase 7) will affect it.
2. Replace system `ThemedToaster` (`apps/system/src/components/themed-toaster.tsx`) + `<TooltipProvider>` usage: mount COSS `<ToastProvider>` at root (wrapper, not `<Toaster/>`). Keep `ThemeProvider` (`theme-context.tsx`) — do not switch to `next-themes`.
3. Verify: no duplicate `Toaster` mounts, `documentElement.classList` dark toggle still works, no portal z-index regression.

## 7. Phase 4 — Delete zero-hit orphans + carry color-picker

1. In the NEW package only, delete (or never add) these 9: `chart.tsx` (recharts), `carousel.tsx` (embla), `menubar.tsx`, `navigation-menu.tsx`, `resizable.tsx`, `aspect-ratio.tsx`, `hover-card.tsx`, `command` (cmdk — COSS Command is different, add COSS Command fresh), `input-otp.tsx` (replaced by COSS OTPField).
2. Carry `packages/ui/components/color-picker.tsx` (461 lines) verbatim to new package as `components/legacy/color-picker.tsx` (or `components/color-picker.tsx` if COSS has no conflict). Only token restyle, no logic rewrite. Consumer stays `apps/system/src/components/3d/color-picker-popover.tsx:9` until Phase 8 switches its import path.
3. Do NOT delete `combobox.tsx`, `field.tsx`, `input-group.tsx`, `item.tsx`, `button-group.tsx`, `calendar.tsx`, `sidebar.tsx`, `dropdown-menu.tsx` (will become `menu`), `context-menu.tsx` — all have hits or are coupled.
4. Later cleanup (after pilot): `pnpm remove` only confirmed-unused deps (`recharts`, `embla-carousel-react`, `react-resizable-panels`, `input-otp`, `sonner` if fully migrated). Do NOT remove until no importer remains — verify with grep.

## 8. Phase 5 — Codemod mechanical renames (script, then typecheck)

Write and run a codemod (e.g. `scripts/coss-codemod.py` via `python3 -c` or standalone script — delete after, not a test) over `apps/system/src` + `packages/drive/src` staged copies importing from new package. Cover:

- [ ] `asChild` → `render={<.../>}` everywhere (e.g. `<MenuTrigger render={<Button/>}>`).
- [ ] `*Content` → `*Popup` or `*Panel`: `DialogContent→DialogPopup+DialogPanel`, `AlertDialogContent→AlertDialogPopup` (no Panel), `SelectContent→SelectPopup`, `PopoverContent→PopoverPopup`, `AccordionContent→AccordionPanel`, `CollapsibleContent→CollapsiblePanel`, `TabsContent→TabsPanel`, `CardContent→CardPanel`. Check COSS per-component docs — legacy aliases may exist but do not rely on them.
- [ ] `DropdownMenu*` → `Menu*` (11 hits: `theme-toggle.tsx:7`, `sidebar/nav-user.tsx:12`, `admin.users.tsx:17`, `jo/order-items-card.tsx:11`, `printer-mode-toggle.tsx:1`, `drive/trello-attachment-menu.tsx:23`, `inventory/item-dialogs.tsx:21`, drive `file-list.tsx:11`, `file-list-rows.tsx:15`, `add-items-menu.tsx:8`). `MenuGroupLabel`, `MenuPopup/SubPopup`. `onSelect` → `onClick`.
- [ ] `HoverCard*` → `PreviewCard*` (0 hits now, but fix any new usage).
- [ ] `Accordion: type="single/multiple" collapsible` → `multiple={true/false}`, `defaultValue={["item-1"]}` array. `ToggleGroup: type="multiple"` → `multiple` + array `defaultValue`.
- [ ] `Slider: value={[50]}`, `onValueChange: number[]` (multi-thumb native). Check `color-picker` Hue/Alpha sliders + `apps/system` `slider` 1 hit.
- [ ] `Select`: add required `items` array prop (SSR/hydration) + `alignItemWithTrigger` on Popup. `SelectValue placeholder` supported — verify each of 6 system `select` usages.
- [ ] `Button`: sizes `default 36→32px, sm 32→28px, lg 40→36px` (+ new `xs:24px, xl:40px, icon-sm:28px, icon-lg:36px`). Use `lg` to match old shadcn size where parity needed. New `destructive-outline` + `loading` prop (spinner + `data-loading` + forced `disabled`) — adopt where `spinner` + `disabled` was manual (17 spinner hits).
- [ ] `Alert/Badge`: new `info/success/warning/error` variants require Phase 2 CSS vars — verify.
- [ ] `AlertDialogAction/Cancel` → `AlertDialogClose`. Add `GroupSeparator` where needed. Add `portalProps` where `Dialog/Sheet/Popover/Menu/Select/Toast` need it.
- [ ] `InputOTP→OTPField, InputOTPSlot→OTPFieldInput, maxLength→length, onChange→onValueChange/value`, one `<OTPFieldInput/>` per char (0 hits now, but fix registry copy).

After codemod: run `tsc --noEmit` (via LSP, not `pnpm check`), fix type errors by hand. Do NOT hand-edit `routeTree.gen.ts`.

## 9. Phase 6 — Hand-rewrite specials (no codemod)

1. **Toast (largest):** `<Toaster/>` → `<ToastProvider>` wrapper + `toastManager.add({title,description,type,actionProps})`. Rewrite table:
   - `toast.success/error/info` (~25 system files e.g. `item-dialogs.tsx`, `admin.users.tsx`, `trello.$listId.tsx`, drive `file-list.tsx:282`, `add-items-menu.tsx:73`) → `toastManager.add` with matching `type`.
   - `toast.loading + toast.dismiss` (`trello-attachment-menu.tsx:150`, `drive.$spaceId.{-$folderId}.tsx:178,191`, `public-share-browser.tsx:131,138`) → COSS loading pattern (verify `type: "loading"` or pending state in docs; if missing, use `actionProps` + manual dismiss handle).
   - `toast.promise` (`trello.$listId.tsx:157`, `admin.users.tsx:260,262`) → manual pending/success/error `toastManager.add` sequence.
   - `toast.custom(<UploadToast/>, {id, duration: Infinity})` (`use-upload.tsx:106,126,138,150`) → COSS toast with custom content slot. SPIKE FIRST: prove `<Progress value={progress}>` (`upload-toast.tsx:41` statuses `uploading|success|error`) renders inside COSS Toast. If blocked, stop and report — do not keep sonner island (per Q9).
2. **Command:** no `cmdk`. Rebuild data-driven `items` + `CommandDialog/Trigger/Popup/GroupLabel/Collection` on Base Autocomplete+Dialog (0 hits now — just ensure new registry copy is used for any new feature).
3. **Calendar/DatePicker:** `date-and-time-picker.tsx:35-45` (`Calendar` in `PopoverContent`→`PopoverPopup`) + `cashflow.tsx:4` → COSS `Calendar` + `DatePicker` (popover or input combo). Verify `react-day-picker` still needed or replaced.
4. **Combobox + InputGroup + Field unit:** `combobox.tsx` (284 lines, `ComboboxPrimitive` + `InputGroup`, `Chips/Chip/ChipRemove`, `Positioner/Popup/Portal`) + `input-group.tsx` (143) + `field.tsx` (233, `cva` orientations, `FieldError` dedup) — migrate together for 4 inventory usages + drive `add-items-menu.tsx`. Do not split across PRs.
5. **Table/Sidebar/Chart leftovers:** `sidebar.tsx` (large, `useIsMobile`) → COSS `Sidebar` (collapsible nav). `table.tsx` 12 hits → COSS `Table`. `chart.tsx`/`carousel.tsx` already deleted (0 hits) — do not rebuild.

## 10. Phase 7 — Pilot migration order (system + shared drive)

Switch import paths from `@dg/ui/...` → `@dg/ui-coss/...` in this order (smallest blast radius first, keep each step committable):

1. `button`, `badge`, `spinner`, `skeleton`, `separator`, `kbd`, `label`, `avatar`
2. `input`, `textarea`, `switch`, `checkbox`, `radio-group`, `slider`, `progress`, `tabs`
3. `card`, `table`, `breadcrumb`, `empty`, `item`, `button-group`, `input-group`, `field`
4. `dialog`, `alert-dialog`, `popover`, `select`, `tooltip`, `collapsible`, `accordion`
5. `dropdown-menu` → `menu` (11 files), `context-menu` (1), `combobox` (4), `calendar` (2), `sheet`, `drawer`, `sidebar` (`sidebar/app-sidebar.tsx`, `trello-sidebar`)
6. `sonner` → Toast (`themed-toaster.tsx`, `__root.tsx`, all `toast.*` call sites) + `packages/drive` (`file-list.tsx`, `file-list-rows.tsx`, `file-list-dialogs.tsx`, `add-items-menu.tsx`, `upload-toast.tsx`, `use-upload.tsx`)
7. `theme-toggle.tsx`, `printer-mode-toggle.tsx` (Button + dropdown-menu + Sun/Moon icons)

After each batch: LSP typecheck clean, no `@dg/ui` import remains in touched files (grep to confirm).

## 11. Phase 8 — Pilot gate (must all pass before storefront)

- [ ] `tsc --noEmit` clean for `packages/ui-coss`, `apps/system`, `packages/drive` (via LSP).
- [ ] Zero `@dg/ui` imports remain in `apps/system/src` + `packages/drive/src` (grep `from "@dg/ui/components` returns 0 in those roots; storefront still allowed).
- [ ] Dark/light parity: same checklist as Phase 0, plus `theme-toggle` cycle, no FOUC (`ScriptOnce` guard still in `theme-context.tsx`).
- [ ] Keyboard/focus/aria/SSR: Tab through Dialog/Menu/Select/Popover, Esc closes, focus returns to trigger; Select `items` hydrates without mismatch; Accordion/Slider arrays behave.
- [ ] Density sign-off: Button/Input/Select `default` 32px vs old 36px accepted, or `lg` applied where parity required. Badge `lg` = old size acknowledged.
- [ ] UploadToast: XHR progress → success/error renders Progress inside COSS Toast, `duration: Infinity` during upload then 3000/5000 dismiss works.
- [ ] No `routeTree.gen.ts` or `convex/_generated/` diffs. No test files added. No `pnpm dev` / lint / `check` run as part of migration.

If any box fails, stay on pilot — do NOT start storefront.

## 12. Phase 9 — Storefront + final cleanup (after gate)

1. Unfreeze storefront. Port `apps/storefront/src/styles.css` `shop-*` (~350 lines neon/blobs/marquee/rise/halftone/grain) + `@theme` shop fonts (`Chakra Petch`, `Archivo`, `Instrument Serif`) on top of COSS theme. Decide per-utility: keep (brand) or drop (pure COSS) — default keep, restyle tokens to COSS vars.
2. Migrate storefront ~17 hits (`shop-button.tsx`, `breadcrumb`, `progress`, `dropdown-menu→Menu`, `public-share-browser.tsx` toast + inline `<Progress value>`) + already-migrated drive Toast (absorbed).
3. Switch `components.json` files (`packages/ui/components.json`, `apps/*/components.json`) from `base-vega` to COSS registry. Remove `@dg/ui` dep from all `package.json` when grep is 0.
4. Delete `packages/ui` legacy dir. Remove now-unused deps only after grep proves zero (`sonner`, `input-otp`, `embla-carousel-react`, `recharts`, `react-resizable-panels`, `cmdk` if present). `pnpm install`.
5. Docs: update `docs/` operational notes + `README.md` Todos (`- [ ]` checkboxes, `<!-- Completed: YYYY-MM-DD HH:MM:SS -->` on done). Run `npx skills add cosscom/coss` for future agents.

## 13. Rollback

- Each Phase 7 batch is a separate commit — revert single batch, not whole branch.
- `@dg/ui` stays installed and working until Phase 9 step 3. Instant rollback = flip imports back to `@dg/ui/...` in touched files.
- If UploadToast spike (Phase 6.1) fails, stop pilot and report toast blocker — do not fork per-app toasts (per Q15).

## 14. Agent execution rules

- Work phases in order. Finish Phase N gate before N+1.
- Prefer `read`/`grep`/`edit` tools over shell for files. Use shell only for `pnpm install`, `npx shadcn ...`, `python3 -c` codemod, `tsc` via LSP.
- Keep diffs minimal: import path + required prop renames + tokens only. Do not redesign features, do not preserve `base-vega` complexity, do not introduce new machinery (per AGENTS.md simplicity rule).
- After every edit touching preserved logic, re-read the edited region to confirm no unrelated deletions.
- Final report must list: files switched, codemod stats, remaining `@dg/ui` grep count, gate checklist status, and any load-bearing blocker.
