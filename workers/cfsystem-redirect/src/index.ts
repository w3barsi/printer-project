interface Env {
  STOREFRONT_ORIGIN: string;
  SYSTEM_ORIGIN: string;
}

const temporaryStatus = 307;
const defaultSystemPath = "/jo";
const systemPaths = new Set(["/login", "/signup"]);
const unsafeCharacters = /[\\\u0000-\u001f\u007f]/;
const encodedPathSeparator = /%2f|%5c/i;
const schemeLike = /^[a-z][a-z0-9+.-]*:/i;

function systemPathFor(pathname: string): string | null {
  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
    return pathname;
  }
  if (systemPaths.has(pathname)) {
    return pathname;
  }
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    const rest = pathname.slice("/app".length).replace(/^\/+/, "");
    if (
      !rest ||
      rest.startsWith("//") ||
      unsafeCharacters.test(rest) ||
      encodedPathSeparator.test(rest) ||
      schemeLike.test(rest)
    ) {
      return defaultSystemPath;
    }
    return `/${rest}`;
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname, search } = new URL(request.url);
    const systemPath = systemPathFor(pathname);
    const origin = systemPath ? env.SYSTEM_ORIGIN : env.STOREFRONT_ORIGIN;
    return Response.redirect(
      `${origin}${systemPath ?? pathname}${search}`,
      temporaryStatus,
    );
  },
} satisfies ExportedHandler<Env>;
