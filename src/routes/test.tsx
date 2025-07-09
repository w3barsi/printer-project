import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/test")({
	component: RouteComponent,
})

function RouteComponent() {
	const [device, setDevice] = useState<USBDevice | null>(null)

	useEffect(() => {
		const checkPermittedDevices = async () => {
			if ("usb" in navigator) {
				const devices = await navigator.usb.getDevices()
				if (devices.length > 0) {
					setDevice(devices[0])
					console.log(
						"Automatically reconnected to permitted device:",
						devices[0].productName,
					)
				}
			}
		}
		checkPermittedDevices()
	}, [])

	async function getUsbDevice() {
		if ("usb" in navigator) {
			try {
				const newDevice = await navigator.usb.requestDevice({
					filters: [],
				})
				console.log("Granted access to USB device:", newDevice)
				console.log("Device Name:", newDevice.productName)
				console.log("Vendor ID:", newDevice.vendorId)
				console.log("Product ID:", newDevice.productId)
				setDevice(newDevice)
			} catch (error) {
				console.error("Error requesting USB device:", error)
				if ((error as Error).name === "NotFoundError") {
					console.log("No device selected by the user.")
				}
			}
		} else {
			console.warn("WebUSB API not supported in this browser.")
		}
	}

	async function printTestMessage() {
		if (!device) {
			console.error("No device connected.")
			return
		}
		console.log(device)

		try {
			await device.open()
			await device.selectConfiguration(1)
			await device.claimInterface(0)

			const anInterface = device.configuration?.interfaces[0]
			const endpoint = anInterface?.alternate.endpoints.find(
				(e) => e.direction === "out",
			)

			if (!endpoint) {
				throw new Error("Printer endpoint not found.")
			}

			const textEncoder = new TextEncoder()
			const textData = textEncoder.encode("Hello, World!\nWow\nNooo\n\n")
			await device.transferOut(endpoint.endpointNumber, textData)

			// Optional: Add a command to cut the paper (ESC/POS command)
			const cutPaperCommand = new Uint8Array([0x1d, 0x56, 0x01])
			await device.transferOut(endpoint.endpointNumber, cutPaperCommand)

			console.log("Test message sent to printer.")
		} catch (error) {
			console.error("Error printing:", error)
		}
	}

	return (
		<div className="flex flex-col m-auto gap-2 max-w-xl pt-4">
			{!device ? (
				<Button onClick={getUsbDevice}>Connect to USB Printer</Button>
			) : (
				<>
					<p>Connected to: {device.productName}</p>
					<Button onClick={printTestMessage}>Print Test Message</Button>
				</>
			)}
		</div>
	)
}
