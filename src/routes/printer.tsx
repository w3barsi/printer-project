import { createFileRoute } from "@tanstack/react-router"
import { useState, useRef } from "react"
import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder"

export const Route = createFileRoute("/printer")({
	component: PrinterComponent,
})

// Common thermal printer vendor and product IDs.
// This helps the browser suggest the right devices to the user.
const PRINTER_FILTERS = [
	{ vendorId: 0x04b8, productId: 0x0202 }, // Epson TM-T88IV
	{ vendorId: 0x0416, productId: 0x5011 }, // Winbond Electronics
	{ vendorId: 0x1504, productId: 0x0006 }, // Bixolon
	{ vendorId: 0x0dd4, productId: 0x015e }, // Star Micronics
]

function PrinterComponent() {
	const [device, setDevice] = useState<USBDevice | null>(null)
	const [log, setLog] = useState<string[]>([])
	const endpointRef = useRef<USBEndpoint | null>(null)

	const addLog = (message: string) => {
		console.log(message)
		setLog((prev) => [...prev, `> ${message}`])
	}

	const connectToPrinter = async () => {
		if (navigator.usb) {
			addLog("WebUSB API is not supported by this browser.")
			alert(
				"WebUSB is not supported. Please use a browser like Chrome or Edge.",
			)
			return
		}

		try {
			addLog("Requesting USB device...")
			const selectedDevice = await navigator.usb.requestDevice({
				filters: PRINTER_FILTERS,
			})

			addLog(
				`Device selected: ${selectedDevice.manufacturerName} ${selectedDevice.productName}`,
			)
			await selectedDevice.open()
			addLog("Device opened.")

			// Most receipt printers use the first configuration.
			await selectedDevice.selectConfiguration(1)
			addLog("Configuration selected.")

			// Find the correct interface and endpoint for printing.
			const iface = selectedDevice.configuration?.interfaces.find((i) =>
				i.alternate.endpoints.some((e) => e.direction === "out"),
			)

			if (!iface) {
				throw new Error("Could not find a suitable printer interface.")
			}

			addLog(`Found interface: ${iface.interfaceNumber}`)
			await selectedDevice.claimInterface(iface.interfaceNumber)
			addLog("Interface claimed.")

			const endpoint = iface.alternate.endpoints.find(
				(e) => e.direction === "out",
			)
			if (!endpoint) {
				throw new Error("Could not find an OUT endpoint.")
			}

			addLog(`Found endpoint: ${endpoint.endpointNumber}`)
			endpointRef.current = endpoint
			setDevice(selectedDevice)
			addLog("Printer connected successfully!")
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			addLog(`Error: ${errorMessage}`)
		}
	}

	const printTestReceipt = async () => {
		if (!device || !endpointRef.current) {
			addLog("Printer not connected.")
			alert("Please connect to a printer first.")
			return
		}

		try {
			addLog("Generating ESC/POS commands for 58mm paper...")
			const encoder = new ReceiptPrinterEncoder()

			// A 58mm printer typically has a width of 32 characters per line.
			const result = encoder
				.initialize()
				.align("center")
				.bold(true)
				.line("My Store")
				.bold(false)
				.line("123 Example Street")
				.line("Anytown, USA")
				.newline()
				.align("left")
				.text("Item 1")
				.text(" ".repeat(18)) // Adjust spacing for 32-char width
				.text("$10.00")
				.newline()
				.text("Item 2 (long)")
				.text(" ".repeat(11))
				.text("$5.50")
				.newline()
				.line("-".repeat(32))
				.bold(true)
				.text("TOTAL")
				.text(" ".repeat(20))
				.text("$15.50")
				.bold(false)
				.newline()
				.newline()
				.align("center")
				.text("Thank you!")
				.newline()
				.cut()
				.encode()

			addLog("Sending data to printer...")
			await device.transferOut(endpointRef.current.endpointNumber, result)
			addLog("Print job sent successfully!")
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			addLog(`Error: ${errorMessage}`)
		}
	}

	return (
		<div className="p-4 max-w-2xl mx-auto font-sans">
			<h3 className="text-2xl font-bold mb-4">Client-Side Printer</h3>
			<div className="mb-4 space-x-2">
				<button
					onClick={connectToPrinter}
					disabled={!!device}
					className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
				>
					Connect to Printer
				</button>
				<button
					onClick={printTestReceipt}
					disabled={!device}
					className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
				>
					Print Test Receipt (58mm)
				</button>
			</div>
			<div className="mt-6 p-3 bg-gray-100 rounded-lg shadow-inner h-64 overflow-y-auto">
				<h4 className="font-semibold mb-2 sticky top-0 bg-gray-100 pb-1">
					Connection Log
				</h4>
				<pre className="text-sm whitespace-pre-wrap">
					{log.length > 0 ? log.join("\n") : "Awaiting connection..."}
				</pre>
			</div>
			<div className="mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
				<p>
					<strong className="font-bold">Important:</strong> This feature
					requires a browser that supports WebUSB (like Chrome or Edge). When
					you click "Connect", the browser will ask for permission to access the
					USB device.
				</p>
			</div>
		</div>
	)
}
