export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-black tracking-[0.18em] text-(--shop-ink-mute) uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
