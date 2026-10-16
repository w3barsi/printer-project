import type { LucideIcon } from "lucide-react";
import { CalculatorIcon, KeyRoundIcon, MedalIcon } from "lucide-react";

export type ThreeDTool = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  product?: string;
  to: "/3d/keychain" | "/3d/medal" | "/3d/pricing";
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
  {
    id: "medal-maker",
    name: "Medal Maker",
    description: "Turn a DXF outline into a layered, 3D-printable medal.",
    icon: MedalIcon,
    product: "Medal",
    to: "/3d/medal",
  },
  {
    id: "pricing",
    name: "3D Pricing",
    description:
      "Price prints from material, machine, labor, and profit settings. Save items and keep a price history.",
    icon: CalculatorIcon,
    to: "/3d/pricing",
  },
];
