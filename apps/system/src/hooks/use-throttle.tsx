import { useEffect, useRef, useState } from "react";

function useThrottle<T>(value: T, delayMs: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const latestValue = useRef(value);
  const lastUpdatedAt = useRef(Date.now());
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestValue.current = value;
    const elapsed = Date.now() - lastUpdatedAt.current;

    if (elapsed >= delayMs) {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
        timeoutId.current = null;
      }
      lastUpdatedAt.current = Date.now();
      setThrottledValue(value);
    } else if (timeoutId.current === null) {
      timeoutId.current = setTimeout(() => {
        timeoutId.current = null;
        lastUpdatedAt.current = Date.now();
        setThrottledValue(latestValue.current);
      }, delayMs - elapsed);
    }
  }, [value, delayMs]);

  useEffect(
    () => () => {
      if (timeoutId.current) clearTimeout(timeoutId.current);
    },
    [],
  );

  return throttledValue;
}

export { useThrottle };
