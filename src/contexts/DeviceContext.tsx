import type { DeviceContextType } from "@/types/printer";
import type { ReactNode } from "react";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";

// Create context with undefined as default
const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

// Provider props interface
interface DeviceProviderProps {
  children: ReactNode;
}

// Provider component
export const DeviceProvider = ({ children }: DeviceProviderProps) => {
  const [device, setDevice] = useState<USBDevice | null>(null);

  // Computed property to check if device is connected
  const isConnected = device !== null;

  const connectDevice = useCallback(async (): Promise<void> => {
    if ("usb" in navigator) {
      try {
        const newDevice = await navigator.usb.requestDevice({
          filters: [],
        });
        setDevice(newDevice);
        window.location.reload();
      } catch (error) {
        console.error("Error requesting USB device:", error);
      }
    } else {
      console.warn("WebUSB API not supported in this browser.");
    }
  }, []);

  const disconnectDevice = useCallback(async (): Promise<void> => {
    if (device) {
      // Close the device connection
      await device.forget();
      setDevice(null);
    }
  }, [device]);

  // useEffect for automatically connecting to permitted devices
  useEffect(() => {
    const checkPermittedDevices = async () => {
      if ("usb" in navigator) {
        const devices = await navigator.usb.getDevices();

        if (devices.length > 0) {
          setDevice(devices[0]);
          console.log(
            "Automatically reconnected to permitted device:",
            devices[0].productName,
          );
        }
      }
    };
    checkPermittedDevices();
  }, []);

  // Listen for device disconnect events
  useEffect(() => {
    const handleDisconnect = (event: USBConnectionEvent) => {
      if (device && event.device === device) {
        setDevice(null);
      }
    };

    if ("usb" in navigator) {
      navigator.usb.addEventListener("disconnect", handleDisconnect);

      return () => {
        navigator.usb.removeEventListener("disconnect", handleDisconnect);
      };
    }
  }, [device]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (device) {
        device.close().catch(console.error);
      }
    };
  }, [device]);

  const value = useMemo<DeviceContextType>(
    () => ({
      device,
      isConnected,
      connectDevice,
      disconnectDevice,
      setDevice,
    }),
    [device, isConnected, connectDevice, disconnectDevice, setDevice],
  );

  return <DeviceContext value={value}>{children}</DeviceContext>;
};

// Custom hook to use the device context
export const useDevice = (): DeviceContextType => {
  const context = use(DeviceContext);

  if (context === undefined) {
    throw new Error("useDevice must be used within a DeviceProvider");
  }

  return context;
};
