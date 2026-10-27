"use client";
import { useEffect, useState } from "react";

// Only used for behaviour (for example "open the chat after picking a group on a phone").
// Layout itself is pure CSS breakpoints, so nothing flashes before this runs.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return matches;
}
