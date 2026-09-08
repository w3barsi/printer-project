import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import { Button } from "@dg/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dg/ui/components/card";
import { Skeleton } from "@dg/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dg/ui/components/table";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";
import type { ReactNode } from "react";

import { Container } from "@/components/layouts/container";

export const Route = createFileRoute("/_authenticated/_admin/admin/users_/$userId")({
  loader: async ({ context: { queryClient: qc }, params }) => {
    await qc.ensureQueryData(
      convexQuery(api.admin.users.getUser, { userId: params.userId }),
    );
    return {
      crumb: [
        { value: "Manage Users", href: "/admin/users", type: "static" },
        {
          value: "User details",
          href: `/admin/users/${encodeURIComponent(params.userId)}`,
          type: "static",
        },
      ],
    };
  },
  head: () => ({ meta: [{ title: "User details | DG" }] }),
  pendingComponent: UserDetailsSkeleton,
  component: UserDetailsPage,
});

function formatDate(value: number | null | undefined) {
  if (value == null) return "Not available";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(value);
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children || "Not available"}</dd>
    </div>
  );
}

function UserDetailsPage() {
  const { userId } = Route.useParams();
  const { data: user } = useSuspenseQuery(
    convexQuery(api.admin.users.getUser, { userId }),
  );

  return (
    <Container className="flex flex-col">
      <Link
        to="/admin/users"
        className="w-fit text-sm text-muted-foreground hover:underline"
      >
        ← Manage Users
      </Link>
      {user ? (
        <>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {user.name || "User details"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {user.email} · Times shown in Asia/Manila
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Overview</h2>
              </CardTitle>
              <CardDescription>
                Profile and account status saved by Better Auth.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="User ID">{user.id}</Detail>
                <Detail label="Name">{user.name}</Detail>
                <Detail label="Email">{user.email}</Detail>
                <Detail label="Username">{user.username}</Detail>
                <Detail label="Display username">{user.displayUsername}</Detail>
                <Detail label="Email verified">
                  {user.emailVerified ? "Yes" : "No"}
                </Detail>
                <Detail label="Role">{user.role}</Detail>
                <Detail label="Status">{user.banned ? "Banned" : "Active"}</Detail>
                <Detail label="Profile image URL">{user.image}</Detail>
                <Detail label="Created">{formatDate(user.createdAt)}</Detail>
                <Detail label="Profile updated">{formatDate(user.updatedAt)}</Detail>
                {user.banned && (
                  <>
                    <Detail label="Ban reason">{user.banReason}</Detail>
                    <Detail label="Ban expires">
                      {user.banExpires == null
                        ? "No expiry"
                        : formatDate(user.banExpires)}
                    </Detail>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
          <UserSessions key={`sessions-${userId}`} userId={userId} />
          <UserAccounts key={`accounts-${userId}`} userId={userId} />
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              <h1>User not found</h1>
            </CardTitle>
            <CardDescription>
              This user may have been deleted or the link is incorrect.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </Container>
  );
}

function UserSessions({ userId }: { userId: string }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.users.listUserSessions,
    { userId },
    { initialNumItems: 20 },
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Sessions</h2>
        </CardTitle>
        <CardDescription>
          Stored sessions, newest first. Signed-out or revoked sessions may be removed.
          Session updates do not indicate last activity or whether the user is online.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session / user agent</TableHead>
              <TableHead>IP address</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Impersonated by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="max-w-96 min-w-60 whitespace-normal">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-xs break-all">{session.id}</span>
                    <span className="break-words text-muted-foreground">
                      {session.userAgent || "User agent not available"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{session.ipAddress || "Not available"}</TableCell>
                <TableCell>{formatDate(session.createdAt)}</TableCell>
                <TableCell>{formatDate(session.updatedAt)}</TableCell>
                <TableCell>{formatDate(session.expiresAt)}</TableCell>
                <TableCell>
                  {session.impersonatedBy ? (
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: session.impersonatedBy }}
                      className="hover:underline"
                    >
                      {session.impersonatedBy}
                    </Link>
                  ) : (
                    "None"
                  )}
                </TableCell>
              </TableRow>
            ))}
            {results.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {status === "LoadingFirstPage"
                    ? "Loading sessions…"
                    : "No stored sessions."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <LoadMore status={status} onClick={() => loadMore(20)} />
      </CardContent>
    </Card>
  );
}

function UserAccounts({ userId }: { userId: string }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.users.listUserAccounts,
    { userId },
    { initialNumItems: 20 },
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Sign-in methods</h2>
        </CardTitle>
        <CardDescription>
          Linked authentication accounts and credential metadata.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Provider account ID</TableHead>
              <TableHead>Password set</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  {account.providerId === "credential"
                    ? "Email / username and password"
                    : account.providerId}
                </TableCell>
                <TableCell>{account.accountId}</TableCell>
                <TableCell>{account.hasPassword ? "Yes" : "No"}</TableCell>
                <TableCell>{formatDate(account.createdAt)}</TableCell>
                <TableCell>{formatDate(account.updatedAt)}</TableCell>
              </TableRow>
            ))}
            {results.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {status === "LoadingFirstPage"
                    ? "Loading sign-in methods…"
                    : "No linked sign-in methods."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <LoadMore status={status} onClick={() => loadMore(20)} />
      </CardContent>
    </Card>
  );
}

function LoadMore({ status, onClick }: { status: string; onClick: () => void }) {
  if (status !== "CanLoadMore" && status !== "LoadingMore") return null;
  return (
    <Button
      variant="outline"
      className="self-start"
      disabled={status === "LoadingMore"}
      onClick={onClick}
    >
      {status === "LoadingMore" ? "Loading…" : "Load more"}
    </Button>
  );
}

function UserDetailsSkeleton() {
  return (
    <Container className="flex flex-col">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </Container>
  );
}
