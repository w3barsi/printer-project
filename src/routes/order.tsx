import { createFileRoute } from "@tanstack/react-router";

import { PublicOrderRoute } from "@/components/public/order";

export const Route = createFileRoute("/order")({
  component: PublicOrderRoute,
  head: () => ({
    meta: [
      { title: "Order Online | DARCYGRAPHiX" },
      {
        name: "description",
        content: "Start an online print order request with DARCYGRAPHiX.",
      },
    ],
  }),
});
