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
        <Tooltip>
          <TooltipTrigger
            delay={300}
            render={
              <Button
                className="w-full"
                variant="destructive"
                onClick={disconnectDevice}
              />
            }
          >
            {device.productName}
          </TooltipTrigger>
          <TooltipContent>Disconnect Printer</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
