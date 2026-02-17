import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui-custom/valentines/button";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useMatches,
} from "@tanstack/react-router";

export const Route = createFileRoute("/(valentina)")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: "/login", search: { redirectUrl: location.pathname } });
    }
    const user = await context.queryClient.ensureQueryData(
      convexQuery(api.auth.getCurrentUser, {}),
    );

    return { user };
  },
  loader: ({ context }) => {
    return { user: context.user };
  },
});

function RouteComponent() {
  const { user } = Route.useLoaderData();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="h-screen w-full items-center justify-center bg-rose-900">
      <Container className="flex h-screen flex-col items-center justify-center gap-6 text-4xl">
        <Outlet />
        <StepNavigation />
      </Container>
    </div>
  );
}

function StepNavigation() {
  const matches = useMatches();
  const childMatch = matches[matches.length - 1];
  const step = (childMatch?.params as { step?: string })?.step || "1";
  const currentStep = parseInt(step, 10);

  const isFirstStep = currentStep <= 1;
  const isLastStep = currentStep >= 10;

  return (
    <div className="flex gap-4">
      <Link
        to="/valentina/$step"
        params={{ step: String(currentStep - 1) }}
        disabled={isFirstStep}
      >
        <Button disabled={isFirstStep}>PREV</Button>
      </Link>
      <Link
        to="/valentina/$step"
        params={{ step: String(currentStep + 1) }}
        disabled={isLastStep}
      >
        <Button disabled={isLastStep}>NEXT</Button>
      </Link>
    </div>
  );
}
