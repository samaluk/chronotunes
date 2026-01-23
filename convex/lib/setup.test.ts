import { describe, expect, test } from "vitest"

describe("setup verification", () => {
  test("vitest is configured correctly", () => {
    expect(1 + 1).toBe(2)
  })

  test("edge-runtime environment is available", () => {
    expect(typeof global).toBe("object")
  })
})
