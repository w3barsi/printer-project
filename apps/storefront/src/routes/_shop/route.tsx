import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_shop")({
  component: ShopLayout,
});

function ShopLayout() {
  return (
    <div className="shop-grain relative isolate min-h-screen overflow-x-clip bg-(--shop-bg) text-(--shop-ink) antialiased">
      <Outlet />
    </div>
  );
}
