import { Button } from "@dg/ui/components/button";
import { Input } from "@dg/ui/components/input";
import { Label } from "@dg/ui/components/label";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { GalleryVerticalEndIcon, LoaderCircleIcon } from "lucide-react";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { env } from "@/env/client";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth/signup")({
  component: SignupForm,
  beforeLoad: ({ search }) => {
    if (!env.VITE_FLAG_SIGNUP) {
      throw redirect({ to: "/login", search: { redirectUrl: search.redirectUrl } });
    }
  },
  head: () => ({ meta: [{ title: "Sign Up | DARCYGRAPHiX" }] }),
});

function SignupForm() {
  const { redirectUrl } = Route.useRouteContext();
  const [isLoading, startSignup] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirm_password");

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof confirmPassword !== "string" ||
      !name ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setErrorMessage("");

    startSignup(async () => {
      await authClient.signUp.email(
        { name, email, password, callbackURL: redirectUrl },
        {
          onError: ({ error }) => setErrorMessage(error.message),
          onSuccess: () => window.location.assign(redirectUrl),
        },
      );
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon className="size-5" />
            </div>
            <h1 className="text-xl font-bold">Create a system account</h1>
          </div>
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                readOnly={isLoading}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                readOnly={isLoading}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                readOnly={isLoading}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                readOnly={isLoading}
                required
              />
            </div>
            <Button type="submit" className="mt-2 w-full" size="lg" disabled={isLoading}>
              {isLoading && <LoaderCircleIcon className="animate-spin" />}
              {isLoading ? "Signing up..." : "Sign up"}
            </Button>
          </div>
          {errorMessage && (
            <p role="alert" className="text-center text-sm text-destructive">
              {errorMessage}
            </p>
          )}
        </div>
      </form>
      <div className="text-center text-sm">
        Already have an account?{" "}
        <Link
          to="/login"
          search={{ redirectUrl }}
          className="underline underline-offset-4"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
