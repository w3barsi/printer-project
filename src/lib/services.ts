import {
  AwardIcon,
  CarIcon,
  FlagIcon,
  GiftIcon,
  ImageIcon,
  LayersIcon,
  LightbulbIcon,
  MegaphoneIcon,
  PartyPopperIcon,
  PenToolIcon,
  PrinterIcon,
  StoreIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

export type Service = {
  no: string;
  slug: string;
  name: string;
  blurb: string;
  icon: LucideIcon;
};

export const SERVICES: Service[] = [
  {
    no: "01",
    slug: "large-format-printing",
    name: "Large-Format Digital Printing",
    blurb:
      "Billboards, backlit films, and oversized prints with color that stays clear from across the street.",
    icon: PrinterIcon,
  },
  {
    no: "02",
    slug: "tarpaulins-banners",
    name: "Tarpaulins & Banners",
    blurb:
      "Weatherproof tarps and banners for openings, promos, schools, and events - hemmed, grommeted, ready to hang.",
    icon: FlagIcon,
  },
  {
    no: "03",
    slug: "commercial-business-signage",
    name: "Commercial & Business Signage",
    blurb:
      "Storefronts, wayfinding, and 3D letter signs that help people find you quickly.",
    icon: StoreIcon,
  },
  {
    no: "04",
    slug: "led-neon-signs",
    name: "LED & Neon Signs",
    blurb:
      "Bright LED and neon-style signs for shops, counters, windows, and photo-ready walls.",
    icon: LightbulbIcon,
  },
  {
    no: "05",
    slug: "acrylic-fabrication",
    name: "Acrylic Fabrication",
    blurb:
      "Cut, bent, and polished acrylic for light boxes, display stands, and custom ideas.",
    icon: LayersIcon,
  },
  {
    no: "06",
    slug: "awards-plaques-medals",
    name: "Awards, Plaques & Medals",
    blurb:
      "Engraved plaques, cast medals, and trophies made carefully for meaningful moments.",
    icon: AwardIcon,
  },
  {
    no: "07",
    slug: "vehicle-graphics-wraps",
    name: "Vehicle Graphics & Wraps",
    blurb:
      "Full wraps, partial wraps, magnetic signs, and fleet branding that keeps your name moving.",
    icon: CarIcon,
  },
  {
    no: "08",
    slug: "advertising-materials",
    name: "Advertising Materials",
    blurb: "Posters, flyers, standees, and promo kits produced fast and finished clean.",
    icon: MegaphoneIcon,
  },
  {
    no: "09",
    slug: "graphic-design",
    name: "Graphic Design",
    blurb:
      "Layout, identity, and artwork help when you know what you need but not how it should look yet.",
    icon: PenToolIcon,
  },
  {
    no: "10",
    slug: "custom-event-printing",
    name: "Custom Event Printing",
    blurb:
      "Backdrops, welcome boards, banners, and one-off pieces for launches, parties, and team events.",
    icon: PartyPopperIcon,
  },
  {
    no: "11",
    slug: "promotional-materials",
    name: "Promotional Materials",
    blurb: "Branded merch, tags, and giveaways that keep a logo in customers' hands.",
    icon: GiftIcon,
  },
  {
    no: "12",
    slug: "digital-printing-services",
    name: "Digital Printing Services",
    blurb:
      "Short-run digital prints with quick turnaround and friendly proofing before we produce.",
    icon: ImageIcon,
  },
];

export const SHOP_THEME: CSSProperties & Record<`--${string}`, string> = {
  "--shop-bg": "#fff5f1",
  "--shop-bg-2": "#ffd9d1",
  "--shop-panel": "#fffaf7",
  "--shop-ink": "#321917",
  "--shop-ink-dim": "#704541",
  "--shop-ink-mute": "#a26862",
  "--shop-line": "rgba(139, 39, 32, 0.16)",
  "--shop-line-2": "rgba(139, 39, 32, 0.28)",
  "--shop-red": "#e1261c",
  "--shop-white": "#fff5f1",
  "--shop-silver": "#d63c32",
};

export const MARQUEE_ITEMS = [
  "Tarpaulins",
  "LED Signs",
  "Neon",
  "Vehicle Wraps",
  "Acrylic",
  "Awards & Plaques",
  "Large-Format",
  "Digital Print",
  "Banners",
  "Signage",
  "Graphic Design",
  "Promo Materials",
];

export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
