"use client";

import { useEffect, useState } from "react";

// Har minute re-render karata hai taaki "Now" -> "1m" jaise relative times update hote rahein
export function useMinuteTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(timer);
  }, []);
}

// Search box mein type karte waqt har key pe API call na ho, thoda ruk ke value do
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
