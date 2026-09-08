"use client";

import { useLocale } from "next-intl";
import { useLayoutEffect } from "react";

export function DocumentLanguage() {
  const locale = useLocale();

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
