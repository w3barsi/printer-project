import { roundMoney } from "@dg/backend/printPricing";
import type { PrintPriceBreakdown, PrintPricingInput } from "@dg/backend/printPricing";

export type BreakdownRow = {
  label: string;
  amount: number;
};

export function formatPrintTime(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "0m";
  }

  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (wholeHours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${wholeHours}h`;
  }

  return `${wholeHours}h ${minutes}m`;
}

export function formatPercent(value: number) {
  return `${roundMoney(value)}%`;
}

export function formatDateTime(value: number) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function buildBreakdownRows(
  input: PrintPricingInput,
  breakdown: PrintPriceBreakdown,
): BreakdownRow[] {
  const rows: BreakdownRow[] = [{ label: "Material", amount: breakdown.material }];

  if (input.printer) {
    rows.push({ label: "Electricity", amount: breakdown.electricity });
    rows.push({ label: "Printer wear", amount: breakdown.printerWear });
  }

  if (input.labor) {
    rows.push({ label: "Labor", amount: breakdown.labor });
  }

  rows.push({ label: "Subtotal", amount: breakdown.subtotal });

  if (input.business) {
    rows.push({
      label: `Failure (${formatPercent(input.business.failureRatePercent)})`,
      amount: breakdown.failure,
    });
    rows.push({
      label: `Profit (${formatPercent(input.business.markupPercent)} markup)`,
      amount: breakdown.profit,
    });
  }

  return rows;
}
