import { Container } from "@/components/layouts/container"
import { Button } from "@/components/ui/button"
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
import { MoreVerticalIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

export const Route = createFileRoute("/(main)/(admin)/admin/users")({
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = useSuspenseQuery(convexQuery(api.admin.users.listUsers, {}))
  const setRole = useConvexMutation(api.admin.users.setRole)
  const deleteUser = useConvexMutation(api.admin.users.deleteUser)

  async function onChangeRole(userId: string, role: "user" | "admin") {
    try {
      await setRole({ userId, role })
      toast.success("Role updated")
    } catch (e: any) {
      toast.error(e?.message || "Failed to update role")
    }
  }

  async function onDelete(userId: string) {
    try {
      await deleteUser({ userId })
      toast.success("User deleted")
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete user")
    }
  }

  return (
    <Container>
      <Table>
        <TableHeader>
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
          {(data?.users ?? []).map((u: any) => (
            <TableRow key={u.id}>
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
                    <DropdownMenuItem onClick={() => onChangeRole(u.id, "user")}>
                      user
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangeRole(u.id, "admin")}>
                      admin
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
              <TableCell>{u.status || "active"}</TableCell>
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
                    <DropdownMenuItem onClick={() => onDelete(u.id)}>
                      <Trash2Icon className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Toaster richColors />
    </Container>
  )
}
