# Drive Search Implementation Plan

## Architecture Decision

Implement a split client/backend design:

- **Local mode:** Filter the current route's already-loaded immediate children in the browser. Do not call Convex for local search.
- **Global mode:** Full-text search within the current space, followed by ancestor-chain validation against the current folder.
- Do not recursively enumerate every descendant.
- Do not add a materialized closure or search-scope table yet.
- Accept that local search covers the same maximum 500 immediate children currently returned by `listItems`.
- Accept Convex's 1,024-result search scan ceiling as an initial limitation.

## Implementation Steps

### 1. Confirm Current Behavior And Constraints

- Read `packages/backend/convex/_generated/ai/guidelines.md`.
- Review `packages/backend/convex/schemas/drive.tsx`.
- Review `packages/backend/convex/drive/items.ts`.
- Review `apps/system/src/routes/_authenticated/drive.$spaceId.{-$folderId}.tsx`.
- Review `packages/drive/src/components/file-list.tsx`.
- Preserve existing authorization, file actions, sorting, navigation, and upload behavior.
- Do not modify generated Convex files or `routeTree.gen.ts`.

### 2. Extend The Full-Text Search Index

- Update `driveItems.search_name` in `packages/backend/convex/schemas/drive.tsx`.
- Retain `spaceId` and `kind` as filter fields.
- Add `deletedAt` as a filter field.
- Support global candidate search by `spaceId` and `deletedAt`.
- Do not add `parentId` solely for local search because local search does not query the backend.
- If the deployment already has substantial production data, use Convex's staged search-index rollout procedure rather than unexpectedly blocking deployment.

### 3. Define The Backend Search Contract

- Add an authenticated query in `packages/backend/convex/drive/items.ts` named `searchItems`.
- Treat this as a recursive search query. Local search must not call it.
- Validate the following arguments:

```ts
{
	spaceId: v.id("driveSpaces"),
	parentId: v.optional(v.id("driveItems")),
	query: v.string(),
}
```

- Treat `parentId: undefined` as the root of the selected space.
- Trim the query.
- Return an empty result for an empty query.
- Reject or safely bound unreasonable query lengths.
- Rely on Convex's maximum of 16 search terms.
- Return a bounded collection and never use an unbounded `.collect()`.

### 4. Apply Authorization And Scope Validation

- Call `requireSpaceAccess(ctx, args.spaceId)`.
- Call `requireParentFolder(ctx, args.spaceId, args.parentId)`.
- Never trust the folder ID without confirming that it belongs to the requested space and has not been deleted.

### 5. Implement Local Search In The Browser

- Use the immediate-child results already returned by `listItems` for the current route.
- Normalize the trimmed search input to lowercase.
- Filter with `item.name.toLowerCase().includes(normalizedQuery)`.
- Preserve the current item order before the file-list component applies its selected sort.
- Do not invoke `searchItems` or any other additional Convex query in local mode.
- Keep the existing `listItems` limit of 500 explicit as a known limitation.
- If folders later need more than 500 immediate children, paginate the folder listing and local search together rather than adding a separate local-search request prematurely.

### 6. Implement Global Search At The Space Root

- When `parentId` is undefined, search by `spaceId === args.spaceId` and `deletedAt === undefined`.
- Do not perform ancestry checks because the space root contains every item in that space.

### 7. Implement Global Search Inside A Folder

- Search matching names across the current space first.
- Retrieve at most Convex's supported 1,024 search candidates.
- For each candidate, begin at its `parentId` and walk upward.
- Include the candidate when the requested `parentId` is reached.
- Exclude the candidate when the space root is reached first.
- Exclude the candidate when an invalid, deleted, non-folder, or cross-space ancestor is found.
- Cache every loaded ancestor in a `Map<Id<"driveItems">, Doc<"driveItems"> | null>` for the duration of the query.
- Reuse cached ancestors across candidates to avoid repeated reads.
- Protect against malformed cycles with a visited-ID set or a conservative maximum folder depth.
- Return a bounded number of accepted results, such as the first 100 in Convex relevance order.

### 8. Shape Search Results Consistently

- Return the same fields that `listItems` currently exposes.
- Include `_id`, `name`, `parentId`, `createdBy`, `ownerName`, `updatedAt`, `kind`, and `publicAccess`.
- Include `r2` for files.
- Reuse a small result-shaping helper only if it meaningfully avoids duplicating owner loading and mapping logic.
- Do not introduce a larger repository abstraction solely for this feature.

### 9. Add Search State To The Folder Browser

- Update `apps/system/src/routes/_authenticated/drive.$spaceId.{-$folderId}.tsx`.
- Add search text state.
- Add a deferred search value using `useDeferredValue`.
- Add search mode state typed as `"local" | "global"`.
- Default to `"local"` unless product behavior already establishes another default.
- Derive local results synchronously from the existing `listItems` data when the mode is local and the trimmed query is non-empty.
- Enable the `searchItems` Convex query only when the mode is global and the trimmed deferred query is non-empty.
- Do not run `searchItems` while the query is empty or the mode is local.
- Continue using `listItems` when there is no active search.
- Display local filtered results in local mode and backend `searchItems` results in global mode.

### 10. Add The Search Controls

- Place a search input in the drive file-list toolbar.
- Add a compact two-option control labeled `Local` and `Global`.
- Give Local the accessible description "Search only this folder."
- Give Global the accessible description "Search this folder and all nested folders."
- At the space root, global means the entire current space.
- Keep the add and upload menu accessible alongside the search controls.
- Ensure controls wrap cleanly on mobile rather than overflowing.

### 11. Handle Query Transitions

- Preserve the immediate-child listing until search becomes active.
- Keep local filtering immediate and avoid a loading state for local mode.
- Show a loading or pending state while a deferred global search query changes.
- Clear stale selection whenever the query, mode, space, or folder changes.
- Ensure switching folders cannot briefly display results from the previous folder.
- Use "No files or folders found" when there is no active search.
- Use "No matching files or folders in this scope" when a search has no results.

### 12. Keep Search-Result Actions Safe

- Opening a descendant folder must navigate to that folder normally.
- Opening a file must continue to use the existing file-preview route.
- Rename, download, share, and delete may remain available if they already operate by item ID.
- Avoid multi-item moves across global search results from different parent folders because `moveItems` requires all selected items to share one source parent.
- Disable drag-and-drop and multi-selection while global search results are displayed.
- Local results may retain existing interactive behavior because all results share the current parent.

### 13. Document The Known Limitation In Code

- Add one concise comment near the global candidate limit.
- Explain that Convex text search scans at most 1,024 results.
- Explain that ancestry is currently checked after searching the space.
- Identify a materialized ancestor-scope search table as the future upgrade if this becomes insufficient.
- Note near the local filtering logic that it searches the currently loaded route items, which are presently capped at 500.
- Do not add another documentation file solely for this limitation.

### 14. Verify The Implementation

- Run targeted TypeScript checks:

```bash
pnpm exec tsc --noEmit -p packages/backend/tsconfig.json
pnpm exec tsc --noEmit -p packages/drive/tsconfig.json
pnpm exec tsc --noEmit -p apps/system/tsconfig.json
```

- If a package does not have its own `tsconfig.json`, use the nearest applicable workspace configuration.
- Do not run `pnpm dev`, `convex dev`, lint commands, or `pnpm check`.
- Do not add or modify tests, per repository instructions.
- Do not manually edit anything under `convex/_generated/`.

## Acceptance Criteria

- Local mode returns only matching immediate children.
- Local mode performs no additional Convex query.
- Local mode filters the route's currently loaded items using case-insensitive substring matching.
- Global mode returns matching descendants at any depth beneath the current folder.
- Global mode at the space root searches the entire current space.
- Neither mode returns deleted items or items from unauthorized spaces.
- Global search does not enumerate every descendant before searching.
- Search results preserve Convex relevance order.
- Shared ancestors are not repeatedly loaded during one query.
- Empty queries use the normal folder listing.
- Folder and file navigation works from search results.
- Multi-selection and drag-and-drop are disabled for global search results.
- Mobile controls remain usable.
- Targeted TypeScript checks pass.
