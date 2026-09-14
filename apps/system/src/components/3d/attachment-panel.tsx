import { Button } from "@dg/ui/components/button";

import { SliderRow } from "@/components/3d/slider-row";
import {
  ATTACHMENT_LIMITS,
  DEFAULT_ATTACHMENT,
  type Attachment,
  type AttachmentType,
} from "@/lib/3d/attachment";

const ATTACHMENT_OPTIONS: { type: AttachmentType; label: string }[] = [
  { type: "hook", label: "Hook" },
  { type: "hole", label: "Hole" },
  { type: "bookmark", label: "Bookmark" },
];

type AttachmentPanelProps = {
  attachment: Attachment | null;
  onChange: (attachment: Attachment | null) => void;
  disabled?: boolean;
};

export function AttachmentPanel({
  attachment,
  onChange,
  disabled,
}: AttachmentPanelProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Attachment</h2>
        <p className="text-xs text-muted-foreground">
          Drag it in the preview to reposition.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1" role="group" aria-label="Attachment type">
        <Button
          type="button"
          size="sm"
          variant={attachment === null ? "default" : "outline"}
          disabled={disabled}
          onClick={() => onChange(null)}
        >
          None
        </Button>
        {ATTACHMENT_OPTIONS.map((option) => (
          <Button
            key={option.type}
            type="button"
            size="sm"
            variant={attachment?.type === option.type ? "default" : "outline"}
            disabled={disabled}
            onClick={() =>
              onChange({
                ...(attachment ?? DEFAULT_ATTACHMENT),
                type: option.type,
                position: null,
                perimeterT: null,
              })
            }
          >
            {option.label}
          </Button>
        ))}
      </div>

      {attachment ? (
        <SliderRow
          label="Opening"
          value={attachment.sizeMm}
          formatValue={(value) => `⌀ ${value.toFixed(1)} mm`}
          min={ATTACHMENT_LIMITS.sizeMm.min}
          max={ATTACHMENT_LIMITS.sizeMm.max}
          step={ATTACHMENT_LIMITS.sizeMm.step}
          disabled={disabled}
          onChange={(sizeMm) => onChange({ ...attachment, sizeMm })}
        />
      ) : null}
    </section>
  );
}
