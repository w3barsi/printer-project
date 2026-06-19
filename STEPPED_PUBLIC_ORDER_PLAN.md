# Stepped Public Order Implementation Plan

This plan breaks `PUBLIC_ORDER_PLAN.md` into gradual, prompt-friendly phases. Each phase is designed to be small enough to ask an agent to execute independently, then stop. Do not run `pnpm dev`, `convex dev`, or `pnpm check`. Do not modify `src/routeTree.gen.ts` or anything under `convex/_generated/`.

All new Convex queries, mutations, actions, and helpers for the public order feature should live under `convex/public/`. Existing Convex files may be updated only when the existing workflow requires it, such as `convex/schema.ts`, `convex/convex.config.ts`, `convex/jo.ts` for staff confirmation/printing guards, or existing integration files that must call into the public order module.

## Recommended Work Batches

Use these batches when you want to make more progress per session without making the task too large. Each batch groups phases that are naturally related and have manageable blast radius.

### Batch A: Discovery And Low-Risk Frontend Prep

- Phases: 1, 2, 3
- Scope: inspect code, add public order constants/helpers, update showcase CTA links.
- Why together: these are low-risk and do not change backend data or submission behavior.
- Suggested prompt: `Execute Batch A from STEPPED_PUBLIC_ORDER_PLAN.md: Phases 1, 2, and 3 only. Stop after Phase 3 verification.`

### Batch B: Backend Data Foundation

- Phases: 4, 5
- Scope: schema changes plus backend pricing/validation helpers.
- Why together: schema and backend helper definitions are tightly related, but no public mutation is added yet.
- Suggested prompt: `Execute Batch B from STEPPED_PUBLIC_ORDER_PLAN.md: Phases 4 and 5 only. Stop before adding public mutations.`

### Batch C: Core Public Order Creation

- Phases: 6, 7
- Scope: create unconfirmed JO mutation, online order metadata rows, attachment metadata/status mutations.
- Why together: this creates the core backend source of truth before R2 upload URL mechanics.
- Suggested prompt: `Execute Batch C from STEPPED_PUBLIC_ORDER_PLAN.md: Phases 6 and 7 only. Stop before R2 upload URL work.`

### Batch D: Upload And Notification Backend

- Phases: 8, 9, 10, 11
- Scope: order-specific R2 upload URLs, staff read queries/signed URLs, confirm mutation, Telegram backend.
- Why together: these are backend integration points around files, staff access, confirmation, and notification.
- Caution: this is the largest backend batch. Split into Phase 8-9 and Phase 10-11 if usage limits are tight.
- Suggested prompt: `Execute Batch D from STEPPED_PUBLIC_ORDER_PLAN.md: Phases 8 through 11 only. Stop before public route UI work.`

### Batch E: Public Order Route Skeleton

- Phases: 12, 13, 14
- Scope: `/order` shell, service selection/coming-soon UI, local cart/contact draft state.
- Why together: these establish the frontend route structure before detailed forms.
- Suggested prompt: `Execute Batch E from STEPPED_PUBLIC_ORDER_PLAN.md: Phases 12, 13, and 14 only. Stop before building Step 2.`

### Batch F: Public Order Step Forms

- Phases: 15, 16, 17, 18
- Scope: Tarpaulin configurator, artwork/design option, cart review, contact/payment form.
- Why together: these are UI-only form steps that share local draft/cart state.
- Caution: split into Phase 15-16 and Phase 17-18 if the frontend diff gets too large.
- Suggested prompt: `Execute Batch F from STEPPED_PUBLIC_ORDER_PLAN.md: Phases 15 through 18 only. Stop before submit integration.`

### Batch G: Submit And Customer Confirmation

- Phases: 19, 20, 21
- Scope: submit unconfirmed order, upload files, update attachment status, trigger Telegram, show confirmation.
- Why together: these complete the public customer flow end-to-end.
- Caution: if uploads are complex, do Phase 19 alone first, then Phase 20-21.
- Suggested prompt: `Execute Batch G from STEPPED_PUBLIC_ORDER_PLAN.md: Phases 19, 20, and 21 only. Stop before staff UI changes.`

### Batch H: Staff UI And Workflow Guards

- Phases: 22, 23, 24, 25
- Scope: JO list badges, JO detail confirm button, online order details card, workflow hardening.
- Why together: these are staff-facing changes needed to operationalize unconfirmed orders.
- Caution: split into Phase 22-23 and Phase 24-25 if needed.
- Suggested prompt: `Execute Batch H from STEPPED_PUBLIC_ORDER_PLAN.md: Phases 22 through 25 only. Stop before final verification.`

### Batch I: Final Verification And Polish

- Phases: 26
- Scope: end-to-end verification, lint/build checks where allowed, final risk report.
- Why alone: this should happen after all implementation batches are complete.
- Suggested prompt: `Execute Batch I from STEPPED_PUBLIC_ORDER_PLAN.md: Phase 26 only. Report skipped checks and remaining risks.`

### Smallest Safe Sequence

- Start with Batch A.
- Then Batch B.
- Then Batch C.
- Split Batch D if needed.
- Then Batch E.
- Split Batch F if needed.
- Then Batch G.
- Then Batch H.
- Finish with Batch I.

## Phase 1: Discovery And Ground Rules

Goal: Prepare context without changing app behavior.

### 1.1 Read Required Project Guidance

- Read `AGENTS.md`.
- Read `PUBLIC_ORDER_PLAN.md`.
- If touching Convex code in later phases, read `convex/_generated/ai/guidelines.md` first.

### 1.2 Inspect Current Public Service Code

- Inspect `src/lib/services.ts`.
- Inspect `src/routes/showcase.$service.tsx`.
- Confirm the Tarpaulin service slug is `tarpaulins-banners`.
- Confirm where the existing quote/contact CTAs are rendered.

### 1.3 Inspect Current JO Backend Code

- Inspect `convex/schema.ts`.
- Inspect `convex/jo.ts`.
- Inspect `convex/items.ts`.
- Confirm internal JOs currently start as `pending`.
- Confirm internal JO creation currently schedules Trello creation.

### 1.4 Inspect Current Staff UI And Upload Code

- Inspect `src/routes/app/jo.index.tsx`.
- Inspect `src/routes/app/jo.$joId.tsx`.
- Inspect `convex/r2.ts`.
- Inspect `src/lib/drive/use-upload-file.ts`.
- Confirm generic Drive upload should not be reused directly for public order uploads.

### 1.5 Stop Point

- Do not edit code in Phase 1 unless asked.
- Report discoveries, risks, and any mismatches with `PUBLIC_ORDER_PLAN.md`.

## Phase 2: Public Order Constants And Pure Helpers

Goal: Add frontend-safe constants and pure calculation helpers with no backend/schema changes.

### 2.1 Create Public Order Constants Module

- Add a module such as `src/lib/public-order.ts`.
- Define supported service slug: `tarpaulins-banners`.
- Define product type: `tarpaulin`.
- Define price: `20` pesos per sqft.
- Define presets: `2x3`, `3x4`, `3x6`, `4x6`, `4x8`.

### 2.2 Add Public Order Value Types

- Add types/unions for artwork options:
  - `upload-now`
  - `send-later`
  - `design-requested`
- Add types/unions for payment methods:
  - `gcash`
  - `bank-transfer`
  - `pay-later`
- Add attachment kind values:
  - `artwork`
  - `payment-proof`

### 2.3 Add Pricing Helpers

- Add helper to calculate area sqft.
- Add helper to calculate per-piece Tarpaulin price.
- Add helper to calculate line total.
- Add helper to format item name like `Tarpaulin 3ft x 6ft`.

### 2.4 Add Client-Side Validation Helpers

- Add helper to validate positive width/height.
- Add helper to validate positive integer quantity.
- Add helper to normalize/display Philippine mobile numbers if practical.
- Keep these helpers pure and reusable.

### 2.5 Verify Phase 2

- Run `pnpm lint` if practical.
- Do not change routes or Convex yet.
- Stop after reporting created helpers and any lint result.

## Phase 3: Showcase CTA Wiring

Goal: Change public showcase CTAs to point toward the future order route, without building the route yet.

### 3.1 Update CTA Text

- In `src/routes/showcase.$service.tsx`, change header CTA text to `Order Now`.
- Change hero CTA text from `Request a quote` to `Order Now`.

### 3.2 Compute Order Links

- Use existing service slug from loader data.
- For `tarpaulins-banners`, route to `/order?service=tarpaulins-banners&step=2`.
- For unsupported services, route to `/order?service=<slug>`.

### 3.3 Replace Mail/Contact Anchors Where Needed

- Replace quote/contact anchors with TanStack `Link` where appropriate.
- Preserve existing styles.
- Preserve `Browse all services` behavior.

### 3.4 Verify Phase 3

- Run `pnpm lint` if practical.
- Do not build the `/order` route in this phase.
- Stop after reporting changed CTA behavior.

## Phase 4: Convex Schema Foundation

Goal: Add schema support for online order data without implementing public submit yet.

### 4.1 Read Convex Guidelines

- Read `convex/_generated/ai/guidelines.md` before editing Convex files.

### 4.2 Extend JO Schema

- In `convex/schema.ts`, add `unconfirmed` to `jo.status`.
- Add optional `source` field to `jo`.
- Add optional `submittedAt` field to `jo`.

### 4.3 Add `onlineOrderDetails` Table

- Add fields for `joId`, customer name, mobile, optional email, optional notes, payment method, payment proof status, attachment upload status, accepted terms, terms accepted timestamp, and submitted timestamp.
- Add index `by_joId`.

### 4.4 Add `onlineOrderItems` Table

- Add fields for `joId`, `itemId`, service slug, product type, dimensions, area, unit price per sqft, artwork option, and optional design instructions.
- Add indexes `by_joId` and `by_itemId`.

### 4.5 Add `orderAttachments` Table

- Add fields for `joId`, optional `itemId`, optional `onlineOrderItemId`, kind, R2 key, filename, MIME type, size, and created timestamp.
- Add indexes `by_joId`, `by_itemId`, and `by_onlineOrderItemId`.

### 4.6 Verify Phase 4

- Run `pnpm lint` if practical.
- Do not edit generated files.
- Stop after reporting schema changes and any type/lint issues.

## Phase 5: Backend Pricing And Validation Helpers

Goal: Add backend-side authoritative helpers before public mutations.

### 5.1 Create Convex Public Order Helper Module

- Add `convex/public/orderHelpers.ts` or similar under `convex/public/`.
- Keep it free of React/frontend imports.

### 5.2 Add Authoritative Pricing Constants

- Define supported service slug `tarpaulins-banners`.
- Define product type `tarpaulin`.
- Define price `20` pesos per sqft.

### 5.3 Add Authoritative Pricing Functions

- Calculate area sqft.
- Calculate per-piece price.
- Calculate line total.
- Format internal item name.

### 5.4 Add Authoritative Validation Functions

- Validate supported service.
- Validate positive decimal width/height.
- Validate positive integer quantity.
- Normalize and validate Philippine mobile number.
- Validate artwork option.
- Validate payment method.

### 5.5 Verify Phase 5

- Run `pnpm lint` if practical.
- Stop before adding mutations.

## Phase 6: Public Order Creation Mutation

Goal: Create unconfirmed JOs and intake rows, without uploads or Telegram yet.

### 6.1 Add `convex/public/orders.ts`

- Use new Convex function syntax.
- Use validators for all args and returns.
- Use public `mutation` for customer submission.
- Keep public order mutations/queries under `convex/public/`.

### 6.2 Implement `createUnconfirmedOrder` Args

- Accept cart items with service slug, dimensions, quantity, artwork option, and optional design instructions.
- Accept contact details.
- Accept payment method and proof status intent.
- Accept required terms boolean.
- Accept honeypot field.

### 6.3 Implement Honeypot Behavior

- If honeypot is filled, return generic fake success.
- Do not create a JO.
- Do not schedule notifications.
- Do not fabricate a realistic JO number.

### 6.4 Implement Server Validation And JO Creation

- Validate supported service and cart shape.
- Validate and normalize mobile.
- Validate required terms checkbox.
- Recalculate all pricing server-side.
- Insert `jo` with `status: "unconfirmed"`, `source: "online-order"`, and `submittedAt`.
- Do not call existing `createJo`.
- Do not create Trello.

### 6.5 Insert Items And Online Order Metadata

- Insert `items` rows with human-readable names, quantities, and per-piece price.
- Insert `onlineOrderDetails`.
- Insert `onlineOrderItems` linked to the created `items`.
- Return `joId`, `joNumber`, item mapping, and estimated total.

### 6.6 Verify Phase 6

- Run `pnpm lint` if practical.
- Stop before upload support.

## Phase 7: Public Order Attachment Metadata

Goal: Add attachment metadata storage and status updates, without signed upload URLs if that needs separate work.

### 7.1 Add Attachment Validators

- Define accepted extensions and MIME types server-side.
- Define max artwork files per item: `5`.
- Define max artwork file size: `25 MB`.
- Define max payment proof files: `1`.

### 7.2 Add Metadata Save Mutation

- Add mutation like `saveOrderAttachment` or `attachOrderFile`.
- Validate `joId`, optional `itemId`, optional `onlineOrderItemId`, kind, key, name, type, and size.
- Insert metadata only for successfully uploaded files.

### 7.3 Enforce Counts Server-Side

- Count existing attachments for the target JO/item/kind.
- Reject beyond max limits.
- Keep payment proof limited to one file per JO.

### 7.4 Add Attachment Status Mutation

- Add mutation to mark `onlineOrderDetails.attachmentUploadStatus`.
- Support statuses such as complete, partial failure, or none.

### 7.5 Verify Phase 7

- Run `pnpm lint` if practical.
- Stop before R2 upload URL work.

## Phase 8: Order-Specific R2 Upload URLs

Goal: Add order-specific upload URL support for public order files.

### 8.1 Inspect R2 Component API

- Re-read `convex/r2.ts`.
- Inspect package docs/code if needed.
- Put order-specific upload functions under `convex/public/uploads.ts` or similar.
- Only update `convex/r2.ts` if the R2 component requires shared setup there.

### 8.2 Add Order Upload URL Function

- Generate upload URLs with an order-specific key prefix.
- Validate file metadata before issuing the URL.
- Do not expose write credentials.

### 8.3 Add Upload Metadata Sync Flow

- Ensure uploaded objects can be synced/recognized by R2 metadata flow.
- Keep public order uploads separate from Drive assumptions.

### 8.4 Verify Phase 8

- Run `pnpm lint` if practical.
- Stop before frontend upload integration.

## Phase 9: Staff Read Queries For Online Order Details

Goal: Make online order metadata available to authenticated staff UI.

### 9.1 Add Authenticated Query

- Add `getOnlineOrderDetails` in `convex/public/orders.ts` or similar under `convex/public/`.
- Use `authedQuery`.
- Accept `joId`.

### 9.2 Return Intake Details

- Return `onlineOrderDetails`.
- Return `onlineOrderItems`.
- Return `orderAttachments`.
- Return `null` if the JO is not an online order or details are missing.

### 9.3 Add Signed Read URL Support

- Add authenticated function to generate signed read URL for an order attachment.
- Verify the attachment exists before generating URL.
- Do not make public file URLs.

### 9.4 Verify Phase 9

- Run `pnpm lint` if practical.
- Stop before staff UI changes.

## Phase 10: Confirm Online Order Backend

Goal: Let staff move online orders from `unconfirmed` to `pending` and create Trello.

### 10.1 Add Confirmation Mutation

- Add authenticated mutation `confirmOnlineOrder`.
- Accept `joId`.
- Validate JO exists.
- Validate `status === "unconfirmed"`.

### 10.2 Patch JO Status

- Set status to `pending`.
- Patch `updatedAt`.

### 10.3 Schedule Trello Creation

- Schedule `internal.trello.createTrelloCard` after confirmation.
- Do not schedule if already confirmed.

### 10.4 Block Printing For Unconfirmed JOs

- Update `markForPrinting` to reject `unconfirmed` JOs.
- Keep existing behavior for pending/in-progress/completed JOs.

### 10.5 Verify Phase 10

- Run `pnpm lint` if practical.
- Stop before frontend staff UI changes.

## Phase 11: Telegram Notification Backend

Goal: Add best-effort Telegram notification, isolated from order creation success.

### 11.1 Add Telegram Action File

- Add `convex/public/telegram.ts` or similar under `convex/public/`.
- Use `internalAction` for the network call.
- Read `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

### 11.2 Implement Missing Env Behavior

- If either env var is missing, skip notification without throwing a blocking error.
- Return/log a skipped status if useful.

### 11.3 Build Message Body

- Include JO number and internal JO link.
- Include customer name, mobile, email if present.
- Include item summary and estimated print total.
- Include artwork status/count.
- Include payment method and proof status.
- Include attachment warning if partial failure.
- Do not include attachment URLs.

### 11.4 Add Trigger Function

- Add mutation/action to send Telegram after attachment attempts.
- It should not block the customer success UI.

### 11.5 Verify Phase 11

- Run `pnpm lint` if practical.
- Stop before frontend submit integration.

## Phase 12: Public Order Route Shell

Goal: Add `/order` route with layout, service selection, and step routing, but no full form submit yet.

### 12.1 Add Route File

- Add `src/routes/order.tsx`.
- Do not edit `src/routeTree.gen.ts` manually.

### 12.2 Add Public Shop Layout

- Reuse `SHOP_THEME` where practical.
- Add DARCYGRAPHiX header.
- Add footer.
- Match public showcase visual language.

### 12.3 Parse Search Params

- Read `service`.
- Read `step`.
- Normalize invalid or missing values in component logic.

### 12.4 Add Step Guard Skeleton

- Missing service shows Step 1 service selection.
- Unsupported service shows coming-soon state.
- Supported service routes to appropriate step.
- Empty cart guards can be placeholders until cart exists.

### 12.5 Verify Phase 12

- Run `pnpm lint` if practical.
- Stop before building detailed step forms.

## Phase 13: Service Selection And Coming-Soon UI

Goal: Finish Step 1 and unsupported service handling.

### 13.1 Render All Services

- Use `SERVICES` from `src/lib/services.ts`.
- Show all service names and blurbs.

### 13.2 Enable Tarpaulins

- Tarpaulins card/button navigates to `/order?service=tarpaulins-banners&step=2`.

### 13.3 Disable Or Mark Unsupported Services

- Show `Coming soon` for unsupported services.
- Direct unsupported URLs should show friendly coming-soon state.

### 13.4 Verify Phase 13

- Run `pnpm lint` if practical.
- Stop before Tarpaulin configurator.

## Phase 14: Local Cart And Draft State

Goal: Add localStorage-backed cart/contact foundations before step forms.

### 14.1 Define Client Cart Types

- Define cart item shape with client id, service slug, product type, dimensions, quantity, pricing snapshot, artwork option, and design instructions.
- Include structure for matching backend item mapping later.

### 14.2 Add Cart LocalStorage Hook Usage

- Use existing `useLocalStorage` or a small wrapper.
- Persist cart metadata only.
- Do not persist `File` objects.

### 14.3 Add Contact Draft LocalStorage

- Persist full name, mobile, email, notes, and payment method.
- Do not persist proof-of-payment file.

### 14.4 Add In-Memory File State

- Keep artwork files keyed by client cart item id.
- Keep payment proof file in memory.

### 14.5 Verify Phase 14

- Run `pnpm lint` if practical.
- Stop before detailed forms.

## Phase 15: Step 2 Tarpaulin Details UI

Goal: Build the Tarpaulin configurator.

### 15.1 Build Inputs

- Width in feet, decimal allowed.
- Height in feet, decimal allowed.
- Quantity, integer only, default `1`, min `1`.

### 15.2 Build Preset Buttons

- Add `2x3`, `3x4`, `3x6`, `4x6`, `4x8`.
- Clicking fills width and height.

### 15.3 Show Live Estimate

- Show area sqft.
- Show price per sqft.
- Show per-piece price.
- Show quantity.
- Show line total.

### 15.4 Navigate To Step 3

- Validate width, height, and quantity.
- Save one active draft item.
- Update URL to `step=3`.

### 15.5 Verify Phase 15

- Run `pnpm lint` if practical.
- Stop before artwork step.

## Phase 16: Step 3 Artwork And Add-To-Cart UI

Goal: Let users choose artwork/design handling and add item to cart.

### 16.1 Add Artwork Option Selector

- Options: upload now, send later, design requested.

### 16.2 Add Artwork File Picker

- Show only for upload now.
- Client-validate count, size, and extension/type.
- Store files in memory.

### 16.3 Add Design Instructions

- Show textarea for design requested.
- Add copy that design fees are confirmed by staff.

### 16.4 Add Or Replace Cart Item

- Add new item to cart with a client id.
- If editing an existing item, replace it.
- Navigate to `step=4`.

### 16.5 Verify Phase 16

- Run `pnpm lint` if practical.
- Stop before cart review.

## Phase 17: Step 4 Cart Review UI

Goal: Let users review, edit, remove, and continue.

### 17.1 Render Cart Items

- Show service, dimensions, quantity, artwork option, and line total.

### 17.2 Add Remove Action

- Remove cart item metadata.
- Remove related in-memory files if present.

### 17.3 Add Edit Action

- Load cart item into active draft.
- Navigate to `step=2`.
- Saving later should replace original item.

### 17.4 Add Add Item And Continue Actions

- Add Item navigates to `step=2` for current service.
- Continue navigates to `step=5` only if cart is non-empty.

### 17.5 Verify Phase 17

- Run `pnpm lint` if practical.
- Stop before contact/payment form.

## Phase 18: Step 5 Contact And Payment UI

Goal: Build final form without full backend upload integration yet.

### 18.1 Build Contact Fields

- Required full name.
- Required mobile number.
- Optional email.
- Optional notes/special instructions.

### 18.2 Build Payment Method Fields

- GCash.
- Bank Transfer.
- Pay Later / Confirm with staff.

### 18.3 Build Proof Upload Input

- Required for GCash and Bank Transfer.
- Not required for Pay Later.
- Keep file in memory.
- Validate client-side.

### 18.4 Add Terms Checkbox And Honeypot

- Add required order request confirmation checkbox.
- Add hidden honeypot field.
- Button label: `Submit Order Request`.

### 18.5 Verify Phase 18

- Run `pnpm lint` if practical.
- Stop before final submit integration.

## Phase 19: Submit Integration Without Attachments

Goal: Submit the cart/contact payload and show confirmation, but skip file uploads for this phase.

### 19.1 Add Submit Handler Validation

- Validate cart non-empty.
- Validate required contact fields.
- Validate mobile format.
- Validate payment proof requirement at UI level, but do not upload yet.
- Validate terms checkbox.

### 19.2 Call `createUnconfirmedOrder`

- Send cart metadata, contact details, payment method, proof status intent, terms accepted, and honeypot.

### 19.3 Handle Fake Honeypot Success

- Show generic received message without JO number.
- Do not attempt uploads or Telegram.

### 19.4 Show Real Confirmation

- Show `Job Order #<joNumber>`.
- Show estimated print total.
- Show customer-facing confirmation copy.
- Clear localStorage cart/contact after JO creation succeeds.

### 19.5 Verify Phase 19

- Run `pnpm lint` if practical.
- Stop before attachment upload integration.

## Phase 20: Frontend Attachment Upload Integration

Goal: Upload artwork and proof files after JO creation, then save metadata.

### 20.1 Map Client Items To Backend Items

- Use item mapping returned from `createUnconfirmedOrder`.
- Match client cart item ids to created `itemId` and `onlineOrderItemId`.

### 20.2 Upload Artwork Files

- Request order-specific upload URL for each selected artwork file.
- Upload with XHR or existing upload pattern.
- Save attachment metadata after each successful upload.
- Track failures.

### 20.3 Upload Payment Proof

- Use same flow with `kind: "payment-proof"`.
- Save metadata after successful upload.
- Track failure.

### 20.4 Mark Attachment Status

- If all expected files upload, mark complete.
- If some fail, mark partial failure.
- If no files expected, mark none/no attachments.

### 20.5 Update Confirmation Copy

- If partial failure, tell customer order was received but some files may need to be resent.

### 20.6 Verify Phase 20

- Run `pnpm lint` if practical.
- Stop before Telegram frontend/backend trigger integration if not already done.

## Phase 21: Telegram Trigger Integration

Goal: Send Telegram notification after order creation and attachment attempt.

### 21.1 Add Frontend Or Backend Trigger Call

- Trigger Telegram after attachment status is known.
- If no attachments are involved, trigger after JO creation.

### 21.2 Handle Failure Non-Blocking

- Do not block success UI if Telegram fails.
- Do not delete or modify the JO on Telegram failure.

### 21.3 Verify Message Content

- Ensure message has JO number, internal link, contact details, item summary, estimated total, artwork/payment statuses, and warnings.
- Ensure it has no attachment URLs.

### 21.4 Verify Phase 21

- Run `pnpm lint` if practical.
- Stop before staff UI changes.

## Phase 22: Staff JO List Updates

Goal: Make unconfirmed online orders visible and understandable in the JO list.

### 22.1 Update Types/Rendering For New Status

- Ensure `unconfirmed` status does not break list rendering.

### 22.2 Add Unconfirmed Badge

- Show a clear `Unconfirmed` badge/status when `jo.status === "unconfirmed"`.

### 22.3 Add Online Source Indicator If Useful

- If `jo.source === "online-order"`, optionally show an `Online` badge.

### 22.4 Avoid Confirm Action In List

- Do not add a list-level confirm button.
- Row navigation should remain the path to review details.

### 22.5 Verify Phase 22

- Run `pnpm lint` if practical.
- Stop before JO detail staff UI.

## Phase 23: Staff JO Detail Confirmation UI

Goal: Let staff confirm online orders from the JO detail page.

### 23.1 Update Header Status Display

- Show `Unconfirmed` status for `jo.status === "unconfirmed"`.
- Keep existing payment badges understandable.

### 23.2 Add Confirm Order Button

- Show only when `jo.status === "unconfirmed"` and `jo.source === "online-order"`.
- Place in JO detail header actions.

### 23.3 Wire Confirmation Mutation

- Call `confirmOnlineOrder`.
- Show success/error feedback if project conventions support it.
- Ensure UI refreshes after confirmation.

### 23.4 Fix Missing Pickup Date Rendering

- Online orders may not have pickup date/time.
- Render `N/A` instead of invalid dates.

### 23.5 Verify Phase 23

- Run `pnpm lint` if practical.
- Stop before online order detail card.

## Phase 24: Staff Online Order Details Card

Goal: Show original customer-submitted details and attachments on JO detail page.

### 24.1 Add Details Query To JO Detail Page

- Fetch online order details for `jo.source === "online-order"`.
- Avoid fetching/showing for normal internal JOs if practical.

### 24.2 Render Read-Only Details Card

- Customer contact details.
- Submitted timestamp.
- Original dimensions and item details.
- Artwork option and design instructions.
- Payment method/proof status.
- Notes/special instructions.
- Attachment warning if partial failure.

### 24.3 Render Attachments

- Show filename, type, size, and kind.
- Provide view/download action.

### 24.4 Wire Signed Read URL Action

- On click, request signed read URL.
- Open/download the returned URL.
- Do not expose permanent raw R2 URLs.

### 24.5 Hide Terms Acceptance

- Do not show terms metadata in the staff UI.

### 24.6 Verify Phase 24

- Run `pnpm lint` if practical.
- Stop before final workflow hardening.

## Phase 25: Workflow Hardening

Goal: Close holes in existing workflows introduced by `unconfirmed` orders.

### 25.1 Confirm Internal JO Behavior

- Internal/manual JOs still start as `pending`.
- Internal/manual JOs still create Trello immediately.

### 25.2 Confirm Public JO Behavior

- Public orders start as `unconfirmed`.
- Public orders do not create Trello until confirmed.

### 25.3 Confirm Printing Guard

- `markForPrinting` rejects unconfirmed JOs server-side.
- UI should not encourage printing unconfirmed orders.

### 25.4 Confirm Deletion Behavior

- Existing JO delete still works.
- Decide whether online order metadata is deleted with JO or retained.
- Do not delete R2 objects unless a safe cleanup path exists.

### 25.5 Verify Phase 25

- Run `pnpm lint` if practical.
- Run `pnpm build` if reasonable.
- Do not run dev servers.

## Phase 26: Final Verification And Polish

Goal: End-to-end code review and final fixes.

### 26.1 Verify Public Route Cases

- `/order` shows service selection.
- `/order?service=tarpaulins-banners&step=2` shows Tarpaulin details.
- Unsupported service shows coming-soon state.
- Invalid steps are guarded.
- Empty cart cannot proceed to review/contact.

### 26.2 Verify Submit Cases

- Valid Pay Later order creates unconfirmed JO.
- GCash/Bank Transfer require proof file in UI.
- Honeypot fake success creates no JO.
- Attachment partial failure still confirms order received.

### 26.3 Verify Staff Cases

- Online order appears in JO list.
- JO detail shows confirm button.
- Confirm moves status to pending and schedules Trello.
- Online details card appears only for online orders.
- Attachments require signed URLs.

### 26.4 Run Final Checks

- Run `pnpm lint`.
- Run `pnpm build` if practical.
- Do not run `pnpm check`.
- Do not run `pnpm dev` or `convex dev`.

### 26.5 Report Remaining Risks

- Report any skipped checks.
- Report any generated Convex type/codegen limitations.
- Report any incomplete external setup such as Telegram env vars.

## Suggested Prompt Pattern

Use prompts like:

```text
Execute Phase 4 from STEPPED_PUBLIC_ORDER_PLAN.md only. Stop after Phase 4 verification and report what changed.
```

```text
Execute Phase 15 from STEPPED_PUBLIC_ORDER_PLAN.md only. Do not start Phase 16.
```

## Potential Edge Cases Reference

- User opens `/order?step=4` with no service selected.
- User opens `/order?service=tarpaulins-banners&step=5` with empty cart.
- User opens unsupported service directly, e.g. `/order?service=led-neon-signs`.
- User changes URL step manually while active draft is incomplete.
- User refreshes after selecting files; file selections are lost.
- User refreshes after cart/contact draft; cart/contact should restore.
- User has stale localStorage cart from an older pricing/version.
- User submits the same order twice by double-clicking submit.
- JO is created but attachment upload fails.
- Some attachments upload and others fail.
- Attachment upload succeeds but metadata save fails.
- Metadata saves but Telegram fails.
- Telegram env vars are missing in production.
- Trello card creation fails when staff confirms.
- Staff confirms an order already confirmed in another tab.
- Staff deletes an unconfirmed JO after customer has seen a JO number.
- Customer enters dimensions with many decimal places.
- Customer enters very large dimensions or quantity causing unrealistic totals.
- Customer uploads unsupported file with spoofed MIME type.
- Customer uploads huge file despite client-side validation.
- Customer selects GCash/Bank Transfer but removes proof before submit.
- Customer chooses design-requested and uploads files anyway.
- Customer adds multiple cart items with different artwork states.
- Editing cart item loses in-memory file references after refresh.
- Existing JO detail UI assumes `pickupDate` exists; online orders may not have it.
- Existing list/detail screens may not render `unconfirmed` status unless updated everywhere.
- Existing `forPrinting` mutation can mark unconfirmed orders unless blocked.
- Existing Trello creation is scheduled inside `createJo`; public creation must avoid that path.
- Signed attachment URLs expire while staff is viewing the page.
- Telegram internal JO link must use the correct production base URL.
- Public route should work on mobile with long filenames and multi-step navigation.
- LocalStorage may be unavailable or full.
- User submits with email omitted, which is valid.
- User submits with mobile in valid but differently formatted PH format.
- Customer sees "estimated total" but final staff quote differs due to design/finishing/delivery.
- Browser back button may return to an invalid step after cart is cleared post-submit.
- Service names/slugs may change later, affecting saved cart items.
- Public order tables preserve original customer intent while staff edits operational items, so differences must be understandable.
