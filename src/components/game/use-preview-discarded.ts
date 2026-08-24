"use client";

import { useEffect, useState } from "react";

const PREVIEW_DISCARDED_NOTICE_MS = 2500;

/** Shows a transient notice when another player locks the slot we previewed. */
export function usePreviewDiscarded(otherLockedSelection: boolean): boolean {
  const [showPreviewDiscarded, setShowPreviewDiscarded] = useState(false);
  const [wasOtherLocked, setWasOtherLocked] = useState(false);

  if (otherLockedSelection !== wasOtherLocked) {
    setWasOtherLocked(otherLockedSelection);
    setShowPreviewDiscarded(otherLockedSelection);
  }

  useEffect(() => {
    if (!showPreviewDiscarded) {
      return;
    }
    const timeoutId = setTimeout(() => {
      setShowPreviewDiscarded(false);
    }, PREVIEW_DISCARDED_NOTICE_MS);
    return () => clearTimeout(timeoutId);
  }, [showPreviewDiscarded]);

  return showPreviewDiscarded;
}
