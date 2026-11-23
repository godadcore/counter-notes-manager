import { useEffect, useState } from "react";

export function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    const fallback = typeof initial === "function" ? initial() : initial;
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
