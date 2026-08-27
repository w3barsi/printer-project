import type { LucideIcon } from "lucide-react";
import { useState } from "react";

type ShowcaseSample = {
  tag: string;
  title: string;
  desc: string;
  photos?: [string, string, string];
};

const SAMPLE_SLOTS = 6;

const SERVICE_SAMPLES: Record<string, ShowcaseSample[]> = {
  "awards-plaques-medals": [
    {
      tag: "SAMPLE 01",
      title: "Awards & plaques sample",
      desc: "Hover left, center, or right to compare three views from this sample.",
      photos: [
        "https://drive.darcygraphix.com/5ad65b30-50e5-41e0-8fab-a2ded832f57f",
        "https://drive.darcygraphix.com/65947f60-60ab-4e62-864d-925fabbb4fb2",
        "https://drive.darcygraphix.com/5963c4a4-9933-46bf-a5ea-3545934f8750",
      ],
    },
  ],
};

export function ShowcaseSamples({
  serviceSlug,
  serviceName,
  Icon,
}: {
  serviceSlug: string;
  serviceName: string;
  Icon: LucideIcon;
}) {
  const samples = getShowcaseSamples(serviceSlug);

  return (
    <section className="mt-10">
      <div className="flex items-center gap-3">
        <span className="font-shop-wide text-[0.72rem] font-semibold tracking-[0.34em] text-(--shop-red) uppercase">
          § Sample output
        </span>
        <span className="h-px w-10 bg-(--shop-red)" />
      </div>
      <h2 className="mt-5 font-shop-display text-[clamp(1.6rem,4vw,2.6rem)] leading-[0.95] font-bold tracking-[-0.01em] italic">
        Work from the shop floor
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-(--shop-ink-dim) md:text-base">
        A few pieces from past {serviceName.toLowerCase()} jobs. Final colors, materials,
        and finish vary by spec - we proof everything before production.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {samples.map((s, i) => (
          <figure
            key={i}
            className="group relative overflow-hidden rounded-[1.5rem] border border-(--shop-line) bg-(--shop-panel) shadow-[0_18px_50px_rgba(139,39,32,0.07)] transition-shadow duration-300 hover:shadow-[0_24px_60px_rgba(139,39,32,0.13)]"
          >
            {s.photos ? (
              <SamplePhotoSwitcher
                photos={s.photos}
                title={s.title}
                index={i}
                total={samples.length}
              />
            ) : (
              <SamplePlaceholder
                tag={s.tag}
                index={i}
                total={samples.length}
                Icon={Icon}
              />
            )}
            <figcaption className="flex flex-col gap-1 p-5">
              <span className="font-shop-wide text-sm font-bold">{s.title}</span>
              <span className="text-xs leading-relaxed text-(--shop-ink-mute)">
                {s.desc}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      <p className="mt-6 text-xs text-(--shop-ink-mute)">
        Hover image samples left, center, or right to preview alternate views. Empty slots
        are placeholders while more photos are added.
      </p>
    </section>
  );
}

function getShowcaseSamples(slug: string): ShowcaseSample[] {
  const serviceSamples = SERVICE_SAMPLES[slug] ?? [];

  return Array.from({ length: SAMPLE_SLOTS }, (_, i) => {
    return (
      serviceSamples[i] ?? {
        tag: `SAMPLE ${String(i + 1).padStart(2, "0")}`,
        title: "Placeholder piece",
        desc: "Sample description coming soon.",
      }
    );
  });
}

function SamplePhotoSwitcher({
  photos,
  title,
  index,
  total,
}: {
  photos: [string, string, string];
  title: string;
  index: number;
  total: number;
}) {
  const [activePhoto, setActivePhoto] = useState(0);

  return (
    <div className="relative aspect-square overflow-hidden bg-[#ffe5df]">
      {photos.map((photo, photoIndex) => (
        <img
          key={photo}
          src={photo}
          alt={`${title} view ${photoIndex + 1}`}
          className={`absolute inset-0 size-full object-contain transition-opacity duration-500 ease-out ${
            activePhoto === photoIndex ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(50,25,23,0.04),rgba(50,25,23,0.22))]" />
      <div className="absolute inset-0 grid grid-cols-3" aria-label={`${title} views`}>
        {photos.map((photo, photoIndex) => (
          <button
            key={photo}
            type="button"
            className="group/zone relative cursor-pointer focus-visible:outline-none"
            aria-label={`Show ${title} view ${photoIndex + 1}`}
            onMouseEnter={() => setActivePhoto(photoIndex)}
            onFocus={() => setActivePhoto(photoIndex)}
          >
            <span
              className={`absolute right-2 bottom-2 left-2 h-1 rounded-full bg-white/85 transition-opacity duration-300 ${
                activePhoto === photoIndex
                  ? "opacity-100"
                  : "opacity-0 group-hover/zone:opacity-50"
              }`}
            />
          </button>
        ))}
      </div>
      <span className="absolute top-3 left-3 rounded-full bg-[#fff5f1]/90 px-2.5 py-1 font-shop-wide text-[0.55rem] font-semibold tracking-[0.34em] text-(--shop-ink-mute) uppercase shadow-sm backdrop-blur">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
      <span className="absolute right-3 bottom-3 rounded-full bg-[#321917]/70 px-2.5 py-1 font-shop-wide text-[0.5rem] font-semibold tracking-[0.18em] text-white uppercase backdrop-blur">
        View {activePhoto + 1} of 3
      </span>
    </div>
  );
}

function SamplePlaceholder({
  tag,
  index,
  total,
  Icon,
}: {
  tag: string;
  index: number;
  total: number;
  Icon: LucideIcon;
}) {
  return (
    <div
      className="relative flex aspect-square items-center justify-center bg-[#ffe5df]"
      aria-hidden
    >
      <div className="shop-halftone pointer-events-none absolute inset-0 opacity-25" />
      <div className="relative flex flex-col items-center gap-2 text-(--shop-ink-mute)">
        <Icon className="size-10 opacity-50" />
        <span className="font-shop-wide text-[0.55rem] font-semibold tracking-[0.22em] text-(--shop-ink-dim) uppercase">
          {tag}
        </span>
      </div>
      <span className="absolute top-3 left-3 font-shop-wide text-[0.55rem] font-semibold tracking-[0.34em] text-(--shop-ink-mute) uppercase">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}
