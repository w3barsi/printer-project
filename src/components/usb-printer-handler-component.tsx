import { useEffect } from "react"
import { useRouter } from "@tanstack/react-router"
import type { Dispatch, SetStateAction } from "react"
import { Button } from "@/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"

export function UsbPrinterHandlerComponent({
	device,
	setDevice,
}: {
	device: USBDevice | null
	setDevice: Dispatch<SetStateAction<USBDevice | null>>
}) {
	useEffect(() => {
		const checkPermittedDevices = async () => {
			if ("usb" in navigator) {
				const devices = await navigator.usb.getDevices()
				console.log(devices.length)

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
				setDevice(newDevice)
				window.location.reload()
			} catch (error) {
				console.error("Error requesting USB device:", error)
			}
		} else {
			console.warn("WebUSB API not supported in this browser.")
		}
	}

	return (
		<div>
			{device === null ? (
				<Button onClick={getUsbDevice}>Connect Printer</Button>
			) : (
				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<Button
							variant="destructive-outline"
							onClick={async () => {
								setDevice(null)
								await device.forget()
							}}
						>
							{device.productName}
						</Button>
					</TooltipTrigger>
					<TooltipContent>Disconnect Printer</TooltipContent>
				</Tooltip>
			)}
		</div>
	)
}
