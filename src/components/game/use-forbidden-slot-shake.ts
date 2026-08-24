"use client";

import { useEffect, useState } from "react";

const FORBIDDEN_SLOT_SHAKE_MS = 500;

/** Shakes a forbidden slot for a fixed window after it is clicked. */
export function useForbiddenSlotShake(): {
  shakeSlotIndex: number | null;
  triggerForbiddenSlot: (index: number) => void;
} {
  const [shakeSlotIndex, setShakeSlotIndex] = useState<number | null>(null);

  useEffect(() => {
    if (shakeSlotIndex === null) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setShakeSlotIndex(null);
    }, FORBIDDEN_SLOT_SHAKE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [shakeSlotIndex]);

  return { shakeSlotIndex, triggerForbiddenSlot: setShakeSlotIndex };
}
