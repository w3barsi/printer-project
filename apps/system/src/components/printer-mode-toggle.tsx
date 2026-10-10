import { MenuItem } from "@dg/ui-coss/components/menu";
import { Check, PrinterIcon } from "lucide-react";

import { useDevice } from "@/contexts/device-context";

export function PrinterModeToggle() {
  const { isConnected, isPrinterMode, setIsPrinterMode } = useDevice();

  if (!isConnected) {
    return null;
  }

  return (
    <MenuItem
      className="flex justify-between"
      onClick={() => setIsPrinterMode(!isPrinterMode)}
    >
      <span className="flex items-center gap-2">
        <PrinterIcon /> Mode
      </span>
      {isPrinterMode ? <Check /> : null}
    </MenuItem>
  );
}
