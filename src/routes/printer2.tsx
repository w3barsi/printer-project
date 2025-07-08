import { createFileRoute } from "@tanstack/react-router"
import React, { useEffect, useRef } from "react"
import { useReactToPrint } from "react-to-print"

export const Route = createFileRoute("/printer2")({
	component: CanvasPrinterComponent,
})

const CANVAS_WIDTH = 384 // 58mm paper width
const CANVAS_HEIGHT = 450

// --- Receipt Drawing Logic (remains the same) ---
function drawReceipt(ctx: CanvasRenderingContext2D) {
	if (!ctx) return
	const FONT_SIZE = 18
	const LINE_HEIGHT = 24
	const PADDING = 10
	let y = PADDING + FONT_SIZE

	ctx.fillStyle = "white"
	ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
	ctx.fillStyle = "black"
	ctx.font = `bold ${FONT_SIZE + 4}px 'monospace'`
	ctx.textAlign = "center"
	ctx.fillText("My Store", CANVAS_WIDTH / 2, y)
	y += LINE_HEIGHT * 1.5

	ctx.font = `${FONT_SIZE}px 'monospace'`
	ctx.fillText("123 Example Street", CANVAS_WIDTH / 2, y)
	y += LINE_HEIGHT
	ctx.fillText("Anytown, USA", CANVAS_WIDTH / 2, y)
	y += LINE_HEIGHT * 1.5

	ctx.textAlign = "left"
	const leftMargin = PADDING
	const rightMargin = CANVAS_WIDTH - PADDING

	function printItem(name: string, price: string) {
		ctx.fillText(name, leftMargin, y)
		ctx.textAlign = "right"
		ctx.fillText(price, rightMargin, y)
		ctx.textAlign = "left"
		y += LINE_HEIGHT
	}

	printItem("Item 1", "$10.00")
	printItem("Item 2 (long name)", "$5.50")
	y += LINE_HEIGHT / 2

	ctx.beginPath()
	ctx.moveTo(PADDING, y)
	ctx.lineTo(CANVAS_WIDTH - PADDING, y)
	ctx.stroke()
	y += LINE_HEIGHT

	ctx.font = `bold ${FONT_SIZE}px 'monospace'`
	printItem("TOTAL", "$15.50")
	ctx.font = `${FONT_SIZE}px 'monospace'`
	y += LINE_HEIGHT * 2

	ctx.textAlign = "center"
	ctx.fillText("Thank you!", CANVAS_WIDTH / 2, y)
	y += LINE_HEIGHT

	ctx.fillStyle = "black"
	ctx.fillRect(CANVAS_WIDTH / 2 - 40, y, 80, 80)
}

// --- Component to be printed ---
// This component is now simpler. It forwards a ref to its root DIV.
const PrintableReceipt = React.forwardRef<HTMLDivElement>((props, ref) => {
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (canvas) {
			const ctx = canvas.getContext("2d")
			if (ctx) {
				drawReceipt(ctx)
			}
		}
	}, [])

	return (
		<div ref={ref}>
			<canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
		</div>
	)
})

// --- Main Page Component ---
function CanvasPrinterComponent() {
	// This ref is now for the DIV element inside PrintableReceipt.
	const componentRef = useRef<HTMLDivElement>(null)

	const handlePrint = useReactToPrint({
		contentRef: componentRef,
		// This style ensures the print output is sized correctly for the paper.
	})

	return (
		<div className="p-4 max-w-md mx-auto">
			<h3 className="text-2xl font-bold mb-4">Canvas Printing (Fixed)</h3>
			<p className="mb-4">
				This version uses a more reliable method with `react-to-print`.
			</p>
			<button
				onClick={handlePrint}
				className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
			>
				Print Receipt
			</button>

			<div className="mt-6 p-3 bg-gray-100 rounded-lg">
				<h4 className="font-semibold mb-2">Print Preview:</h4>
				{/* The component to be printed is now wrapped in a div that is not visible on screen */}
				<div className="overflow-hidden h-0">
					<PrintableReceipt ref={componentRef} />
				</div>
				{/* For display purposes only, we render it again */}
				<PrintableReceipt />
			</div>

			<div className="mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
				<p>
					<strong className="font-bold">Note:</strong> The component to be
					printed is technically hidden. The receipt you see below is a visual
					preview. Clicking the button prints the hidden one.
				</p>
			</div>
		</div>
	)
}
