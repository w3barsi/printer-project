import type { LucideIcon } from "lucide-react";
import { KeyRoundIcon } from "lucide-react";

export type ThreeDTool = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  product: string;
  to: "/3d/keychain";
};

export const threeDTools: ThreeDTool[] = [
  {
    id: "keychain-maker",
    name: "Keychain Maker",
    description: "Turn a PNG into a multi-color, 3D-printable keychain.",
    icon: KeyRoundIcon,
    product: "Keychain",
    to: "/3d/keychain",
  },
];
