"use client";

import { useEffect, useRef } from "react";

/** Subscribes once; the latest handler is picked up through a refreshed ref. */
export function useGlobalKeydown(handler: (event: KeyboardEvent) => Promise<void>): void {
  const keydownRef = useRef(handler);

  useEffect(() => {
    keydownRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (event: KeyboardEvent): void => {
      void keydownRef.current(event);
    };

    globalThis.addEventListener("keydown", listener);
    return () => globalThis.removeEventListener("keydown", listener);
  }, []);
}
