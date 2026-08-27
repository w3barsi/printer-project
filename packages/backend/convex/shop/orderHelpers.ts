export const SUPPORTED_SERVICE_SLUG = "tarpaulins-banners";
export const PRODUCT_TYPE = "tarpaulin";
export const TARPAULIN_PRICE_PER_SQFT = 20;

export const ARTWORK_OPTIONS = ["upload-now", "send-later", "design-requested"] as const;
export type ArtworkOption = (typeof ARTWORK_OPTIONS)[number];

export const PAYMENT_METHODS = ["gcash", "bank-transfer", "pay-later"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ATTACHMENT_KINDS = ["artwork", "payment-proof"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const ACCEPTED_ORDER_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ACCEPTED_ORDER_ATTACHMENT_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export const MAX_ARTWORK_FILES_PER_ITEM = 5;
export const MAX_ARTWORK_FILE_SIZE = 25 * 1024 * 1024;
export const MAX_PAYMENT_PROOF_FILES = 1;

export function calculateAreaSqft(width: number, height: number) {
  return width * height;
}

export function calculatePiecePrice(width: number, height: number) {
  return calculateAreaSqft(width, height) * TARPAULIN_PRICE_PER_SQFT;
}

export function calculateLineTotal(width: number, height: number, quantity: number) {
  return calculatePiecePrice(width, height) * quantity;
}

export function formatInternalItemName(width: number, height: number) {
  return `Tarpaulin ${formatDimension(width)}ft x ${formatDimension(height)}ft`;
}

export function assertSupportedService(serviceSlug: string) {
  if (serviceSlug !== SUPPORTED_SERVICE_SLUG) {
    throw new Error("Unsupported service");
  }
}

export function assertPositiveDimension(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than 0`);
  }
}

export function assertPositiveIntegerQuantity(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Quantity must be a positive whole number");
  }
}

export function normalizeAndValidatePhilippineMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  let normalized = value.trim();

  if (digits.length === 10 && digits.startsWith("9")) {
    normalized = `+63${digits}`;
  } else if (digits.length === 11 && digits.startsWith("09")) {
    normalized = `+63${digits.slice(1)}`;
  } else if (digits.length === 12 && digits.startsWith("63")) {
    normalized = `+${digits}`;
  }

  if (!/^\+639\d{9}$/.test(normalized)) {
    throw new Error("Enter a valid Philippine mobile number");
  }

  return normalized;
}

export function assertArtworkOption(value: string): asserts value is ArtworkOption {
  if (!ARTWORK_OPTIONS.includes(value as ArtworkOption)) {
    throw new Error("Invalid artwork option");
  }
}

export function assertPaymentMethod(value: string): asserts value is PaymentMethod {
  if (!PAYMENT_METHODS.includes(value as PaymentMethod)) {
    throw new Error("Invalid payment method");
  }
}

export function assertAttachmentKind(value: string): asserts value is AttachmentKind {
  if (!ATTACHMENT_KINDS.includes(value as AttachmentKind)) {
    throw new Error("Invalid attachment kind");
  }
}

export function assertAcceptedAttachment(
  filename: string,
  mimeType: string,
  size: number,
) {
  const normalizedFilename = filename.toLowerCase();
  const hasAcceptedExtension = ACCEPTED_ORDER_ATTACHMENT_EXTENSIONS.some((extension) =>
    normalizedFilename.endsWith(extension),
  );
  const hasAcceptedMimeType = ACCEPTED_ORDER_ATTACHMENT_MIME_TYPES.includes(
    mimeType as (typeof ACCEPTED_ORDER_ATTACHMENT_MIME_TYPES)[number],
  );

  if (!hasAcceptedExtension || !hasAcceptedMimeType) {
    throw new Error("Unsupported file type");
  }

  if (!Number.isFinite(size) || size <= 0) {
    throw new Error("File size must be greater than 0");
  }

  if (size > MAX_ARTWORK_FILE_SIZE) {
    throw new Error("File must be 25 MB or smaller");
  }
}

function formatDimension(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}
