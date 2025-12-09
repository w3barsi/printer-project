import { createFileRoute } from "@tanstack/react-router";
import { EyeClosedIcon, EyeIcon, LoaderCircle } from "lucide-react";
import { useState } from "react";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/(auth)/login")({
  component: LoginForm,
  validateSearch: z.object({ redirectUrl: z.string().optional() }),
  head: () => ({
    meta: [
      {
        title: `Login | DG`,
      },
    ],
  }),
});

function LoginForm() {
  const { redirectUrl } = Route.useSearch();

  const [isLoading, setIsLoading] = useState(false);
  const [viewPassword, setViewPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMessage("");

    authClient.signIn.email(
      {
        email,
        password,
        callbackURL: redirectUrl ?? "/jo",
      },
      {
        onError: (ctx) => {
          setErrorMessage(ctx.error.message);
          setIsLoading(false);
        },
        // better-auth seems to trigger a hard navigation on login,
        // so we don't have to revalidate & navigate ourselves
        // onSuccess: () => {
        //   queryClient.removeQueries({ queryKey: authQueryOptions().queryKey });
        //   navigate({ to: redirectUrl });
        // },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a href="#" className="flex flex-col items-center gap-2 font-medium">
              <img src="/logo.svg" alt="logo" />
            </a>
          </div>
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="hello@example.com"
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
                  placeholder="Enter Password here"
                  readOnly={isLoading}
                  required
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label="Copy"
                    title="Copy"
                    size="icon-xs"
                    onClick={() => {
                      setViewPassword((vp) => !vp);
                    }}
                  >
                    {viewPassword ? <EyeIcon /> : <EyeClosedIcon />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
            <Button type="submit" className="mt-2 w-full" size="lg" disabled={isLoading}>
              {isLoading && <LoaderCircle className="animate-spin" />}
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </div>
          {errorMessage && (
            <span className="text-destructive text-center text-sm">{errorMessage}</span>
          )}
        </div>
      </form>
    </div>
  );
}
