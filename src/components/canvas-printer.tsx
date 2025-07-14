import { Link } from "@tanstack/react-router"
import { useRef, useState } from "react"
import * as reactToPrint from "react-to-print"
import { useQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { ItemRenderer } from "@/components/item-render"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

export default function CanvasPrinterComponent({
	joId,
}: {
	joId: string | null
}) {
	const contentRef = useRef<HTMLDivElement>(null)
	const print = reactToPrint.useReactToPrint({
		contentRef: contentRef,
	})
	const reactToPrintFn = () => {
		print()
		setOrNumber(orNumber + 1)
	}
	const [orNumber, setOrNumber] = useState(0)

	const typedId = joId as Id<"jo">
	const { data: jo } = useQuery(
		convexQuery(api.jo.getOneJoWithItems, { id: typedId }),
	)

	return (
		<div className="w-full flex items-center justify-center">
			<div className="container max-w-md flex gap-2 p-2 flex-col items-center">
				<Link to="/jo">
					<Button variant="link">JobOrder</Button>
				</Link>
				<Button onClick={reactToPrintFn} className="w-full">
					Print
				</Button>
				<div className="border w-fit p-2 inline-block bg-blue-200 rounded">
					<div
						ref={contentRef}
						className="flex flex-col w-48 min-h-24 bg-white justify-between items-center"
					>
						<img src="/logo.jpg" className="p-2 w-2/3" />
						<Separator className="bg-black" />
						<div className="flex justify-between p-2 items-center w-full">
							<span>{jo?.jo.name}</span>
							<span className="text-center">
								{jo?.jo.joNumber ?? Math.floor(Math.random() * 100)}
							</span>
						</div>
						<Separator className="bg-black" />
						<ItemRenderer item={jo?.items} />
						<Separator className="bg-black" />
						<div className="text-center text-sm pb-12">
							This serves as your claim slip. Please don't lose this!
						</div>
						<Separator className="bg-black" />
					</div>
				</div>
			</div>
		</div>
	)
}
