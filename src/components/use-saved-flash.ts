"use client";

import { useEffect, useRef, useState } from "react";

/** How long a "Saved" confirmation stays up after a successful save. */
export const SAVED_FLASH_MS = 1_800;

/**
 * A short-lived "saved" flag: `flash()` after a successful save shows the
 * confirmation, and it clears itself. Used by the Today save buttons and by the
 * blocks that save on their own (`AutosaveStatus`).
 */
export function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function flash() {
    if (timer.current) clearTimeout(timer.current);
    setSaved(true);
    timer.current = setTimeout(() => setSaved(false), SAVED_FLASH_MS);
  }

  return { saved, flash };
}
