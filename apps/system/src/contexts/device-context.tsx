import type { ReactNode } from "react";
import { createContext, use, useEffect, useState } from "react";

import type { DeviceContextType } from "@/types/printer";

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export function DeviceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [device, setDevice] = useState<USBDevice | null>(null);
  const [isPrinterMode, setIsPrinterMode] = useState(false);
  const isConnected = device !== null;

  const connectDevice = async () => {
    if (!("usb" in navigator)) {
      console.warn("WebUSB API not supported in this browser.");
      return;
    }

    try {
      const newDevice = await navigator.usb.requestDevice({ filters: [] });
      setDevice(newDevice);
      window.location.reload();
    } catch (error) {
      console.error("Error requesting USB device:", error);
    }
  };

  const disconnectDevice = async () => {
    if (!device) return;

    await device.forget();
    setDevice(null);
  };

  useEffect(() => {
    if (!("usb" in navigator)) return;

    void navigator.usb.getDevices().then(([permittedDevice]) => {
      if (permittedDevice) setDevice(permittedDevice);
    });
  }, []);

  useEffect(() => {
    if (!("usb" in navigator)) return;

    const handleDisconnect = (event: USBConnectionEvent) => {
      if (event.device === device) setDevice(null);
    };

    navigator.usb.addEventListener("disconnect", handleDisconnect);
    return () => navigator.usb.removeEventListener("disconnect", handleDisconnect);
  }, [device]);

  useEffect(() => {
    return () => {
      if (device) void device.close().catch(console.error);
    };
  }, [device]);

  const value: DeviceContextType = {
    device,
    isConnected,
    connectDevice,
    disconnectDevice,
    setDevice,
    isPrinterMode,
    setIsPrinterMode,
  };

  return <DeviceContext value={value}>{children}</DeviceContext>;
}

export function useDevice() {
  const context = use(DeviceContext);
  if (!context) throw new Error("useDevice must be used within a DeviceProvider");

  return context;
}
