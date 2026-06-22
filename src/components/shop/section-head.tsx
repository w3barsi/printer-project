export function SectionHead({
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
        <span className="font-shop-wide text-[0.72rem] font-semibold tracking-[0.34em] text-(--shop-red) uppercase">
          {no}
        </span>
        <span className="h-px w-10 bg-(--shop-red)" />
      </div>
      <h2 className="mt-5 font-shop-display text-[clamp(2rem,5.5vw,4rem)] leading-[0.95] font-bold tracking-[-0.01em] italic">
        {title}
      </h2>
      <p className="mt-5 text-base leading-relaxed text-(--shop-ink-dim) md:text-lg">
        {sub}
      </p>
    </div>
  );
}
