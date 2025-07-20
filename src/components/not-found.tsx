import { Link } from "@tanstack/react-router"

export function NotFound() {
	return (
		<div className="space-y-2 p-2">
			<p>The page you are looking for does not exist.</p>
			<p className="flex flex-wrap items-center gap-2">
				<button
					className="rounded-md bg-white px-4 py-2 text-black transition-colors hover:bg-gray-200"
					onClick={() => window.history.back()}
				>
					Go back
				</button>
				<button className="rounded-md bg-white px-4 py-2 text-black transition-colors hover:bg-gray-200">
					<Link to="/">Home</Link>
				</button>
			</p>
		</div>
	)
}
