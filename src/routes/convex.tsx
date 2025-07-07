import { Suspense, useRef } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useMutation } from "convex/react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "../../convex/_generated/api"

export const Route = createFileRoute("/convex")({
	component: App,
	loader: async ({ context }) => {},
})

function Products() {
	const products = useSuspenseQuery(convexQuery(api.products.get, {}))

	return (
		<div className="mt-8">
			<h2 className="text-xl font-semibold mb-4 text-zinc-300">Products</h2>
			<ul className="space-y-2">
				{products.data.map((p) => (
					<li
						key={p._id}
						className="bg-zinc-900 border border-zinc-800 rounded-md p-4 flex justify-between items-center"
					>
						<span className="text-white">{p.title}</span>
						<span className="text-zinc-400">{p.price}</span>
					</li>
				))}
			</ul>
		</div>
	)
}

function App() {
	const ref = useRef<HTMLInputElement>(null)
	const mutate = useMutation(api.products.add)
	return (
		<div className="bg-black text-white min-h-screen font-sans p-8">
			<div className="max-w-md mx-auto flex flex-col gap-4">
				<Link
					className=" w-full px-4 py-2 bg-black text-white text-center hover:text-black  border-2 border-white rounded-md hover:bg-gray-200 transition-colors"
					to="/"
				>
					Index
				</Link>
				<h1 className="text-3xl font-bold mb-6 text-center">
					Add a New Product
				</h1>
				<div className="flex gap-2">
					<input
						className="flex-grow bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
						ref={ref}
						type="text"
						placeholder="Enter product title..."
					/>
					<button
						className="bg-white text-black rounded-md px-6 py-2 font-semibold hover:bg-gray-200 transition-colors"
						onClick={() => {
							if (ref.current?.value) {
								mutate({ title: ref.current.value })
								ref.current.value = ""
							}
						}}
					>
						Add
					</button>
				</div>

				<Suspense fallback={<div>Loading...</div>}>
					<Products />
				</Suspense>
			</div>
		</div>
	)
}
