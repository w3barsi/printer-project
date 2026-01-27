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
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "../ui/item";

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
              <Item key={payment._id} variant="outline">
                <ItemContent>
                  <ItemTitle className="font-mono text-lg">
                    {formatCurrency(payment.amount)}
                  </ItemTitle>
                  <ItemDescription>
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
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
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
                </ItemActions>
              </Item>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground text-center">No payments yet</div>
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
