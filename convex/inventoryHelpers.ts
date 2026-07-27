const MAX_NAME_LENGTH = 120;
const MAX_REASON_LENGTH = 500;

export function validateInventoryName(name: string, label: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error(`${label} is required`);
  }

  if (trimmedName.length > MAX_NAME_LENGTH) {
    throw new Error(`${label} cannot be longer than ${MAX_NAME_LENGTH} characters`);
  }

  return {
    name: trimmedName,
    normalizedName: trimmedName.toLowerCase(),
  };
}

export function validateNonNegativeQuantity(quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new Error("Quantity must be a non-negative whole number");
  }

  return quantity;
}

export function validatePositiveQuantity(quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive whole number");
  }

  return quantity;
}

export function normalizeOptionalReason(reason?: string) {
  const trimmedReason = reason?.trim();

  if (!trimmedReason) {
    return undefined;
  }

  if (trimmedReason.length > MAX_REASON_LENGTH) {
    throw new Error(`Reason cannot be longer than ${MAX_REASON_LENGTH} characters`);
  }

  return trimmedReason;
}

export function validateRequiredReason(reason: string) {
  const trimmedReason = normalizeOptionalReason(reason);

  if (!trimmedReason) {
    throw new Error("Reason is required");
  }

  return trimmedReason;
}
