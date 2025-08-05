import { CreateUserDialog } from "@/components/create-user"
import { Container } from "@/components/layouts/container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Toaster } from "@/components/ui/sonner"
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
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { GavelIcon, MoreVerticalIcon } from "lucide-react"
import { toast } from "sonner"

export const Route = createFileRoute("/(main)/(admin)/admin/users")({
  component: RouteComponent,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(convexQuery(api.admin.users.listUsers, {}))
  },
  head: () => ({
    meta: [
      {
        title: `Admin | DG`,
      },
    ],
  }),
})

function RouteComponent() {
  const { data } = useSuspenseQuery(convexQuery(api.admin.users.listUsers, {}))
  const setRole = useConvexMutation(api.admin.users.setRole)
  const banOrUnbanUser = useConvexMutation(api.admin.users.banOrUnbanUser)

  async function onChangeRole(userId: string, role: "user" | "admin" | "cashier") {
    try {
      await setRole({ userId, role })
      toast.success("Role updated")
    } catch (e: unknown) {
      const error = e as { message?: string }
      toast.error(error?.message || "Failed to update role")
    }
  }

  async function banHandler(userId: string, isBanned: boolean) {
    console.log(userId, isBanned)
    try {
      await banOrUnbanUser({ userId, isBanned })
      toast.success("User deleted")
    } catch (e: unknown) {
      const error = e as { message?: string }
      toast.error(error?.message || "Failed to delete user")
    }
  }

  return (
    <Container>
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <CreateUserDialog />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <span>No users</span>
                ) : (
                  data.map((u) => (
                    <TableRow key={u._id}>
                      <TableCell>{u.name || "-"}</TableCell>
                      <TableCell>{u.email || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              {u.role || "user"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={() => onChangeRole(u._id, "admin")}
                            >
                              admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onChangeRole(u._id, "user")}>
                              user
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onChangeRole(u._id, "cashier")}
                            >
                              cashier
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>{u.banned ? "banned" : "active"}</TableCell>
                      <TableCell>
                        {u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Actions">
                              <MoreVerticalIcon className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => banHandler(u._id, u.banned ?? false)}
                            >
                              <GavelIcon /> {u.banned ? "Unban User" : "Ban User"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Toaster richColors />
    </Container>
  )
}
