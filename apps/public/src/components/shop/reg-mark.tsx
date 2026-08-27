export function RegMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`shop-reg ${className}`}
      style={{ width: "0.9em", height: "0.9em" }}
      aria-hidden
    />
  );
}

export function RegCorner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none absolute ${className} z-20 hidden text-(--shop-line-2) md:block`}
      aria-hidden
    >
      <RegMark />
    </span>
  );
}
