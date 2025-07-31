import { Button } from "@/components/ui/button"
import { useDevice } from "@/contexts/DeviceContext"
import { printReceipt } from "@/lib/printer"
import type { JoWithItems } from "@/types/convex"
import { PrinterIcon } from "lucide-react"
import { toast } from "sonner"

export function PrintJoButton({ jo }: { jo: JoWithItems }) {
  const { device, isConnected } = useDevice()

  const handlePrint = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (!isConnected) {
      return toast.error("Printer not connected")
    }
    printReceipt({ jo, device })
  }

  return (
    <Button onClick={handlePrint} variant="ghost">
      <PrinterIcon />
    </Button>
  )
}
