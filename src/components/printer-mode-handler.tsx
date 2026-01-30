import { useDevice } from "@/contexts/DeviceContext";
import { printReceipt } from "@/lib/printer";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { useEffect, useRef } from "react";

export function PrinterModeHandler() {
  const { device, isPrinterMode } = useDevice();
  const { data } = useQuery(convexQuery(api.jo.getForPrinting, {}));
  const unmarkForPrinting = useConvexMutation(api.jo.unmarkForPrinting);
  const isMountedRef = useRef(true);
  const processingRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isPrinterMode) return;
    if (!data || !device || data.length === 0 || processingRef.current) return;

    const processPrintQueue = async () => {
      processingRef.current = true;

      for (const jo of data) {
        if (!isMountedRef.current) {
          processingRef.current = false;
          return;
        }

        try {
          await printReceipt({ device, jo });
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (isMountedRef.current) {
            await unmarkForPrinting({ joId: jo._id });
          }
        } catch (error) {
          if (isMountedRef.current) {
            console.error(`Failed to print/unmark JO ${jo._id}:`, error);
          }
        }
      }

      processingRef.current = false;
    };

    processPrintQueue();
  }, [data, device, unmarkForPrinting, isPrinterMode]);

  return null;
}
