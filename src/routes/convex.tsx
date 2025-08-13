import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Suspense, useRef } from "react";

import { Button } from "@/components/ui/button";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/convex")({
  component: App,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(convexQuery(api.products.get, {}));
  },
});

function Products() {
  const products = useSuspenseQuery(convexQuery(api.products.get, {}));

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-xl font-semibold text-zinc-300">Products</h2>
      <ul className="space-y-2">
        {products.data.map((p) => (
          <li
            key={p._id}
            className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 p-4"
          >
            <span className="text-white">{p.title}</span>
            <span className="text-zinc-400">{p.price}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  const ref = useRef<HTMLInputElement>(null);
  const mutate = useMutation(api.products.add);
  return (
    <div className="min-h-screen bg-black p-8 font-sans text-white">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <Link
          className="w-full rounded-md border-2 border-white bg-black px-4 py-2 text-center text-white transition-colors hover:bg-gray-200 hover:text-black"
          to="/"
        >
          Index
        </Link>
        <h1 className="mb-6 text-center text-3xl font-bold">Add a New Product</h1>
        <div className="flex gap-2">
          <input
            className="flex-grow rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            ref={ref}
            type="text"
            placeholder="Enter product title..."
          />
          <Button
            className="rounded-md bg-white px-6 py-2 font-semibold text-black transition-colors hover:bg-gray-200"
            onClick={() => {
              if (ref.current?.value) {
                mutate({ title: ref.current.value });
                ref.current.value = "";
              }
            }}
          >
            Add
          </Button>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <Products />
        </Suspense>
      </div>
    </div>
  );
}
