# Testing

These guidelines adapt Kent C. Dodds' testing principles from Kody: https://github.com/kentcdodds/kody/blob/main/docs/contributing/testing-principles.md

Use the repository's existing commands and framework-specific setup; the principles below govern test design.

## File locations

Tests live alongside source files:

```text
convex/lobbies.ts         -> convex/lobbies.test.ts
convex/lib/gameLogic.ts   -> convex/lib/gameLogic.test.ts
components/game/Timer.tsx -> components/game/Timer.test.tsx
```

## Convex function tests

```typescript
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

test("create lobby generates 6-char code", async () => {
  const t = convexTest(schema);
  const result = await t.mutation(api.lobbies.create, { displayName: "Host" });
  expect(result.code).toHaveLength(6);
});
```

## Component tests

```typescript
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { PlayerCard } from "./PlayerCard";

test("displays player name", () => {
  render(<PlayerCard player={{ displayName: "Alice", coins: 3 }} />);
  expect(screen.getByText("Alice")).toBeInTheDocument();
});
```

## Testing principles

- Choose the lightest test layer that can falsify the behavior. Escalate to integration or end-to-end tests only when the behavior genuinely depends on those boundaries.
- Prefer fewer, longer tests when multiple actions and assertions belong to one meaningful workflow.
- Treat each test like a manual tester's script: explicit setup, realistic actions, and all relevant assertions for the journey.
- Do not split one coherent flow merely to achieve one assertion per test. Multiple related assertions in one test are desirable.
- Keep suites flat where practical. Prefer top-level `test(...)`/`it(...)` over deep `describe` nesting.
- Avoid shared setup such as `beforeEach`/`afterEach` when it hides what a test needs. Prefer inline setup or explicit factory helpers.
- Avoid shared mutable state between tests. If later assertions depend on the same rendered object, request, response, or state transition, they likely belong in the same test.
- Build helpers that return ready-to-use objects or fixtures instead of mutable globals.
- Keep test names behavior-focused and specific.
- Test observable behavior and stable contracts rather than implementation details.
- Avoid tests that merely pin incidental copy, descriptions, warnings, or configuration strings. Prefer structured output or user-visible outcomes.
- Do not test guarantees already enforced by the type system unless runtime behavior adds something materially different.
- Keep tests deterministic and able to run offline where practical. Prefer local fakes and fixtures over live third-party services.
- Keep the bar high for slower integration and E2E tests; reserve them for important cross-boundary behavior and a small number of critical journeys.
- Prefer asserting meaningful intermediate states inside the broader workflow that causes them rather than isolated transition-only tests.
- Add regression tests when the failure is plausible to recur or the affected workflow is important enough to justify ongoing maintenance.
- Use async/await for asynchronous tests; avoid done callbacks.
- Do not use `.only` or `.skip` in committed code.

## Review heuristic

Before adding a new test, ask:

1. What behavior could this test falsify?
2. Is there a lighter test layer that can prove the same thing honestly?
3. Does this assertion belong to an existing workflow test?
4. Am I testing behavior, or merely pinning implementation detail or prose?
5. Will this test remain useful enough to justify its maintenance and runtime cost?
