import { Link } from "@tanstack/react-router"

export function NotFound() {
	return (
		<div className="space-y-2 p-2">
			<p>The page you are looking for does not exist.</p>
			<p className="flex flex-wrap items-center gap-2">
				<button
					className="px-4 py-2 bg-white text-black rounded-md hover:bg-gray-200 transition-colors"
					onClick={() => window.history.back()}
				>
					Go back
				</button>
				<button className="px-4 py-2 bg-white text-black rounded-md hover:bg-gray-200 transition-colors">
					<Link to="/">Home</Link>
				</button>
			</p>
		</div>
	)
}
