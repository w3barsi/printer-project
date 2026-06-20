export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-(--shop-line) pb-2">
      <span>{label}</span>
      <span className="font-mono font-black text-(--shop-ink)">{value}</span>
    </div>
  );
}
