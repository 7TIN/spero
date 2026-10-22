import { useEffect, useRef, useState } from "react";

/**
 * Debounce rapid changes, then space the emitted values by at least
 * `minIntervalMs`. Useful for search-as-you-type against an API that allows
 * only one request per second.
 */
export function useDebouncedRateLimitedValue<T>(
  value: T,
  debounceMs: number,
  minIntervalMs: number,
): T {
  const [emitted, setEmitted] = useState(value);
  const latestValue = useRef(value);
  const lastEmittedAt = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    latestValue.current = value;

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    const elapsed = Date.now() - lastEmittedAt.current;
    const wait = Math.max(debounceMs, minIntervalMs - elapsed);

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      lastEmittedAt.current = Date.now();
      setEmitted(latestValue.current);
    }, wait);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, debounceMs, minIntervalMs]);

  return emitted;
}
