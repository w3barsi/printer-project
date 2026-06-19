# Public Order Plan

Build a public `/order` flow connected from service showcase pages. It creates `unconfirmed` Job Orders, stores customer intake metadata separately, supports Tarpaulin ordering first, saves cart/contact drafts locally, uploads order attachments to R2 through order-specific APIs, and notifies staff through Telegram when configured.

## Public Showcase Changes

- In `src/routes/showcase.$service.tsx`, change both showcase CTAs to `Order Now`.
- Supported service link: `/order?service=tarpaulins-banners&step=2`.
- Unsupported service link: `/order?service=<slug>`.
- The order page handles unsupported services with a coming-soon/contact state.

## Order Route

Create a customer-facing route:

- `/order`
- `/order?service=tarpaulins-banners&step=2`
- `/order?service=tarpaulins-banners&step=3`
- `/order?service=tarpaulins-banners&step=4`
- `/order?service=tarpaulins-banners&step=5`

Step behavior:

- Step 1: Service selection when `?service=` is missing.
- Step 2: Tarpaulin details.
- Step 3: Artwork/design option.
- Step 4: Cart review.
- Step 5: Contact/payment details and submit.

Use query param `step` for browser back/forward and refresh recovery, but guard invalid navigation based on current state.

## Supported Service MVP

Only `tarpaulins-banners` is orderable initially.

Tarpaulin Step 2:

- Show default price: `PHP 20 / sq ft`.
- Presets: `2x3`, `3x4`, `3x6`, `4x6`, `4x8`.
- Clicking preset fills width/height fields.
- Width/height are in feet and allow decimals.
- Quantity defaults to `1`, minimum `1`, whole numbers only.
- Show live estimated line total: `width x height x PHP 20 x quantity`.

## Cart Behavior

- Cart supports multiple items structurally, even though only Tarpaulin is implemented.
- Store cart items in `localStorage`.
- Store contact draft in `localStorage`.
- Do not store actual `File` objects in `localStorage`.
- Clear submitted cart/contact draft after JO creation succeeds.
- Allow edit/remove cart items on Step 4.
- Editing replaces the original cart item.
- Only one active item draft exists at a time.

## Artwork Step

Each cart item has its own artwork state.

Artwork options:

- `upload-now`
- `send-later`
- `design-requested`

If `design-requested`, show optional design instructions.

Artwork is optional. Customers may ask the company to design it.

Design fees are not auto-priced. Show copy that design fees, if any, will be confirmed by staff.

## Contact And Payment Step

Required fields:

- Full Name
- Mobile Number

Optional fields:

- Email
- Notes/Special Instructions

Payment method options:

- GCash
- Bank Transfer
- Pay Later / Confirm with staff

Proof of payment:

- Required only for GCash or Bank Transfer.
- Optional/not shown as required for Pay Later.

Final checkbox:

- Required confirmation checkbox explaining this is an order request and production starts after staff confirmation.
- Submit button label: `Submit Order Request`.

## Customer Confirmation

After successful JO creation, show a confirmation state/page section:

- "Order request received. Our team will contact you to confirm details before production."
- Show `Job Order #<joNumber>`.
- Show estimated print total, not "amount due".
- If attachment uploads partially failed, say the order was received but some files may need to be resent.

No automated SMS/email for MVP.

## Backend Data Model

Update `jo`:

- Add status literal: `unconfirmed`.
- Add optional `source`, with online orders using `source: "online-order"`.
- Add optional `submittedAt`.

Existing internal/manual JOs remain `pending`.

Add separate intake tables:

- `onlineOrderDetails`
- `onlineOrderItems`
- `orderAttachments`

`onlineOrderDetails` linked by `joId`:

- Customer name
- Mobile
- Email
- Notes
- Payment method
- Proof/payment status
- Attachment upload status
- Accepted order terms boolean
- Terms accepted timestamp
- Submitted timestamp

`onlineOrderItems` linked by `joId` and `itemId`:

- Service slug
- Product type
- Width feet
- Height feet
- Area sqft
- Unit price per sqft
- Artwork option
- Design instructions

`orderAttachments`:

- `joId`
- Optional `itemId`
- Optional `onlineOrderItemId`
- `kind: "artwork" | "payment-proof"`
- R2 key
- Filename
- MIME type
- Size
- Created timestamp

Terms data is stored for audit only and not shown in staff UI.

## Public Order Creation Flow

Use a two-phase or three-phase flow:

1. `createUnconfirmedOrder`
   - Validate payload server-side.
   - Check honeypot.
   - Normalize mobile number.
   - Recalculate pricing server-side.
   - Create `jo` with `status: "unconfirmed"`.
   - Create `items`.
   - Create `onlineOrderDetails`.
   - Create `onlineOrderItems`.
   - Do not create Trello card.
2. Upload attachments through order-specific R2 upload functions.
   - Save metadata only after successful upload.
   - If some fail, keep the JO and mark attachment status as partial failure.
3. Send Telegram notification.
   - Best effort only.
   - Missing Telegram env vars should skip notification, not fail order creation.
   - Failure should not delete or block the JO.

No Convex rate limiter for MVP. Keep honeypot only.

## Pricing

Hardcode Tarpaulin MVP pricing:

- `PHP 20 / sqft`

Frontend uses this for estimates.

Backend recalculates authoritative item price on submit.

For existing `items` table:

- `items.price` stores price per single tarpaulin.
- `items.quantity` stores quantity.
- Existing total logic `quantity * price` continues working.

Example:

- `3ft x 6ft x PHP 20 = PHP 360`
- If quantity `2`, total is `2 x PHP 360`.

Item name should be human-readable:

- `Tarpaulin 3ft x 6ft`

Structured details live in `onlineOrderItems`.

## Uploads

Do not reuse the current generic Drive R2 upload API for public order uploads.

Add order-specific upload functions with validation.

MVP limits:

- Artwork: max `5` files per item.
- Artwork file size: max `25 MB` per file.
- Payment proof: max `1` file.
- Accepted types: `jpg`, `jpeg`, `png`, `pdf`, `psd`, `ai`, `eps`, `svg`, `zip`, `rar`.

Validate both client-side and server-side.

Staff file access:

- Files visible from JO detail page.
- Generate signed read URLs for authenticated staff.
- Telegram should not contain file links.

## Telegram Notification

Use Telegram, not Viber.

Send after JO creation and attachment attempt.

Message includes:

- Job Order number
- Internal JO link
- Customer name
- Mobile
- Email if present
- Item summary
- Estimated print total
- Artwork status/count
- Payment method
- Payment proof status
- Attachment warning if partial failure

Do not include attachment URLs.

Telegram is conditional on env vars:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

## Staff Workflow

Online orders appear in existing JO list immediately.

JO list:

- Show `Unconfirmed` badge/status for online orders.
- Do not provide confirm action in the list.

JO detail page:

- Show `Confirm Order` action in the header for `unconfirmed` online orders.
- Confirmation changes status from `unconfirmed` to `pending`.
- Confirmation creates the Trello card.
- Staff can review/edit operational JO/items separately.

Trello:

- Internal/manual JOs still create Trello as currently.
- Online orders do not create Trello until confirmed.

For printing:

- `unconfirmed` JOs should not be markable/usable for printing until confirmed.
- Enforce in UI and preferably server-side.

## Internal JO Detail UI

For online orders only, show read-only `Online Order Details` card:

- Customer contact details
- Submitted timestamp
- Original submitted item dimensions/details
- Artwork option/design instructions
- Attachment list/download buttons
- Payment method/proof status
- Notes/special instructions
- Attachment warning if partial failure

Hide this card for normal internal JOs.

Do not show terms acceptance details in the staff UI.

## Validation Rules

Client and server validation:

- Supported service must be `tarpaulins-banners`.
- Width/height must be positive decimals.
- Quantity must be positive integer.
- Mobile number must be Philippine format: `09XXXXXXXXX` or `+639XXXXXXXXX`.
- Normalize mobile server-side.
- Required contact fields must be present.
- Required payment proof if GCash/Bank Transfer.
- Required confirmation checkbox.
- Honeypot must be empty.

## Potential Edge Cases

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
