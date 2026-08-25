# New Drive to Trello Attachment Plan

## Goal

Allow an authenticated user with access to a New Drive space to attach a file or folder to one or more cards on the existing Trello board. The database is authoritative, and each affected Trello card description contains a generated projection of its active Drive associations.

```md
<!-- drive-items-start -->

[📄 _File name_](https://system.example.com/app/newdrive/file/ITEM_ID)
[📁 _Folder name_](https://system.example.com/app/newdrive/SPACE_ID/FOLDER_ID)

<!-- drive-items-end -->
```

## Confirmed Product Rules

- The relationship is many-to-many.
- Both files and folders are attachable.
- Links use authenticated application routes, never signed R2 or public-share URLs.
- The feature uses the existing hard-coded Trello board.
- Any authenticated user with access to the item's Drive space may attach or detach it.
- The action appears only in item row menus inside an opened Drive space.
- Archived Trello lists and cards cannot receive new attachments.
- Existing archived attachments remain visible under an `Attached Cards` group and can be detached.
- The database is the source of truth; Trello description content is a generated projection.
- Valid generated blocks stay in their current location. New or repaired blocks are appended.
- Generated entries use the exact icon, italic name, and link format shown above.
- Entries are ordered by attachment creation time, oldest first.
- The generated block is removed when it has no entries.
- A reattached item receives a new row and moves to the end.
- Successful detach deletes the association row; permanent detach history is not retained.
- Failed attach/detach operations retain enough operational state for bounded automatic retries and a manual retry.
- Rename regenerates all associated cards. Move does not because item-ID URLs remain stable.
- Drive deletion proceeds even if Trello is unavailable; cleanup continues asynchronously.
- A missing Trello card is treated as successfully detached and all of its local associations are removed.
- A projected description over Trello's 16,384-character limit is rejected without truncating any content.

## Execution Constraints

- Read `convex/_generated/ai/guidelines.md` before changing Convex code.
- Keep the assembled schema in `convex/schema.ts`; define this domain table in `convex/schemas/drive.tsx`.
- Use the new Convex function syntax and validators for every function argument.
- Derive users from authentication server-side. Never accept `attachedBy` or `detachRequestedBy` from the browser.
- Do not manually edit `convex/_generated/`, `src/routeTree.gen.ts`, or other generated files.
- Do not add or plan tests, test dependencies, test scripts, or test files.
- Do not run a dev server, `convex dev`, lint commands, `pnpm check`, or formatting commands.
- Preserve unrelated worktree changes.

## State Model

Add `newDriveTrelloAttachments` to `driveSchema` in `convex/schemas/drive.tsx`.

Fields:

| Field               | Validator                                                                | Purpose                                                                              |
| ------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `newDriveItemId`    | `v.id("newDriveItems")`                                                  | Attached file or folder.                                                             |
| `trelloCardId`      | `v.string()`                                                             | Trello card receiving the generated link.                                            |
| `trelloCardName`    | `v.string()`                                                             | Display fallback during Trello outages; refresh after successful card reads.         |
| `attachedBy`        | `v.id("users")`                                                          | Application actor who requested the current attachment.                              |
| `desiredState`      | `v.union(v.literal("attached"), v.literal("detached"))`                  | State that Trello should reflect. `detached` rows exist only until cleanup succeeds. |
| `syncStatus`        | `v.union(v.literal("pending"), v.literal("synced"), v.literal("error"))` | Whether Trello currently reflects the desired state.                                 |
| `lastSyncError`     | `v.optional(v.string())`                                                 | Sanitized latest failure for UI and diagnosis.                                       |
| `lastSyncAttemptAt` | `v.optional(v.number())`                                                 | Latest Trello update attempt.                                                        |
| `retryCount`        | `v.number()`                                                             | Consecutive automatic failures for bounded backoff.                                  |
| `nextRetryAt`       | `v.optional(v.number())`                                                 | Earliest scheduled retry time.                                                       |
| `detachRequestedBy` | `v.optional(v.id("users"))`                                              | Actor requesting removal while it is pending or failed.                              |
| `detachRequestedAt` | `v.optional(v.number())`                                                 | Time removal was requested.                                                          |

Use Convex `_creationTime` as the attachment time and stable oldest-first ordering value. Do not add a redundant `attachedAt` field.

Indexes:

- `by_newDriveItemId` on `newDriveItemId`.
- `by_trelloCardId` on `trelloCardId`.
- `by_newDriveItemId_and_trelloCardId` on both IDs for duplicate prevention with `.unique()`.
- `by_syncStatus_and_nextRetryAt` for bounded operational lookup and diagnosis.

Safety bounds:

- Define shared backend constants instead of scattering numeric limits.
- Cap one Drive item at 500 Trello-card associations so item queries and rename fan-out remain bounded.
- Cap one Trello card at 200 Drive associations as a secondary guard; the 16,384-character description check remains authoritative.
- Reject a new association with a clear error rather than silently truncating a bounded query.

## Step 1: Add the Schema

- [ ] Update `convex/schemas/drive.tsx` with `newDriveTrelloAttachments` and the indexes above.
- [ ] Keep `convex/schema.ts` unchanged unless schema composition needs correction; it already spreads `driveSchema`.
- [ ] Confirm no existing table or generated file is manually modified.

## Step 2: Create the Attachment Data Module

Create `convex/drive/trelloAttachments.ts` for database-only queries, mutations, validators, and bounded helpers. Do not perform external fetches in this module.

- [ ] Add a public `listForItem` authenticated query.
- [ ] Accept only `itemId`; load the item, reject deleted/missing items, and call `requireSpaceAccess` using its `spaceId`.
- [ ] Return at most 500 associations ordered by `_creationTime`, including card ID/name, desired state, sync state, sanitized error, and retry metadata needed by the menu.
- [ ] Add an internal query that resolves an authenticated action caller from Better Auth ID to the application user, loads the item, and verifies Drive-space access.
- [ ] Add an internal query that builds a card synchronization snapshot from all rows indexed by `trelloCardId`.
- [ ] Include each non-deleted item required by the desired projection. A row with `desiredState: "detached"` must be excluded from generated links but retained until successful synchronization.
- [ ] Produce a deterministic snapshot fingerprint from association IDs, desired states, item names/kinds/deletion state, and creation order. Use it to detect writes that became stale while Trello was being updated.
- [ ] Add an internal mutation that creates an association after revalidating that the item still exists, is not deleted, and has not reached its per-item cap.
- [ ] Use `by_newDriveItemId_and_trelloCardId` with `.unique()` inside the insertion transaction. Make a repeated attach request idempotent when the row already desires `attached`; reject reversal while a detach is actively pending.
- [ ] Add an internal mutation that changes an existing association to `desiredState: "detached"`, records the authenticated requesting actor/time, clears stale errors, and marks synchronization pending.
- [ ] Add an internal mutation that marks every association for an item pending after a rename and returns unique affected card IDs.
- [ ] Add internal completion/failure mutations for a card sync. Keep retry metadata consistent across rows for the same card.
- [ ] On successful sync, patch desired-attached rows to `synced`, refresh `trelloCardName`, clear retry/error fields, and delete desired-detached rows.
- [ ] If the completion fingerprint no longer matches current DB state, do not mark the newer state synced; return that another card sync must run.
- [ ] Add an internal mutation that removes all associations for a Trello card after a confirmed 404.
- [ ] Add a bounded internal deletion-cleanup mutation that marks associations for deleted Drive items as desired-detached in batches and returns unique card IDs to synchronize.

## Step 3: Implement the Description Projection

Create pure helpers in `convex/drive/trelloSync.ts` or a small adjacent module only if separating them makes the action module materially easier to read.

- [ ] Define the exact marker constants `<!-- drive-items-start -->` and `<!-- drive-items-end -->`.
- [ ] Build file URLs as `${APP_ORIGIN}/app/newdrive/file/${itemId}`.
- [ ] Build folder URLs as `${APP_ORIGIN}/app/newdrive/${spaceId}/${itemId}`.
- [ ] Resolve `APP_ORIGIN` from Convex `env.SERVER_URL`, remove its trailing slash, and fail clearly when it is absent or invalid. Do not generate a production Trello link from `localhost`, a Convex deployment URL, an expiring R2 URL, or a public share token.
- [ ] Escape Markdown-significant characters in item names so names cannot break or inject generated links.
- [ ] Render files with `📄` and folders with `📁` based on the persisted Drive item kind, not the UI's image/PDF/text display subtype.
- [ ] Sort entries by association `_creationTime` ascending.
- [ ] If exactly one well-formed generated block exists, replace it in place and preserve all text before and after it.
- [ ] If no generated block exists, append the canonical block after the existing description with clean blank-line separation.
- [ ] If complete blocks are duplicated, remove all complete generated blocks and standalone marker lines, then append one canonical block.
- [ ] If only one marker exists, remove only the recognizable marker line, preserve ambiguous surrounding text, and append one canonical block. Do not delete handwritten content that cannot safely be identified as generated.
- [ ] Treat text inside a valid generated block as managed content and overwrite it from the DB projection.
- [ ] If the desired projection is empty, remove complete generated blocks and standalone marker lines without adding an empty block.
- [ ] Measure the final description conservatively and reject it when it exceeds 16,384 characters. Never truncate generated links or handwritten text.

## Step 4: Implement Trello Synchronization Actions

Use `convex/drive/trelloSync.ts` for external Trello calls and public/internal actions. `fetch` is available in the default Convex runtime, so do not add `"use node"` merely for HTTP.

- [ ] Add one private Trello fetch helper that reads `TRELLO_KEY` and `TRELLO_TOKEN` from typed Convex `env`, checks `response.ok` before trusting response data, validates the small response shape needed by each operation, and never includes credentials in errors.
- [ ] Add Trello operations to fetch a card, fetch its parent list, and update only the card `desc` field.
- [ ] Fetch card fields needed for validation and synchronization: `id`, `name`, `desc`, `closed`, `idBoard`, and `idList`.
- [ ] On initial attach, verify the card belongs to board `1ELaQNZb`, the card is not archived, and its current list is not archived.
- [ ] Do not reject cleanup of a previously attached card merely because it was archived after attachment.
- [ ] Add a public `attach` action taking only `itemId`, `trelloCardId`, and `trelloCardName` as user input.
- [ ] Authenticate inside the action, resolve the application actor server-side, verify item/space access, verify the live Trello card/list, use the live card name instead of trusting the supplied fallback, insert the pending row, and immediately run the common card-sync helper.
- [ ] Add a public `detach` action taking only `attachmentId` or the item/card pair. Authenticate and authorize against the associated item's Drive space before recording detach intent.
- [ ] Add a public `retry` action that authenticates, authorizes through the associated Drive item, resets bounded retry metadata, and reruns the common card-sync helper without changing desired intent.
- [ ] Return a small discriminated result from each public action so the UI can distinguish `synced`, `pending/error`, `already-attached`, and `missing-card` outcomes.
- [ ] Add an internal `syncCard` action wrapper for the Convex scheduler. Public actions and the internal wrapper should call the same plain async synchronization helper rather than calling one action from another.
- [ ] Synchronization must fetch the latest Trello description, fetch the latest DB snapshot, merge the projection, enforce the size limit, and update the description.
- [ ] Treat Trello 404 as terminal: remove all local rows for that card and return a missing-card result.
- [ ] Treat credential, rate-limit, network, validation, and 5xx failures as retryable errors unless Trello explicitly proves the request cannot succeed.
- [ ] After a successful Trello PUT, apply the success mutation using the snapshot fingerprint. If DB state changed during the request, schedule another immediate synchronization so a stale write cannot become the final projection.
- [ ] Because Trello offers no atomic DB/Trello transaction, always regenerate from current authoritative state; never append or remove one line in isolation.

## Step 5: Add Bounded Retry Behavior

- [ ] Use a fixed bounded backoff sequence such as 1 minute, 5 minutes, 30 minutes, 2 hours, and 12 hours.
- [ ] On retryable failure, set `syncStatus: "error"`, store a short sanitized message, increment `retryCount`, set `nextRetryAt`, and transactionally schedule the internal card-sync action.
- [ ] Before a scheduled retry runs, reload current card state. Exit if the card no longer has rows, is already synced, or the scheduled attempt has been superseded.
- [ ] Stop automatic scheduling after the final delay while retaining the error and manual retry capability.
- [ ] Manual retry resets the automatic retry sequence and attempts synchronization immediately.
- [ ] Make duplicate scheduled jobs harmless by checking current desired state and snapshot fingerprints before applying results.

## Step 6: Integrate Rename and Delete Lifecycles

Update `convex/drive/items.ts` without changing move behavior.

- [ ] After `renameItem` patches the item name, mark its associations pending and transactionally schedule one sync per unique Trello card.
- [ ] Keep rename successful even if subsequent Trello work fails; the association status and retries expose eventual synchronization.
- [ ] After `deleteItems` soft-deletes the selected items and descendants, transactionally schedule bounded deletion-association processing with the collected item IDs.
- [ ] Have deletion processing mark matching rows desired-detached and schedule each unique affected card. Process additional batches through the scheduler if necessary to stay inside Convex transaction limits.
- [ ] Do not delay R2 deletion or roll back Drive deletion because of Trello.
- [ ] Keep deleted Drive records available to backend cleanup until their Trello associations are removed.
- [ ] Do not trigger Trello synchronization from `moveItems`; current app routes use stable space/item IDs.

## Step 7: Prepare Lazy Trello Selector Data

Reuse the established React Query functions in `src/server/trello.ts` unless a small dedicated selector function avoids altering existing Trello screens.

- [ ] Fetch Trello lists only after the outer `Attach to Trello Card` submenu opens.
- [ ] Filter out `closed` lists for new attachments.
- [ ] Fetch a list's cards only after that list submenu opens.
- [ ] Filter out `closed` cards for new attachments.
- [ ] Preserve the existing React Query keys `['trelloLists']` and `['listCards', listId]` where the response contracts remain compatible, so existing cache data is reused.
- [ ] Show bounded, scrollable submenu content so long list/card names and large active boards remain usable on desktop and mobile.
- [ ] Add loading, empty, and fetch-error states inside the relevant submenu, including a refetch action for Trello list/card read failures.
- [ ] Do not expose archived cards through active-list card results. Existing archived associations come from the Convex `listForItem` query and cached `trelloCardName`.

## Step 8: Build the Attachment Menu Component

Create `src/components/new-drive/trello-attachment-menu.tsx` to keep asynchronous state and nested-menu complexity out of `file-list-rows.tsx`.

- [ ] Accept the current `NewDriveItem` and render a `DropdownMenuSub` labeled `Attach to Trello Card`.
- [ ] Use the existing submenu primitives from `src/components/ui/dropdown-menu.tsx`; do not create another menu system.
- [ ] Query `listForItem` only while the outer submenu is open, using Convex's skip behavior while closed.
- [ ] Render an `Attached Cards` submenu/group first when associations exist, followed by a separator and active Trello lists.
- [ ] Render active attached cards as checked under both `Attached Cards` and their current active list when applicable.
- [ ] For a synced desired-attached row, selecting it opens a confirmation dialog before detach.
- [ ] For a pending row, show a spinner/status and prevent contradictory attach/detach clicks.
- [ ] For an error row, show the error state and make selection run retry rather than reverse desired intent.
- [ ] Keep desired-detached error rows in `Attached Cards` until cleanup succeeds, labeled as failed removal with retry available.
- [ ] For an unattached active card, selection calls the public attach action.
- [ ] Use loading and success/error toasts. Report immediate synchronization failure while leaving the visible retry state intact.
- [ ] Prevent duplicate submissions while an action is in flight.
- [ ] Use an existing `AlertDialog` pattern for detach confirmation and name both the Drive item and Trello card in its copy.
- [ ] Ensure menu and dialog interactions stop row selection, drag, double-click, and navigation handlers just as the current action menu does.
- [ ] Use Lucide imports with the required `Icon` suffix and preserve the existing New Drive visual language.

## Step 9: Wire the Menu Through New Drive Rows

- [ ] Add an optional Trello attachment capability/prop to `NewDriveFileList` in `src/components/new-drive/file-list.tsx` rather than enabling it globally.
- [ ] Pass the capability to `NewDriveFileRow` in `src/components/new-drive/file-list-rows.tsx`.
- [ ] Count the Trello action in `hasActions` so rows still render the action trigger when appropriate.
- [ ] Mount `TrelloAttachmentMenu` in the existing row dropdown for both files and folders, before destructive delete.
- [ ] Enable the prop only from `src/routes/app/newdrive.$spaceId.{-$folderId}.tsx`.
- [ ] Do not enable it from New Drive recent/search results or `public-share-browser.tsx`.
- [ ] Do not add it to the file preview route.

## Step 10: Handle UI Consistency

- [ ] Let the Convex association subscription update checked/pending/error state after every operation; avoid maintaining a second authoritative client-side attachment list.
- [ ] Invalidate or refetch Trello list/card queries only when live card metadata may have changed. Association changes should flow from Convex subscriptions.
- [ ] Keep attached card fallback names even if Trello list/card fetching fails.
- [ ] If Trello reports a card missing during attach, show a clear failure and do not create a durable association.
- [ ] If an existing card disappears during sync, remove its associations and notify the initiating user when the operation was interactive.
- [ ] Keep errors user-safe: no Trello token, API key, raw credential-bearing URL, or full untrusted response body may reach the browser or DB.

## Step 11: Verify Configuration

- [ ] Confirm `TRELLO_KEY`, `TRELLO_TOKEN`, and `SERVER_URL` are present in the Convex environment used by the application.
- [ ] Confirm production `SERVER_URL` is the authenticated system origin that serves `/app/newdrive/...` routes.
- [ ] Confirm the token can read board `1ELaQNZb`, read its lists/cards, and update card descriptions.
- [ ] Keep board and description-limit constants centralized within each runtime that needs them; do not add list IDs to attachment rows because cards can move between lists.

## Step 12: Verification Without Tests or Dev Servers

- [ ] Review all changed files for TypeScript errors through the available editor/LSP diagnostics.
- [ ] Run `pnpm build` after implementation. Do not run lint, `pnpm check`, or a dev server.
- [ ] Do not manually repair generated API/router files if the build reports stale generation. Use only the repository-approved Convex generation workflow or report the blocker.
- [ ] Inspect the final diff and confirm unrelated worktree changes were not modified.

The executing agent must not add automated tests because this repository explicitly forbids creating or planning tests. Use the following acceptance checklist for a user-run environment after the build succeeds.

## Acceptance Checklist

- [ ] Opening a Drive row menu shows `Attach to Trello Card` for both files and folders.
- [ ] Opening the submenu loads only active lists; opening a list loads only active cards.
- [ ] Attaching a file creates one DB row and adds one `📄` link without changing handwritten description text.
- [ ] Attaching a folder creates one DB row and adds one `📁` link to the folder route.
- [ ] Repeating attach does not create a duplicate association or duplicate description line.
- [ ] Multiple Drive items on one card appear oldest first inside exactly one marker block.
- [ ] One Drive item can be attached to multiple cards.
- [ ] A valid generated block stays in its original description position after regeneration.
- [ ] Duplicate or damaged markers are repaired without deleting text outside recognizable generated content.
- [ ] Detach requires confirmation, removes the line, and deletes the association after Trello succeeds.
- [ ] Detaching the last item removes the marker block.
- [ ] Renaming an attached item updates all linked card labels.
- [ ] Moving an attached item leaves its stable link valid without a description update.
- [ ] Deleting an attached item succeeds immediately and eventually removes all corresponding Trello links.
- [ ] Archived cards/lists cannot receive new links; existing archived associations remain visible under `Attached Cards` and detachable.
- [ ] A Trello failure leaves visible error state, schedules bounded retries, and supports manual retry.
- [ ] A deleted Trello card causes local associations for that card to be removed.
- [ ] A projected description over 16,384 characters rejects the new attachment without truncating the existing description.
- [ ] Public New Drive views, recent/search results, and file previews do not expose the action.
- [ ] Users without access to an admin-only Drive space cannot query, attach, detach, or retry its associations through direct API calls.

## Completion Criteria

The feature is complete when schema, backend state transitions, Trello projection/retry behavior, Drive rename/delete hooks, lazy nested menus, authorization, error states, and production build all satisfy this document without adding public sharing or changing handwritten Trello description content outside the managed block.
