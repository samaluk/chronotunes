"use client";

import type { Locale } from "next-intl";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

type LocaleAction = (locale: Locale) => Promise<void>;

const LocaleActionContext = createContext<LocaleAction | null>(null);

export function LocaleActionProvider({
  children,
  changeLocaleAction,
}: {
  children: ReactNode;
  changeLocaleAction: LocaleAction;
}): ReactNode {
  return (
    <LocaleActionContext.Provider value={changeLocaleAction}>
      {children}
    </LocaleActionContext.Provider>
  );
}

export function useLocaleAction(): LocaleAction {
  const context = useContext(LocaleActionContext);
  if (!context) {
    throw new Error("useLocaleAction must be used within LocaleActionProvider");
  }
  return context;
}
