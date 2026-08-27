import { createFileRoute } from "@tanstack/react-router";

import { ShopCapabilities } from "@/components/shop/shop-capabilities";
import { ShopContact } from "@/components/shop/shop-contact";
import { ShopFooter } from "@/components/shop/shop-footer";
import { ShopHeader } from "@/components/shop/shop-header";
import { ShopHero } from "@/components/shop/shop-hero";
import { ShopMarquee } from "@/components/shop/shop-marquee";
import { ShopProcess } from "@/components/shop/shop-process";
import { ShopServices } from "@/components/shop/shop-services";

export const Route = createFileRoute("/_shop/")({
  component: ShopHome,
});

function ShopHome() {
  return (
    <>
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
    </>
  );
}
