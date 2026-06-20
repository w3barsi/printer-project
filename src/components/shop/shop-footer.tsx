import { Link } from "@tanstack/react-router";

export function ShopFooter() {
  return (
    <footer className="relative z-10 bg-(--shop-bg) px-6 py-16 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <img src="/DG_Long.png" alt="DARCYGRAPHiX" className="h-10 w-auto md:h-12" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-(--shop-ink-dim)">
              Advertising, signage, and print made by a team that keeps the process clear
              and approachable.
            </p>
          </div>

          <FooterCol
            title="Services"
            links={[
              ["Large-format print", "#services"],
              ["LED & neon", "#services"],
              ["Signage", "#services"],
              ["Awards & plaques", "#services"],
            ]}
          />
          <FooterCol
            title="Shop"
            links={[
              ["Process", "#process"],
              ["Capabilities", "#capabilities"],
              ["Get a quote", "#contact"],
            ]}
          />
          <FooterCol
            title="Contact"
            links={[
              ["hello@darcygraphix.com", "mailto:hello@darcygraphix.com"],
              ["darcygraphix.com", "#"],
              ["Staff login", "/app/jo"],
            ]}
          />
        </div>

        <div className="shop-rule my-10" />

        <div className="flex flex-col items-start justify-between gap-4 text-xs text-(--shop-ink-mute) md:flex-row md:items-center">
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
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="shop-eyebrow !text-[0.62rem]">{title}</h4>
      <ul className="mt-5 space-y-3">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("/") ? (
              <Link
                to={href}
                className="shop-link-underline text-sm text-(--shop-ink-dim) transition-colors hover:text-(--shop-ink)"
              >
                {label}
              </Link>
            ) : (
              <a
                href={href}
                className="shop-link-underline text-sm text-(--shop-ink-dim) transition-colors hover:text-(--shop-ink)"
              >
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
