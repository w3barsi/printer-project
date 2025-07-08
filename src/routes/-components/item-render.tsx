import type { Item } from "@/types/printer"

export function ItemRenderer({ item }: { item: Item[] | undefined }) {
	return (
		<div className="py-4 flex flex-col gap-2 w-full">
			{item?.map((i) => (
				<div className="" key={i._id}>
					<div className="flex justify-between font-semibold">
						<p>{i.name}</p>
						<p>₱{i.price * i.quantity}</p>
					</div>
					<div className="text-xs flex justify-between">
						<span>qty: {i.quantity}</span>
						<span>₱{i.price}</span>
					</div>
				</div>
			))}
		</div>
	)
}
