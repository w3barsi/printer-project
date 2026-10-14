import type { Infer } from "convex/values";

import type {
  printFilamentUsage,
  printPricingInput,
  printPriceBreakdown,
} from "../schemas/printPricing";

export type PrintFilamentUsage = Infer<typeof printFilamentUsage>;
export type PrintPricingInput = Infer<typeof printPricingInput>;
export type PrintPriceBreakdown = Infer<typeof printPriceBreakdown>;

export const printPricingLimits = {
  maxNameLength: 120,
  maxNoteLength: 500,
  maxFilaments: 20,
} as const;

export function normalizeName(name: string, label: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error(`${label} is required`);
  }

  if (trimmedName.length > printPricingLimits.maxNameLength) {
    throw new Error(
      `${label} cannot be longer than ${printPricingLimits.maxNameLength} characters`,
    );
  }

  return {
    name: trimmedName,
    normalizedName: trimmedName.toLowerCase(),
  };
}

export function validateNonNegativeNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }

  return value;
}

export function validatePositiveNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number`);
  }

  return value;
}

export function validatePercentage(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${label} must be between 0 and 100`);
  }

  return value;
}

export function validateNote(note?: string) {
  const trimmedNote = note?.trim();

  if (!trimmedNote) {
    return undefined;
  }

  if (trimmedNote.length > printPricingLimits.maxNoteLength) {
    throw new Error(
      `Note cannot be longer than ${printPricingLimits.maxNoteLength} characters`,
    );
  }

  return trimmedNote;
}

export function validatePrintPricingInput(input: PrintPricingInput): PrintPricingInput {
  if (input.filaments.length === 0) {
    throw new Error("At least one filament is required");
  }

  if (input.filaments.length > printPricingLimits.maxFilaments) {
    throw new Error(`Cannot use more than ${printPricingLimits.maxFilaments} filaments`);
  }

  const filaments = input.filaments.map((filament, index) => {
    const label = `Filament ${index + 1}`;

    return {
      presetId: filament.presetId,
      name: normalizeName(filament.name, `${label} name`).name,
      weightGrams: validatePositiveNumber(
        filament.weightGrams,
        `${label} weight in grams`,
      ),
      costPerKg: validateNonNegativeNumber(filament.costPerKg, `${label} cost per kg`),
    };
  });

  const printer = input.printer
    ? {
        presetId: input.printer.presetId,
        name: input.printer.name
          ? normalizeName(input.printer.name, "Printer name").name
          : undefined,
        powerWatts: validatePositiveNumber(
          input.printer.powerWatts,
          "Printer power in watts",
        ),
        price: validateNonNegativeNumber(input.printer.price, "Printer price"),
        lifespanHours: validatePositiveNumber(
          input.printer.lifespanHours,
          "Printer lifespan in hours",
        ),
        electricityRatePerKwh: validateNonNegativeNumber(
          input.printer.electricityRatePerKwh,
          "Electricity rate per kWh",
        ),
      }
    : undefined;

  const labor = input.labor
    ? {
        ratePerHour: validateNonNegativeNumber(
          input.labor.ratePerHour,
          "Labor rate per hour",
        ),
        hours: validateNonNegativeNumber(input.labor.hours, "Labor hours"),
      }
    : undefined;

  const business = input.business
    ? {
        failureRatePercent: validatePercentage(
          input.business.failureRatePercent,
          "Failure rate percent",
        ),
        markupPercent: validateNonNegativeNumber(
          input.business.markupPercent,
          "Markup percent",
        ),
      }
    : undefined;

  return {
    filaments,
    printTimeHours: validateNonNegativeNumber(
      input.printTimeHours,
      "Print time in hours",
    ),
    printer,
    labor,
    business,
  };
}

export function computePriceBreakdown(input: PrintPricingInput): PrintPriceBreakdown {
  const material = input.filaments.reduce(
    (total, filament) => total + (filament.weightGrams / 1000) * filament.costPerKg,
    0,
  );

  const electricity = input.printer
    ? (input.printer.powerWatts / 1000) *
      input.printTimeHours *
      input.printer.electricityRatePerKwh
    : 0;

  const printerWear = input.printer
    ? (input.printer.price / input.printer.lifespanHours) * input.printTimeHours
    : 0;

  const laborCost = input.labor ? input.labor.ratePerHour * input.labor.hours : 0;

  const subtotal = material + electricity + printerWear + laborCost;

  const failure = input.business
    ? (subtotal * input.business.failureRatePercent) / 100
    : 0;

  const profit = input.business
    ? ((subtotal + failure) * input.business.markupPercent) / 100
    : 0;

  return {
    material,
    electricity,
    printerWear,
    labor: laborCost,
    subtotal,
    failure,
    profit,
    total: subtotal + failure + profit,
  };
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatPeso(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}
