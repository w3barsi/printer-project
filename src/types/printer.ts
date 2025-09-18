import type { Doc } from "@convex/_generated/dataModel";

export type Item = Doc<"items">;
export type Jo = Doc<"jo">;

export type JoWithItems = {
  jo: Jo;
  items: Item[];
};

export interface DeviceContextType {
  device: USBDevice | null;
  isConnected: boolean;
  connectDevice: () => Promise<void>;
  disconnectDevice: () => Promise<void>;
  setDevice: (device: USBDevice | null) => void;
}
