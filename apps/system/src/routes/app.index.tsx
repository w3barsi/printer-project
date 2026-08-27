import { createFileRoute, redirect } from "@tanstack/react-router";

import { defaultSystemRedirectUrl, hashSuffix } from "@/lib/redirect-url";

export const Route = createFileRoute("/app/")({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: `${defaultSystemRedirectUrl}${location.searchStr}${hashSuffix(location.hash)}`,
      statusCode: 307,
    });
  },
});
