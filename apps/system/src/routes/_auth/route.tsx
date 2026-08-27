import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { defaultSystemRedirectUrl, redirectSearchSchema } from "@/lib/redirect-url";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
  validateSearch: redirectSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.user) throw redirect({ to: defaultSystemRedirectUrl });

    return { redirectUrl: search.redirectUrl };
  },
});

function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  );
}
