import { Container } from "@/components/layouts/container"
import { PrintJoButton } from "@/components/printer/print-jo-button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  Calendar,
  Clock,
  Package,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"

export const Route = createFileRoute("/(main)/jo/$joId")({
  component: JoDetailComponent,
  loader: async ({ context: { queryClient: qc }, params }) => {
    const id = params.joId as Id<"jo">
    const jo = await qc.ensureQueryData(convexQuery(api.jo.getOneWithItems, { id }))

    return {
      joNumber: jo?.joNumber,
      crumb: [
        { value: "Job Order", href: "/jo/", type: "static" },
        { value: params.joId, href: `/jo/${params.joId}`, type: "jo" },
      ],
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        name: "description",
        content: "My App is a web application",
      },
      {
        title: `Job Order #${loaderData?.joNumber} | DG`,
      },
    ],
  }),
})

function JoDetailComponent() {
  const { joId } = Route.useParams()
  const navigate = useNavigate()

  // Fetch job order with items using Convex API
  // Suspense query for /jo/${joId} route
  // Fetch job order with items using Convex API
  // Suspense query for /jo/${joId} route
  const { data: jo } = useSuspenseQuery(
    // Fetch job order with items using Convex API
    // Suspense query for /jo/${joId} route
    convexQuery(api.jo.getOneWithItems, { id: joId as Id<"jo"> }),
  )

  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.jo.deleteJo),
    onSuccess: () => {
      navigate({ to: "/jo" })
    },
  })
  const deleteJo = () => mutate({ joId: joId as Id<"jo"> })

  if (jo === null) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <h2 className="mb-2 text-xl font-semibold">Job Order Not Found</h2>
            <p className="text-muted-foreground">
              The requested job order could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalValue = jo.items.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const totalItems = jo.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Container className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link to="/jo">
            <ArrowLeftIcon /> Back
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                <Package className="h-6 w-6" />
                {jo.name}
              </CardTitle>
              <p className="text-muted-foreground mt-1">Job Order #{jo.joNumber}</p>
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger>
                  <Button variant="destructive-ghost">
                    <Trash2Icon />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={deleteJo}
                      disabled={isPending}
                    >
                      <Trash2Icon />
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <PrintJoButton jo={jo} />
              <AddItemDialog joId={joId as Id<"jo">} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Calendar className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Pickup Date</p>
                <p className="text-muted-foreground text-sm">
                  {new Date(Number(jo.pickupDate)).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-muted-foreground text-sm">
                  {new Date(jo._creationTime).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Total Items</p>
                <p className="text-muted-foreground text-sm">{totalItems} items</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Order Items ({jo.items.length})</h3>
          </div>
          {jo.items.length === 0 ? (
            <div className="text-muted-foreground text-center">No Items</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jo.items.map((item) => (
                    <TableRow key={item._id} className="group">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.quantity * item.price)}
                      </TableCell>
                      <TableCell className="w-12 text-right">
                        <DeleteItemButton itemId={item._id} />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell colSpan={3} className="text-right font-semibold">
                      Total Order Value
                    </TableCell>
                    <TableCell className="text-right text-lg font-bold">
                      {formatCurrency(totalValue)}
                    </TableCell>
                    <TableCell className="w-12 text-right"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  )
}

function AddItemDialog({ joId }: { joId: Id<"jo"> }) {
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const { mutate: createItem, isPending } = useMutation({
    mutationFn: useConvexMutation(api.items.createItem),
    onSuccess: () => {
      setIsOpen(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createItem({ joId, name, quantity, price })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="mr-2" /> Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="w-sm">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new item to the job order.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Price
            </Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteItemButton({ itemId }: { itemId: Id<"items"> }) {
  const { mutate: deleteItem, isPending } = useMutation({
    mutationFn: useConvexMutation(api.items.deleteItem),
  })

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
      onClick={() => deleteItem({ itemId })}
      disabled={isPending}
    >
      <Trash2Icon className="h-4 w-4" />
    </Button>
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount)
}
