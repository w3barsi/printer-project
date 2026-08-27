import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { Button } from "@dg/ui/components/button";
import { Card, CardContent, CardHeader } from "@dg/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dg/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@dg/ui/components/table";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { AddItemDialog } from "@/components/jo/add-item-dialog";
import { DeleteItemAlertDialog } from "@/components/jo/delete-item-alert-dialog";
import { EditItemDialog } from "@/components/jo/edit-item-dialog";
import { formatCurrency } from "@/components/jo/job-order-formatters";
import type { Item } from "@/types/convex";

export function OrderItemsCard({ joId }: { joId: Id<"jo"> }) {
  const { data: jo } = useSuspenseQuery(convexQuery(api.jo.getOneComplete, { id: joId }));
  const [item, setItem] = useState<Item | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteAlertDialogOpen, setIsDeleteAlertDialogOpen] = useState(false);

  if (jo === null) {
    return null;
  }

  return (
    <>
      <EditItemDialog
        open={isEditDialogOpen}
        setOpen={setIsEditDialogOpen}
        item={item}
        joId={joId}
      />
      <DeleteItemAlertDialog
        open={isDeleteAlertDialogOpen}
        setOpen={setIsDeleteAlertDialogOpen}
        item={item}
        joId={joId}
      />
      <Card className="pt-6 pb-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Order Items</h3>
            {jo.status !== "unconfirmed" ? <AddItemDialog joId={joId} /> : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase md:pl-4">
                  Item Name
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase">
                  Quantity
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase">
                  Unit Price
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase">
                  Total
                </TableHead>
                <TableHead className="w-12 text-xs font-semibold text-muted-foreground uppercase" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jo.items.map((item) => (
                <TableRow key={item._id} className="group">
                  <TableCell className="font-medium md:pl-4">{item.name}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.price)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.quantity * item.price)}
                  </TableCell>
                  <TableCell className="w-12 text-right">
                    {jo.status !== "unconfirmed" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon" />}
                        >
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setIsEditDialogOpen(true);
                              setItem(item);
                            }}
                          >
                            <PencilIcon />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              setIsDeleteAlertDialogOpen(true);
                              setItem(item);
                            }}
                          >
                            <Trash2Icon />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="border-t-2">
                <TableCell colSpan={3} className="text-lg font-semibold md:pl-4" />
                <TableCell className="text-right">
                  <span className="text-xs text-muted-foreground">Total Order Value</span>
                  <p className="text-lg">{formatCurrency(jo.totalOrderValue)}</p>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
