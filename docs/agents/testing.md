# Testing

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

## Testing rules

- Write assertions inside `it()` or `test()` blocks.
- Avoid done callbacks in async tests; use async/await.
- Do not use `.only` or `.skip` in committed code.
- Keep test suites reasonably flat; avoid excessive `describe` nesting.
