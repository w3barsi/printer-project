import type { Id } from "@convex/_generated/dataModel";

import type {
  ArtworkOption,
  PaymentMethod,
  PUBLIC_ORDER_PRODUCT_TYPE,
} from "@/lib/public-order";

export type OrderStep = 1 | 2 | 3 | 4 | 5;

export type PublicOrderCartItem = {
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

export type ContactDraft = {
  name: string;
  mobile: string;
  email: string;
  notes: string;
  paymentMethod: PaymentMethod;
  acceptedTerms: boolean;
  honeypot: string;
};

export type ItemDraft = {
  editingId: string | null;
  width: string;
  height: string;
  quantity: string;
  artworkOption: ArtworkOption;
  designInstructions: string;
};

export type SubmittedOrder = {
  joNumber: number | null;
  itemCount: number;
  estimatedTotal: number;
  attachmentStatus: "none" | "complete" | "partial-failure";
  telegramStatus: "sent" | "skipped";
  honeypot: boolean;
};

export type AttachmentKind = "artwork" | "payment-proof";

export type UploadOrderFileArgs = {
  file: File;
  kind: AttachmentKind;
  joId: Id<"jo">;
  itemId?: Id<"items">;
  onlineOrderItemId?: Id<"onlineOrderItems">;
};
