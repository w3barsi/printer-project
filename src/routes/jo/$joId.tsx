import { createFileRoute, Router, useParams } from "@tanstack/react-router"
import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { api } from "@convex/_generated/api"
import { Calendar, Package, Clock } from "lucide-react"
import type { Id } from "@convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"

export const Route = createFileRoute("/jo/$joId")({
	component: JoDetailComponent,
	loader: async ({ context: { queryClient: qc }, params }) => {
		const id = params.joId as Id<"jo">
		await qc.ensureQueryData(convexQuery(api.jo.getOneJoWithItems, { id }))
	},
})

const getStatusColor = (status: string) => {
	switch (status) {
		case "completed":
			return "bg-green-100 text-green-800 hover:bg-green-100"
		case "in-progress":
			return "bg-blue-100 text-blue-800 hover:bg-blue-100"
		case "pending":
			return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
		default:
			return "bg-gray-100 text-gray-800 hover:bg-gray-100"
	}
}

const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "PHP",
	}).format(amount)
}

function JoDetailComponent() {
	const { joId } = useParams({ from: "/jo/$joId" })

	const { data: jo } = useSuspenseQuery(
		convexQuery(api.jo.getOneJoWithItems, { id: joId as any }),
	)

	if (jo === null) {
		return (
			<div className="container mx-auto py-8 px-4 max-w-4xl">
				<Card>
					<CardContent className="p-8 text-center">
						<Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
						<h2 className="text-xl font-semibold mb-2">Job Order Not Found</h2>
						<p className="text-muted-foreground">
							The requested job order could not be found.
						</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	const totalValue = jo.items.reduce(
		(sum, item) => sum + item.quantity * item.price,
		0,
	)
	const totalItems = jo.items.reduce((sum, item) => sum + item.quantity, 0)

	return (
		<div className="container mx-auto py-8 px-4 max-w-4xl">
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="text-2xl font-bold flex items-center gap-2">
									<Package className="h-6 w-6" />
									{jo.jo.name}
								</CardTitle>
								<p className="text-muted-foreground mt-1">
									Job Order #{jo.jo.joNumber}
								</p>
							</div>
							<Badge
								variant="secondary"
								className={`${getStatusColor(jo.jo.status)} text-sm px-3 py-1`}
							>
								{jo.jo.status.replace("-", " ")}
							</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="flex items-center gap-3">
								<Calendar className="h-5 w-5 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Pickup Date</p>
									<p className="text-sm text-muted-foreground">
										{new Date(Number(jo.jo.pickupDate)).toLocaleDateString()}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<Clock className="h-5 w-5 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Created</p>
									<p className="text-sm text-muted-foreground">
										{new Date(jo.jo._creationTime).toLocaleDateString()}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<Package className="h-5 w-5 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Total Items</p>
									<p className="text-sm text-muted-foreground">
										{totalItems} items
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Package className="h-5 w-5" />
							Order Items ({jo.items.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Item Name</TableHead>
										<TableHead className="text-center">Quantity</TableHead>
										<TableHead className="text-right">Unit Price</TableHead>
										<TableHead className="text-right">Total</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{jo.items.map((item: any) => (
										<TableRow key={item._id}>
											<TableCell className="font-medium">{item.name}</TableCell>
											<TableCell className="text-center">
												{item.quantity}
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(item.price)}
											</TableCell>
											<TableCell className="text-right font-medium">
												{formatCurrency(item.quantity * item.price)}
											</TableCell>
										</TableRow>
									))}
									<TableRow className="border-t-2">
										<TableCell colSpan={3} className="font-semibold">
											Total Order Value
										</TableCell>
										<TableCell className="text-right font-bold text-lg">
											{formatCurrency(totalValue)}
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
