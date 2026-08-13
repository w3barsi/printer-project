# Radix to Base UI Migration Plan

## Goal

Migrate the project from shadcn Radix components to shadcn Base UI components, remove all Radix dependencies including transitive dependencies where practical, preserve intentional UI customizations, and keep application behavior unchanged.

Do not run `pnpm dev`, `convex dev`, `pnpm check`, or modify generated files. Do not revert unrelated worktree changes. The existing changes in `src/routes/app/inventory.tsx` and `src/components/inventory/item-details-sheet.tsx` must be preserved.

## Step-By-Step Plan

### 1. Read project instructions and inspect the worktree

Run:

```bash
git status --short
pnpm dlx shadcn@latest info --json
```

Confirm the initial shadcn configuration reports:

```json
{
  "style": "radix-vega",
  "base": "radix"
}
```

Record existing lint/build failures before editing:

```bash
pnpm lint
pnpm build
```

Do not fix unrelated pre-existing failures.

### 2. Create a migration inventory

Find all remaining Radix contracts:

```bash
rg 'from "radix-ui"|from "@radix-ui|from '\''@radix-ui' src
rg '\basChild\b' src
rg -- '--radix-' src
rg 'data-\[state=' src
pnpm why @radix-ui/react-dialog
```

Expected hotspots include:

- 33 files importing `radix-ui`.
- Approximately 102 `asChild` usages.
- Radix variables in generated components and several application files.
- Transitive Radix from `cmdk` and `vaul`.

### 3. Protect intentional customizations

Before overwriting generated components, read the current `HEAD` versions of these files and preserve the listed behavior:

- `src/components/ui/table.tsx`
- `src/components/ui/sonner.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/alert-dialog.tsx`

Use `git show HEAD:<path>` after regeneration when comparing old and new implementations. Do not restore entire Radix files after regeneration; only reapply the intentional behavior onto the new Base UI implementations.

### 4. Switch shadcn to Base UI

Change only the style in `components.json`:

```json
"style": "base-vega"
```

Do not change aliases, colors, icon library, Tailwind configuration, or theme variables.

Verify:

```bash
pnpm dlx shadcn@latest info --json
```

The result must report:

```json
{
  "style": "base-vega",
  "base": "base"
}
```

### 5. Preview the Base UI component replacement

Use the component list returned by `shadcn info`. Pass the currently installed components explicitly; do not use `--all`, because that could install unrelated components.

First run:

```bash
pnpm dlx shadcn@latest add <installed-components> --dry-run
```

Review every affected file. Confirm that no files outside the intended UI component and dependency set would be unexpectedly overwritten.

This plan authorizes `--overwrite` for the currently installed shadcn components after the dry-run has been reviewed.

### 6. Regenerate installed shadcn components

Run:

```bash
pnpm dlx shadcn@latest add <installed-components> --overwrite
```

Immediately inspect:

```bash
git status --short
git diff -- src/components/ui package.json pnpm-lock.yaml components.json
```

Confirm generated primitive imports use `@base-ui/react/*` instead of `radix-ui`.

### 7. Reapply the table customizations

In `src/components/ui/table.tsx`, preserve:

- `bg-muted` on `TableHeader`.
- The custom `TableWrapper` component.
- The `TableWrapper` export.
- Existing `TableWrapper` consumers without changing their layout.

Current expected wrapper styling:

```tsx
className={cn("w-full overflow-hidden rounded-md border", className)}
```

Verify all existing imports still compile:

```bash
rg 'TableWrapper' src
```

### 8. Reapply Sonner integration

In `src/components/ui/sonner.tsx`, preserve:

- `useTheme` from `@/contexts/theme-context`.
- The current project theme passed into Sonner.
- The full-width toast class needed by upload-progress toasts.

Preserve equivalent behavior to:

```tsx
toastOptions={{
  classNames: {
    toast: "cn-toast flex w-full",
  },
}}
```

Do not restore `next-themes`.

### 9. Merge sidebar customizations into the Base sidebar

Keep the newly generated Base UI composition and `render` API. Do not restore Radix `Slot` or `asChild`.

Preserve:

- Compact `gap-0` sidebar content.
- Compact `gap-0` sidebar menus.
- Correct active-state styling for main and submenu links.
- Existing `isActive` behavior.
- Mobile Sheet behavior.
- Collapsed-sidebar tooltips.

Base UI's generated `useRender` state may already serialize `data-active` correctly. Verify the rendered state contract rather than copying the old implementation blindly.

### 10. Merge Dialog and Alert Dialog customizations

Keep Base UI primitives such as `Backdrop`, `Popup`, and `render`. Do not restore Radix `Overlay`, `Content`, or `asChild`.

For Dialog, preserve:

- Light blurred overlay.
- Current rounded/ring presentation where it differs from generated Base Vega.
- `showCloseButton` behavior in `DialogContent`.
- Optional footer close button behavior.
- Existing accessible titles and descriptions.

For Alert Dialog, preserve:

- `size="sm"` as the current default.
- Responsive size-driven layout.
- `AlertDialogMedia`.
- Button `variant` and `size` support on Action and Cancel.
- Current overlay treatment.

Use Base UI `render` composition for Action and Cancel.

### 11. Migrate all `asChild` call sites

Replace Radix composition with Base UI composition.

Convert trigger composition from:

```tsx
<DialogTrigger asChild>
  <Button>Open</Button>
</DialogTrigger>
```

To:

```tsx
<DialogTrigger render={<Button />}>Open</DialogTrigger>
```

Apply this pattern to:

- Dialog triggers and close buttons.
- Alert Dialog triggers, actions, and cancel buttons.
- Tooltip triggers.
- Popover triggers.
- Dropdown Menu triggers.
- Collapsible triggers and content.
- Sidebar menu components.
- Breadcrumb links.
- Sheet triggers and close buttons.

For nested Tooltip and Dialog triggers, preserve one interactive element and avoid nested buttons.

### 12. Migrate links styled as buttons

Do not render anchors through Base UI Button. Current shadcn Base guidance recommends styling plain links with `buttonVariants`.

Convert:

```tsx
<Button asChild variant="secondary">
  <Link to="...">...</Link>
</Button>
```

To the equivalent:

```tsx
<Link className={buttonVariants({ variant: "secondary" })} to="...">
  ...
</Link>
```

Use `cn()` when additional classes are needed.

Apply this to default error pages, catch boundaries, breadcrumbs, sidebar navigation, and other button-link compositions.

### 13. Migrate `ShopButton`

`src/components/shop/ui/shop-button.tsx` directly imports Radix `Slot`.

Replace its `asChild` composition with a Base UI-compatible `render` API while preserving:

- `shopButtonVariants`.
- Existing variants and sizes.
- Current visual styling.
- Existing Link consumers.

Use the same `useRender` and `mergeProps` composition pattern used by generated Base shadcn components. Update all `ShopButton asChild` call sites to `render`.

### 14. Migrate Select call sites

Base Select requires an `items` collection.

Update:

- `src/components/jo/add-payment-dialog.tsx`
- `src/components/inventory/activity-log.tsx`

Define stable item arrays with labels and values, pass them to `<Select items={items}>`, and render the corresponding `SelectItem` elements from that collection.

Preserve controlled values, placeholders, React Hook Form integration, and existing filter behavior.

Replace Radix positioning props such as `position="popper"` with Base UI props such as `alignItemWithTrigger`, `side`, and `sideOffset` where applicable.

### 15. Replace Radix state selectors and variables

Update application-level selectors:

- `src/components/sidebar/nav-user.tsx`
- `src/components/sidebar/trello-sidebar.tsx`
- `src/components/inventory/activity-log.tsx`

Replace Radix selectors such as:

```text
data-[state=open]
```

With Base UI state attributes such as:

```text
data-open
```

Replace application-level Radix variables:

```text
--radix-popover-trigger-width
--radix-dropdown-menu-trigger-width
```

With generated Base UI variables, usually:

```text
--anchor-width
--available-height
--transform-origin
```

Generated UI files should provide the appropriate Base variables after regeneration.

### 16. Handle component-specific API differences

Search for and migrate any actual usages of these APIs:

```bash
rg '<Accordion|<ToggleGroup|<Slider' src --glob '!src/components/ui/**'
```

Apply these conversions where needed:

- Accordion: remove `type`; use `multiple`; use array values.
- Toggle Group: replace `type="multiple"` with `multiple`; use array values.
- Slider: use a number for a single thumb and arrays only for ranges.
- Base triggers: use `render`, not `asChild`.
- Non-button trigger renders: add `nativeButton={false}` only where Base UI requires it.

### 17. Resolve the invalid Button variants

These call sites currently request the removed `destructive-outline` variant:

- `src/components/printer/printer-button.tsx`
- `src/components/printer/usb-printer-handler-component.tsx`

Replace them with a built-in shadcn variant. Prefer `variant="destructive"` unless the surrounding UI clearly requires a neutral outline treatment.

Do not add a new custom Button variant solely for backward compatibility.

### 18. Remove Command's transitive Radix dependency

The shadcn Command component uses `cmdk`, which introduces Radix transitively.

Replace the Command-based inventory picker in `src/components/inventory/activity-log.tsx` with the existing shadcn Base Combobox pattern. Use `src/components/inventory/supplier-combobox.tsx` as a project example.

After the replacement:

- Remove unused imports from `activity-log.tsx`.
- Delete `src/components/ui/command.tsx` if it has no remaining consumers.
- Confirm no source file imports `cmdk`.

### 19. Remove Radix-related dependencies

Once source migration is complete, run:

```bash
pnpm remove radix-ui cmdk vaul
```

Keep `@base-ui/react`.

`vaul` should no longer be needed because shadcn's Base Drawer uses `@base-ui/react/drawer`.

### 20. Run static migration checks

All of these searches should return no matches:

```bash
rg 'from "radix-ui"|from "@radix-ui|from '\''@radix-ui' src
rg '\basChild\b' src
rg -- '--radix-' src
rg 'data-\[state=(open|closed|on|off|delayed-open)' src
rg 'from "cmdk"|from "vaul"' src
```

Check the dependency graph:

```bash
pnpm why radix-ui
pnpm why @radix-ui/react-dialog
pnpm why @radix-ui/react-slot
```

For a strict zero-Radix migration, these commands should report no dependency path.

### 21. Format and verify

Do not run `pnpm check`.

Run:

```bash
pnpm format:check
pnpm lint
pnpm build
```

If formatting is required, format only files changed by the migration. Do not format unrelated dirty files.

Fix all migration-introduced type, lint, and build failures.

### 22. Review the final diff

Run:

```bash
git status --short
git diff --stat
git diff
```

Confirm:

- Existing unrelated changes are preserved.
- `routeTree.gen.ts` is untouched.
- Nothing under `convex/_generated` is touched.
- No Radix source imports remain.
- The five custom UI components retain their required behavior.
- No accidental theme redesign was introduced.

### 23. Provide a manual QA checklist

Do not start a dev server. Report that these interactions still require browser verification:

- Dialog open, close, Escape, outside click, and focus restoration.
- Alert Dialog confirm/cancel and destructive actions.
- Dropdown and context menus.
- Tooltips, including collapsed sidebar tooltips.
- Desktop and mobile sidebar behavior.
- Inventory item picker and activity filter.
- Payment type Select.
- JO and Trello collapsibles.
- Tabs and keyboard navigation.
- Toast theme and upload-progress width.
- Table wrappers on admin, inventory, cashier, and activity pages.

## Completion Criteria

- `components.json` reports `base-vega`.
- All shadcn primitive wrappers use Base UI.
- No `radix-ui`, `@radix-ui/*`, `cmdk`, or `vaul` dependency remains.
- No `asChild` or `--radix-*` usage remains.
- Custom Table, Sonner, Sidebar, Dialog, and Alert Dialog behavior is preserved.
- `pnpm lint` and `pnpm build` pass.
- Existing unrelated worktree changes remain intact.
- No commit is created unless explicitly requested.
