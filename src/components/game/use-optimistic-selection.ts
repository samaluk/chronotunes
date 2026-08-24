"use client";

import { useState } from "react";

/** Adopts server-side selection changes synchronously during render. */
export function useOptimisticSelection(serverSelection: number | null): {
  optimisticIndex: number | null;
  setOptimisticIndex: (index: number | null) => void;
} {
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);
  const [lastServerSelection, setLastServerSelection] = useState(serverSelection);
  if (serverSelection !== lastServerSelection) {
    setLastServerSelection(serverSelection);
    setOptimisticIndex(null);
  }
  return { optimisticIndex, setOptimisticIndex };
}
