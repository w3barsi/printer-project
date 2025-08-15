import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
  beforeLoad: () => {
    if (import.meta.env.PROD) {
      throw redirect({ to: "/jo" });
    }
  },
  loader: ({ context }) => {
    return { user: context.user };
  },
});

function Home() {
  const { user } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const router = useRouter();

  return (
    <div className="container mx-auto flex max-w-4xl flex-col items-center px-4 py-8">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold sm:text-4xl">React TanStarter</h1>
        <div className="flex items-center gap-2 max-sm:flex-col">
          This is an unprotected page:
          <pre className="bg-card text-card-foreground rounded-md border p-1">
            routes/index.tsx
          </pre>
        </div>

        <Button type="button" asChild className="mb-2 w-fit" size="lg">
          <Link to="/jo">Go to Job Orders</Link>
        </Button>
      </div>

      {user ? (
        <div className="flex flex-col items-center gap-2">
          <p>
            Welcome back, {user.name}! as {user.role}{" "}
          </p>
          <Button type="button" asChild className="mb-2 w-fit" size="lg">
            <Link to="/jo">Go to Job Orders</Link>
          </Button>
          <div className="text-center text-xs sm:text-sm">
            Session user:
            <pre className="max-w-screen overflow-x-auto px-2 text-start">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          <Button
            onClick={async () => {
              await authClient.signOut();
              await queryClient.invalidateQueries({ queryKey: ["user"] });
              await router.invalidate();
            }}
            type="button"
            className="w-fit"
            variant="destructive"
            size="lg"
          >
            Sign out
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p>You are not signed in.</p>
          <Button type="button" asChild className="w-fit" size="lg">
            <Link to="/login">Log in</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
