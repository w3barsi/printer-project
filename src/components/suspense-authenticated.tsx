import { Suspense } from "react";
import { Authenticated, AuthLoading } from "convex/react";

export function SuspenseAuthenticated({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  return (
    <>
      <Authenticated>
        <Suspense fallback={fallback}>{children}</Suspense>
      </Authenticated>
      <AuthLoading>{fallback}</AuthLoading>
    </>
  );
}
