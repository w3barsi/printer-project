import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAction, useMutation } from "convex/react";
import { useState, useSyncExternalStore } from "react";

import { ArtworkStep } from "@/components/public/order/artwork-step";
import { CartReviewStep } from "@/components/public/order/cart-review-step";
import { ComingSoon } from "@/components/public/order/coming-soon";
import { ContactPaymentStep } from "@/components/public/order/contact-payment-step";
import { OrderConfirmation } from "@/components/public/order/order-confirmation";
import { ServiceSelection } from "@/components/public/order/service-selection";
import { StepRail } from "@/components/public/order/step-rail";
import { TarpaulinDetailsStep } from "@/components/public/order/tarpaulin-details-step";
import type {
  AttachmentKind,
  ContactDraft,
  ItemDraft,
  OrderStep,
  PublicOrderCartItem,
  SubmittedOrder,
} from "@/components/public/order/types";
import {
  buildArtworkSummary,
  emptyContactDraft,
  emptyItemDraft,
  getLocationSearchSnapshot,
  getOrderSearch,
  getServerLocationSearchSnapshot,
  maxArtworkFilesPerItem,
  maxFileSize,
  normalizeStep,
  paymentLabel,
  putFile,
  subscribeToLocationSearch,
} from "@/components/public/order/utils";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  PUBLIC_ORDER_PRODUCT_TYPE,
  PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG,
  calculatePublicOrderLineTotal,
  calculateTarpaulinAreaSqft,
  calculateTarpaulinPiecePrice,
  formatTarpaulinItemName,
  isPositiveDimension,
  isPositiveIntegerQuantity,
  isValidPhilippineMobile,
} from "@/lib/public-order";
import { SHOP_THEME, getServiceBySlug } from "@/lib/services";

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
  const progressCartCount = submittedOrder ? submittedOrder.itemCount : cart.length;
  const progressTotal = submittedOrder ? submittedOrder.estimatedTotal : cartTotal;

  function navigateOrder(next: { service?: string; step?: OrderStep }) {
    const params = new URLSearchParams();
    if (next.service) params.set("service", next.service);
    if (next.step) params.set("step", String(next.step));

    const nextSearch = `?${params.toString()}`;
    window.history.pushState(null, "", `/order${nextSearch}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    setFormError(null);
  }

  function markOrderReceived() {
    const params = new URLSearchParams({
      service: PUBLIC_ORDER_SUPPORTED_SERVICE_SLUG,
      step: "received",
    });

    window.history.replaceState(null, "", `/order?${params.toString()}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
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
        markOrderReceived();
        setSubmittedOrder({
          joNumber: null,
          itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
          estimatedTotal: cartTotal,
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
        itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
        estimatedTotal: created.estimatedTotal,
        attachmentStatus,
        telegramStatus: telegramResult.status,
        honeypot: false,
      });
      markOrderReceived();
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
              <StepRail
                step={currentStep}
                cartCount={progressCartCount}
                total={progressTotal}
              />
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
            <ComingSoon
              serviceName={selectedService?.name ?? "This service"}
              selectedSlug={requestedService}
            />
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
