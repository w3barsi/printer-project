import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
}

interface OrderDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit?: (schoolName: string, orders: OrderItem[]) => void;
}

export function CreateSchoolDialog({
  open = true,
  onOpenChange,
  onSubmit,
}: OrderDialogProps) {
  const [schoolName, setSchoolName] = useState("");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusedOrderId && inputRef.current) {
      inputRef.current.focus();
      setFocusedOrderId(null);
    }
  }, [focusedOrderId, orders]);

  const handleAddOrder = () => {
    const newOrderId = Date.now().toString();
    const newOrder: OrderItem = {
      id: newOrderId,
      name: "",
      quantity: 1,
    };
    setOrders([...orders, newOrder]);
    setFocusedOrderId(newOrderId);
  };

  const handleOrderChange = (
    id: string,
    field: "name" | "quantity",
    value: string | number,
  ) => {
    setOrders(
      orders.map((order) => (order.id === id ? { ...order, [field]: value } : order)),
    );
  };

  const handleCreate = () => {
    onSubmit?.(schoolName, orders);
    handleCancel();
  };

  const handleCancel = () => {
    setSchoolName("");
    setOrders([]);
    onOpenChange?.(false);
  };

  const handleDelete = (id: string) => {
    setOrders(orders.filter((order) => order.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* School Name Input */}
          <div className="space-y-2">
            <Label htmlFor="school-name">School Name</Label>
            <Input
              id="school-name"
              placeholder="Enter school name"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
          </div>

          {/* Orders List */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Orders</div>
            {orders.length === 0 ? (
              <p className="text-muted-foreground text-sm">No orders added yet</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="flex gap-4">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`order-name-${order.id}`} className="text-xs">
                        Name
                      </Label>
                      <Input
                        ref={focusedOrderId === order.id ? inputRef : null}
                        id={`order-name-${order.id}`}
                        placeholder="Item name"
                        value={order.name}
                        onChange={(e) =>
                          handleOrderChange(order.id, "name", e.target.value)
                        }
                      />
                    </div>
                    <div className="w-32 space-y-1">
                      <Label htmlFor={`order-qty-${order.id}`} className="text-xs">
                        Quantity
                      </Label>
                      <Input
                        id={`order-qty-${order.id}`}
                        type="number"
                        placeholder="0"
                        value={order.quantity}
                        onChange={(e) =>
                          handleOrderChange(
                            order.id,
                            "quantity",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        min="0"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(order.id)}
                      >
                        <XIcon className="text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Order Button */}
          <button
            type="button"
            onClick={handleAddOrder}
            className="border-primary bg-primary/5 hover:bg-primary/10 text-primary w-full border-2 border-dashed py-2 text-sm font-medium transition-colors"
            style={{
              borderRadius: "8px",
            }}
          >
            + Add Order
          </button>
        </div>

        {/* Footer Buttons */}
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
