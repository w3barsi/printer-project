import { CreateUserDialog } from "@/components/create-user";
import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { GavelIcon, LockKeyholeIcon, MoreVerticalIcon, User2Icon } from "lucide-react";
import { Suspense, useState, type Dispatch } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/(main)/(admin)/admin/users")({
  component: RouteComponent,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(convexQuery(api.admin.users.listUsers, {}));
  },
  head: () => ({
    meta: [
      {
        title: `Admin | DG`,
      },
    ],
  }),
});

function RouteComponent() {
  return (
    <Container className="flex flex-col">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <CreateUserDialog />
      </div>

      <Suspense fallback={<UserTableSkeleton />}>
        <UserManagementTable />
      </Suspense>
    </Container>
  );
}

function UserManagementTable() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; id: Id<"users"> }>();

  const { data } = useSuspenseQuery(convexQuery(api.admin.users.listUsers, {}));
  const setRole = useConvexMutation(api.admin.users.setRole);
  const banOrUnbanUser = useConvexMutation(api.admin.users.banOrUnbanUser);

  async function onChangeRole(userId: string, role: "user" | "admin" | "cashier") {
    try {
      await setRole({ userId, role });
      toast.success("Role updated");
    } catch (e: unknown) {
      const error = e as { message?: string };
      toast.error(error?.message || "Failed to update role");
    }
  }

  async function banHandler(userId: string, isBanned: boolean) {
    console.log(userId, isBanned);
    try {
      await banOrUnbanUser({ userId, isBanned });
      toast.success("User deleted");
    } catch (e: unknown) {
      const error = e as { message?: string };
      toast.error(error?.message || "Failed to delete user");
    }
  }

  return (
    <TableWrapper>
      <Table>
        <TableHeader className="bg-muted sticky top-0 z-10">
          <TableRow>
            <TableHead className="md:pl-4">Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-0 md:pr-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <span>No users</span>
          ) : (
            data.map((u) => (
              <TableRow key={u._id}>
                <TableCell className="pl-4">{u.name || "-"}</TableCell>
                <TableCell>{u.email || "-"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {u.role || "user"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => onChangeRole(u._id, "admin")}>
                        admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeRole(u._id, "user")}>
                        user
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeRole(u._id, "cashier")}>
                        cashier
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell>{u.banned ? "banned" : "active"}</TableCell>
                <TableCell>
                  {u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}
                </TableCell>
                <TableCell className="pr-4 text-right">
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

                      <DropdownMenuItem
                        onClick={async () => {
                          const { error } = await authClient.admin.impersonateUser({
                            userId: u._id,
                          });
                          if (error) {
                            toast.error(error.message);
                          } else {
                            window.location.reload();
                          }
                        }}
                      >
                        <User2Icon /> Impersonate User
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setIsDialogOpen(true);
                          setUser({ name: u.name, id: u._id });
                        }}
                      >
                        <LockKeyholeIcon /> Change Password
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <ChangePasswordDialog open={isDialogOpen} setOpen={setIsDialogOpen} user={user} />
    </TableWrapper>
  );
}

function ChangePasswordDialog({
  open,
  setOpen,

  user,
}: {
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  user?: { name: string; id: Id<"users"> };
}) {
  const [password, setPassword] = useState("");

  const changePassword = async () => {
    setOpen(false);
    await authClient.admin.setUserPassword({
      userId: user!.id,
      newPassword: password,
    });
    setPassword("");
  };
  const handleApply = () => {
    if (password.trim().length < 8) {
      setPassword((p) => p.trim());
      return toast.error("Password must be at least 8 characters long");
    }
    toast.promise(changePassword, {
      loading: `Changing password for ${user!.name}`,
      success: "Password changed successfully!",
      error: "Error changing password!",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild></DialogTrigger>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Enter your new password below.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-password" className="text-right">
              New Password
            </Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="col-span-3"
              placeholder="Enter new password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={handleApply} disabled={password.length < 8}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserTableSkeleton() {
  return (
    <TableWrapper>
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
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-8 rounded-full" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}
