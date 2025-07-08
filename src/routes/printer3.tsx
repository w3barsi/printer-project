import { createFileRoute } from "@tanstack/react-router"
import React, { useEffect, useRef } from "react"
import { useReactToPrint } from "react-to-print"

export const Route = createFileRoute("/printer3")({
	component: CanvasPrinterComponent,
})

// --- Main Page Component ---
function CanvasPrinterComponent() {
	const contentRef = useRef<HTMLDivElement>(null)
	const reactToPrintFn = useReactToPrint({
		contentRef: contentRef,
		pageStyle: `
@page {
        /* Remove browser default header (title) and footer (url) */
        margin: 0;
    }
    @media print {
        body {
            /* Tell browsers to print background colors */
            color-adjust: exact; /* Firefox. This is an older version of "print-color-adjust" */
            print-color-adjust: exact; /* Firefox/Safari */
            -webkit-print-color-adjust: exact; /* Chrome/Safari/Edge/Opera */
        }
    }
    `,
	})

	return (
		<div>
			<button onClick={reactToPrintFn}>Print</button>
			<div ref={contentRef}>Content to print</div>
		</div>
	)
}
