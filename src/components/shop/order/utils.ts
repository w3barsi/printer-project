import { SHOP_ORDER_SUPPORTED_SERVICE_SLUG } from "@/lib/shop-order";
import type { ArtworkOption } from "@/lib/shop-order";

import type {
  ContactDraft,
  ItemDraft,
  OrderStep,
  ShopOrderCartItem,
  SubmittedOrder,
} from "./types";

export const emptyContactDraft: ContactDraft = {
  name: "",
  mobile: "",
  email: "",
  notes: "",
  paymentMethod: "pay-later",
  acceptedTerms: false,
  honeypot: "",
};

export const emptyItemDraft: ItemDraft = {
  editingId: null,
  width: "3",
  height: "6",
  quantity: "1",
  artworkOption: "send-later",
  designInstructions: "",
};

export const acceptedUploadExtensions = ".pdf,.jpg,.jpeg,.png,.webp";
export const maxArtworkFilesPerItem = 5;
export const maxFileSize = 25 * 1024 * 1024;

export const inputClassName =
  "w-full rounded-2xl border border-(--shop-line-2) bg-white/80 px-4 py-3 text-base font-semibold text-(--shop-ink) outline-none transition focus:border-(--shop-red)";

export function normalizeStep(
  step: string | undefined,
  service: string | undefined,
  cartCount: number,
): OrderStep {
  if (!service) return 1;
  if (service !== SHOP_ORDER_SUPPORTED_SERVICE_SLUG) return 1;

  const parsed = Number(step);
  if (step === "received") return 5;
  if (parsed === 3) return 3;
  if (parsed === 4) return 4;
  if (parsed === 5) return cartCount > 0 ? 5 : 4;
  return 2;
}

export function artworkLabel(option: ArtworkOption) {
  if (option === "upload-now") return "Upload now";
  if (option === "design-requested") return "Request design";
  return "Send later";
}

export function artworkDescription(option: ArtworkOption) {
  if (option === "upload-now") return "Attach print-ready files with this request.";
  if (option === "design-requested") return "Ask staff to quote layout or design help.";
  return "Submit the order now and send artwork through chat later.";
}

export function paymentLabel(method: NonNullable<ContactDraft["paymentMethod"]>) {
  if (method === "gcash") return "GCash";
  if (method === "bank-transfer") return "Bank Transfer";
  return "Pay Later / Confirm with staff";
}

export function attachmentStatusLabel(status: SubmittedOrder["attachmentStatus"]) {
  if (status === "complete") return "Uploaded";
  if (status === "partial-failure") return "Needs follow-up";
  return "No uploads";
}

export function buildArtworkSummary(
  cart: ShopOrderCartItem[],
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

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

export async function putFile(url: string, file: File) {
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
