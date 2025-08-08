import type { Item } from "@/types/printer"

export function ItemRenderer({ item }: { item: Item[] | undefined }) {
  const total = item?.reduce((acc, i) => acc + i.price * i.quantity, 0)
  return (
    <div className="flex w-full flex-col gap-2 pt-4">
      {item?.map((i) => (
        <div key={i._id}>
          <div className="flex justify-between font-semibold">
            <p>{i.name}</p>
            <p>₱{i.price * i.quantity}</p>
          </div>
          <div className="flex justify-between text-xs">
            <span>qty: {i.quantity}</span>
            <span>₱{i.price}</span>
          </div>
        </div>
      ))}
      <div className="flex justify-between pb-2">
        <span>Total:</span> <span className="font-bold">₱{total}</span>
      </div>
    </div>
  )
}
