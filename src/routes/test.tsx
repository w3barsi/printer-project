import { convexQuery } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/test")({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className="bg-black text-white min-h-screen flex flex-col items-center justify-center font-sans p-4">
			<AuthLoading>
				<div>Loading...</div>
			</AuthLoading>
			<Unauthenticated>
				<SignIn />
			</Unauthenticated>
			<Authenticated>
				<Dashboard />
			</Authenticated>
		</div>
	)
}
function Dashboard() {
	const user = useSuspenseQuery(convexQuery(api.auth.getCurrentUser, {}))
	return (
		<div className="text-center">
			<h1 className="text-2xl mb-4">Hello {user.data?.name}!</h1>
			<button
				onClick={() => authClient.signOut()}
				className="px-4 py-2 bg-white text-black rounded-md hover:bg-gray-200 transition-colors"
			>
				Sign out
			</button>
		</div>
	)
}

function SignIn() {
	const [showSignIn, setShowSignIn] = useState(true)

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		const formData = new FormData(e.target as HTMLFormElement)
		if (showSignIn) {
			await authClient.signIn.email(
				{
					email: formData.get("email") as string,
					password: formData.get("password") as string,
				},
				{
					onError: (ctx) => {
						window.alert(ctx.error.message)
					},
				},
			)
		} else {
			console.log("Signing up user...")
			await authClient.signUp.email(
				{
					name: formData.get("name") as string,
					email: formData.get("email") as string,
					password: formData.get("password") as string,
				},
				{
					onError: (ctx) => {
						window.alert(ctx.error.message)
					},
				},
			)
		}
	}

	return (
		<div className="w-full max-w-sm">
			<div className="bg-black border border-zinc-800 rounded-lg p-8">
				<h2 className="text-2xl font-bold text-center mb-6">
					{showSignIn ? "Sign In" : "Create an Account"}
				</h2>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					{!showSignIn && (
						<input
							name="name"
							placeholder="Name"
							className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					)}
					<input
						type="email"
						name="email"
						placeholder="Email"
						className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<input
						type="password"
						name="password"
						placeholder="Password"
						className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<button
						type="submit"
						className="bg-white text-black rounded-md py-2 font-semibold hover:bg-gray-200 transition-colors mt-2"
					>
						{showSignIn ? "Sign In" : "Sign Up"}
					</button>
				</form>
			</div>
			<p className="text-center text-zinc-400 mt-6">
				{showSignIn ? "Don't have an account? " : "Already have an account? "}
				<button
					onClick={() => setShowSignIn(!showSignIn)}
					className="text-blue-400 hover:underline"
				>
					{showSignIn ? "Sign up" : "Sign in"}
				</button>
			</p>
		</div>
	)
}
