import { describe, expect, it, vi } from "vitest";

import { nextIndexForDirection } from "./use-betting-actions";

describe(nextIndexForDirection, () => {
  it("moves down within bounds", () => {
    expect(nextIndexForDirection(5, null, 1, "down", vi.fn())).toBe(2);
  });

  it("moves up within bounds", () => {
    expect(nextIndexForDirection(5, null, 2, "up", vi.fn())).toBe(1);
  });

  it("returns null when moving past the top", () => {
    const onForbidden = vi.fn();
    expect(nextIndexForDirection(5, null, 0, "up", onForbidden)).toBeNull();
    expect(onForbidden).not.toHaveBeenCalled();
  });

  it("returns null when moving past the bottom", () => {
    expect(nextIndexForDirection(5, null, 4, "down", vi.fn())).toBeNull();
  });

  it("skips the turn player slot moving down", () => {
    const onForbidden = vi.fn();
    expect(nextIndexForDirection(5, 2, 1, "down", onForbidden)).toBe(3);
    expect(onForbidden).not.toHaveBeenCalled();
  });

  it("skips the turn player slot moving up", () => {
    expect(nextIndexForDirection(5, 2, 3, "up", vi.fn())).toBe(1);
  });

  it("reports forbidden when the skip would leave bounds below", () => {
    const onForbidden = vi.fn();
    expect(nextIndexForDirection(3, 2, 1, "down", onForbidden)).toBeNull();
    expect(onForbidden).toHaveBeenCalledWith(2);
  });

  it("reports forbidden when the skip would leave bounds above", () => {
    const onForbidden = vi.fn();
    expect(nextIndexForDirection(3, 0, 1, "up", onForbidden)).toBeNull();
    expect(onForbidden).toHaveBeenCalledWith(0);
  });
});
