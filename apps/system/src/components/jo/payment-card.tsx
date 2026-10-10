import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { Card, CardHeader, CardTitle } from "@dg/ui-coss/components/card";
import { CardContent } from "@dg/ui-coss/components/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { BanknoteIcon, CalendarIcon, UserIcon } from "lucide-react";

import { AddPaymentDialog } from "@/components/jo/add-payment-dialog";
import { DeleteConfirmButton } from "@/components/ui-custom/delete-confirm-button";

export function PaymentsCard({ joId }: { joId: Id<"jo"> }) {
  const { data: jo } = useSuspenseQuery(
    convexQuery(api.jo.getOneComplete, { id: joId as Id<"jo"> }),
  );

  const deletePayment = useMutation(api.payment.deletePayment).withOptimisticUpdate(
    (localStore, args) => {
      const typedJoId = joId as Id<"jo">;
      const currentValue = localStore.getQuery(api.jo.getOneComplete, { id: typedJoId });
      if (!currentValue) return;
      const newValue = {
        ...currentValue,
        totalPayments: currentValue.totalPayments - args.amount,
        payments: currentValue.payments.filter((c) => c._id !== args.paymentId),
      };
      localStore.setQuery(api.jo.getOneComplete, { id: typedJoId }, newValue);
    },
  );

  if (!jo) {
    return null;
  }

  return (
    <Card className="@container">
      <CardHeader className="flex flex-col items-center justify-between @xs:flex-row">
        <CardTitle className="flex items-center gap-2">
          <BanknoteIcon className="h-6 w-6" />
          <p>Payment/s</p>
        </CardTitle>
        <AddPaymentDialog
          joId={joId as Id<"jo">}
          totalPayments={jo.totalPayments}
          totalOrderValue={jo.totalOrderValue}
        />
      </CardHeader>
      <CardContent>
        {jo.payments && jo.payments.length > 0 ? (
          <div className="flex flex-col gap-2 md:gap-4">
            {jo.payments.map((payment) => (
              <div
                key={payment._id}
                className="flex w-full flex-wrap items-center gap-3.5 rounded-md border border-border px-4 py-3.5 text-sm"
              >
                <div className="flex flex-1 flex-col gap-1">
                  <div className="line-clamp-1 flex w-fit items-center gap-2 font-mono text-lg leading-snug font-medium underline-offset-4">
                    {formatCurrency(payment.amount)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="size-4" />
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment._creationTime).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserIcon className="size-4" />
                      <p className="text-sm text-muted-foreground">
                        {payment.createdByName}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DeleteConfirmButton
                    deleteFor="payment"
                    onConfirm={() =>
                      deletePayment({
                        paymentId: payment._id,
                        amount: payment.amount,
                        joId: jo._id,
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">No payments yet</div>
        )}
      </CardContent>
    </Card>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}
