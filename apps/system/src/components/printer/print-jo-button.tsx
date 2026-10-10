import { api } from "@dg/backend/api";
import { Button } from "@dg/ui-coss/components/button";
import { Kbd } from "@dg/ui-coss/components/kbd";
import { toastManager } from "@dg/ui-coss/components/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@dg/ui-coss/components/tooltip";
import { useMutation } from "convex/react";
import { PrinterIcon } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";

import { useDevice } from "@/contexts/device-context";
import { printReceipt } from "@/lib/printer";
import type { GetOneComplete } from "@/types/convex";

export function PrintJoButton({ jo }: { jo: GetOneComplete }) {
  const { device, isConnected } = useDevice();
  const markForPrinting = useMutation(api.jo.markForPrinting);

  const handlePrint = async (e: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isConnected) {
      try {
        await markForPrinting({ joId: jo._id });
        return toastManager.add({ title: "Marked for printing." });
      } catch (e) {
        return toastManager.add({ title: "No printer connected.", type: "error" });
      }
    }
    printReceipt({ jo, device });
  };

  useHotkeys("ctrl+p", (e) => {
    handlePrint(e);
  });

  return (
    <Tooltip>
      <TooltipTrigger render={<Button onClick={handlePrint} variant="outline" />}>
        <PrinterIcon /> Print JO
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex items-center gap-2">
          Print Job Order <Kbd>Ctrl + P</Kbd>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
