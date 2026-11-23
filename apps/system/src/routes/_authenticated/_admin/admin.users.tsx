import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import { Button } from "@dg/ui-coss/components/button";
import { Card } from "@dg/ui-coss/components/card";
import { Menu, MenuPopup, MenuItem, MenuTrigger } from "@dg/ui-coss/components/menu";
import { Skeleton } from "@dg/ui-coss/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dg/ui-coss/components/table";
import { toastManager } from "@dg/ui-coss/components/toast";
import { cn } from "@dg/ui-coss/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";

import { CreateUserDialog } from "@/components/create-user";
import { Container } from "@/components/layouts/container";
import { UserActionsMenu } from "@/components/user-actions";

export const Route = createFileRoute("/_authenticated/_admin/admin/users")({
  component: RouteComponent,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(convexQuery(api.admin.users.listUsers, {}));
    return {
      crumb: [{ value: "Manage Users", href: "/admin/", type: "static" }],
    };
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
        <h1 className="text-3xl font-bold tracking-tight">Manage Users</h1>
        <CreateUserDialog />
      </div>

      <Suspense fallback={<UserTableSkeleton />}>
        <UserManagementTable />
      </Suspense>
    </Container>
  );
}

function UserManagementTable() {
  const navigate = useNavigate();

  const { data } = useSuspenseQuery(convexQuery(api.admin.users.listUsers, {}));
  const setRole = useConvexMutation(api.admin.users.setRole);

  async function onChangeRole(userId: string, role: "user" | "admin" | "cashier") {
    try {
      await setRole({ userId, role });
      toastManager.add({ title: "Role updated", type: "success" });
    } catch (e: unknown) {
      const error = e as { message?: string };
      toastManager.add({
        title: error?.message || "Failed to update role",
        type: "error",
      });
    }
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader className="sticky top-0 z-10">
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
              <TableRow
                key={u.id}
                className="cursor-pointer"
                onClick={(event) => {
                  if (!(event.target instanceof Element)) return;
                  if (
                    event.target.closest(
                      "a, button, [role='menuitem'], [data-user-actions]",
                    )
                  )
                    return;
                  void navigate({ to: "/admin/users/$userId", params: { userId: u.id } });
                }}
              >
                <TableCell className="pl-4">
                  <Link
                    to="/admin/users/$userId"
                    params={{ userId: u.id }}
                    className="font-medium hover:underline focus-visible:underline"
                  >
                    {u.name || u.email || "View user"}
                  </Link>
                </TableCell>
                <TableCell>{u.email || "-"}</TableCell>
                <TableCell data-user-actions>
                  <Menu>
                    <MenuTrigger render={<Button variant="outline" size="sm" />}>
                      {u.role || "user"}
                    </MenuTrigger>
                    <MenuPopup align="start">
                      <MenuItem onClick={() => onChangeRole(u.id, "admin")}>
                        admin
                      </MenuItem>
                      <MenuItem onClick={() => onChangeRole(u.id, "user")}>user</MenuItem>
                      <MenuItem onClick={() => onChangeRole(u.id, "cashier")}>
                        cashier
                      </MenuItem>
                    </MenuPopup>
                  </Menu>
                </TableCell>
                <TableCell className={cn(u.banned && "text-red-500")}>
                  {u.banned ? "banned" : "active"}
                </TableCell>
                <TableCell>
                  {u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}
                </TableCell>
                <TableCell className="pr-4 text-right" data-user-actions>
                  <UserActionsMenu user={u} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function UserTableSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader className="sticky top-0 z-10">
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
    </Card>
  );
}
