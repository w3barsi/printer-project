# Base UI Migration Plan

Plan for switching this project from Radix UI to Base UI while keeping shadcn's Vega style.

No implementation changes have been made yet. The Vega/Base reference project was generated outside this repo at `/tmp/opencode/start-app` with:

```bash
pnpm dlx shadcn@latest init --preset bIkeymG --base base --template start
```

## Current State

- `components.json` currently uses `style: "radix-vega"`.
- The target reference uses `style: "base-vega"` and `base: "base"`.
- The current primitive dependency is `radix-ui`.
- The target primitive dependency is `@base-ui/react`.
- Most generated wrappers under `src/components/ui` import from `radix-ui`.
- App code has many Radix `asChild` usages that need Base UI `render={...}` equivalents.
- Only one app-level `Select` usage was found: `src/components/jo/add-payment-dialog.tsx`.
- No app-level `Accordion`, `ToggleGroup`, or `Slider` usage was found.
- `src/styles.css` already contains Vega-like tokens plus local font/shop/custom styles, so it should be merged, not overwritten.

## Migration Steps

### 1. Snapshot Current shadcn State

Run:

```bash
pnpm dlx shadcn@latest info --json
```

Keep the output and the reference project at `/tmp/opencode/start-app` available for comparison.

### 2. Update Dependencies

Replace:

```json
"radix-ui": "^1.4.3"
```

with:

```json
"@base-ui/react": "^1.6.0"
```

Consider adding the reference font package if matching the current shadcn Vega output exactly:

```json
"@fontsource-variable/inter": "^5.2.8"
```

Do not remove supporting component dependencies that shadcn Base still uses, such as `cmdk`, `vaul`, `input-otp`, `react-day-picker`, `embla-carousel-react`, `sonner`, or `react-resizable-panels`.

### 3. Update `components.json`

Change:

```json
"style": "radix-vega"
```

to:

```json
"style": "base-vega"
```

The reference `components.json` also includes `"rtl": false`; add it only if the shadcn CLI expects it after re-init/apply.

### 4. Regenerate shadcn UI Wrappers

Regenerate the installed component set with Base/Vega wrappers:

```bash
pnpm dlx shadcn@latest add accordion alert-dialog alert aspect-ratio avatar badge breadcrumb button-group button calendar card carousel chart checkbox collapsible combobox command context-menu dialog drawer dropdown-menu empty field hover-card input-group input-otp input item kbd label menubar navigation-menu pagination popover progress radio-group resizable scroll-area select separator sheet sidebar skeleton slider sonner spinner switch table tabs textarea toggle-group toggle tooltip --overwrite
```

Before doing the actual overwrite, inspect high-risk components with `--dry-run` and `--diff`:

```bash
pnpm dlx shadcn@latest add button --dry-run
pnpm dlx shadcn@latest add sidebar --dry-run
pnpm dlx shadcn@latest add dialog dropdown-menu select tooltip popover collapsible alert-dialog sheet --dry-run
```

Review these wrappers manually after regeneration:

- `src/components/ui/button.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/tooltip.tsx`
- `src/components/ui/collapsible.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/item.tsx`
- `src/components/ui/button-group.tsx`

### 5. Merge `src/styles.css`

Do not blindly overwrite `src/styles.css`.

The Base/Vega reference adds:

```css
@import "shadcn/tailwind.css";
@import "@fontsource-variable/inter";
```

The reference also uses Base/Vega radius values:

```css
--radius-sm: calc(var(--radius) * 0.6);
--radius-md: calc(var(--radius) * 0.8);
--radius-xl: calc(var(--radius) * 1.4);
```

Preserve local additions:

- Google font imports or intentionally replace them with `@fontsource-variable/inter`.
- Shop-specific fonts and CSS variables.
- Custom utility keyframes.
- Existing app-specific theme tokens.

Consolidate duplicated `@theme inline` blocks only if it is safe and verification passes.

### 6. Convert `asChild` to `render`

Radix uses:

```tsx
<DialogTrigger asChild>
  <Button>Open</Button>
</DialogTrigger>
```

Base UI uses:

```tsx
<DialogTrigger render={<Button />}>Open</DialogTrigger>
```

When rendering a non-button element, add `nativeButton={false}` where required:

```tsx
<Button render={<Link to="/path" />} nativeButton={false}>
  Go
</Button>
```

Known files with app-level `asChild` migration work:

- `src/components/theme-toggle.tsx`
- `src/components/create-user.tsx`
- `src/components/cashier/add-cashflow.tsx`
- `src/components/cashier/add-coh.tsx`
- `src/components/drive/create-folder-dialog.tsx`
- `src/components/drive/entry.tsx`
- `src/components/sidebar/*.tsx`
- `src/components/jo/*.tsx`
- `src/components/printer/*.tsx`
- `src/routes/app/jo.$joId.tsx`
- `src/routes/app/_admin/admin.users.tsx`
- `src/routes/app/_cashier/cashflow.tsx`
- `src/components/breadcrumbs.tsx`
- `src/components/default-catch-boundary.tsx`
- `src/components/default-not-found.tsx`

### 7. Migrate Custom Radix Slot Components

Generated shadcn files should be replaced by Base versions, but custom components using `Slot` need manual migration or an intentional compatibility decision.

Custom component to migrate manually if removing Radix fully:

- `src/components/shop/ui/shop-button.tsx`

Generated components that currently use `Slot` and should be handled by regeneration:

- `src/components/ui/button.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/button-group.tsx`
- `src/components/ui/item.tsx`
- `src/components/ui/sidebar.tsx`

### 8. Fix `Select`

Current Radix-style usage in `src/components/jo/add-payment-dialog.tsx` uses inline items and `placeholder` on `SelectValue`.

Base-style target:

```tsx
const paymentTypeItems = [
  { label: "Select payment type", value: null },
  { label: "Cash", value: "cash" },
  { label: "Bank", value: "bank" },
]

<Select items={paymentTypeItems} value={field.value} onValueChange={field.onChange}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      {paymentTypeItems.map((item) => (
        <SelectItem key={item.value ?? "placeholder"} value={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectGroup>
  </SelectContent>
</Select>
```

Check the form schema before allowing `null`. If `null` is not valid, use an app-specific placeholder strategy.

### 9. Remove Radix-Specific CSS Vars

Regenerated wrappers should replace Radix CSS variables with Base equivalents.

Radix variables to remove from UI wrappers include:

- `--radix-dropdown-menu-content-available-height`
- `--radix-dropdown-menu-trigger-width`
- `--radix-popover-content-transform-origin`
- `--radix-select-content-transform-origin`
- `--radix-navigation-menu-viewport-width`

Base equivalents include:

- `--available-height`
- `--available-width`
- `--anchor-width`
- `--transform-origin`

### 10. Verify

Run:

```bash
pnpm install
pnpm lint
pnpm build
```

Do not run `pnpm check` per repo instructions.

Manual smoke tests:

- Dialog open/close flows.
- Alert dialog confirm/cancel.
- Dropdown menus in sidebar, user menu, admin pages, theme toggle, and drive entries.
- Tooltips on printer and job order actions.
- Popover date picker in cashier cashflow.
- Sidebar collapse and mobile sheet.
- Select payment type.
- Shop pages using custom `ShopButton`.

## Recommended Commit Strategy

Use two focused commits or PRs:

1. Generated migration: dependencies, `components.json`, regenerated `src/components/ui/*`, CSS merge.
2. App compatibility fixes: `asChild` to `render`, `Select`, custom `ShopButton`, smoke-test fixes.

This keeps generated churn separate from behavioral fixes.
