import type { GetOneComplete } from "@/types/convex";
import { PrinterIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useDevice } from "@/contexts/DeviceContext";
import { printReceipt } from "@/lib/printer";
import { useHotkeys } from "react-hotkeys-hook";
import { Badge } from "../ui/badge";

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
    <Button onClick={handlePrint}>
      <PrinterIcon /> Print JO <Badge variant="hotkey">⌘ P</Badge>
    </Button>
  );
}
