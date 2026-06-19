import { createFileRoute } from "@tanstack/react-router";

import { ShopCapabilities } from "@/components/public/shop-capabilities";
import { ShopContact } from "@/components/public/shop-contact";
import { ShopFooter } from "@/components/public/shop-footer";
import { ShopHeader } from "@/components/public/shop-header";
import { ShopHero } from "@/components/public/shop-hero";
import { ShopMarquee } from "@/components/public/shop-marquee";
import { ShopProcess } from "@/components/public/shop-process";
import { ShopServices } from "@/components/public/shop-services";
import { SHOP_THEME } from "@/lib/services";

export const Route = createFileRoute("/")({
  component: ShopHome,
});

function ShopHome() {
  return (
    <div className="shop shop-grain" style={SHOP_THEME}>
      <ShopHeader />
      <main>
        <ShopHero />
        <ShopMarquee />
        <ShopServices />
        <ShopProcess />
        <ShopCapabilities />
        <ShopContact />
      </main>
      <ShopFooter />
    </div>
  );
}
