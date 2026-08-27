import { Button } from "@dg/ui/components/button";
import { Input } from "@dg/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@dg/ui/components/input-group";
import { Label } from "@dg/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import { EyeClosedIcon, EyeIcon, LoaderCircleIcon } from "lucide-react";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth/login")({
  component: LoginForm,
  head: () => ({ meta: [{ title: "Login | DARCYGRAPHiX" }] }),
});

function LoginForm() {
  const { redirectUrl } = Route.useRouteContext();
  const [isLoading, startLogin] = useTransition();
  const [viewPassword, setViewPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email ||
      !password
    ) {
      return;
    }

    setErrorMessage("");

    startLogin(async () => {
      await authClient.signIn.email(
        { email, password, callbackURL: redirectUrl },
        {
          onError: ({ error }) => setErrorMessage(error.message),
        },
      );
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <img src="/logo.svg" alt="DARCYGRAPHiX" className="max-h-16" />
            <h1 className="text-xl font-bold">Sign in to the business system</h1>
          </div>
          <div className="flex flex-col gap-5">
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
              <InputGroup>
                <InputGroupInput
                  id="password"
                  name="password"
                  type={viewPassword ? "text" : "password"}
                  autoComplete="current-password"
                  readOnly={isLoading}
                  required
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    aria-label={viewPassword ? "Hide password" : "Show password"}
                    title={viewPassword ? "Hide password" : "Show password"}
                    size="icon-xs"
                    onClick={() => setViewPassword((visible) => !visible)}
                  >
                    {viewPassword ? <EyeIcon /> : <EyeClosedIcon />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
            <Button type="submit" className="mt-2 w-full" size="lg" disabled={isLoading}>
              {isLoading && <LoaderCircleIcon className="animate-spin" />}
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </div>
          {errorMessage && (
            <p role="alert" className="text-center text-sm text-destructive">
              {errorMessage}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
