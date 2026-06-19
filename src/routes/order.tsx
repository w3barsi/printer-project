import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAction, useMutation } from "convex/react";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  FileUpIcon,
  PencilIcon,
  PlusIcon,
  ShoppingBagIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  ARTWORK_OPTIONS,
  PAYMENT_METHODS,
  PUBLIC_ORDER_PRODUCT_TYPE,
  PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG,
  TARPAULIN_PRICE_PER_SQFT,
  TARPAULIN_SIZE_PRESETS,
  type ArtworkOption,
  type PaymentMethod,
  calculatePublicOrderLineTotal,
  calculateTarpaulinAreaSqft,
  calculateTarpaulinPiecePrice,
  formatTarpaulinItemName,
  getPublicOrderHref,
  isPositiveDimension,
  isPositiveIntegerQuantity,
  isValidPhilippineMobile,
} from "@/lib/public-order";
import { SERVICES, SHOP_THEME, getServiceBySlug } from "@/lib/services";

export const Route = createFileRoute("/order")({
  component: PublicOrderRoute,
  head: () => ({
    meta: [
      { title: "Order Online | DARCYGRAPHiX" },
      {
        name: "description",
        content: "Start an online print order request with DARCYGRAPHiX.",
      },
    ],
  }),
});

type OrderStep = 1 | 2 | 3 | 4 | 5;

type PublicOrderCartItem = {
  id: string;
  serviceSlug: string;
  productType: typeof PUBLIC_ORDER_PRODUCT_TYPE;
  width: number;
  height: number;
  quantity: number;
  areaSqft: number;
  piecePrice: number;
  lineTotal: number;
  artworkOption: ArtworkOption;
  designInstructions?: string;
};

type ContactDraft = {
  name: string;
  mobile: string;
  email: string;
  notes: string;
  paymentMethod: PaymentMethod;
  acceptedTerms: boolean;
  honeypot: string;
};

type ItemDraft = {
  editingId: string | null;
  width: string;
  height: string;
  quantity: string;
  artworkOption: ArtworkOption;
  designInstructions: string;
};

type SubmittedOrder = {
  joNumber: number | null;
  estimatedTotal: number;
  attachmentStatus: "none" | "complete" | "partial-failure";
  telegramStatus: "sent" | "skipped";
  honeypot: boolean;
};

type AttachmentKind = "artwork" | "payment-proof";

const emptyContactDraft: ContactDraft = {
  name: "",
  mobile: "",
  email: "",
  notes: "",
  paymentMethod: "pay-later",
  acceptedTerms: false,
  honeypot: "",
};

const emptyItemDraft: ItemDraft = {
  editingId: null,
  width: "3",
  height: "6",
  quantity: "1",
  artworkOption: "send-later",
  designInstructions: "",
};

const acceptedUploadExtensions = ".pdf,.jpg,.jpeg,.png,.webp";
const maxArtworkFilesPerItem = 5;
const maxFileSize = 25 * 1024 * 1024;

function PublicOrderRoute() {
  const locationSearch = useSyncExternalStore(
    subscribeToLocationSearch,
    getLocationSearchSnapshot,
    getServerLocationSearchSnapshot,
  );
  const search = getOrderSearch(locationSearch);
  const [cart, setCart] = useLocalStorage<PublicOrderCartItem[]>(
    "dg-public-order-cart",
    [],
  );
  const [contactDraft, setContactDraft] = useLocalStorage<ContactDraft>(
    "dg-public-order-contact",
    emptyContactDraft,
  );
  const [itemDraft, setItemDraft] = useState<ItemDraft>(emptyItemDraft);
  const [artworkFiles, setArtworkFiles] = useState<Record<string, File[]>>({});
  const [draftArtworkFiles, setDraftArtworkFiles] = useState<File[]>([]);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrder | null>(null);
  const createUnconfirmedOrder = useMutation(api.public.orders.createUnconfirmedOrder);
  const generateOrderUploadUrl = useMutation(api.public.uploads.generateOrderUploadUrl);
  const saveOrderAttachment = useMutation(api.public.orders.saveOrderAttachment);
  const markAttachmentUploadStatus = useMutation(
    api.public.orders.markAttachmentUploadStatus,
  );
  const syncOrderUploadMetadata = useAction(api.public.uploads.syncOrderUploadMetadata);
  const sendOrderTelegramNotification = useAction(
    api.public.telegram.sendOrderTelegramNotification,
  );

  const requestedService = search.service;
  const selectedService = requestedService
    ? getServiceBySlug(requestedService)
    : undefined;
  const isSupportedService = requestedService === PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG;
  const currentStep = normalizeStep(search.step, requestedService, cart.length);
  const cartTotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  function navigateOrder(next: { service?: string; step?: OrderStep }) {
    const params = new URLSearchParams();
    if (next.service) params.set("service", next.service);
    if (next.step) params.set("step", String(next.step));

    const nextSearch = `?${params.toString()}`;
    window.history.pushState(null, "", `/order${nextSearch}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    setFormError(null);
  }

  function updateItemDraft(patch: Partial<ItemDraft>) {
    setItemDraft((draft) => ({ ...draft, ...patch }));
    setFormError(null);
  }

  function handleDetailsNext() {
    const width = Number(itemDraft.width);
    const height = Number(itemDraft.height);
    const quantity = Number(itemDraft.quantity);

    if (!isPositiveDimension(width) || !isPositiveDimension(height)) {
      setFormError("Enter a width and height greater than 0.");
      return;
    }

    if (!isPositiveIntegerQuantity(quantity)) {
      setFormError("Quantity must be a whole number greater than 0.");
      return;
    }

    navigateOrder({ service: PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG, step: 3 });
  }

  function handleArtworkFiles(files: FileList | null) {
    if (!files) return;
    const nextFiles = Array.from(files);
    const invalidFile = nextFiles.find((file) => file.size > maxFileSize);
    if (invalidFile) {
      setFormError("Each file must be 25 MB or smaller.");
      return;
    }

    if (nextFiles.length > maxArtworkFilesPerItem) {
      setFormError("Upload up to 5 artwork files per item.");
      return;
    }

    setDraftArtworkFiles(nextFiles);
    setFormError(null);
  }

  function addDraftToCart() {
    const width = Number(itemDraft.width);
    const height = Number(itemDraft.height);
    const quantity = Number(itemDraft.quantity);

    if (!isPositiveDimension(width) || !isPositiveDimension(height)) {
      setFormError("Enter valid dimensions before adding this item.");
      return;
    }

    if (!isPositiveIntegerQuantity(quantity)) {
      setFormError("Quantity must be a whole number greater than 0.");
      return;
    }

    if (
      itemDraft.artworkOption === "design-requested" &&
      !itemDraft.designInstructions.trim()
    ) {
      setFormError("Add design instructions so staff can quote the design work.");
      return;
    }

    const id = itemDraft.editingId ?? crypto.randomUUID();
    const nextItem: PublicOrderCartItem = {
      id,
      serviceSlug: PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG,
      productType: PUBLIC_ORDER_PRODUCT_TYPE,
      width,
      height,
      quantity,
      areaSqft: calculateTarpaulinAreaSqft(width, height),
      piecePrice: calculateTarpaulinPiecePrice(width, height),
      lineTotal: calculatePublicOrderLineTotal(width, height, quantity),
      artworkOption: itemDraft.artworkOption,
      designInstructions: itemDraft.designInstructions.trim() || undefined,
    };

    setCart((items) => {
      const withoutEditingItem = items.filter((item) => item.id !== id);
      return [...withoutEditingItem, nextItem];
    });
    setArtworkFiles((current) => ({ ...current, [id]: draftArtworkFiles }));
    setDraftArtworkFiles([]);
    setItemDraft(emptyItemDraft);
    navigateOrder({ service: PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG, step: 4 });
  }

  function editCartItem(item: PublicOrderCartItem) {
    setItemDraft({
      editingId: item.id,
      width: String(item.width),
      height: String(item.height),
      quantity: String(item.quantity),
      artworkOption: item.artworkOption,
      designInstructions: item.designInstructions ?? "",
    });
    setDraftArtworkFiles(artworkFiles[item.id] ?? []);
    navigateOrder({ service: PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG, step: 2 });
  }

  function removeCartItem(id: string) {
    setCart((items) => items.filter((item) => item.id !== id));
    setArtworkFiles((current) => {
      const rest = { ...current };
      delete rest[id];
      return rest;
    });
  }

  function updateContactDraft(patch: Partial<ContactDraft>) {
    setContactDraft((draft) => ({ ...draft, ...patch }));
    setFormError(null);
  }

  function handlePaymentProof(file: File | null) {
    if (file && file.size > maxFileSize) {
      setFormError("Payment proof must be 25 MB or smaller.");
      return;
    }

    setPaymentProofFile(file);
    setFormError(null);
  }

  async function submitOrderRequest() {
    if (cart.length === 0) {
      setFormError("Add at least one item before submitting.");
      return;
    }

    if (!contactDraft.name.trim()) {
      setFormError("Full name is required.");
      return;
    }

    if (!isValidPhilippineMobile(contactDraft.mobile)) {
      setFormError("Enter a valid Philippine mobile number.");
      return;
    }

    if (contactDraft.paymentMethod !== "pay-later" && !paymentProofFile) {
      setFormError("Upload payment proof for GCash or bank transfer.");
      return;
    }

    if (!contactDraft.acceptedTerms) {
      setFormError("Confirm the order request terms before submitting.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const created = await createUnconfirmedOrder({
        items: cart.map((item) => ({
          serviceSlug: item.serviceSlug,
          width: item.width,
          height: item.height,
          quantity: item.quantity,
          artworkOption: item.artworkOption,
          designInstructions: item.designInstructions,
        })),
        contact: {
          name: contactDraft.name,
          mobile: contactDraft.mobile,
          email: contactDraft.email.trim() || undefined,
          notes: contactDraft.notes.trim() || undefined,
        },
        paymentMethod: contactDraft.paymentMethod,
        paymentProofStatus:
          contactDraft.paymentMethod === "pay-later" ? "not-required" : "pending-upload",
        acceptedTerms: contactDraft.acceptedTerms,
        honeypot: contactDraft.honeypot,
      });

      if (created.honeypot || !created.joId || !created.joNumber) {
        setSubmittedOrder({
          joNumber: null,
          estimatedTotal: 0,
          attachmentStatus: "none",
          telegramStatus: "skipped",
          honeypot: true,
        });
        setCart([]);
        setContactDraft(emptyContactDraft);
        setArtworkFiles({});
        setPaymentProofFile(null);
        return;
      }

      const uploadResults: boolean[] = [];
      for (const mapping of created.itemMappings) {
        const cartItem = cart[mapping.clientIndex];
        const files = cartItem ? (artworkFiles[cartItem.id] ?? []) : [];

        for (const file of files) {
          uploadResults.push(
            await uploadOrderFile({
              file,
              kind: "artwork",
              joId: created.joId,
              itemId: mapping.itemId,
              onlineOrderItemId: mapping.onlineOrderItemId,
            }),
          );
        }
      }

      if (paymentProofFile) {
        uploadResults.push(
          await uploadOrderFile({
            file: paymentProofFile,
            kind: "payment-proof",
            joId: created.joId,
          }),
        );
      }

      const expectedUploads = uploadResults.length;
      const failedUploads = uploadResults.filter((result) => !result).length;
      const attachmentStatus =
        expectedUploads === 0
          ? "none"
          : failedUploads === 0
            ? "complete"
            : "partial-failure";
      const paymentProofStatus =
        contactDraft.paymentMethod === "pay-later"
          ? "not-required"
          : paymentProofFile && failedUploads === 0
            ? "uploaded"
            : "missing";

      await markAttachmentUploadStatus({
        joId: created.joId,
        status: attachmentStatus,
        paymentProofStatus,
      });

      const telegramResult = await sendOrderTelegramNotification({
        joNumber: created.joNumber,
        joUrl: `${window.location.origin}/app/jo/${created.joId}`,
        customerName: contactDraft.name.trim(),
        mobile: contactDraft.mobile.trim(),
        email: contactDraft.email.trim() || undefined,
        itemSummary: cart
          .map(
            (item) =>
              `${formatTarpaulinItemName(item.width, item.height)} x ${item.quantity}`,
          )
          .join(", "),
        estimatedTotal: created.estimatedTotal,
        artworkSummary: buildArtworkSummary(cart, artworkFiles),
        paymentSummary: `${paymentLabel(contactDraft.paymentMethod)} / ${paymentProofStatus}`,
        attachmentWarning:
          attachmentStatus === "partial-failure"
            ? "Some files failed to upload and may need to be resent."
            : undefined,
      });

      setSubmittedOrder({
        joNumber: created.joNumber,
        estimatedTotal: created.estimatedTotal,
        attachmentStatus,
        telegramStatus: telegramResult.status,
        honeypot: false,
      });
      setCart([]);
      setContactDraft(emptyContactDraft);
      setArtworkFiles({});
      setDraftArtworkFiles([]);
      setPaymentProofFile(null);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not submit order request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function uploadOrderFile({
    file,
    kind,
    joId,
    itemId,
    onlineOrderItemId,
  }: {
    file: File;
    kind: AttachmentKind;
    joId: Id<"jo">;
    itemId?: Id<"items">;
    onlineOrderItemId?: Id<"onlineOrderItems">;
  }) {
    try {
      const { key, url } = await generateOrderUploadUrl({
        joId,
        kind,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      });

      await putFile(url, file);
      await syncOrderUploadMetadata({ key });
      await saveOrderAttachment({
        joId,
        itemId,
        onlineOrderItemId,
        kind,
        key,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      });
      return true;
    } catch {
      return false;
    }
  }

  return (
    <div className="shop shop-grain min-h-screen" style={SHOP_THEME}>
      <header className="relative z-20 mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-10">
        <Link to="/" className="group flex items-center gap-3">
          <img
            src="/DG_SHORT_SVG.svg"
            alt=""
            className="h-10 w-auto rounded-2xl border border-white/80 bg-white p-1.5 shadow-sm md:h-11"
          />
          <img src="/DG_Long.png" alt="DARCYGRAPHiX" className="h-8 w-auto md:h-9" />
        </Link>
        <a
          href="/#services"
          className="shop-link-underline text-sm font-bold text-(--shop-red)"
        >
          Services
        </a>
      </header>

      <main className="relative z-10 mx-auto max-w-[1400px] px-6 pb-24 md:px-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-(--shop-line) bg-(--shop-panel) p-7 shadow-[0_24px_60px_rgba(139,39,32,0.10)] md:p-10">
          <div className="shop-halftone pointer-events-none absolute inset-0 opacity-20" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(225,38,28,0.16),transparent_38%),radial-gradient(circle_at_88%_18%,rgba(214,60,50,0.12),transparent_34%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <span className="shop-eyebrow !tracking-[0.2em] !text-(--shop-red)">
                Online order desk
              </span>
              <h1 className="shop-font-display mt-4 max-w-3xl text-[clamp(2.4rem,7vw,5.4rem)] leading-[0.92]">
                Start your print request
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-(--shop-ink-dim) md:text-lg">
                Configure tarpaulin sizes, attach artwork notes, and send the details for
                staff confirmation before production.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-(--shop-line) bg-white/55 p-5">
              <StepRail step={currentStep} cartCount={cart.length} total={cartTotal} />
            </div>
          </div>
        </section>

        {formError ? (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-700">
            {formError}
          </div>
        ) : null}

        <div className="mt-8">
          {submittedOrder ? (
            <OrderConfirmation order={submittedOrder} />
          ) : !requestedService ? (
            <ServiceSelection />
          ) : !isSupportedService ? (
            <ComingSoon serviceName={selectedService?.name ?? "This service"} />
          ) : currentStep === 2 ? (
            <TarpaulinDetailsStep
              draft={itemDraft}
              updateDraft={updateItemDraft}
              onNext={handleDetailsNext}
            />
          ) : currentStep === 3 ? (
            <ArtworkStep
              draft={itemDraft}
              files={draftArtworkFiles}
              updateDraft={updateItemDraft}
              onFilesChange={handleArtworkFiles}
              onBack={() =>
                navigateOrder({ service: PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG, step: 2 })
              }
              onAdd={addDraftToCart}
            />
          ) : currentStep === 4 ? (
            <CartReviewStep
              cart={cart}
              artworkFiles={artworkFiles}
              total={cartTotal}
              onEdit={editCartItem}
              onRemove={removeCartItem}
              onAddItem={() => {
                setItemDraft(emptyItemDraft);
                setDraftArtworkFiles([]);
                navigateOrder({ service: PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG, step: 2 });
              }}
              onContinue={() =>
                navigateOrder({ service: PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG, step: 5 })
              }
            />
          ) : (
            <ContactPaymentStep
              draft={contactDraft}
              cartTotal={cartTotal}
              paymentProofFile={paymentProofFile}
              isSubmitting={isSubmitting}
              updateDraft={updateContactDraft}
              onPaymentProof={handlePaymentProof}
              onBack={() =>
                navigateOrder({ service: PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG, step: 4 })
              }
              onSubmit={submitOrderRequest}
            />
          )}
        </div>
      </main>

      <footer className="relative z-10 bg-(--shop-bg) px-6 py-10 md:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 text-xs text-(--shop-ink-mute) md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} DARCYGRAPHiX Advertising.</span>
          <span>Orders are confirmed by staff before production.</span>
        </div>
      </footer>
    </div>
  );
}

function StepRail({
  step,
  cartCount,
  total,
}: {
  step: OrderStep;
  cartCount: number;
  total: number;
}) {
  const steps = ["Service", "Size", "Artwork", "Cart", "Contact"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="shop-eyebrow !text-[0.65rem] !tracking-[0.22em] text-(--shop-ink-mute)">
          Step {step} of 5
        </p>
        <p className="rounded-full bg-(--shop-red) px-3 py-1 text-xs font-black text-white">
          {cartCount} item{cartCount === 1 ? "" : "s"} · {formatCurrency(total)}
        </p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {steps.map((label, index) => {
          const number = index + 1;
          const active = number <= step;
          return (
            <div key={label} className="min-w-0">
              <div
                className={`h-2 rounded-full ${active ? "bg-(--shop-red)" : "bg-(--shop-line-2)"}`}
              />
              <p className="mt-2 truncate text-[0.65rem] font-bold text-(--shop-ink-dim)">
                {label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServiceSelection() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {SERVICES.map((service) => {
        const supported = service.slug === PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG;
        const Icon = service.icon;
        return (
          <a
            key={service.slug}
            href={getPublicOrderHref(service.slug)}
            className="group relative overflow-hidden rounded-[1.75rem] border border-(--shop-line) bg-(--shop-panel) p-6 shadow-[0_18px_50px_rgba(139,39,32,0.07)] transition hover:-translate-y-0.5 hover:border-[rgba(225,38,28,0.36)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-(--shop-line-2) bg-[#ffe5df] text-(--shop-red)">
                <Icon className="size-6" />
              </div>
              <span className="shop-eyebrow !text-[0.62rem] !tracking-[0.24em] text-(--shop-ink-mute)">
                {supported ? "Orderable" : "Coming soon"}
              </span>
            </div>
            <h2 className="shop-font-wide mt-5 text-lg font-black">{service.name}</h2>
            <p className="mt-3 text-sm leading-relaxed text-(--shop-ink-dim)">
              {service.blurb}
            </p>
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-black text-(--shop-red)">
              {supported ? "Start order" : "Ask about availability"}
              <ArrowRightIcon className="size-4 transition group-hover:translate-x-1" />
            </p>
          </a>
        );
      })}
    </section>
  );
}

function ComingSoon({ serviceName }: { serviceName: string }) {
  return (
    <section className="rounded-[2rem] border border-(--shop-line) bg-(--shop-panel) p-8 text-center shadow-[0_18px_50px_rgba(139,39,32,0.07)]">
      <SparklesIcon className="mx-auto size-10 text-(--shop-red)" />
      <h2 className="shop-font-display mt-4 text-4xl">
        {serviceName} orders are coming soon
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-(--shop-ink-dim)">
        Online ordering starts with tarpaulins first. For this service, contact the shop
        and staff will help you quote it manually.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a href="/#contact" className="shop-btn shop-btn-primary !rounded-full">
          Contact staff
        </a>
        <a
          href={getPublicOrderHref(PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG)}
          className="shop-btn shop-btn-ghost !rounded-full"
        >
          Order tarpaulin
        </a>
      </div>
    </section>
  );
}

function OrderConfirmation({ order }: { order: SubmittedOrder }) {
  return (
    <section className="rounded-[2rem] border border-(--shop-line) bg-(--shop-panel) p-8 text-center shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-10">
      <CheckCircle2Icon className="mx-auto size-12 text-(--shop-red)" />
      <h2 className="shop-font-display mt-4 text-5xl">Order request received</h2>
      {order.honeypot ? (
        <p className="mx-auto mt-4 max-w-xl text-(--shop-ink-dim)">
          Thanks. Your request has been received and will be reviewed by staff.
        </p>
      ) : (
        <div className="mx-auto mt-6 max-w-2xl space-y-4">
          <p className="text-lg text-(--shop-ink-dim)">
            Staff will confirm details, payment, artwork, and production schedule before
            printing.
          </p>
          <div className="grid gap-3 rounded-[1.5rem] border border-(--shop-line) bg-white/55 p-5 text-left sm:grid-cols-3">
            <SummaryPill label="Job Order" value={`#${order.joNumber}`} />
            <SummaryPill
              label="Print Estimate"
              value={formatCurrency(order.estimatedTotal)}
            />
            <SummaryPill
              label="Files"
              value={attachmentStatusLabel(order.attachmentStatus)}
            />
          </div>
          {order.attachmentStatus === "partial-failure" ? (
            <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700">
              Some files did not upload. Your order was still created; staff may ask you
              to resend files.
            </p>
          ) : null}
        </div>
      )}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <a
          href={getPublicOrderHref(PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG)}
          className="shop-btn shop-btn-primary !rounded-full"
        >
          Start another order
        </a>
        <Link to="/" className="shop-btn shop-btn-ghost !rounded-full">
          Back to home
        </Link>
      </div>
    </section>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black tracking-[0.18em] text-(--shop-ink-mute) uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-black text-(--shop-ink)">{value}</p>
    </div>
  );
}

function TarpaulinDetailsStep({
  draft,
  updateDraft,
  onNext,
}: {
  draft: ItemDraft;
  updateDraft: (patch: Partial<ItemDraft>) => void;
  onNext: () => void;
}) {
  const width = Number(draft.width);
  const height = Number(draft.height);
  const quantity = Number(draft.quantity);
  const hasValidEstimate =
    isPositiveDimension(width) &&
    isPositiveDimension(height) &&
    isPositiveIntegerQuantity(quantity);

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_0.75fr]">
      <div className="rounded-[2rem] border border-(--shop-line) bg-(--shop-panel) p-6 shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-8">
        <h2 className="shop-font-display text-4xl">Tarpaulin size</h2>
        <p className="mt-3 text-sm leading-relaxed text-(--shop-ink-dim)">
          Use feet for width and height. Decimals are allowed for custom sizes.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-5">
          {TARPAULIN_SIZE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="rounded-2xl border border-(--shop-line-2) bg-[#ffe5df] px-4 py-3 text-sm font-black text-(--shop-red) transition hover:bg-white"
              onClick={() =>
                updateDraft({
                  width: String(preset.width),
                  height: String(preset.height),
                })
              }
            >
              {preset.label} ft
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Field label="Width (ft)">
            <input
              className={inputClassName}
              inputMode="decimal"
              value={draft.width}
              onChange={(event) => updateDraft({ width: event.target.value })}
            />
          </Field>
          <Field label="Height (ft)">
            <input
              className={inputClassName}
              inputMode="decimal"
              value={draft.height}
              onChange={(event) => updateDraft({ height: event.target.value })}
            />
          </Field>
          <Field label="Quantity">
            <input
              className={inputClassName}
              inputMode="numeric"
              value={draft.quantity}
              onChange={(event) => updateDraft({ quantity: event.target.value })}
            />
          </Field>
        </div>

        <button
          type="button"
          className="shop-btn shop-btn-primary mt-7 !rounded-full"
          onClick={onNext}
        >
          Continue to artwork <ArrowRightIcon className="size-4" />
        </button>
      </div>

      <EstimateCard
        width={width}
        height={height}
        quantity={quantity}
        active={hasValidEstimate}
      />
    </section>
  );
}

function EstimateCard({
  width,
  height,
  quantity,
  active,
}: {
  width: number;
  height: number;
  quantity: number;
  active: boolean;
}) {
  return (
    <aside className="rounded-[2rem] border border-(--shop-line) bg-(--shop-bg-2) p-6 shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-8">
      <p className="shop-eyebrow !tracking-[0.2em] !text-(--shop-red)">Live estimate</p>
      <h3 className="shop-font-display mt-3 text-4xl">
        {active
          ? formatCurrency(calculatePublicOrderLineTotal(width, height, quantity))
          : "--"}
      </h3>
      <div className="mt-6 space-y-3 text-sm text-(--shop-ink-dim)">
        <SummaryRow
          label="Area"
          value={active ? `${calculateTarpaulinAreaSqft(width, height)} sqft` : "--"}
        />
        <SummaryRow
          label="Rate"
          value={formatCurrency(TARPAULIN_PRICE_PER_SQFT) + " / sqft"}
        />
        <SummaryRow
          label="Per piece"
          value={
            active ? formatCurrency(calculateTarpaulinPiecePrice(width, height)) : "--"
          }
        />
        <SummaryRow label="Quantity" value={active ? String(quantity) : "--"} />
      </div>
    </aside>
  );
}

function ArtworkStep({
  draft,
  files,
  updateDraft,
  onFilesChange,
  onBack,
  onAdd,
}: {
  draft: ItemDraft;
  files: File[];
  updateDraft: (patch: Partial<ItemDraft>) => void;
  onFilesChange: (files: FileList | null) => void;
  onBack: () => void;
  onAdd: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-(--shop-line) bg-(--shop-panel) p-6 shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-8">
      <h2 className="shop-font-display text-4xl">Artwork handling</h2>
      <p className="mt-3 text-sm leading-relaxed text-(--shop-ink-dim)">
        Tell us whether you have print-ready files or need layout help. Design fees are
        quoted separately by staff.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {ARTWORK_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`rounded-[1.5rem] border p-5 text-left transition ${draft.artworkOption === option ? "border-(--shop-red) bg-[#ffe5df]" : "border-(--shop-line) bg-white/60 hover:bg-white"}`}
            onClick={() => updateDraft({ artworkOption: option })}
          >
            <CheckCircle2Icon className="size-5 text-(--shop-red)" />
            <h3 className="shop-font-wide mt-4 text-sm font-black uppercase">
              {artworkLabel(option)}
            </h3>
            <p className="mt-2 text-sm text-(--shop-ink-dim)">
              {artworkDescription(option)}
            </p>
          </button>
        ))}
      </div>

      {draft.artworkOption === "upload-now" ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-(--shop-line-2) bg-white/50 p-6">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 text-center">
            <FileUpIcon className="size-8 text-(--shop-red)" />
            <span className="font-black">Choose artwork files</span>
            <span className="text-sm text-(--shop-ink-dim)">
              PDF, JPG, PNG, or WEBP. Up to 5 files, 25 MB each.
            </span>
            <input
              className="sr-only"
              type="file"
              multiple
              accept={acceptedUploadExtensions}
              onChange={(event) => onFilesChange(event.target.files)}
            />
          </label>
          {files.length ? (
            <ul className="mt-4 space-y-2 text-sm font-semibold text-(--shop-ink-dim)">
              {files.map((file) => (
                <li key={`${file.name}-${file.size}`}>{file.name}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {draft.artworkOption === "design-requested" ? (
        <Field label="Design instructions" className="mt-6">
          <textarea
            className={`${inputClassName} min-h-32 resize-y`}
            value={draft.designInstructions}
            onChange={(event) => updateDraft({ designInstructions: event.target.value })}
            placeholder="Example: grand opening banner, red and gold, include logo and phone number..."
          />
        </Field>
      ) : null}

      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          className="shop-btn shop-btn-ghost !rounded-full"
          onClick={onBack}
        >
          Back
        </button>
        <button
          type="button"
          className="shop-btn shop-btn-primary !rounded-full"
          onClick={onAdd}
        >
          {draft.editingId ? "Update cart item" : "Add to cart"}{" "}
          <ShoppingBagIcon className="size-4" />
        </button>
      </div>
    </section>
  );
}

function CartReviewStep({
  cart,
  artworkFiles,
  total,
  onEdit,
  onRemove,
  onAddItem,
  onContinue,
}: {
  cart: PublicOrderCartItem[];
  artworkFiles: Record<string, File[]>;
  total: number;
  onEdit: (item: PublicOrderCartItem) => void;
  onRemove: (id: string) => void;
  onAddItem: () => void;
  onContinue: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-(--shop-line) bg-(--shop-panel) p-6 shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="shop-font-display text-4xl">Review cart</h2>
          <p className="mt-3 text-sm text-(--shop-ink-dim)">
            Check sizes and artwork notes before adding contact details.
          </p>
        </div>
        <p className="shop-font-display text-3xl text-(--shop-red)">
          {formatCurrency(total)}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {cart.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-(--shop-line-2) p-8 text-center text-(--shop-ink-dim)">
            No items yet. Add a tarpaulin size to continue.
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="grid gap-4 rounded-[1.5rem] border border-(--shop-line) bg-white/55 p-5 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div>
                <h3 className="shop-font-wide font-black">
                  {formatTarpaulinItemName(item.width, item.height)}
                </h3>
                <p className="mt-2 text-sm text-(--shop-ink-dim)">
                  {item.quantity} pc · {item.areaSqft} sqft each ·{" "}
                  {artworkLabel(item.artworkOption)}
                </p>
                <p className="mt-1 text-xs text-(--shop-ink-mute)">
                  {artworkFiles[item.id]?.length ?? 0} artwork file
                  {(artworkFiles[item.id]?.length ?? 0) === 1 ? "" : "s"} selected
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 md:justify-end">
                <p className="font-mono text-lg font-black">
                  {formatCurrency(item.lineTotal)}
                </p>
                <button
                  type="button"
                  className="rounded-full border border-(--shop-line) p-2 text-(--shop-red)"
                  onClick={() => onEdit(item)}
                  aria-label="Edit item"
                >
                  <PencilIcon className="size-4" />
                </button>
                <button
                  type="button"
                  className="rounded-full border border-(--shop-line) p-2 text-(--shop-red)"
                  onClick={() => onRemove(item.id)}
                  aria-label="Remove item"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          className="shop-btn shop-btn-ghost !rounded-full"
          onClick={onAddItem}
        >
          <PlusIcon className="size-4" /> Add item
        </button>
        <button
          type="button"
          className="shop-btn shop-btn-primary !rounded-full"
          onClick={onContinue}
          disabled={cart.length === 0}
        >
          Continue <ArrowRightIcon className="size-4" />
        </button>
      </div>
    </section>
  );
}

function ContactPaymentStep({
  draft,
  cartTotal,
  paymentProofFile,
  isSubmitting,
  updateDraft,
  onPaymentProof,
  onBack,
  onSubmit,
}: {
  draft: ContactDraft;
  cartTotal: number;
  paymentProofFile: File | null;
  isSubmitting: boolean;
  updateDraft: (patch: Partial<ContactDraft>) => void;
  onPaymentProof: (file: File | null) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const proofRequired = draft.paymentMethod !== "pay-later";

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_0.72fr]">
      <div className="rounded-[2rem] border border-(--shop-line) bg-(--shop-panel) p-6 shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-8">
        <h2 className="shop-font-display text-4xl">Contact and payment</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <input
              className={inputClassName}
              value={draft.name}
              onChange={(event) => updateDraft({ name: event.target.value })}
            />
          </Field>
          <Field label="Mobile number">
            <input
              className={inputClassName}
              value={draft.mobile}
              onChange={(event) => updateDraft({ mobile: event.target.value })}
              placeholder="0917 123 4567"
            />
          </Field>
          <Field label="Email (optional)">
            <input
              className={inputClassName}
              type="email"
              value={draft.email}
              onChange={(event) => updateDraft({ email: event.target.value })}
            />
          </Field>
          <Field label="Payment method">
            <select
              className={inputClassName}
              value={draft.paymentMethod}
              onChange={(event) =>
                updateDraft({ paymentMethod: event.target.value as PaymentMethod })
              }
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {paymentLabel(method)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Notes or special instructions" className="mt-4">
          <textarea
            className={`${inputClassName} min-h-28 resize-y`}
            value={draft.notes}
            onChange={(event) => updateDraft({ notes: event.target.value })}
          />
        </Field>

        <div className="mt-5 rounded-[1.5rem] border border-dashed border-(--shop-line-2) bg-white/50 p-5">
          <label className="flex cursor-pointer flex-col gap-2">
            <span className="font-black">
              Payment proof {proofRequired ? "required" : "optional"}
            </span>
            <span className="text-sm text-(--shop-ink-dim)">
              Keep the file here for Batch G upload integration.
            </span>
            <input
              type="file"
              accept={acceptedUploadExtensions}
              onChange={(event) => onPaymentProof(event.target.files?.[0] ?? null)}
            />
          </label>
          {paymentProofFile ? (
            <p className="mt-2 text-sm font-semibold text-(--shop-red)">
              {paymentProofFile.name}
            </p>
          ) : null}
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-[1.5rem] border border-(--shop-line) bg-white/55 p-4 text-sm text-(--shop-ink-dim)">
          <input
            type="checkbox"
            checked={draft.acceptedTerms}
            onChange={(event) => updateDraft({ acceptedTerms: event.target.checked })}
            className="mt-1"
          />
          <span>
            I understand this submits an order request. Staff will confirm final details,
            artwork, payment, and production schedule.
          </span>
        </label>

        <input
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          value={draft.honeypot}
          onChange={(event) => updateDraft({ honeypot: event.target.value })}
          aria-hidden="true"
        />

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            className="shop-btn shop-btn-ghost !rounded-full"
            onClick={onBack}
          >
            Back
          </button>
          <button
            type="button"
            className="shop-btn shop-btn-primary !rounded-full"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Order Request"}
          </button>
        </div>
      </div>

      <aside className="rounded-[2rem] border border-(--shop-line) bg-(--shop-bg-2) p-6 shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-8">
        <p className="shop-eyebrow !tracking-[0.2em] !text-(--shop-red)">Request total</p>
        <p className="shop-font-display mt-3 text-4xl">{formatCurrency(cartTotal)}</p>
        <p className="mt-4 text-sm leading-relaxed text-(--shop-ink-dim)">
          This is the print estimate only. Design fees, delivery, and special finishing
          are confirmed by staff.
        </p>
      </aside>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-black tracking-[0.18em] text-(--shop-ink-mute) uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-(--shop-line) pb-2">
      <span>{label}</span>
      <span className="font-mono font-black text-(--shop-ink)">{value}</span>
    </div>
  );
}

function getOrderSearch(locationSearch: string) {
  if (typeof window === "undefined") {
    return { service: undefined, step: undefined };
  }

  const params = new URLSearchParams(locationSearch);
  return {
    service: params.get("service") ?? undefined,
    step: params.get("step") ?? undefined,
  };
}

function getLocationSearchSnapshot() {
  return typeof window === "undefined" ? "" : window.location.search;
}

function getServerLocationSearchSnapshot() {
  return "";
}

function subscribeToLocationSearch(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function normalizeStep(
  step: string | undefined,
  service: string | undefined,
  cartCount: number,
): OrderStep {
  if (!service) return 1;
  if (service !== PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG) return 1;

  const parsed = Number(step);
  if (parsed === 3) return 3;
  if (parsed === 4) return 4;
  if (parsed === 5) return cartCount > 0 ? 5 : 4;
  return 2;
}

function artworkLabel(option: ArtworkOption) {
  if (option === "upload-now") return "Upload now";
  if (option === "design-requested") return "Request design";
  return "Send later";
}

function artworkDescription(option: ArtworkOption) {
  if (option === "upload-now") return "Attach print-ready files with this request.";
  if (option === "design-requested") return "Ask staff to quote layout or design help.";
  return "Submit the order now and send artwork through chat later.";
}

function paymentLabel(method: PaymentMethod) {
  if (method === "gcash") return "GCash";
  if (method === "bank-transfer") return "Bank Transfer";
  return "Pay Later / Confirm with staff";
}

function attachmentStatusLabel(status: SubmittedOrder["attachmentStatus"]) {
  if (status === "complete") return "Uploaded";
  if (status === "partial-failure") return "Needs follow-up";
  return "No uploads";
}

function buildArtworkSummary(
  cart: PublicOrderCartItem[],
  artworkFiles: Record<string, File[]>,
) {
  const uploadCount = cart.reduce(
    (sum, item) => sum + (artworkFiles[item.id]?.length ?? 0),
    0,
  );
  const designRequests = cart.filter(
    (item) => item.artworkOption === "design-requested",
  ).length;
  const sendLater = cart.filter((item) => item.artworkOption === "send-later").length;

  return `${uploadCount} upload file(s), ${designRequests} design request(s), ${sendLater} send later item(s)`;
}

async function putFile(url: string, file: File) {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

const inputClassName =
  "w-full rounded-2xl border border-(--shop-line-2) bg-white/80 px-4 py-3 text-base font-semibold text-(--shop-ink) outline-none transition focus:border-(--shop-red)";
