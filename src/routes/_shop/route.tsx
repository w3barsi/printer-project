import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SHOP_THEME } from "@/lib/services";

export const Route = createFileRoute("/_shop")({
  component: ShopLayout,
});

function ShopLayout() {
  return (
    <div className="shop shop-grain" style={SHOP_THEME}>
      <Outlet />
    </div>
  );
}
