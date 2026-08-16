import { describe, expect, it } from "vitest";

import { routing } from "./routing";
import { messagesByLocale, resolveLocale } from "./messages";

function isNestedMessages(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function flattenKeys(messages: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(messages)) {
    const fullKey = prefix === "" ? key : `${prefix}.${key}`;
    if (isNestedMessages(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function keysForLocale(locale: (typeof routing.locales)[number]): string[] {
  return flattenKeys(messagesByLocale[locale]);
}

describe("locale messages", () => {
  it("provides a catalog for every configured locale", () => {
    expect(Object.keys(messagesByLocale).sort()).toEqual([...routing.locales].sort());
    for (const locale of routing.locales) {
      expect(messagesByLocale[locale]).toBeDefined();
    }
  });

  it("keeps the en and es catalogs structurally identical", () => {
    expect(keysForLocale("en").sort()).toEqual(keysForLocale("es").sort());
  });

  it("includes the betting year labels in every catalog", () => {
    for (const key of ["betting.beforeYear", "betting.afterYear", "betting.betweenYears"]) {
      expect(keysForLocale("en")).toContain(key);
      expect(keysForLocale("es")).toContain(key);
    }
  });
});

describe("resolveLocale", () => {
  it("falls back to the default locale when no cookie is present", () => {
    expect(resolveLocale(undefined)).toBe(routing.defaultLocale);
  });

  it("returns the cookie locale when it is valid", () => {
    for (const locale of routing.locales) {
      expect(resolveLocale(locale)).toBe(locale);
    }
  });

  it("falls back to the default locale for an unknown value", () => {
    expect(resolveLocale("fr")).toBe(routing.defaultLocale);
  });
});
