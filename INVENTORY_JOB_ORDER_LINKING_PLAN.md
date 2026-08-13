# Inventory Job Order Linking Plan

Execution plan for linking inventory usage to Job Orders so the application can show where stock was used. This plan also renames the user-facing "Remove stock" action to "Use stock."

No implementation changes have been made yet.

## Outcome

Users can record stock usage against an optional Job Order. The resulting inventory activity remains the authoritative, immutable record of the usage and can be viewed from both the inventory ledger and the Job Order detail page.

The first release must support:

- Selecting an optional Job Order while using stock.
- Reducing the inventory balance and recording the usage link atomically.
- Showing the linked Job Order in inventory activity views.
- Showing all linked inventory usage on the Job Order detail page.
- Preserving Job Order identifying information in the inventory ledger after the Job Order is deleted.
- Renaming user-facing "Remove stock" language to "Use stock" without changing the persisted `stock_removed` operation.

The first release must not include:

- Automatic stock usage based on Job Order line items.
- Inventory costing or profitability calculations.
- Editing or relinking an existing inventory activity.
- Restoring stock automatically when a Job Order or Job Order item is deleted.
- A new test framework, test files, or test dependencies.

## Domain Decisions

### Inventory Usage

An **Inventory Usage** is an inventory activity whose persisted operation is `stock_removed`. It reduces one inventory item's stock balance by a positive whole-number quantity.

### Job Order Link

An Inventory Usage may reference zero or one Job Order. A single stock quantity used across multiple Job Orders must be recorded as separate usage activities, one per Job Order.

### Historical Snapshot

The activity stores the Job Order ID plus snapshots of its Job Order number and display name at the time of usage. The snapshots preserve an understandable ledger entry if the Job Order is later permanently deleted.

### Terminology

- Use `Use stock`, `Quantity used`, and `Stock used` in the UI.
- Keep `removeStock`, the `remove` action value, and the persisted `stock_removed` operation unless a local refactor is necessary for clarity.
- Do not migrate existing activity operation values merely to rename UI copy.
- An unlinked usage remains valid for damage, disposal, internal use, or usage whose Job Order is unknown.

## Required Invariants

The implementing agent must preserve all of these invariants throughout the work:

- Inventory quantity never becomes negative.
- Usage quantity is a positive safe whole number.
- Inventory balance reduction and activity insertion occur in the same Convex mutation transaction.
- A supplied `jobOrderId` must resolve to an existing Job Order at mutation time.
- Unconfirmed online Job Orders cannot be linked to inventory usage.
- Pending, in-progress, and completed Job Orders may be linked.
- A usage activity references at most one Job Order.
- The Job Order link is optional.
- Only `stock_removed` activities may receive Job Order fields in this release.
- Existing inventory activities remain valid without Job Order fields.
- Existing `stock_removed` activities are not backfilled or guessed.
- Activity records are immutable from the UI; no edit, unlink, or relink mutation is introduced.
- Job Order deletion never deletes inventory activities and never restores inventory.
- Historical Job Order snapshots remain visible after Job Order deletion.
- A route link is rendered only when the referenced Job Order still exists.
- Queries are bounded or paginated and use indexes rather than `.filter()`.
- No unbounded activity array is added to the `jo` or `inventoryItems` documents.
- Generated files under `convex/_generated/` and `src/routeTree.gen.ts` are not manually modified.

## File Map

Expected files to modify:

- `convex/schemas/inventory.tsx`
- `convex/inventory.ts`
- `convex/jo.ts`
- `src/components/inventory/item-dialogs.tsx`
- `src/components/inventory/activity-log.tsx`
- `src/components/inventory/item-details-sheet.tsx`
- `src/routes/app/jo.$joId.tsx`
- `src/components/jo/delete-jo-alert-dialog.tsx`

Expected file to add:

- `src/components/inventory/job-order-combobox.tsx`

Files that must not be edited directly:

- `convex/_generated/**`
- `src/routeTree.gen.ts`

The agent may choose a slightly different component boundary only if it keeps the data model and behavior below unchanged and avoids duplicating the Job Order selector logic.

## Dependencies And Execution Order

Complete the phases in order. Frontend work depends on the schema and Convex API shape being settled first.

### Phase 0: Preflight

- [ ] Read `AGENTS.md` and `convex/_generated/ai/guidelines.md` before editing Convex code.
- [ ] Inspect `git status --short` and preserve unrelated worktree changes.
- [ ] Re-read the current implementations in `convex/schemas/inventory.tsx`, `convex/inventory.ts`, `convex/jo.ts`, and the expected frontend files from the file map.
- [ ] Confirm the Job Order route remains `/app/jo/$joId` and that `joNumber` is the stable user-facing identifier.
- [ ] Do not run `pnpm dev`, `convex dev`, a lint command, or `pnpm check`.

#### Gate 0

- [ ] The agent can identify the current stock-removal mutation, both inventory activity renderers, the Job Order deletion mutation, and the Job Order detail composition before making changes.
- [ ] Any conflicting concurrent edits have been understood; unrelated edits remain untouched.

### Phase 1: Extend The Inventory Activity Schema

Modify `convex/schemas/inventory.tsx`.

- [ ] Add `jobOrderId: v.optional(v.id("jo"))` to `inventoryActivities`.
- [ ] Add `jobOrderNumber: v.optional(v.number())` to preserve the displayed Job Order number.
- [ ] Add `jobOrderName: v.optional(v.string())` to preserve the displayed Job Order/customer name.
- [ ] Add `.index("by_job_order_id", ["jobOrderId"])`.
- [ ] Keep the existing `inventoryAction` and `inventoryOperation` values unchanged.
- [ ] Do not add Job Order fields to `inventoryItems`; the relationship belongs to individual usage events.
- [ ] Do not add a separate join table because the existing immutable activity is already the usage record and each usage supports at most one Job Order.

#### Gate 1

- [ ] Existing activity documents remain schema-valid because every new field is optional.
- [ ] The schema supports efficient reverse lookup from one Job Order to its usage activities.
- [ ] No existing activity operation requires migration.

### Phase 2: Extend Inventory Validators And Stock Usage Mutation

Modify `convex/inventory.ts`.

- [ ] Extend `inventoryActivityValidator` with the same three optional Job Order fields.
- [ ] Extend `removeStock` arguments with `jobOrderId: v.optional(v.id("jo"))`.
- [ ] Resolve `jobOrderId` inside the existing mutation transaction when supplied.
- [ ] Throw a clear `Job Order not found` error if the supplied ID no longer exists.
- [ ] Reject a Job Order whose status is `unconfirmed` with a clear message telling the user to confirm it first.
- [ ] Preserve the existing positive-quantity and available-balance validation.
- [ ] Add `jobOrderId`, `jobOrderNumber`, and a normalized display string for `jobOrderName` to the inserted activity only when a Job Order was supplied.
- [ ] Convert the Job Order's `name` safely to display text because the schema permits either a string or a customer ID. Follow the existing project behavior for resolving customer-backed names if one already exists; otherwise use an explicit stable fallback rather than serializing a raw ID as a customer name.
- [ ] Keep the inventory item patch and activity insert in this single mutation.
- [ ] Do not attach Job Order fields in `createItem`, `addStock`, `correctQuantity`, or `updateItemDetails`.
- [ ] Keep `reason` optional for stock usage.

#### Gate 2

- [ ] Calling `removeStock` without `jobOrderId` behaves as it did before.
- [ ] Calling it with a valid confirmed Job Order stores all three Job Order fields and the correct negative quantity delta.
- [ ] Invalid or unconfirmed Job Orders cause no inventory patch and no activity insert.
- [ ] Insufficient stock causes no inventory patch and no activity insert.
- [ ] The mutation's success path cannot produce an activity whose Job Order ID exists without its number and name snapshots.

### Phase 3: Add Bounded Job Order Selection Query

Modify `convex/jo.ts`.

- [ ] Add an authenticated query dedicated to combobox options, named consistently with project conventions, such as `searchOptions`.
- [ ] Accept `query: v.string()` and return a bounded array of at most 20 options.
- [ ] Return only the fields needed by the selector: `_id`, `joNumber`, resolved display `name`, and `status`.
- [ ] Exclude `unconfirmed` Job Orders from selectable results.
- [ ] Support finding a Job Order by its exact numeric Job Order number.
- [ ] Support finding by display name using an indexed or bounded strategy that complies with Convex query guidelines.
- [ ] When the search string is empty, return recent selectable Job Orders using `by_lastUpdated`, newest first, capped at 20.
- [ ] Do not call the existing paginated Job Order list from the client and filter it locally.
- [ ] Do not use `.filter()` in a Convex database query.

If proper name search cannot be implemented efficiently with the current union-typed `jo.name`, stop and choose the smallest schema/index adjustment that gives bounded results. Do not introduce a broad Job Order search migration as an incidental change.

#### Gate 3

- [ ] Empty search returns no more than 20 recent selectable Job Orders.
- [ ] Exact Job Order number lookup can find an older Job Order outside the recent 20.
- [ ] Name search is bounded.
- [ ] Unconfirmed online orders never appear as selectable results.
- [ ] Query results provide enough data to distinguish similarly named Job Orders.

### Phase 4: Add Job Order Usage Query

Modify `convex/inventory.ts`.

- [ ] Add an authenticated paginated query such as `listUsageByJobOrder`.
- [ ] Accept `jobOrderId: v.id("jo")` and `paginationOpts: paginationOptsValidator`.
- [ ] Reuse the existing page-size validation.
- [ ] Query `inventoryActivities` through `by_job_order_id`, ordered newest first.
- [ ] Return `paginationResultValidator(inventoryActivityValidator)` or an equally strict narrower validator.
- [ ] Do not require the Job Order document to exist merely to query its historical activities; the activity index is authoritative for history.
- [ ] Do not collect all linked activities.

#### Gate 4

- [ ] A Job Order with no linked usage returns a valid empty paginated result.
- [ ] Multiple usages of the same inventory item remain separate ledger entries.
- [ ] Results remain queryable by stored ID even if a linked Job Order is later deleted.
- [ ] Pagination order is deterministic and newest-first under Convex index ordering.

### Phase 5: Build The Reusable Job Order Combobox

Add `src/components/inventory/job-order-combobox.tsx`.

- [ ] Follow the controlled Base UI combobox pattern already used by `src/components/inventory/supplier-combobox.tsx` and the inventory item filter.
- [ ] Accept `value: Id<"jo"> | null`, `onValueChange`, `disabled`, and accessibility props needed by the form.
- [ ] Query the new bounded Job Order options endpoint from Phase 3.
- [ ] Render each option with `JO #<number>`, resolved name, and status.
- [ ] Preserve the selected option's label when the search results change or the popover closes.
- [ ] Provide an explicit clear/no-Job-Order option because linking is optional.
- [ ] Display useful loading, empty, and disabled states.
- [ ] Ensure keyboard selection and screen-reader labeling work through the existing combobox primitives.
- [ ] Keep the component usable on narrow mobile dialogs without fixed widths that overflow.

#### Gate 5

- [ ] The user can select, clear, search, and re-open the selector without losing the visible selected label.
- [ ] Search results identify Job Orders unambiguously by number and name.
- [ ] No unconfirmed Job Order can be selected through normal UI usage.
- [ ] The selector does not fetch an unbounded Job Order collection.

### Phase 6: Change Remove Stock To Use Stock

Modify `src/components/inventory/item-dialogs.tsx`.

- [ ] Replace user-facing menu text `Remove stock` with `Use stock`.
- [ ] Replace the dialog title with `Use stock`.
- [ ] Replace `Quantity removed` with `Quantity used`.
- [ ] Replace `Confirm removal` with `Confirm usage` or `Use stock`; choose one and use it consistently.
- [ ] Replace success toast `Stock removed` with `Stock used`.
- [ ] Update descriptions and warning copy so they describe usage rather than generic removal.
- [ ] Keep the internal `remove` mode and `removeStock` API name unless changing them produces a clearly smaller implementation.
- [ ] Extend `stockAdjustmentSchema` and default values with a nullable/empty `jobOrderId` field.
- [ ] Render the Job Order combobox only when `mode === "remove"`.
- [ ] Label it `Used for Job Order (optional)`.
- [ ] Add supporting copy that leaving it blank is appropriate for damage, disposal, or general use.
- [ ] Convert the form string/null value to `Id<"jo"> | undefined` only at the mutation boundary.
- [ ] Send `jobOrderId` only in the `removeStock` call.
- [ ] Include the selected `JO #` in the usage confirmation summary when selected.
- [ ] Reset the selected Job Order whenever the dialog closes after success or cancellation.
- [ ] Keep client-side available-balance validation and server-side validation.

#### Gate 6

- [ ] Add-stock and stock-correction dialogs do not show or submit Job Order fields.
- [ ] Use-stock works with no selected Job Order.
- [ ] Use-stock works with a selected Job Order.
- [ ] The resulting balance preview remains correct.
- [ ] The user-facing flow contains no remaining `Remove stock`, `Quantity removed`, `Confirm removal`, or `Stock removed` copy.
- [ ] Damage and disposal remain representable through unlinked usage plus the reason field.

### Phase 7: Display Job Order Links In Inventory Activity

Modify both:

- `src/components/inventory/activity-log.tsx`
- `src/components/inventory/item-details-sheet.tsx`

- [ ] Extend local activity rendering to use the optional Job Order fields generated from the Convex data model.
- [ ] Change the `stock_removed` operation label from `Stock removed` to `Stock used` in both files.
- [ ] Show `JO #<jobOrderNumber>` and the Job Order name on linked usage entries.
- [ ] Render a TanStack Router link to `/app/jo/$joId` only if the Job Order still exists.
- [ ] Avoid one lookup query per activity row. Prefer enriching paginated activity query results with a bounded `jobOrderExists`/linkability field, or another batched approach within the page query.
- [ ] If the Job Order has been deleted, show the snapshots with a `Deleted Job Order` indicator and no route link.
- [ ] Stop link clicks from triggering any surrounding inventory row or sheet behavior.
- [ ] Keep unlinked entries visually unchanged except for the `Stock used` terminology.
- [ ] Preserve readable responsive layouts; the Job Order reference must remain discoverable on mobile.

This phase may require extending the activity return validator and the `listActivities`/`listUsageByJobOrder` response shape with a derived linkability field. Do not persist redundant deletion flags on historical activities.

#### Gate 7

- [ ] Linked usage shows the correct snapshots in the global ledger and item detail history.
- [ ] Live Job Orders have working typed route links.
- [ ] Deleted Job Orders display historical identity but cannot navigate to a missing route.
- [ ] Unlinked and pre-feature activities render without errors.
- [ ] Activity pagination and existing item/action filters still work.
- [ ] The implementation does not create per-row client query fan-out.

### Phase 8: Add Inventory Used To Job Order Details

Modify `src/routes/app/jo.$joId.tsx`.

- [ ] Add an `InventoryUsedCard` component or an equivalently focused component near `JoItemsCard` in the main Job Order content column.
- [ ] Query `listUsageByJobOrder` with the current route's `joId`.
- [ ] Display inventory item snapshot name, supplier snapshot, absolute quantity used, reason, actor, and timestamp for each usage.
- [ ] Use `Math.abs(quantityDelta)` for the displayed used quantity while leaving ledger storage negative.
- [ ] Add a clear empty state: `No inventory usage recorded for this Job Order`.
- [ ] Add bounded pagination or load-more controls using the query's Convex cursor.
- [ ] Include loading/suspense treatment consistent with the route's existing data flow.
- [ ] Keep the card readable on desktop and mobile; do not force a wide table when a stacked activity list is clearer.
- [ ] Do not merge usage totals into Job Order financial totals in this release.
- [ ] Do not place an array of usage IDs or activities on the Job Order document.

#### Gate 8

- [ ] A Job Order shows every activity linked to its ID, newest first, subject to pagination.
- [ ] Separate usage events remain individually auditable with actor, reason, and time.
- [ ] A Job Order with no usage has a deliberate empty state rather than a missing or broken section.
- [ ] Recording new linked usage updates the Job Order card through Convex reactivity without manual page reload.
- [ ] Existing order summary, payments, items, printing, confirmation, and deletion UI remain functional.

### Phase 9: Preserve History During Job Order Deletion

Modify:

- `convex/jo.ts`
- `src/components/jo/delete-jo-alert-dialog.tsx`

- [ ] Confirm `deleteJo` does not query or delete `inventoryActivities`.
- [ ] Do not restore any linked inventory quantities during deletion.
- [ ] Preserve existing deletion of Job Order items and payments.
- [ ] Update the confirmation description to state that linked inventory usage history will remain in the inventory ledger.
- [ ] Ensure activity rendering from Phase 7 treats the deleted reference as historical rather than erroneous.
- [ ] Do not clear `jobOrderId` or snapshots from activity records when deleting a Job Order.

#### Gate 9

- [ ] Deleting a linked Job Order leaves inventory quantity unchanged.
- [ ] Its linked activities remain queryable in inventory history.
- [ ] The saved Job Order number and name remain displayed.
- [ ] No dead Job Order link is rendered after reactive data updates.
- [ ] The deletion dialog accurately describes the retained history.

### Phase 10: Terminology And Consistency Sweep

Search the application source for old user-facing language.

- [ ] Search `src/` for `Remove stock`, `Stock removed`, `Quantity removed`, `Confirm removal`, and equivalent lowercase variants.
- [ ] Replace user-facing instances related to inventory usage with the agreed terminology.
- [ ] Keep technical identifiers and historical enum values unchanged where they are not user-facing.
- [ ] Confirm activity descriptions still distinguish stock usage from quantity correction and detail updates.
- [ ] Confirm no unrelated deletion/removal language was changed.

#### Gate 10

- [ ] All inventory UI consistently says `Use stock` for the action and `Stock used` for the recorded event.
- [ ] Persisted activities still use `operation: "stock_removed"` and `action: "remove"`.
- [ ] No data migration exists solely for copy changes.

### Phase 11: Static Verification

Do not add or modify tests for this project.

- [ ] Review every changed Convex function for argument validators, bounded queries, indexes, and authenticated wrappers.
- [ ] Review every changed return validator against the exact returned object shape.
- [ ] Run the project's available TypeScript/build verification with `pnpm build` if the worktree and environment permit it.
- [ ] Do not run lint commands, `pnpm check`, `pnpm dev`, or `convex dev`.
- [ ] If Convex-generated types are stale locally, do not manually edit generated files; report the limitation and verify all non-generated TypeScript as far as possible.
- [ ] Inspect `git diff --check` for whitespace errors.
- [ ] Inspect `git diff --stat` and `git diff` to confirm only intended files changed.

#### Gate 11

- [ ] Build/type verification passes, or the final report names the exact environment/generated-type blocker.
- [ ] No generated file or route tree was manually changed.
- [ ] No unrelated worktree changes were reverted or overwritten.
- [ ] No lint command or prohibited dev server was run.

## Manual Behavior Verification Matrix

Use this matrix for manual or code-path verification. Do not create test files.

| Scenario                                                   | Expected result                                                                                            |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Use stock with no Job Order                                | Balance decreases; immutable `stock_removed` activity is created without Job Order fields.                 |
| Use stock with a valid pending Job Order                   | Balance decreases; activity stores ID, number, and name snapshots; both sides show the usage.              |
| Use stock with an in-progress Job Order                    | Same successful behavior as pending.                                                                       |
| Use stock with a completed Job Order                       | Same successful behavior as pending; late recording is allowed.                                            |
| Attempt to use stock for an unconfirmed online order       | Selector excludes it and the mutation rejects a manually supplied ID; no writes occur.                     |
| Attempt to use more than available                         | Mutation rejects; balance and ledger remain unchanged.                                                     |
| Attempt to use zero, negative, decimal, or unsafe quantity | Validation rejects; no writes occur.                                                                       |
| Delete a linked Job Order                                  | Inventory is not restored; activity remains with snapshots and a deleted indicator; no route link remains. |
| View an existing pre-feature activity                      | Activity renders normally with no Job Order reference.                                                     |
| Split usage across two Job Orders                          | Two separate usage submissions produce two independently linked activities.                                |
| Damage or disposal                                         | User leaves Job Order blank and records context in the optional reason.                                    |
| Rename a Job Order after usage                             | Existing usage continues to show the captured historical name snapshot.                                    |
| Rename an inventory item or supplier after usage           | Existing activity continues to use its existing item/supplier snapshots.                                   |
| Paginate Job Order usage                                   | Newest entries appear first and older entries remain reachable without loading all rows.                   |
| Mobile use-stock dialog                                    | Quantity, Job Order selector, reason, balance preview, and submit action fit without horizontal overflow.  |

## Completion Criteria

The feature is complete only when all of the following are true:

- [ ] A stock usage can optionally be linked to one existing, confirmed Job Order.
- [ ] The inventory mutation enforces all invariants server-side and writes atomically.
- [ ] Linked usage is visible and understandable from inventory and Job Order views.
- [ ] Deleted Job Orders leave useful immutable inventory history without dead links.
- [ ] Existing activity records and unlinked usage remain supported.
- [ ] All user-facing inventory action copy uses `Use stock`/`Stock used` terminology.
- [ ] No automatic consumption, cost calculation, activity editing, or scope expansion was introduced.
- [ ] Verification gates are complete and any environment limitation is documented in the implementation report.

## Implementation Report Requirements

When execution is complete, the implementing agent must report:

- Files added and modified.
- Final Convex schema and public API changes.
- The exact deletion behavior implemented.
- Verification commands run and their outcomes.
- Any verification that could not be completed and why.
- Any deviation from this plan, with the reason and the preserved invariant.
