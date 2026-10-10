import { Button } from "@dg/ui-coss/components/button";
import { DownloadIcon } from "lucide-react";

type ExportPanelProps = {
  disabled?: boolean;
  onExport3mf: () => void;
  onExportStl: () => void;
};

export function ExportPanel({ disabled, onExport3mf, onExportStl }: ExportPanelProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Export</h2>
        <p className="text-xs text-muted-foreground">
          3MF keeps the color parts; STL is geometry only.
        </p>
      </div>

      <Button type="button" size="sm" disabled={disabled} onClick={onExport3mf}>
        <DownloadIcon data-icon="inline-start" />
        Download 3MF
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={onExportStl}
      >
        <DownloadIcon data-icon="inline-start" />
        Download STL
      </Button>
    </section>
  );
}
