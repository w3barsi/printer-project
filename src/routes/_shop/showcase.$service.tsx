import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useHotkeys } from "react-hotkeys-hook";

import { ShowcaseSamples } from "@/components/shop/showcase-samples";
import { ShopButton } from "@/components/shop/ui/button";
import { SERVICES, getServiceBySlug } from "@/lib/services";
import { getShopOrderHref } from "@/lib/shop-order";

export const Route = createFileRoute("/_shop/showcase/$service")({
  loader: ({ params }) => {
    const service = getServiceBySlug(params.service);
    if (!service) {
      throw redirect({ to: "/", hash: "services" });
    }
    return {
      slug: service.slug,
      no: service.no,
      name: service.name,
      blurb: service.blurb,
    };
  },
  component: Showcase,
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.name} | DARCYGRAPHiX`,
      },
      {
        name: "description",
        content: loaderData?.blurb,
      },
    ],
  }),
});

function Showcase() {
  const { slug, no, name, blurb } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const service = getServiceBySlug(slug);
  if (!service) return null;
  const Icon = service.icon;
  const idx = SERVICES.findIndex((s) => s.slug === slug);
  const prev = idx > 0 ? SERVICES[idx - 1] : undefined;
  const next = idx < SERVICES.length - 1 ? SERVICES[idx + 1] : undefined;
  const orderHref = getShopOrderHref(slug);

  useHotkeys(
    "left",
    () => {
      if (prev) navigate({ to: "/showcase/$service", params: { service: prev.slug } });
    },
    { enabled: !!prev },
  );

  useHotkeys(
    "right",
    () => {
      if (next) navigate({ to: "/showcase/$service", params: { service: next.slug } });
    },
    { enabled: !!next },
  );

  return (
    <>
      <header className="relative z-20 mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-10">
        <Link to="/" className="group flex items-center gap-3">
          <img
            src="/DG_SHORT_SVG.svg"
            alt=""
            className="h-10 w-auto rounded-2xl border border-white/80 bg-white p-1.5 shadow-sm md:h-11"
          />
          <img src="/DG_Long.png" alt="DARCYGRAPHiX" className="h-8 w-auto md:h-9" />
        </Link>
        <ShopButton asChild variant="primary" size="sm">
          <a href={orderHref}>Order Now</a>
        </ShopButton>
      </header>

      <main className="relative z-10 mx-auto max-w-[1400px] px-6 pt-10 pb-24 md:px-10 md:pt-14">
        <Link
          to="/"
          hash="services"
          className="shop-link-underline inline-flex items-center gap-2 font-shop-wide text-[0.72rem] font-semibold tracking-[0.18em] text-(--shop-red) uppercase"
        >
          ← Back to services
        </Link>

        <section
          id="top"
          className="relative mt-10 overflow-hidden rounded-[2rem] border border-(--shop-line) bg-(--shop-panel) p-8 shadow-[0_24px_60px_rgba(139,39,32,0.10)] md:p-14"
        >
          <div className="shop-halftone pointer-events-none absolute inset-0 rounded-[2rem] opacity-20" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(225,38,28,0.16),transparent_40%),radial-gradient(circle_at_90%_20%,rgba(214,60,50,0.12),transparent_36%)]" />

          <div className="relative flex flex-col gap-8">
            <div className="flex items-start justify-between">
              <div className="relative flex size-16 items-center justify-center rounded-2xl border border-(--shop-line-2) bg-[#ffe5df] text-(--shop-red)">
                <Icon className="size-8" />
              </div>
              <span className="font-shop-wide text-[0.7rem] font-semibold tracking-[0.3em] text-(--shop-ink-mute) uppercase">
                {no}
              </span>
            </div>

            <div>
              <span className="font-shop-wide text-[0.72rem] font-semibold tracking-[0.18em] text-(--shop-red) uppercase">
                ✦ Service showcase
              </span>
              <h1 className="mt-4 font-shop-display text-[clamp(2.4rem,7vw,5.5rem)] leading-[0.92] font-bold tracking-[-0.01em] italic">
                {name}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-pretty text-(--shop-ink-dim) md:text-lg">
                {blurb}
              </p>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4">
              <ShopButton asChild variant="primary">
                <a href={orderHref}>Order Now</a>
              </ShopButton>
              <ShopButton asChild variant="ghost">
                <Link to="/" hash="services">
                  Browse all services
                </Link>
              </ShopButton>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            [
              "How it works",
              "Tell us the what, where, and when. We quote it, proof it, then produce it.",
            ],
            [
              "Built in-house",
              "Print, fabrication, and finishing all happen with our own crew.",
            ],
            [
              "Friendly proofing",
              "You approve the artwork before anything goes to production.",
            ],
          ].map(([k, v]) => (
            <div
              key={k}
              className="relative flex flex-col gap-3 rounded-[1.75rem] border border-(--shop-line) bg-(--shop-panel) p-7 shadow-[0_18px_50px_rgba(139,39,32,0.07)]"
            >
              <h2 className="font-shop-wide text-base font-extrabold tracking-wider uppercase">
                {k}
              </h2>
              <p className="text-sm leading-relaxed text-(--shop-ink-dim)">{v}</p>
            </div>
          ))}
        </section>

        <ShowcaseSamples serviceSlug={slug} serviceName={name} Icon={Icon} />

        <div className="mt-10 flex gap-4">
          {prev ? (
            <Link
              to="/showcase/$service"
              params={{ service: prev.slug }}
              className={`group flex min-w-0 ${next ? "flex-[1_1_0%] items-center justify-between p-5 md:p-6" : "flex-1 items-center justify-between p-7 md:p-8"} rounded-[1.5rem] border border-(--shop-line) bg-(--shop-bg-2) transition-[border-color,background-color] duration-300 hover:border-[rgba(225,38,28,0.38)] hover:bg-[#fff0ec]`}
            >
              <span className="font-shop-wide text-[0.72rem] font-semibold tracking-[0.18em] text-(--shop-red) uppercase transition-transform duration-300 group-hover:-translate-x-1">
                ←
              </span>
              <div className="flex min-w-0 flex-col items-end gap-1">
                <span className="font-shop-wide text-[0.6rem] font-semibold tracking-[0.3em] text-(--shop-ink-mute) uppercase">
                  Previous · {prev.no}
                </span>
                <span
                  className={`truncate font-shop-wide font-bold ${next ? "text-sm md:text-base" : "text-lg"}`}
                >
                  {prev.name}
                </span>
              </div>
            </Link>
          ) : null}

          {next ? (
            <Link
              to="/showcase/$service"
              params={{ service: next.slug }}
              className={`group flex min-w-0 ${prev ? "flex-[4_4_0%] p-7 md:p-8" : "flex-1 p-7 md:p-8"} items-center justify-between rounded-[1.5rem] border border-(--shop-line) bg-(--shop-bg-2) transition-[border-color,background-color] duration-300 hover:border-[rgba(225,38,28,0.38)] hover:bg-[#fff0ec]`}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-shop-wide text-[0.6rem] font-semibold tracking-[0.3em] text-(--shop-ink-mute) uppercase">
                  Next service · {next.no}
                </span>
                <span className="truncate font-shop-wide text-lg font-bold">
                  {next.name}
                </span>
              </div>
              <span className="shrink-0 font-shop-wide text-[0.72rem] font-semibold tracking-[0.18em] text-(--shop-red) uppercase transition-transform duration-300 group-hover:translate-x-1">
                View →
              </span>
            </Link>
          ) : null}
        </div>
      </main>

      <footer className="relative z-10 bg-(--shop-bg) px-6 py-10 md:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-4 text-xs text-(--shop-ink-mute) md:flex-row md:items-center">
          <span>
            © {new Date().getFullYear()} DARCYGRAPHiX Advertising. All rights reserved.
          </span>
          <div className="flex items-center gap-2">
            <img
              src="/DG_SHORT_SVG.svg"
              alt=""
              className="h-5 w-auto rounded-sm bg-white p-0.5"
            />
          </div>
        </div>
      </footer>
    </>
  );
}
