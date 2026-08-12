# Public Drive Sharing Implementation Plan

Purpose: add revocable public links for New Drive files and folders. Public file links are read-only. Public folder links grant either recursive read access or recursive edit access to anonymous guests.

This document is an execution checklist. Complete phases in order and do not continue past a verification gate until it passes.

## Fixed Product Decisions

- Scope is New Drive files and folders only. Job orders and claim slips are not part of this feature.
- Each item has at most one public link shared by all recipients.
- Public URLs use an opaque, cryptographically random token at `/share/$token`.
- Any authenticated user who can access an item's space may enable, update, copy, or disable its public link.
- A shared file supports `read` only.
- A shared folder supports `read` or `edit`.
- Folder access includes all current and future descendants recursively while they remain under the shared root.
- `read` permits browsing, previewing supported files, downloading individual files, and downloading a capped folder ZIP.
- `edit` includes all read capabilities plus creating folders, uploading files/folders, renaming descendants, moving descendants within the shared root, and deleting descendants.
- An anonymous editor cannot rename, move, or delete the shared root itself.
- Anonymous edits are attributed to the existing `"guest"` creator value. Do not collect a display name and do not require sign-in.
- Moving a directly shared item does not invalidate its direct public link.
- Moving a descendant outside a shared folder immediately removes access through the folder's link.
- Changing a link between `read` and `edit`, or changing its expiration, preserves the URL.
- Disabling a link invalidates it. Re-enabling sharing generates a new token, so the old URL stays invalid.
- Expiration is optional. Presets are never, 24 hours, 7 days, 30 days, and a custom future date/time.
- Public links do not support passwords, recipient lists, usage limits, or access auditing in this release.
- Public pages expose item name, kind/content type, size, and last-modified time. They do not expose owner, creator, internal space name, local user IDs, or R2 keys.
- Missing, malformed, disabled, expired, and deleted shares all show the same generic unavailable state.
- Public pages use `noindex, nofollow`.
- Folder ZIPs preserve the directory tree and include the shared folder as the archive's top-level directory.
- Initial ZIP limits are 500 files and 250 MiB total uncompressed size. Above either limit, require individual downloads.
- Guest deletion uses the existing destructive Drive behavior after confirmation. It is not a separate trash workflow.

## Non-Goals

- Multiple links or per-recipient links for one item.
- Password-protected links.
- Public job-order or claim-slip views.
- Public search, comments, activity logs, recipient analytics, or notifications.
- Editing the contents of an existing file.
- Direct file-link rename or deletion.
- Moving content outside the shared root.
- Background/server-generated archives for folders above the ZIP limits.
- Search-engine discovery.
- New automated tests or test infrastructure. This repository explicitly prohibits creating or planning tests.

## Global Engineering Constraints

- Read `convex/_generated/ai/guidelines.md` before changing Convex code.
- Use Convex's new object syntax and include `args` and `returns` validators on every function.
- Keep the assembled schema in `convex/schema.ts`; keep Drive tables in `convex/schemas/drive.tsx` unless that file is intentionally renamed as a separate cleanup.
- Do not modify `convex/_generated/**` or `src/routeTree.gen.ts` manually.
- Do not run a dev server, Convex dev, lint, `pnpm check`, or add tests.
- Use the existing `@/` and `@convex` import aliases and project formatting conventions.
- Keep R2 objects private. A public caller receives only short-lived signed URLs after authorization.
- Never trust a client-provided item ID, parent ID, destination ID, ticket ID, or space ID as proof of access.
- Public Convex functions are exposed to the Internet. Return only an explicit public-safe projection.
- Prefer shared Drive implementation helpers over duplicating name validation, collision checks, subtree collection, and R2 cleanup logic.
- Do not weaken `authedQuery`, `authedMutation`, or existing authenticated Drive authorization to support guests. Add token-authorized public functions instead.

## Core Authorization Invariants

These invariants apply to every phase and must remain centralized in the share module.

1. An active share root is a live `newDriveItems` record with a matching token, non-empty `publicAccess`, and no elapsed `publicExpiresAt`.
2. The permission for a public session comes only from the token's share root. A descendant's own `publicAccess`, token, or expiration does not increase or reduce access inherited from the current root.
3. A requested item is in scope only when it is the share root or its current parent chain reaches the share root without leaving the root's space.
4. A requested parent or move destination must be a live folder in scope.
5. Mutations require a folder share root with `publicAccess === "edit"`.
6. The shared root is immutable to guests. Guest mutation targets must be strict descendants, except that the root may be used as a parent or move destination.
7. A guest move must keep every source under the shared root and place it under a destination inside the same shared root. Existing cycle prevention still applies.
8. Upload ticket creation and finalization independently validate the active edit share and destination scope.
9. Revocation, expiration, deletion, or permission downgrade takes effect on the next Convex operation. Previously issued R2 URLs may remain valid only for their short signing lifetime.
10. Disabling then re-enabling a share never reuses the old token.
11. Public read results never contain `spaceId`, `createdBy`, `ownerName`, user IDs, R2 keys, or exact unavailability reasons.
12. All invalid public mutation attempts fail with one generic share-access error rather than revealing whether a token or item exists.

## Phase 0: Baseline and Interface Inventory

### Files to inspect

- `convex/_generated/ai/guidelines.md`
- `convex/schema.ts`
- `convex/schemas/drive.tsx`
- `convex/drive/items.ts`
- `convex/drive/lib.ts`
- `convex/r2.ts`
- `src/router.tsx`
- `src/routes/__root.tsx`
- `src/routes/app/newdrive.$spaceId.{-$folderId}.tsx`
- `src/routes/app/newdrive.file.$itemId.tsx`
- `src/components/new-drive/file-list.tsx`
- `src/components/new-drive/add-items-menu.tsx`
- `src/components/new-drive/upload-dropzone.tsx`
- `src/hooks/use-new-drive-upload.tsx`
- `src/lib/new-drive-items.ts`

### Checklist

- [ ] Confirm the current worktree and preserve unrelated user changes.
- [ ] Read the current Convex guidelines before making backend edits.
- [ ] Record the exact signatures and return projections of existing authenticated Drive functions.
- [ ] Identify reusable implementation blocks in `convex/drive/items.ts`: name validation, duplicate detection, ancestry/cycle checks, subtree deletion, ticket handling, and R2 cleanup.
- [ ] Confirm how authenticated file previews classify embeddable content.
- [ ] Confirm that anonymous public Convex queries can execute during SSR and after hydration with the current `ConvexQueryClient(..., { expectAuth: true })` setting.
- [ ] If `expectAuth: true` blocks anonymous queries, make the smallest router configuration change that permits public queries while preserving authenticated token setup in `src/routes/__root.tsx`. Do not create a second Convex client unless the library requires it.
- [ ] Confirm signed R2 URLs can be fetched cross-origin by the browser, because ZIP generation depends on browser fetch access.

### Verification Gate 0

- [ ] An unauthenticated top-level route can execute a harmless public Convex query in SSR and after hydration without being redirected to `/login`.
- [ ] Authenticated `/app` routes still receive their token and enforce their existing login redirect.
- [ ] The implementation path for browser fetches from signed R2 URLs is known. If CORS prevents it, stop and resolve R2 CORS before implementing ZIP generation.

## Phase 1: Persisted Share State

### Files

- Modify `convex/schemas/drive.tsx`.
- `convex/schema.ts` should require no behavioral change because it already assembles `driveSchema`; update only if an import path changes.

### Data model

Add these optional fields to the common New Drive item fields so both union variants contain them:

```ts
publicToken: v.optional(v.string());
publicExpiresAt: v.optional(v.number());
```

Keep the existing kind-specific `publicAccess` validators:

- Folder: optional `"read" | "edit"`.
- File: optional `"read"`.

Add this index to `newDriveItems`:

```ts
.index("by_publicToken", ["publicToken"])
```

Do not add a share table. The selected one-link-per-item model is represented directly on the item.

### Checklist

- [ ] Add `publicToken` and `publicExpiresAt` to the common item fields.
- [ ] Add `by_publicToken`.
- [ ] Keep all new fields optional so existing records remain valid without a backfill.
- [ ] Do not place tokens in list or preview return validators used by ordinary Drive pages.
- [ ] Do not add `publicAccess` to upload tickets. `shareRootId` identifies the authority that must be re-resolved.

### Verification Gate 1

- [ ] Convex schema validation/type generation succeeds through the project's supported non-dev workflow.
- [ ] Existing New Drive records remain valid with no migration.
- [ ] The generated model makes token lookup available without manually editing generated files.

## Phase 2: Central Share Resolution and Scope Helpers

### Files

- Create `convex/drive/shares.ts` for share management and public functions.
- Modify `convex/drive/lib.ts` for reusable Drive invariants only when they are shared by authenticated and public operations.
- Modify `convex/drive/items.ts` only to extract implementation helpers that genuinely need reuse.

### Required internal interface

Keep the interface small. Exact local names may vary, but the module must provide equivalent implementation helpers:

```ts
resolveActiveShare(ctx, token)
requireSharedItem(ctx, shareRoot, itemId, options?)
requireSharedFolder(ctx, shareRoot, folderId)
```

`resolveActiveShare` must:

- Look up `newDriveItems` with `by_publicToken`.
- Require a live item and a present `publicAccess` value.
- Reject elapsed expiration with `publicExpiresAt <= Date.now()`.
- Return the root and effective permission for internal use.
- Use a generic unavailable error/result externally.

`requireSharedItem` must:

- Load the requested item.
- Require it to be live and in the root's space.
- Accept the root itself for reads.
- Walk parent IDs until reaching the root.
- Reject a missing/deleted parent, a space mismatch, an exhausted depth bound, or a cycle.
- Never infer scope from `publicAccess` on the requested descendant.

Use an explicit ancestry depth bound, such as 256, to prevent unbounded reads on corrupt data.

### Shared implementation extraction

- [ ] Reuse `assertItemName` and `normalizeName` from `convex/drive/lib.ts`.
- [ ] Extract duplicate-name lookup/checking only if both authenticated and guest code would otherwise duplicate it.
- [ ] Extract move cycle validation only if it can preserve current authenticated behavior exactly.
- [ ] Extract subtree collection so authenticated and guest deletion share the same item limit and traversal behavior.
- [ ] Keep extracted helpers private to the Drive backend; do not create public Convex functions merely for reuse.
- [ ] Preserve `MAX_FILE_SIZE = 5 GiB`, `MAX_DELETE_ITEMS = 500`, and `UPLOAD_TICKET_TTL = 15 minutes` as shared constants if public operations need them.

### Verification Gate 2

Manually exercise helpers through temporary caller wiring or the completed functions in Phase 3, then remove any temporary public diagnostic function.

- [ ] Root item is accepted.
- [ ] Direct and deeply nested descendants are accepted.
- [ ] Siblings, ancestors, and items in another space are rejected.
- [ ] A descendant moved outside the root is rejected immediately.
- [ ] Deleted roots, deleted descendants, expired roots, and unknown tokens produce the same public unavailable behavior.
- [ ] A descendant's independent link settings do not affect the current root token's permission.

## Phase 3: Authenticated Share Management

### Files

- Implement in `convex/drive/shares.ts`.

### Convex functions

Implement authenticated functions with complete validators:

```ts
getShareSettings({ itemId });
setShare({ itemId, access, expiresAt });
disableShare({ itemId });
```

Recommended interface details:

- `access` is `"read" | "edit"` for the mutation validator, followed by a runtime rejection of `"edit"` for files. Alternatively use separate discriminated args if that produces a clearer validator.
- `expiresAt` is `v.union(v.number(), v.null())`; `null` means never.
- `getShareSettings` returns a discriminated restricted/shared projection. Return the complete public URL from the UI, not the backend, so deployment origin is not backend configuration.
- `setShare` creates a token only when no active stored sharing configuration exists. Updating access or expiration preserves the existing token.
- Treat an already expired but not disabled link as the same share record: changing its expiration to the future reactivates the same URL. Only explicit disable rotates the future URL.
- `disableShare` removes `publicAccess`, `publicToken`, and `publicExpiresAt` together.

### Authorization

- [ ] Load the target item and require it to be live.
- [ ] Call `requireSpaceAccess` using the item's actual `spaceId`.
- [ ] Do not require creator ownership because the agreed policy allows any user with space access.
- [ ] Reject folder `edit` on files.
- [ ] Reject expiration values that are not safely in the future.
- [ ] Generate tokens with a cryptographically secure source. Use at least 128 bits of entropy; `crypto.randomUUID()` is sufficient if represented without making the URL guessable.
- [ ] Check the token index for collision before storing, even though collision is extremely unlikely.
- [ ] Patch `updatedAt` only if changing sharing is intended to count as an item modification. Make one consistent choice; recommended behavior is not to change content `updatedAt` for share-setting changes.

### Verification Gate 3

- [ ] A user with access to an `everyone` space can manage links for any item in that space.
- [ ] A non-admin cannot manage a link in an `admin` space.
- [ ] Files cannot be assigned `edit`.
- [ ] Enabling creates one opaque token.
- [ ] Changing permission and expiration preserves the token.
- [ ] Explicit disable invalidates and clears the token.
- [ ] Re-enable creates a different token.
- [ ] Expired settings can be extended while preserving the token unless they were explicitly disabled.

## Phase 4: Public Read and Download Functions

### Files

- Implement in `convex/drive/shares.ts`.
- Modify `convex/r2.ts` only if a narrowly scoped helper is needed for signed URLs or CORS-safe delivery.

### Public-safe result shape

Define validators for public projections. A public item may include:

- `_id`
- `name`
- `kind`
- `parentId` only when needed for navigation and only for in-scope records
- `updatedAt`
- `contentType` and `size` for files
- Effective root permission, returned once at the page/root level
- Whether the current item is the protected share root

Never return `spaceId`, `createdBy`, `ownerName`, `publicToken` other than the token already supplied by the caller, or `r2.key`.

### Convex functions

Implement equivalent public functions:

```ts
getSharedRoot({ token });
getSharedFolder({ token, folderId });
listSharedItems({ token, parentId });
getSharedFilePreview({ token, itemId });
getSharedDownloadUrl({ token, itemId });
getSharedArchiveManifest({ token });
```

The exact split may be reduced if one deeper query can safely serve root/folder/list data without increasing exposed state.

### Behavior

- [ ] `getSharedRoot` returns a generic unavailable discriminant or a public root projection plus effective access.
- [ ] For a file root, opening `/share/$token` returns file preview metadata directly.
- [ ] For a folder root, `parentId` omitted/null means list the root's direct children; do not interpret it as the Drive space root.
- [ ] Every folder/item ID is independently scope-checked on every request.
- [ ] Signed preview/download URLs expire after 15 minutes or less.
- [ ] Public previews embed only an allowlist such as images, PDFs, plain text, audio, and video if already supported safely by the app.
- [ ] HTML, SVG, scripts, executables, and unknown active content are download-only. Do not iframe arbitrary uploaded HTML.
- [ ] Download responses use the original file name in the browser flow without exposing the R2 key.

### Archive manifest

`getSharedArchiveManifest` must:

- Require a folder share root.
- Traverse all current descendants from the root.
- Preserve relative paths and include the root folder name as the first path segment.
- Count files and sum uncompressed bytes before issuing a successful manifest.
- Reject over 500 files or over 250 MiB with a specific safe `archiveTooLarge` result.
- Reject malformed/cyclic trees with the generic unavailable result.
- Return no more than the bounded file set and no internal R2 keys.
- Generate short-lived signed URLs only after all files pass scope and limits.

### Verification Gate 4

- [ ] A read file link can preview safe content and download the original.
- [ ] A read folder link can browse all current descendant depths.
- [ ] New descendants appear without changing the link.
- [ ] Out-of-scope IDs return no metadata and no signed URL.
- [ ] Public payloads contain no internal space, owner, creator, or R2 key data.
- [ ] Unsafe MIME types are download-only.
- [ ] Revoked/expired links stop issuing new signed URLs.
- [ ] Archive manifests preserve paths and enforce both caps before the browser starts bulk downloads.

## Phase 5: Public Folder Editing Backend

### Files

- Implement guest functions in `convex/drive/shares.ts` or, if the file becomes difficult to navigate, place mutation implementation in `convex/drive/sharedItems.ts` while keeping share resolution in `shares.ts`.
- Reuse implementation helpers from `convex/drive/items.ts` and `convex/drive/lib.ts`.

### Convex mutations

Implement equivalent token-authorized functions:

```ts
createSharedFolder({ token, parentId, name });
renameSharedItem({ token, itemId, name });
moveSharedItems({ token, itemIds, destinationFolderId });
deleteSharedItems({ token, itemIds });
createSharedUploadTicket({ token, parentId, name, contentType, size });
```

All require an active `edit` folder root.

### Create, rename, move, delete rules

- [ ] Create folders only under an in-scope live folder, including the root.
- [ ] Set `createdBy: "guest"` for guest-created folders and uploaded files.
- [ ] Rename only strict descendants; reject the root.
- [ ] Preserve existing item-name validation and sibling collision behavior.
- [ ] Move only strict descendants.
- [ ] Require every selected source to be in scope before writing anything.
- [ ] Require the destination to be an in-scope live folder, including the root.
- [ ] Reject moving an item into itself or one of its descendants.
- [ ] Keep the operation transactional so one invalid source prevents all moves.
- [ ] Delete only strict descendants; reject any request containing the root.
- [ ] Reuse the 500-item recursive deletion limit.
- [ ] Schedule the same R2 cleanup used by authenticated deletion.
- [ ] Update affected parent/space timestamps consistently with authenticated operations.

### Guest upload tickets

On ticket creation:

- [ ] Resolve an active edit folder share.
- [ ] Validate the parent as an in-scope folder.
- [ ] Apply the existing 5 GiB per-file limit and file-name validation.
- [ ] Create the signed R2 upload URL with the existing key strategy.
- [ ] Store `shareRootId: root._id` and `uploadedBy: "guest"` on the ticket.

Update the internal upload-ticket projection in `convex/drive/items.ts` to include `shareRootId` when needed.

### Public upload actions

Implement equivalent actions:

```ts
finalizeSharedUpload({ token, ticketId });
cancelSharedUpload({ token, ticketId });
```

Finalization must:

- Load the ticket without exposing it publicly.
- Require `uploadedBy === "guest"`.
- Require `ticket.shareRootId` to equal the root resolved from the supplied token.
- Re-resolve active `edit` permission after metadata synchronization and immediately before the completion mutation.
- Revalidate that the ticket parent is still in scope.
- Reuse metadata-size verification and duplicate-name checks.
- Insert the file with `createdBy: "guest"`.
- Remove the ticket after success.

Cancellation must only delete an R2 object/ticket associated with the same active token root. Expired or revoked links cannot authorize cancellation; rely on existing expired-ticket cleanup for eventual cleanup if necessary.

### Race and revocation requirements

- [ ] Do not finalize based only on permission checked when the ticket was created.
- [ ] In the internal completion mutation, re-read the root and ticket in the same transaction before inserting the file.
- [ ] If the root is revoked, expired, deleted, downgraded, or the destination leaves scope, reject completion and do not create a Drive item.
- [ ] Never let an authenticated upload ticket be finalized through the guest action or vice versa.

### Verification Gate 5

- [ ] Read tokens fail every guest mutation.
- [ ] Edit tokens can create, upload, rename, move, and delete descendants.
- [ ] Edit tokens cannot rename, move, or delete the root.
- [ ] Moves cannot escape the root or create cycles.
- [ ] Guest-created items display as Guest to authenticated users.
- [ ] Downgrading, expiring, disabling, or deleting the root blocks outstanding upload finalization.
- [ ] Guessing an out-of-scope item, parent, destination, or ticket ID never grants access or reveals its existence.
- [ ] Guest deletion removes the same records and R2 objects as authenticated deletion.

## Phase 6: Authenticated Share Dialog

### Files

- Create `src/components/new-drive/share-dialog.tsx`.
- Modify `src/components/new-drive/file-list.tsx`.
- Modify `src/routes/app/newdrive.$spaceId.{-$folderId}.tsx`.
- Modify `src/lib/new-drive-items.ts` only if the view model needs explicit share capability fields.
- Reuse UI wrappers from `src/components/ui/`, including dialog, select/radio group, popover, calendar, input, button, and spinner as appropriate.

### Dialog behavior

- [ ] Add `onShareItem` or a controlled share-dialog interface to `NewDriveFileList`; do not put Convex calls directly into each row.
- [ ] Wire the existing Share dropdown item to open the selected item's dialog.
- [ ] Load current settings when the dialog opens.
- [ ] Show Restricted, Viewer, and Editor for folders.
- [ ] Show Restricted and Viewer only for files.
- [ ] Show expiration presets: never, 24 hours, 7 days, 30 days, and custom.
- [ ] Require custom expiration to be in the future.
- [ ] Construct the public URL from `window.location.origin` and the returned token.
- [ ] Provide a copy button using the Clipboard API with success/error feedback.
- [ ] Preserve the URL while changing permission or expiration.
- [ ] Make disabling sharing an explicit action with clear destructive wording.
- [ ] Explain that anyone with the URL receives the selected access.
- [ ] Reflect mutation loading states and prevent duplicate submissions.
- [ ] Keep the dialog usable on narrow mobile screens.
- [ ] Update/invalidate the authenticated list data after changes so the access badge changes immediately.

### Verification Gate 6

- [ ] The placeholder Share menu item opens the correct item's settings.
- [ ] File and folder permission choices match the backend rules.
- [ ] Copy produces the exact current-origin `/share/$token` URL.
- [ ] Permission/expiration updates do not change that URL.
- [ ] Disable changes the badge to Restricted and makes the old URL unavailable.
- [ ] Re-enable produces a different URL.
- [ ] Dialog errors do not close the dialog or leave false success state.

## Phase 7: Public Read-Only Route and Browser

### Files

- Create `src/routes/share.$token.{-$itemId}.tsx` or the equivalent TanStack file-route name for `/share/$token/{-$itemId}`.
- Create `src/components/new-drive/public-share-browser.tsx` if the route would otherwise mix data orchestration with substantial UI.
- Modify `src/components/new-drive/file-list.tsx` to support public navigation/capabilities without hard-coded `/app/newdrive` links.
- Modify or reuse the authenticated file preview presentation without importing authenticated queries.
- Do not edit `src/routeTree.gen.ts`; let normal generation update it.

### Route contract

- `/share/$token` opens the share root.
- `/share/$token/$itemId` opens an in-scope descendant folder or file.
- For a direct file share, the root URL renders its preview.
- For a folder share, the root URL renders the root's direct children.
- Public breadcrumb navigation never climbs above the shared root.

### Route implementation

- [ ] Place the route outside `/app` so it does not inherit the authenticated redirect.
- [ ] Use a loader with `queryClient` aliased as `qc`, following repository convention.
- [ ] Load only public Convex functions.
- [ ] Add `robots: noindex, nofollow` metadata.
- [ ] Avoid putting item names or other private metadata in static error-page head tags.
- [ ] Render one generic unavailable page for all invalid share states.
- [ ] Display basic metadata only: name, type, size, and modified time.
- [ ] Render effective access as Viewer or Editor without exposing internal share fields.
- [ ] Support desktop and mobile layouts.
- [ ] For read access, omit or disable all create/upload/rename/move/delete controls.
- [ ] Keep direct downloads available for read and edit links.

### File list reuse

- [ ] Replace hard-coded authenticated navigation with a small navigation callback or link-builder interface.
- [ ] Keep authenticated behavior unchanged when no public adapter is supplied.
- [ ] Drive action visibility from supplied capabilities/callbacks, not from item-owned public fields.
- [ ] Do not create a second copy of selection, drag/drop, rename, or delete UI solely for public mode.
- [ ] Ensure public breadcrumbs and drag targets cannot navigate or move above the shared root.

### Verification Gate 7

- [ ] Anonymous SSR returns the public page instead of a login redirect.
- [ ] Hydration does not flash an auth error or refetch through an authenticated function.
- [ ] Direct file, root folder, nested folder, and nested file URLs work on desktop and mobile.
- [ ] Breadcrumbs stop at the shared root.
- [ ] Read links expose no editing controls and backend calls still reject manual mutation attempts.
- [ ] Generic unavailable behavior is identical for unknown, expired, disabled, and deleted links.
- [ ] Page source and network responses contain no forbidden metadata.

## Phase 8: Public Editing UI and Upload Adapter

### Files

- Modify `src/hooks/use-new-drive-upload.tsx`.
- Modify `src/components/new-drive/add-items-menu.tsx`.
- Modify `src/components/new-drive/upload-dropzone.tsx`.
- Modify `src/components/new-drive/file-list.tsx`.
- Modify `src/components/new-drive/public-share-browser.tsx` or the public route.

### Upload refactor

Refactor `useNewDriveUpload` around a small operation adapter while keeping traversal and progress logic shared. The adapter needs equivalents for:

```ts
createFolder(args);
createUploadTicket(args);
finalizeUpload(args);
cancelUpload(args);
```

- Authenticated mode supplies existing `api.drive.items` operations.
- Public edit mode supplies token-authorized share operations.
- Do not duplicate relative-path parsing, folder reconstruction, upload progress, toast rendering, or PUT behavior.
- Keep the token inside the public adapter rather than threading it through generic presentational UI where unnecessary.

### Editor controls

- [ ] Render Add Items and upload dropzone only for effective `edit` folder shares.
- [ ] Connect rename, move, and delete callbacks to guest mutations.
- [ ] Hide rename/move/delete for the protected root.
- [ ] Permit dragging descendants only to in-scope folders.
- [ ] Do not render a parent destination above the shared root.
- [ ] Use the existing deletion confirmation and clearly state that deletion affects everyone.
- [ ] Refresh/invalidate public query data after each mutation.
- [ ] Surface generic access errors if permission expires or is revoked while the page is open.
- [ ] After loss of access, transition to the generic unavailable state rather than retaining stale editable UI.

### Verification Gate 8

- [ ] Folder and multi-file uploads preserve relative paths under the selected public folder.
- [ ] Progress, cancellation, duplicate-name errors, and 5 GiB validation behave like authenticated uploads.
- [ ] Guest rename/move/delete interactions work within scope on desktop and mobile.
- [ ] Root controls remain protected in every navigation state.
- [ ] Permission downgrade while open removes editing capability after the next subscription update/refetch.
- [ ] A malicious caller cannot bypass hidden UI by invoking guest mutations directly.

## Phase 9: Capped Folder ZIP

### Files

- Create `src/lib/download-shared-folder.ts` or a similarly focused browser utility.
- Add the Download all control to `src/components/new-drive/public-share-browser.tsx`.
- Use existing `jszip` and `file-saver`; do not add another archive dependency.

### Browser archive flow

1. Request the bounded archive manifest from Convex.
2. If the backend reports `archiveTooLarge`, show the 500-file/250-MiB limit and keep individual downloads available.
3. Fetch each signed URL with bounded concurrency rather than starting 500 requests at once. Use a small fixed concurrency such as four.
4. Add each blob to JSZip under its sanitized relative path.
5. Preserve empty folders only if the manifest intentionally includes folder entries; otherwise document that ZIPs contain file-bearing paths only.
6. Generate the ZIP and save it as `<shared-root-name>.zip`.
7. Show progress for download and archive generation.
8. Allow retry after a failed or expired signed URL by requesting a fresh manifest.

### Safety requirements

- [ ] Sanitize every archive path segment and reject `.`/`..`, absolute paths, backslashes, and control characters to prevent ZIP-slip paths.
- [ ] Resolve duplicate archive paths deterministically or reject the manifest as inconsistent.
- [ ] Do not begin fetching files until the backend confirms both caps.
- [ ] Release references to fetched blobs after completion/failure where practical.
- [ ] Prevent starting multiple archive builds simultaneously.
- [ ] Keep the control available to both read and edit shares.
- [ ] Do not attempt a browser ZIP above either limit.

### Verification Gate 9

- [ ] ZIP contains one top-level directory named for the shared root.
- [ ] Nested directory structure and file names are preserved.
- [ ] A near-limit archive completes without freezing the UI on a representative desktop browser.
- [ ] Mobile receives clear progress and can cancel/leave safely; if platform memory is insufficient, failure is handled without crashing the page.
- [ ] Over-limit folders fail before file transfer starts.
- [ ] Revocation or URL expiration during generation produces a recoverable error without saving a partial archive as successful.

## Phase 10: Final Integration and Security Verification

### Code review checklist

- [ ] Search public result validators and returns for `spaceId`, `createdBy`, `ownerName`, `publicToken`, and R2 `key`; confirm none leak beyond the intentional root token input/settings response.
- [ ] Search all guest mutations for direct `ctx.db.get(args.itemId)` usage and confirm every loaded ID is subsequently checked against the active share root.
- [ ] Confirm every public Convex function has explicit `args` and `returns` validators.
- [ ] Confirm no guest path calls `requireSpaceAccess` as its authorization mechanism.
- [ ] Confirm authenticated paths still use authentication and space access checks.
- [ ] Confirm direct file shares cannot receive `edit` through schema, mutation, or UI.
- [ ] Confirm the root's effective permission controls descendants, regardless of descendant share settings.
- [ ] Confirm all signed URLs are short-lived and generated only after current authorization.
- [ ] Confirm explicit disable clears token, access, and expiration atomically.
- [ ] Confirm no generated files were manually edited.

### Manual behavior matrix

Verify each row for root, direct child, and deeply nested child where applicable:

| State                | Browse               | Preview/download | ZIP         | Create/upload | Rename/move/delete |
| -------------------- | -------------------- | ---------------- | ----------- | ------------- | ------------------ |
| Active file `read`   | Root file only       | Yes              | No          | No            | No                 |
| Active folder `read` | In-scope descendants | Yes              | Yes, capped | No            | No                 |
| Active folder `edit` | In-scope descendants | Yes              | Yes, capped | Yes           | Descendants only   |
| Expired              | Unavailable          | No new URL       | No          | No            | No                 |
| Disabled             | Unavailable          | No new URL       | No          | No            | No                 |
| Deleted root         | Unavailable          | No new URL       | No          | No            | No                 |

### Adversarial manual checks

- [ ] Substitute an item ID from another space into the public URL and every public function argument.
- [ ] Substitute a sibling/ancestor ID outside the shared root.
- [ ] Attempt to move a descendant to a folder outside the root.
- [ ] Attempt to move a folder into itself or a descendant.
- [ ] Attempt to rename, move, and delete the root.
- [ ] Start an upload, then downgrade, expire, disable, or delete the share before finalization.
- [ ] Use an authenticated upload ticket with guest finalization and a guest ticket with authenticated finalization.
- [ ] Disable and re-enable sharing, then retry the old token.
- [ ] Move a direct shared file and confirm its direct token still works.
- [ ] Move a descendant out of a shared folder and confirm the folder token loses access immediately.
- [ ] Give a descendant its own share, then confirm each token enforces its own root and permission independently.

### Build gate

- [ ] Run `pnpm build` after implementation.
- [ ] Do not run lint, `pnpm check`, a dev server, Convex dev, or automated tests.
- [ ] Resolve TypeScript/build errors only in files relevant to this feature; do not revert unrelated worktree changes.
- [ ] Review the final diff for accidental generated-file, dependency, formatting, or unrelated changes.

## Completion Criteria

The feature is complete only when:

- [ ] Authenticated users with space access can enable, configure, copy, and disable one public link per item.
- [ ] Public file links are read/download-only.
- [ ] Public folder links recursively enforce their current `read` or `edit` permission.
- [ ] Anonymous editors can fully manage descendants but cannot mutate the root or escape its subtree.
- [ ] Guest uploads remain authorized through finalization and are attributed to Guest.
- [ ] Revocation, expiration, deletion, and subtree moves take effect according to the fixed decisions.
- [ ] Public pages disclose only approved metadata and are marked `noindex, nofollow`.
- [ ] Individual downloads use short-lived private-R2 URLs.
- [ ] Folder ZIP download preserves structure and enforces the fixed caps.
- [ ] Desktop and mobile public flows pass the manual gates.
- [ ] `pnpm build` succeeds.

## Expected File Change Map

Required or likely additions:

- `PUBLIC_DRIVE_SHARING_PLAN.md`
- `convex/drive/shares.ts`
- `src/components/new-drive/share-dialog.tsx`
- `src/components/new-drive/public-share-browser.tsx`
- `src/routes/share.$token.{-$itemId}.tsx`
- `src/lib/download-shared-folder.ts`

Required or likely modifications:

- `convex/schemas/drive.tsx`
- `convex/drive/lib.ts`
- `convex/drive/items.ts`
- `src/router.tsx` only if anonymous Convex SSR requires it
- `src/components/new-drive/file-list.tsx`
- `src/components/new-drive/add-items-menu.tsx`
- `src/components/new-drive/upload-dropzone.tsx`
- `src/hooks/use-new-drive-upload.tsx`
- `src/lib/new-drive-items.ts`
- `src/routes/app/newdrive.$spaceId.{-$folderId}.tsx`

Generated by framework tooling, never edit manually:

- `convex/_generated/**`
- `src/routeTree.gen.ts`

Files that should not need feature changes unless implementation discovery proves otherwise:

- Legacy Drive tables/functions under `convex/drive.ts`
- Job-order, customer, payment, printer, and shop modules
- Authentication policy in `convex/auth.ts`
- R2 client configuration beyond narrowly required signed-download/CORS behavior
