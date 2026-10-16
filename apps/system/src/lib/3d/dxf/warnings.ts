import type { ModelWarning } from "../warnings";
import type { DxfUnits } from "./parse";

export function buildDxfWarnings(input: {
  units: DxfUnits;
  unsupported: Map<string, number>;
  openContours: number;
  splinesSkipped: number;
}): ModelWarning[] {
  const warnings: ModelWarning[] = [];

  if (input.units.assumed) {
    warnings.push({
      id: "dxf-units",
      message: "This file does not declare units, so millimetres are assumed.",
    });
  }

  for (const [type, count] of input.unsupported) {
    warnings.push({
      id: `dxf-unsupported-${type}`,
      message:
        count === 1
          ? `Ignored 1 ${type} entity — only closed outlines are used.`
          : `Ignored ${count} ${type} entities — only closed outlines are used.`,
    });
  }

  if (input.openContours > 0) {
    warnings.push({
      id: "dxf-open",
      message:
        input.openContours === 1
          ? "1 open outline could not be closed and was ignored."
          : `${input.openContours} open outlines could not be closed and were ignored.`,
    });
  }

  if (input.splinesSkipped > 0) {
    warnings.push({
      id: "dxf-splines",
      message:
        input.splinesSkipped === 1
          ? "1 spline had unusable control data and was skipped."
          : `${input.splinesSkipped} splines had unusable control data and were skipped.`,
    });
  }

  return warnings;
}
