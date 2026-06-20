export const SHOP_ORDER_SUPPORTED_SERVICE_SLUG = "tarpaulins-banners";
export const SHOP_ORDER_PRODUCT_TYPE = "tarpaulin";
export const TARPAULIN_PRICE_PER_SQFT = 20;

export const TARPAULIN_SIZE_PRESETS = [
  { label: "2x3", width: 2, height: 3 },
  { label: "3x4", width: 3, height: 4 },
  { label: "3x6", width: 3, height: 6 },
  { label: "4x6", width: 4, height: 6 },
  { label: "4x8", width: 4, height: 8 },
] as const;

export const ARTWORK_OPTIONS = ["upload-now", "send-later", "design-requested"] as const;
export type ArtworkOption = (typeof ARTWORK_OPTIONS)[number];

export const PAYMENT_METHODS = ["gcash", "bank-transfer", "pay-later"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ORDER_ATTACHMENT_KINDS = ["artwork", "payment-proof"] as const;
export type OrderAttachmentKind = (typeof ORDER_ATTACHMENT_KINDS)[number];

export function getShopOrderHref(serviceSlug: string) {
  const search = new URLSearchParams({ service: serviceSlug });

  if (serviceSlug === SHOP_ORDER_SUPPORTED_SERVICE_SLUG) {
    search.set("step", "2");
  }

  return `/order?${search.toString()}`;
}

export function calculateTarpaulinAreaSqft(width: number, height: number) {
  return width * height;
}

export function calculateTarpaulinPiecePrice(width: number, height: number) {
  return calculateTarpaulinAreaSqft(width, height) * TARPAULIN_PRICE_PER_SQFT;
}

export function calculateShopOrderLineTotal(
  width: number,
  height: number,
  quantity: number,
) {
  return calculateTarpaulinPiecePrice(width, height) * quantity;
}

export function formatTarpaulinItemName(width: number, height: number) {
  return `Tarpaulin ${formatDimension(width)}ft x ${formatDimension(height)}ft`;
}

export function isPositiveDimension(value: number) {
  return Number.isFinite(value) && value > 0;
}

export function isPositiveIntegerQuantity(value: number) {
  return Number.isInteger(value) && value > 0;
}

export function normalizePhilippineMobile(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10 && digits.startsWith("9")) {
    return `+63${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("09")) {
    return `+63${digits.slice(1)}`;
  }

  if (digits.length === 12 && digits.startsWith("63")) {
    return `+${digits}`;
  }

  return value.trim();
}

export function isValidPhilippineMobile(value: string) {
  return /^\+639\d{9}$/.test(normalizePhilippineMobile(value));
}

function formatDimension(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}
