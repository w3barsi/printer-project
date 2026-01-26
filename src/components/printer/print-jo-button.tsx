import type { GetOneComplete } from "@/types/convex";
import { PrinterIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useDevice } from "@/contexts/DeviceContext";
import { printReceipt } from "@/lib/printer";
import { useHotkeys } from "react-hotkeys-hook";
import { Kbd } from "../ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function PrintJoButton({ jo }: { jo: GetOneComplete }) {
  const { device, isConnected } = useDevice();

  const handlePrint = (e: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isConnected) {
      return toast.error("Printer not connected");
    }
    printReceipt({ jo, device });
  };

  useHotkeys("ctrl+p", (e) => {
    handlePrint(e);
  });

  return (
    <Tooltip>
      <TooltipTrigger>
        <Button onClick={handlePrint} variant="outline">
          <PrinterIcon /> Print JO
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex items-center gap-2">
          Print Job Order <Kbd>Ctrl + P</Kbd>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
