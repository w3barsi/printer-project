import { useDevice } from "@/contexts/DeviceContext";

import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function PrinterButton() {
  const { device, connectDevice, disconnectDevice } = useDevice();
  return (
    <div className="flex w-full justify-center">
      {device === null ? (
        <Button className="w-full" onClick={connectDevice}>
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
                onClick={async () => {
                  await disconnectDevice();
                }}
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
