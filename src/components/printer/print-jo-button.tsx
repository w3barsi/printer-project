import { api } from "@dg/backend/api";
import { Button } from "@dg/ui/components/button";
import { Kbd } from "@dg/ui/components/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@dg/ui/components/tooltip";
import { useMutation } from "convex/react";
import { PrinterIcon } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";

import { useDevice } from "@/contexts/DeviceContext";
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
        return toast("Marked for printing.", { icon: "🖨️" });
      } catch (e) {
        return toast.error("No printer connected.", { icon: "🖨️" });
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
