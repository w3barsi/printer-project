import { Button } from "@dg/ui-coss/components/button";

import { SliderRow } from "@/components/3d/slider-row";
import {
  ATTACHMENT_LIMITS,
  DEFAULT_ATTACHMENT,
  clampHookOffsetMm,
  maxHookOffsetMm,
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
        <>
          <SliderRow
            label="Opening diameter"
            value={attachment.sizeMm}
            unit="mm"
            min={ATTACHMENT_LIMITS.sizeMm.min}
            max={ATTACHMENT_LIMITS.sizeMm.max}
            step={ATTACHMENT_LIMITS.sizeMm.step}
            disabled={disabled}
            onChange={(sizeMm) =>
              onChange({
                ...attachment,
                sizeMm,
                offsetMm: clampHookOffsetMm(sizeMm, attachment.offsetMm),
              })
            }
          />
          {attachment.type === "hook" ? (
            <SliderRow
              label="Offset"
              value={attachment.offsetMm}
              unit="mm"
              min={ATTACHMENT_LIMITS.offsetMm.min}
              max={maxHookOffsetMm(attachment.sizeMm)}
              step={ATTACHMENT_LIMITS.offsetMm.step}
              disabled={disabled}
              onChange={(offsetMm) => onChange({ ...attachment, offsetMm })}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
