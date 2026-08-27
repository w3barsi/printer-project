export interface DeviceContextType {
  device: USBDevice | null;
  isConnected: boolean;
  connectDevice: () => Promise<void>;
  disconnectDevice: () => Promise<void>;
  setDevice: (device: USBDevice | null) => void;
  isPrinterMode: boolean;
  setIsPrinterMode: (value: boolean) => void;
}
