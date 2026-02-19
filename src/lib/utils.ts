import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { ConvexError } from "convex/values";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// taken from is-standalone-pwa
export function isStandalonePWA(): boolean {
  return (
    typeof window !== "undefined" &&
    // matchMedia()
    (window?.matchMedia("(display-mode: standalone)").matches ||
      // iOS
      // @ts-expect-error iOS non-standard standalone property
      window.navigator?.standalone ||
      // Android
      document.referrer.startsWith("android-app://") ||
      // Windows
      // @ts-expect-error Windows non-standard Windows property
      window?.Windows ||
      /trident.+(msapphost|webview)\//i.test(navigator.userAgent) ||
      document.referrer.startsWith("app-info://platform/microsoft-store"))
  );
}

export const isAuthError = (error: unknown) => {
  // This broadly matches potentially auth related errors, can be rewritten to
  // work with your app's own error handling.
  const message =
    (error instanceof ConvexError && error.data) ||
    (error instanceof Error && error.message) ||
    "";
  return /auth/i.test(message);
};
