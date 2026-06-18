import { createFileRoute, Link } from "@tanstack/react-router";
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

export const Route = createFileRoute("/")({
  component: ShopHome,
});

type Service = {
  no: string;
  name: string;
  blurb: string;
  icon: LucideIcon;
  accent: "magenta" | "cyan" | "yellow" | "red";
  plate: string;
};

const SERVICES: Service[] = [
  {
    no: "01",
    name: "Large-Format Digital Printing",
    blurb:
      "Billboards, backlit films, and oversized prints with saturated color that holds up at any scale.",
    icon: PrinterIcon,
    accent: "cyan",
    plate: "K",
  },
  {
    no: "02",
    name: "Tarpaulins & Banners",
    blurb:
      "Weatherproof tarps and banners built for the street — grommeted, hemmed, ready to hang.",
    icon: FlagIcon,
    accent: "magenta",
    plate: "M",
  },
  {
    no: "03",
    name: "Commercial & Business Signage",
    blurb:
      "Storefronts, wayfinding, and 3D letter signs that make a business impossible to miss.",
    icon: StoreIcon,
    accent: "cyan",
    plate: "C",
  },
  {
    no: "04",
    name: "LED & Neon Signs",
    blurb:
      "Hand-bent neon and LED channel letters wired to glow day and night, indoors and out.",
    icon: LightbulbIcon,
    accent: "yellow",
    plate: "Y",
  },
  {
    no: "05",
    name: "Acrylic Fabrication",
    blurb:
      "Cut, bent, and polished acrylic for light boxes, display stands, and one-off custom builds.",
    icon: LayersIcon,
    accent: "cyan",
    plate: "C",
  },
  {
    no: "06",
    name: "Awards, Plaques & Medals",
    blurb:
      "Engraved plaques, cast medals, and trophies that make an achievement feel permanent.",
    icon: AwardIcon,
    accent: "yellow",
    plate: "Y",
  },
  {
    no: "07",
    name: "Vehicle Graphics & Wraps",
    blurb:
      "Full and partial wraps, magnetic signage, and fleet branding that turns traffic into impressions.",
    icon: CarIcon,
    accent: "magenta",
    plate: "M",
  },
  {
    no: "08",
    name: "Advertising Materials",
    blurb: "Posters, flyers, standees, and promo kits produced fast and finished clean.",
    icon: MegaphoneIcon,
    accent: "cyan",
    plate: "K",
  },
  {
    no: "09",
    name: "Graphic Design",
    blurb:
      "Layout, identity, and artwork — the design work that makes the print worth printing.",
    icon: PenToolIcon,
    accent: "cyan",
    plate: "C",
  },
  {
    no: "10",
    name: "Custom Event Printing",
    blurb:
      "Backdrops, banners, and one-off pieces for launches, parties, and corporate events.",
    icon: PartyPopperIcon,
    accent: "yellow",
    plate: "Y",
  },
  {
    no: "11",
    name: "Promotional Materials",
    blurb: "Branded merch, tags, and giveaways that keep a logo in customers' hands.",
    icon: GiftIcon,
    accent: "magenta",
    plate: "M",
  },
  {
    no: "12",
    name: "Digital Printing Services",
    blurb:
      "Short-run digital prints with quick turnaround — proofs the same day when possible.",
    icon: ImageIcon,
    accent: "cyan",
    plate: "C",
  },
];

const MARQUEE_ITEMS = [
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

const ACCENT_TEXT: Record<Service["accent"], string> = {
  magenta: "shop-neon-magenta",
  cyan: "shop-neon-cyan",
  yellow: "shop-neon-yellow",
  red: "shop-neon-red",
};
const ACCENT_SOLID: Record<Service["accent"], string> = {
  magenta: "text-[var(--shop-magenta)]",
  cyan: "text-[var(--shop-cyan)]",
  yellow: "text-[var(--shop-yellow)]",
  red: "text-[var(--shop-red)]",
};

function ShopHome() {
  return (
    <div className="shop shop-grain">
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

/* ------------------------------------------------------------------ */

function ShopHeader() {
  return (
    <header className="relative z-20 mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-10">
      <a href="#top" className="group flex items-center gap-3">
        <RegMark className="shop-reg-spin text-[var(--shop-coral)]" />
        <span className="shop-font-display text-xl tracking-tight">
          DARCY<span className="text-[var(--shop-coral)]">GRAPH</span>iX
        </span>
      </a>
      <nav className="hidden items-center gap-9 md:flex">
        {[
          ["Services", "#services"],
          ["Process", "#process"],
          ["Capabilities", "#capabilities"],
          ["Contact", "#contact"],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            className="shop-link-underline shop-eyebrow !tracking-[0.2em]"
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <Link
          to="/app/jo"
          className="shop-eyebrow shop-link-underline hidden !tracking-[0.2em] sm:inline"
        >
          Staff login
        </Link>
        <a href="#contact" className="shop-btn shop-btn-ghost !px-4 !py-2.5">
          Get a quote
        </a>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */

function ShopHero() {
  return (
    <section
      id="top"
      className="relative z-10 mx-auto max-w-[1400px] px-6 pt-14 pb-20 md:px-10 md:pt-20"
    >
      {/* ambient neon blobs */}
      <div
        className="shop-blob shop-blob-magenta top-24 -left-20 h-[420px] w-[420px]"
        aria-hidden
      />
      <div
        className="shop-blob shop-blob-cyan top-40 right-[-10%] h-[380px] w-[380px]"
        aria-hidden
      />
      <div
        className="shop-blob shop-blob-yellow top-[420px] left-1/3 h-[300px] w-[300px] opacity-30"
        aria-hidden
      />

      <div className="relative grid gap-12 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
        <div>
          <div className="shop-rise shop-rise-1 mb-8 flex items-center gap-3">
            <span className="h-px w-10 bg-[var(--shop-coral)]" />
            <span className="shop-eyebrow !text-[var(--shop-coral)]">
              Est. — Advertising &amp; Signage
            </span>
          </div>

          <h1 className="shop-font-display shop-rise shop-rise-2 text-[clamp(3.4rem,12vw,11rem)]">
            <span className="block">PRINT</span>
            <span className="block">
              <span className="shop-stroke">SOMETHING</span>
            </span>
            <span className="block">
              <span
                className="shop-neon-magenta shop-flicker shop-flicker-fast"
                style={{ animationDelay: "0.6s" }}
              >
                LOUD.
              </span>
            </span>
          </h1>

          <p className="shop-rise shop-rise-4 mt-8 max-w-xl text-base leading-relaxed text-pretty text-[var(--shop-ink-dim)] md:text-lg">
            Big-format print, neon, signage, and custom fabrication for brands that refuse
            to blend in. We design it, print it, build it, and hang it — under one roof.
          </p>

          <div className="shop-rise shop-rise-5 mt-10 flex flex-wrap items-center gap-4">
            <a href="#contact" className="shop-btn shop-btn-primary">
              Request a quote
            </a>
            <a href="#services" className="shop-btn shop-btn-ghost">
              See services
            </a>
          </div>

          <div className="shop-rise shop-rise-6 mt-12 flex flex-wrap items-center gap-x-8 gap-y-3">
            {["Same-day quotes", "In-house fabrication", "Any scale"].map((t) => (
              <div
                key={t}
                className="flex items-center gap-2 text-sm text-[var(--shop-ink-dim)]"
              >
                <span className="shop-neon-cyan text-[0.7rem]">✦</span>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* mock LED sign panel */}
        <div className="shop-rise shop-rise-5 relative">
          <SignPanel />
        </div>
      </div>

      {/* corner registration marks */}
      <RegCorner className="top-3 left-3" />
      <RegCorner className="top-3 right-3" />
    </section>
  );
}

function SignPanel() {
  return (
    <div className="relative mx-auto w-full max-w-sm rounded-md border border-[var(--shop-line-2)] bg-[var(--shop-bg-2)] p-8">
      <div className="shop-halftone pointer-events-none absolute inset-0 rounded-md opacity-40" />
      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <span className="shop-eyebrow !text-[0.62rem]">Channel Letter · Live</span>
          <span className="flex items-center gap-1.5 text-[0.62rem] text-[var(--shop-ink-mute)]">
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--shop-yellow)]" />
            ON
          </span>
        </div>

        <div className="rounded-sm border border-[var(--shop-line)] bg-black/60 p-7 text-center">
          <div
            className="shop-font-display shop-neon-yellow shop-flicker text-5xl"
            style={{ animationDelay: "0.2s" }}
          >
            OPEN
          </div>
          <div className="shop-font-serif mt-3 text-xl text-[var(--shop-ink-dim)] italic">
            for business
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          {["C", "M", "Y"].map((c, i) => (
            <div
              key={c}
              className="shop-font-display rounded-sm border border-[var(--shop-line)] py-3 text-2xl"
              style={{
                color: ["var(--shop-cyan)", "var(--shop-magenta)", "var(--shop-yellow)"][
                  i
                ],
              }}
            >
              {c}
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-[var(--shop-ink-mute)]">
          Hand-bent neon &amp; LED channel letters — wired, weatherproofed, and installed
          by our crew.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ShopMarquee() {
  const row = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <section
      className="relative z-10 border-y border-[var(--shop-line)] bg-[var(--shop-bg-2)] py-5"
      aria-label="Services"
    >
      <div className="flex overflow-hidden">
        <div className="shop-marquee shop-marquee-fwd">
          {row.map((item, i) => (
            <span key={i} className="flex items-center">
              <span className="shop-font-display px-6 text-2xl text-[var(--shop-ink)]">
                {item}
              </span>
              <span className="shop-neon-magenta text-lg">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function ShopServices() {
  return (
    <section
      id="services"
      className="relative z-10 mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32"
    >
      <SectionHead
        no="§ 01"
        title="What comes off the shop floor"
        sub="Twelve things we print, bend, cut, and fabricate — most of them under one roof, all of them built to be seen."
      />

      <div className="mt-14 grid gap-px overflow-hidden rounded-md border border-[var(--shop-line)] bg-[var(--shop-line)] sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <ServiceCard key={s.no} service={s} />
        ))}
      </div>
    </section>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const Icon = service.icon;
  return (
    <div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty(
          "--mx",
          `${((e.clientX - r.left) / r.width) * 100}%`,
        );
        e.currentTarget.style.setProperty(
          "--my",
          `${((e.clientY - r.top) / r.height) * 100}%`,
        );
      }}
      className="shop-card group relative flex flex-col gap-6 bg-[var(--shop-panel)] p-7 md:p-8"
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex size-12 items-center justify-center rounded-sm border border-[var(--shop-line-2)] ${ACCENT_SOLID[service.accent]}`}
        >
          <Icon className="size-6" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="shop-eyebrow !text-[0.6rem] !tracking-[0.3em] text-[var(--shop-ink-mute)]">
            {service.no}
          </span>
          <span className={`shop-font-display text-xl ${ACCENT_TEXT[service.accent]}`}>
            {service.plate}
          </span>
        </div>
      </div>

      <div className="mt-auto">
        <h3 className="shop-font-wide text-lg leading-snug font-bold">{service.name}</h3>
        <p className="mt-3 text-sm leading-relaxed text-[var(--shop-ink-dim)]">
          {service.blurb}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--shop-line)] pt-5">
        <span className="shop-eyebrow !text-[0.6rem] text-[var(--shop-ink-mute)]">
          In-house
        </span>
        <span
          className={`translate-x-1 text-sm opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 ${ACCENT_SOLID[service.accent]}`}
        >
          →
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ShopProcess() {
  const steps = [
    {
      no: "01",
      title: "Brief",
      body: "Tell us the what, where, and when. We quote it — most jobs same day.",
    },
    {
      no: "02",
      title: "Design",
      body: "We lay it out and send a proof. You approve the artwork before anything prints.",
    },
    {
      no: "03",
      title: "Produce",
      body: "Print, cut, bend, fabricate. Your job runs across the shop floor.",
    },
    {
      no: "04",
      title: "Install",
      body: "Delivery or on-site installation. We don't hand off until it's up and right.",
    },
  ];
  return (
    <section
      id="process"
      className="relative z-10 border-y border-[var(--shop-line)] bg-[var(--shop-bg-2)] py-24 md:py-32"
    >
      <div className="shop-halftone pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <SectionHead
          no="§ 02"
          title="How a job runs through the shop"
          sub="Four steps, one crew, no handoffs to strangers."
        />

        <ol className="mt-14 grid gap-px overflow-hidden rounded-md border border-[var(--shop-line)] bg-[var(--shop-line)] md:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.no}
              className="relative flex flex-col gap-4 bg-[var(--shop-panel)] p-7 md:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="shop-font-display text-5xl text-[var(--shop-ink-mute)]">
                  {s.no}
                </span>
                <RegMark
                  className={
                    i % 2 === 0 ? "text-[var(--shop-coral)]" : "text-[var(--shop-cyan)]"
                  }
                />
              </div>
              <h3 className="shop-font-wide text-xl font-extrabold tracking-wide uppercase">
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--shop-ink-dim)]">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function ShopCapabilities() {
  const caps = [
    {
      k: "Fast",
      v: "Most jobs quoted same-day. Short-run digital prints proofed quickly.",
    },
    {
      k: "In-house",
      v: "Print, fabricate, and finish under one roof — fewer handoffs, tighter quality.",
    },
    {
      k: "Any scale",
      v: "From a single engraved plaque to a full building wrap.",
    },
  ];
  return (
    <section
      id="capabilities"
      className="relative z-10 mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32"
    >
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <SectionHead
            no="§ 03"
            title="A print shop, not a middleman"
            sub="We keep the machines, the materials, and the crew in one place — so a job doesn't get lost between vendors."
            align="left"
          />
        </div>

        <div className="grid gap-px overflow-hidden rounded-md border border-[var(--shop-line)] bg-[var(--shop-line)] sm:grid-cols-3">
          {caps.map((c, i) => (
            <div
              key={c.k}
              className="relative flex flex-col gap-3 bg-[var(--shop-panel)] p-7"
            >
              <span
                className={`shop-font-display text-3xl ${
                  ["shop-neon-magenta", "shop-neon-cyan", "shop-neon-yellow"][i]
                }`}
              >
                0{i + 1}
              </span>
              <h3 className="shop-font-wide text-base font-extrabold tracking-wider uppercase">
                {c.k}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--shop-ink-dim)]">{c.v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function ShopContact() {
  return (
    <section
      id="contact"
      className="relative z-10 overflow-hidden border-y border-[var(--shop-line)] bg-[var(--shop-bg-2)] py-24 md:py-36"
    >
      <div
        className="shop-blob shop-blob-magenta top-[-20%] left-[-10%] h-[460px] w-[460px] opacity-40"
        aria-hidden
      />
      <div
        className="shop-blob shop-blob-cyan right-[-15%] bottom-[-30%] h-[420px] w-[420px] opacity-40"
        aria-hidden
      />
      <div className="shop-halftone-magenta pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative mx-auto max-w-[1100px] px-6 text-center md:px-10">
        <span className="shop-eyebrow !text-[var(--shop-coral)]">
          ✦ Ready when you are
        </span>
        <h2 className="shop-font-display mx-auto mt-6 max-w-4xl text-[clamp(2.6rem,9vw,7rem)] leading-[0.92]">
          Let's print
          <br />
          <span className="shop-neon-cyan shop-flicker">something loud.</span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-[var(--shop-ink-dim)] md:text-lg">
          Send us a brief — the what, the size, the deadline — and we'll quote it back,
          usually within a day.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a href="mailto:hello@darcygraphix.com" className="shop-btn shop-btn-primary">
            hello@darcygraphix.com
          </a>
          <a href="#services" className="shop-btn shop-btn-ghost">
            Browse services
          </a>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-md border border-[var(--shop-line)] bg-[var(--shop-line)] sm:grid-cols-3">
          {[
            ["Email", "hello@darcygraphix.com"],
            ["Web", "darcygraphix.com"],
            ["Based in", "the Philippines"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex flex-col items-center gap-2 bg-[var(--shop-panel)] px-4 py-7"
            >
              <span className="shop-eyebrow !text-[0.6rem] text-[var(--shop-ink-mute)]">
                {k}
              </span>
              <span className="shop-font-wide text-sm font-semibold text-[var(--shop-ink)]">
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function ShopFooter() {
  return (
    <footer className="relative z-10 bg-[var(--shop-bg)] px-6 py-16 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <RegMark className="shop-reg-spin text-[var(--shop-coral)]" />
              <span className="shop-font-display text-2xl">
                DARCY<span className="text-[var(--shop-coral)]">GRAPH</span>iX
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--shop-ink-dim)]">
              Advertising, signage, and print — designed, produced, and installed by one
              crew.
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

        <div className="flex flex-col items-start justify-between gap-4 text-xs text-[var(--shop-ink-mute)] md:flex-row md:items-center">
          <span>
            © {new Date().getFullYear()} DARCYGRAPHiX Advertising. All rights reserved.
          </span>
          <div className="flex items-center gap-2">
            <span className="shop-eyebrow !text-[0.58rem]">C · M · Y · K</span>
            <span className="shop-neon-magenta">✦</span>
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
                className="shop-link-underline text-sm text-[var(--shop-ink-dim)] transition-colors hover:text-[var(--shop-ink)]"
              >
                {label}
              </Link>
            ) : (
              <a
                href={href}
                className="shop-link-underline text-sm text-[var(--shop-ink-dim)] transition-colors hover:text-[var(--shop-ink)]"
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

/* ------------------------------------------------------------------ */

function SectionHead({
  no,
  title,
  sub,
  align = "left",
}: {
  no: string;
  title: string;
  sub: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <div
        className={`flex items-center gap-3 ${align === "center" ? "justify-center" : ""}`}
      >
        <span className="shop-eyebrow !text-[var(--shop-coral)]">{no}</span>
        <span className="h-px w-10 bg-[var(--shop-coral)]" />
      </div>
      <h2 className="shop-font-display mt-5 text-[clamp(2rem,5.5vw,4rem)] leading-[0.95]">
        {title}
      </h2>
      <p className="mt-5 text-base leading-relaxed text-[var(--shop-ink-dim)] md:text-lg">
        {sub}
      </p>
    </div>
  );
}

function RegMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`shop-reg ${className}`}
      style={{ width: "0.9em", height: "0.9em" }}
      aria-hidden
    />
  );
}

function RegCorner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none absolute ${className} z-20 hidden text-[var(--shop-line-2)] md:block`}
      aria-hidden
    >
      <RegMark />
    </span>
  );
}
