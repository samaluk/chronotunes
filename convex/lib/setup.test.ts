import { describe, expect, test, expectTypeOf } from "vitest";

describe("setup verification", () => {
  test("vitest is configured correctly", () => {
    expect(1 + 1).toBe(2);
  });

  test("edge-runtime environment is available", () => {
    expectTypeOf(global).toBeObject();
  });
});
