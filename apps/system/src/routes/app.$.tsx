import { createFileRoute, redirect } from "@tanstack/react-router";

import { hashSuffix, normalizeLegacyAppPath } from "@/lib/redirect-url";

export const Route = createFileRoute("/app/$")({
  beforeLoad: ({ location, params }) => {
    throw redirect({
      href: `${normalizeLegacyAppPath(params._splat)}${location.searchStr}${hashSuffix(location.hash)}`,
      statusCode: 307,
    });
  },
});
