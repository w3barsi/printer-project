import { createFileRoute } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { useReactToPrint } from "react-to-print"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ItemRenderer } from "./-components/item-render"

export const Route = createFileRoute("/printer")({
	component: CanvasPrinterComponent,
})
// --- Main Page Component ---
function CanvasPrinterComponent() {
	const contentRef = useRef<HTMLDivElement>(null)
	const print = useReactToPrint({
		contentRef: contentRef,
	})
	const reactToPrintFn = () => {
		print()
		setOrNumber(orNumber + 1)
	}

	const [orNumber, setOrNumber] = useState(0)

	return (
		<div className="w-full flex items-center justify-center">
			<div className="container max-w-md flex gap-2 p-2 flex-col items-center">
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
						<p className="text-center text-2xl">
							OR# <span className="font-bold">{orNumber}</span>
						</p>
						<Separator className="bg-black" />
						<ItemRenderer item={undefined} />
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
