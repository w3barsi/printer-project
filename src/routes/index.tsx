import { createFileRoute, Link } from "@tanstack/react-router";

import { MARQUEE_ITEMS, SERVICES, SHOP_THEME, type Service } from "@/lib/services";

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

/* ------------------------------------------------------------------ */

function ShopHeader() {
  return (
    <header className="relative z-20 mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-10">
      <a href="#top" className="group flex items-center gap-3">
        <img
          src="/DG_SHORT_SVG.svg"
          alt=""
          className="h-10 w-auto rounded-2xl border border-white/80 bg-white p-1.5 shadow-sm md:h-11"
        />
        <img src="/DG_Long.png" alt="DARCYGRAPHiX" className="h-8 w-auto md:h-9" />
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
          className="shop-eyebrow shop-link-underline hidden !tracking-[0.16em] sm:inline"
        >
          Staff login
        </Link>
        <a
          href="#contact"
          className="shop-btn shop-btn-primary !rounded-full !px-5 !py-2.5"
        >
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
      className="relative z-10 mx-auto max-w-[1400px] px-6 pt-10 pb-20 md:px-10 md:pt-14"
    >
      {/* warm ink-and-paper blobs */}
      <div
        className="shop-blob shop-blob-red top-24 -left-20 h-[420px] w-[420px] opacity-30"
        aria-hidden
      />
      <div
        className="shop-blob shop-blob-white top-40 right-[-10%] h-[380px] w-[380px] opacity-60"
        aria-hidden
      />
      <div
        className="shop-blob shop-blob-silver top-[420px] left-1/3 h-[300px] w-[300px] opacity-40"
        aria-hidden
      />

      {/* DG watermark */}
      <img
        src="/DG_SHORT_BORDERED.png"
        alt=""
        className="pointer-events-none absolute top-[10%] right-[-8%] z-0 w-[55%] max-w-[520px] opacity-[0.08] md:top-[5%] md:right-[2%] md:w-[40%]"
      />

      <div className="relative grid gap-12 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
        <div>
          <div className="shop-rise shop-rise-1 mb-8 flex items-center gap-3">
            <span className="h-px w-10 bg-(--shop-red)" />
            <span className="shop-eyebrow !tracking-[0.18em] !text-(--shop-red)">
              Friendly print, signage &amp; fabrication
            </span>
          </div>

          <h1 className="shop-font-display shop-rise shop-rise-2 text-[clamp(3.2rem,10vw,9rem)] leading-[0.88]">
            <span className="block">MAKE YOUR</span>
            <span className="block">
              <span className="shop-stroke">BRAND</span>
            </span>
            <span className="block">
              <span
                className="text-(--shop-red) drop-shadow-[0_12px_28px_rgba(242,92,61,0.22)]"
                style={{ animationDelay: "0.6s" }}
              >
                EASY TO SPOT.
              </span>
            </span>
          </h1>

          <p className="shop-rise shop-rise-4 mt-8 max-w-xl text-base leading-relaxed text-pretty text-(--shop-ink-dim) md:text-lg">
            Big-format print, signage, acrylic, awards, and event pieces made by a crew
            that talks clearly, proofs carefully, and helps you get the job done without
            the guesswork.
          </p>

          <div className="shop-rise shop-rise-5 mt-10 flex flex-wrap items-center gap-4">
            <a href="#contact" className="shop-btn shop-btn-primary !rounded-full">
              Request a quote
            </a>
            <a href="#services" className="shop-btn shop-btn-ghost !rounded-full">
              See services
            </a>
          </div>

          <div className="shop-rise shop-rise-6 mt-12 flex flex-wrap items-center gap-x-8 gap-y-3">
            {["Clear quotes", "Artwork help", "Built in-house"].map((t) => (
              <div
                key={t}
                className="flex items-center gap-2 text-sm text-(--shop-ink-dim)"
              >
                <span className="text-[0.7rem] text-(--shop-red)">✦</span>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* friendly shop-window panel */}
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
    <div className="relative mx-auto w-full max-w-sm rotate-1 rounded-[2rem] border border-(--shop-line-2) bg-(--shop-panel) p-7 shadow-[0_28px_80px_rgba(139,39,32,0.14)]">
      <div className="shop-halftone pointer-events-none absolute inset-0 rounded-[2rem] opacity-20" />
      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <span className="shop-eyebrow !text-[0.62rem] !tracking-[0.18em]">
            Shop window preview
          </span>
          <span className="flex items-center gap-1.5 text-[0.62rem] text-(--shop-ink-mute)">
            <span className="size-1.5 animate-pulse rounded-full bg-(--shop-red)" />
            READY
          </span>
        </div>

        <div className="rounded-[1.35rem] border border-(--shop-line) bg-[#ffe5df] p-6 text-center shadow-inner">
          <div
            className="shop-font-display text-5xl text-(--shop-red)"
            style={{ animationDelay: "0.2s" }}
          >
            HELLO
          </div>
          <div className="shop-font-serif mt-3 text-xl text-(--shop-ink-dim) italic">
            we made your sign
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <img src="/DG_SHORT_BORDERED.png" alt="" className="h-20 w-auto opacity-90" />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-(--shop-ink-mute)">
          We help choose materials, prepare artwork, print, fabricate, and install when
          your project needs it.
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
      className="relative z-10 border-y border-(--shop-line) bg-(--shop-bg-2) py-5"
      aria-label="Services"
    >
      <div className="flex overflow-hidden">
        <div className="shop-marquee shop-marquee-fwd">
          {row.map((item, i) => (
            <span key={i} className="flex items-center">
              <span className="shop-font-display px-6 text-2xl text-(--shop-ink)">
                {item}
              </span>
              <span className="text-lg text-(--shop-red)">✦</span>
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
      className="relative z-10 mx-auto max-w-350 px-6 py-24 md:px-10 md:py-32"
    >
      <SectionHead
        no="§ 01"
        title="Start with what you need made"
        sub="From one banner to a full storefront, we make the practical pieces that help customers notice, understand, and remember you."
      />

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

/* ------------------------------------------------------------------ */

function ShopProcess() {
  const steps = [
    {
      no: "01",
      title: "Brief",
      body: "Tell us the what, where, and when. We quote it - most jobs same day.",
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
      className="relative z-10 border-y border-(--shop-line) bg-(--shop-bg-2) py-24 md:py-32"
    >
      <div className="shop-halftone pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative mx-auto max-w-350 px-6 md:px-10">
        <SectionHead
          no="§ 02"
          title="An easy path from idea to installed"
          sub="Four clear steps, one crew, and proofs before production so you always know what is happening."
        />

        <ol className="mt-14 grid gap-4 md:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.no}
              className="relative flex flex-col gap-4 rounded-[1.75rem] border border-(--shop-line) bg-(--shop-panel) p-7 shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="shop-font-display text-5xl text-(--shop-ink-mute)">
                  {s.no}
                </span>
                <RegMark
                  className={i % 2 === 0 ? "text-(--shop-red)" : "text-(--shop-silver)"}
                />
              </div>
              <h3 className="shop-font-wide text-xl font-extrabold tracking-wide uppercase">
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-(--shop-ink-dim)">{s.body}</p>
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
      k: "Clear",
      v: "You get practical options, plain-language pricing, and proofs before we produce.",
    },
    {
      k: "Helpful",
      v: "Bring a finished file or a rough idea. We can help shape it into something print-ready.",
    },
    {
      k: "Capable",
      v: "From a single engraved plaque to a full building wrap, the work stays with our team.",
    },
  ];
  return (
    <section
      id="capabilities"
      className="relative z-10 mx-auto max-w-350 px-6 py-24 md:px-10 md:py-32"
    >
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <SectionHead
            no="§ 03"
            title="Serious production, easy conversation"
            sub="We keep the machines, materials, and people close together so your project feels simpler from the first message to the final install."
            align="left"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {caps.map((c, i) => (
            <div
              key={c.k}
              className="relative flex flex-col gap-3 rounded-[1.75rem] border border-(--shop-line) bg-(--shop-panel) p-7 shadow-[0_18px_50px_rgba(139,39,32,0.07)]"
            >
              <span
                className={`shop-font-display text-3xl ${
                  ["text-(--shop-red)", "text-(--shop-silver)", "text-(--shop-ink)"][i]
                }`}
              >
                0{i + 1}
              </span>
              <h3 className="shop-font-wide text-base font-extrabold tracking-wider uppercase">
                {c.k}
              </h3>
              <p className="text-sm leading-relaxed text-(--shop-ink-dim)">{c.v}</p>
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
      className="relative z-10 overflow-hidden border-y border-(--shop-line) bg-(--shop-bg-2) py-24 md:py-36"
    >
      <div
        className="shop-blob shop-blob-red top-[-20%] left-[-10%] h-115 w-115 opacity-40"
        aria-hidden
      />
      <div
        className="shop-blob shop-blob-white right-[-15%] bottom-[-30%] h-105 w-105 opacity-40"
        aria-hidden
      />
      <div className="shop-halftone-red pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative mx-auto max-w-275 px-6 text-center md:px-10">
        <span className="shop-eyebrow !tracking-[0.18em] !text-(--shop-red)">
          ✦ Tell us what you are making
        </span>
        <h2 className="shop-font-display mx-auto mt-6 max-w-4xl text-[clamp(2.6rem,9vw,7rem)] leading-[0.92]">
          Let's make
          <br />
          <span className="text-(--shop-red)">this easy.</span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-(--shop-ink-dim) md:text-lg">
          Send the item, size, quantity, deadline, and any artwork you have. We'll reply
          with the next practical step.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="mailto:hello@darcygraphix.com"
            className="shop-btn shop-btn-primary !rounded-full"
          >
            hello@darcygraphix.com
          </a>
          <a href="#services" className="shop-btn shop-btn-ghost !rounded-full">
            Browse services
          </a>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            ["Email", "hello@darcygraphix.com"],
            ["Web", "darcygraphix.com"],
            ["Based in", "the Philippines"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex flex-col items-center gap-2 rounded-[1.5rem] border border-(--shop-line) bg-(--shop-panel) px-4 py-7 shadow-[0_18px_50px_rgba(139,39,32,0.07)]"
            >
              <span className="shop-eyebrow !text-[0.6rem] text-(--shop-ink-mute)">
                {k}
              </span>
              <span className="shop-font-wide text-sm font-semibold text-(--shop-ink)">
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
        <span className="shop-eyebrow !text-(--shop-red)">{no}</span>
        <span className="h-px w-10 bg-(--shop-red)" />
      </div>
      <h2 className="shop-font-display mt-5 text-[clamp(2rem,5.5vw,4rem)] leading-[0.95]">
        {title}
      </h2>
      <p className="mt-5 text-base leading-relaxed text-(--shop-ink-dim) md:text-lg">
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
      className={`pointer-events-none absolute ${className} z-20 hidden text-(--shop-line-2) md:block`}
      aria-hidden
    >
      <RegMark />
    </span>
  );
}
