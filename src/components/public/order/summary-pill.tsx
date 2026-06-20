export function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black tracking-[0.18em] text-(--shop-ink-mute) uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-black text-(--shop-ink)">{value}</p>
    </div>
  );
}
