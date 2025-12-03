import { useCallback, useEffect, useRef } from "react";

export function usePWA() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateHandlerRef = useRef<(() => void) | null>(null);

  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    if (event.data && event.data.type === "SW_CACHED") {
      console.log("PWA offline functionality activated");
    }
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Register the service worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("PWA Service Worker registered successfully:", registration);
          registrationRef.current = registration;

          // Check for updates
          const handleUpdateFound = () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New content is available
                if (confirm("New version available! Refresh to update?")) {
                  window.location.reload();
                }
              }
            });
          };

          updateHandlerRef.current = handleUpdateFound;
          registration.addEventListener("updatefound", handleUpdateFound);
        })
        .catch((error) => {
          console.error("Error registering PWA service worker:", error);
        });

      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);

      // Cleanup function
      return () => {
        navigator.serviceWorker.removeEventListener(
          "message",
          handleServiceWorkerMessage,
        );

        // Remove registration event listeners if they exist
        const registration = registrationRef.current;
        const updateHandler = updateHandlerRef.current;

        if (registration && updateHandler) {
          registration.removeEventListener("updatefound", updateHandler);
          registrationRef.current = null;
          updateHandlerRef.current = null;
        }
      };
    }
  }, [handleServiceWorkerMessage]);
}
