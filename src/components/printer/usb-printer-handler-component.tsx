import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDevice } from "@/contexts/DeviceContext";

export function UsbPrinterHandlerComponent() {
  const { device, connectDevice, disconnectDevice } = useDevice();

  return (
    <div className="flex w-full justify-center">
      {device === null ? (
        <Button className="w-full" onClick={async () => await connectDevice()}>
          Connect Printer
        </Button>
      ) : (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              className="w-full"
              variant="destructive-outline"
              onClick={disconnectDevice}
            >
              {device.productName}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Disconnect Printer</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
