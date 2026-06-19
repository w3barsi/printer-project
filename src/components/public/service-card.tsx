import { Link } from "@tanstack/react-router";

import { type Service } from "@/lib/services";

export function ServiceCard({ service }: { service: Service }) {
  const Icon = service.icon;
  return (
    <Link
      to="/showcase/$service"
      params={{ service: service.slug }}
      className="group relative flex min-h-64 flex-col gap-6 overflow-hidden rounded-[1.75rem] border border-(--shop-line) bg-(--shop-panel) p-7 shadow-[0_18px_50px_rgba(139,39,32,0.08)] transition-[border-color,box-shadow,background-color] duration-300 hover:border-[rgba(225,38,28,0.38)] hover:bg-[#fff0ec] hover:shadow-[0_24px_60px_rgba(139,39,32,0.13)] md:p-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(225,38,28,0.14),transparent_38%),radial-gradient(circle_at_90%_18%,rgba(214,60,50,0.1),transparent_34%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <div className="relative flex size-12 items-center justify-center rounded-2xl border border-(--shop-line-2) bg-[#ffe5df] text-(--shop-red) transition-colors duration-300 group-hover:border-[rgba(225,38,28,0.45)] group-hover:bg-[#ffd9cc]">
          <Icon className="size-6" />
        </div>
        <span className="shop-eyebrow !text-[0.6rem] !tracking-[0.3em] text-(--shop-ink-mute)">
          {service.no}
        </span>
      </div>

      <div className="mt-auto">
        <h3 className="shop-font-wide text-lg leading-snug font-bold">{service.name}</h3>
        <p className="mt-3 text-sm leading-relaxed text-(--shop-ink-dim)">
          {service.blurb}
        </p>
        <span className="shop-eyebrow mt-5 flex items-center gap-1.5 !text-[0.6rem] !tracking-[0.2em] !text-(--shop-red) opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          View showcase
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
