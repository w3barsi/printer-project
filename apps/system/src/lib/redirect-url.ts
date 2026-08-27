import { z } from "zod";

export const defaultSystemRedirectUrl = "/jo";

const systemOrigin = "https://system.darcygraphix.com";
const unsafeCharacters = /[\\\u0000-\u001f\u007f]/;
const encodedPathSeparator = /%2f|%5c/i;

export function normalizeSystemRedirectUrl(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return defaultSystemRedirectUrl;
  }
  if (unsafeCharacters.test(value) || encodedPathSeparator.test(value)) {
    return defaultSystemRedirectUrl;
  }

  try {
    const url = new URL(value, systemOrigin);
    if (url.origin !== systemOrigin) return defaultSystemRedirectUrl;
    if (url.pathname === "/login" || url.pathname === "/signup") {
      return defaultSystemRedirectUrl;
    }
    if (url.pathname === "/api/auth" || url.pathname.startsWith("/api/auth/")) {
      return defaultSystemRedirectUrl;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return defaultSystemRedirectUrl;
  }
}

export function normalizeLegacyAppPath(splat: string | undefined) {
  const base = (splat ?? "").replace(/^\/+/, "");
  if (base.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(base) || base.includes("\\")) {
    return defaultSystemRedirectUrl;
  }
  const target = normalizeSystemRedirectUrl(base ? `/${base}` : "/");
  return target === "/" ? defaultSystemRedirectUrl : target;
}

export function hashSuffix(hash: string) {
  return hash ? `#${hash}` : "";
}

export const redirectSearchSchema = z
  .object({ redirectUrl: z.string().optional() })
  .transform(({ redirectUrl }) => ({
    redirectUrl: normalizeSystemRedirectUrl(redirectUrl),
  }));
