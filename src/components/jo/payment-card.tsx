import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { BanknoteIcon, CalendarIcon, UserIcon } from "lucide-react";

import { AddPaymentDialog } from "@/components/jo/add-payment-dialog";
import { DeleteConfirmButton } from "@/components/ui-custom/delete-confirm-button";
import { CardContent } from "@/components/ui/card";

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
    <Card>
      <CardHeader className="flex items-center justify-between">
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
                className="bg-muted/50 flex items-center justify-between rounded-md pr-4"
              >
                <div className="flex gap-2 rounded p-2 md:gap-4 md:p-4">
                  <div className="flex w-full flex-col justify-between">
                    <p className="pb-2 font-mono text-xl">₱{payment.amount.toFixed(2)}</p>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="size-4" />
                      <p className="text-muted-foreground text-sm">
                        {new Date(payment._creationTime).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserIcon className="size-4" />
                      <p className="text-muted-foreground text-sm">
                        {payment.createdByName}
                      </p>
                    </div>
                  </div>
                </div>
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
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground text-center">No payments yet</div>
        )}
      </CardContent>
    </Card>
  );
}
