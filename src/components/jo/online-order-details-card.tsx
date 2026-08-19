import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { ChevronDownIcon, ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  formatCurrency,
  formatFileSize,
  formatKebab,
  formatOptionalDate,
} from "@/components/jo/job-order-formatters";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function OnlineOrderDetailsCard({ joId }: { joId: Id<"jo"> }) {
  const { data: jo } = useSuspenseQuery(convexQuery(api.jo.getOneComplete, { id: joId }));
  const [isOpen, setIsOpen] = useState(() => jo?.status === "unconfirmed");
  const { data } = useSuspenseQuery(
    convexQuery(api.shop.orders.getOnlineOrderDetails, { joId }),
  );
  const getAttachmentUrl = useMutation(api.shop.orders.getOrderAttachmentUrl);

  if (!data) {
    return null;
  }

  async function openAttachment(attachmentId: Id<"orderAttachments">) {
    try {
      const url = await getAttachmentUrl({ attachmentId });
      if (!url) {
        toast.error("Attachment URL is unavailable.");
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open attachment.");
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} render={<Card />}>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Online Order Details</CardTitle>
          <CardDescription>Customer-submitted intake details</CardDescription>
        </div>
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle online order details"
            />
          }
        >
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
      </CardHeader>
      <CollapsibleContent render={<CardContent className="space-y-5" />}>
        <div className="grid gap-3 md:grid-cols-2">
          <DetailField label="Customer" value={data.details.customerName} />
          <DetailField label="Mobile" value={data.details.mobile} />
          <DetailField label="Email" value={data.details.email ?? "N/A"} />
          <DetailField
            label="Submitted"
            value={formatOptionalDate(data.details.submittedAt)}
          />
          <DetailField label="Payment" value={formatKebab(data.details.paymentMethod)} />
          <DetailField
            label="Payment Proof"
            value={formatKebab(data.details.paymentProofStatus)}
          />
          <DetailField
            label="Upload Status"
            value={formatKebab(data.details.attachmentUploadStatus)}
          />
          <DetailField label="Notes" value={data.details.notes ?? "N/A"} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">
            Configured Items
          </h3>
          <div className="mt-2 space-y-2">
            {data.items.map((item) => (
              <div key={item._id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">
                  {item.width}ft x {item.height}ft · {item.areaSqft} sqft
                </div>
                <div className="text-muted-foreground">
                  {formatKebab(item.artworkOption)} ·{" "}
                  {formatCurrency(item.unitPricePerSqft)} / sqft
                </div>
                {item.designInstructions ? (
                  <p className="mt-2 text-muted-foreground">{item.designInstructions}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">
            Attachments
          </h3>
          <div className="mt-2 space-y-2">
            {data.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No uploaded attachments.</p>
            ) : (
              data.attachments.map((attachment) => (
                <div
                  key={attachment._id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{attachment.filename}</div>
                    <div className="text-muted-foreground">
                      {formatKebab(attachment.kind)} · {attachment.mimeType} ·{" "}
                      {formatFileSize(attachment.size)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAttachment(attachment._id)}
                  >
                    <ExternalLinkIcon className="h-4 w-4" />
                    Open
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 text-sm break-words">{value}</div>
    </div>
  );
}
