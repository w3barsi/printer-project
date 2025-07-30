import type { JoWithItems } from "@/types/convex"
import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder"

const encoder = new ReceiptPrinterEncoder()

const MAX_LENGTH = 32

function sliceIntoGroups<T>(arr: T[]): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += 2) {
    result.push(arr.slice(i, i + 2))
  }
  return result
}

function lineBuilder(arrString: string[]) {
  const str = sliceIntoGroups(arrString)
  let final = ""

  str.forEach(([left, right], i) => {
    final +=
      left +
      " ".repeat(MAX_LENGTH - left.length - right.length) +
      `${right}` +
      (str.length - 1 === i ? "" : "\n")
  })

  console.log(final)
  return final
}

function leftRightText({ left, right }: { left: string; right: string }) {
  const rightLength = right.length
  const availableSpace = MAX_LENGTH - rightLength

  if (left.length > availableSpace - 3) {
    left = left.slice(0, availableSpace - 4) + "... "
  }

  const spaces = MAX_LENGTH - left.length - rightLength
  return left + " ".repeat(spaces) + right
}

// function itemLineBuilder(arrString: string[]) {
// 	const name = arrString[0]
// 	const total = arrString[1]
// 	const qty = arrString[2]
// 	const unitPrice = arrString[3]
// 	const gap1 = MAX_LENGTH - arrString[0].length - arrString[1].length
// 	const gap2 = MAX_LENGTH - arrString[2].length - arrString[3].length
//
// 	const final = `${name}${" ".repeat(gap1)}${total}\n${qty} x ${unitPrice}`
//
// 	console.log(final)
// 	return final
// }

function rightText(str: string) {
  return "-" + " ".repeat(MAX_LENGTH - str.length - 1) + str
}

export async function printReceipt({
  device,
  jo,
}: {
  device: USBDevice | null
  jo: JoWithItems
}) {
  if (!device) {
    console.error("No device connected.")
    return
  }

  try {
    await device.open()
    await device.selectConfiguration(1)
    await device.claimInterface(0)

    const endpoint = device.configuration?.interfaces[0]?.alternate.endpoints.find(
      (e) => e.direction === "out",
    )

    if (!endpoint) {
      throw new Error("Printer endpoint not found.")
    }

    const logo = new Image()
    await new Promise((resolve, reject) => {
      logo.onload = resolve
      logo.onerror = reject
      logo.src = "/logo.jpg"
    })

    const totalPrice = jo.items.reduce((total, item) => {
      return total + item.quantity * item.price
    }, 0)

    // const header = encoder
    //   .initialize()
    //   .align("center")
    //   .image(logo, 320, 160, "atkinson")
    //   .align("left")
    //   .line(lineBuilder(["Customer Name", "JO Number", jo.name, jo.joNumber.toString()]))
    //   .line("--------------------------------")
    //   .encode()
    // await device.transferOut(endpoint.endpointNumber, header)

    jo.items.forEach(async (item) => {
      const total = item.quantity * item.price
      const body = encoder
        .initialize()
        .align("left")
        .line(leftRightText({ left: item.name, right: `PHP ${total.toFixed(2)}` }))
        .line(
          `${item.quantity}${item.quantity > 1 ? "pcs" : "pc"} x @ PHP ${item.price.toFixed(2)}`,
        )
        // .line(rightText(`PHP ${total}`))
        .newline()
        .encode()

      await device.transferOut(endpoint.endpointNumber, body)
    })

    const footer = encoder
      .initialize()
      .align("left")
      .line(rightText("Total: " + totalPrice.toFixed(2)))
      .line("--------------------------------")
      .line("This serves as your claim slip.")
      .newline(2)
      .encode()
    await device.transferOut(endpoint.endpointNumber, footer)

    console.log("Receipt sent to printer.")
  } catch (error) {
    console.error("Error printing receipt:", error)
  } finally {
    if (device.opened) {
      await device.close()
    }
  }
}
