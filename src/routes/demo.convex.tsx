import { useRef } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation } from "convex/react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "../../convex/_generated/api"

export const Route = createFileRoute("/demo/convex")({
	component: App,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(convexQuery(api.products.get, {}))
	},
})

function Products() {
	const products = useSuspenseQuery(convexQuery(api.products.get, {}))

	return (
		<ul>
			{products.data.map((p) => (
				<li key={p._id}>
					{p.title} - {p.price}
				</li>
			))}
		</ul>
	)
}

function App() {
	const ref = useRef<HTMLInputElement>(null)
	const mutate = useMutation(api.products.add)
	return (
		<div className="p-4 ">
			<div className="flex gap-2">
				<input className="p-2 border" ref={ref} type="text" />
				<button
					className="p-2 border rounded"
					onClick={() => {
						mutate({ title: ref.current?.value || "" })
						ref.current!.value = ""
					}}
				>
					Add
				</button>
			</div>

			<Products />
		</div>
	)
}
