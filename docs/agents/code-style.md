# Code style

## Formatting (Oxfmt)

- Oxfmt is the formatter (see `oxfmt.config.ts` and Ultracite oxfmt preset).
- 2-space indentation.
- Double quotes for strings.
- Semicolons as needed.
- Trailing commas in multiline.

## Imports

Order: external packages, internal, then relative.

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { GameHeader } from "./GameHeader";
```

## TypeScript

- Strict mode enabled.
- Prefer explicit return types on exported functions when they improve clarity.
- Use `type` for object shapes, `interface` for extendable contracts.
- Prefer `unknown` over `any`; avoid `any`.
- Use Convex `Id<"tableName">` for document IDs.

```typescript
export function computeValidRange(
  timeline: TimelineEntry[],
  year: number
): Range {
  // ...
}
```

## Naming conventions

- Files: kebab-case (`game-logic.ts`, `betting-panel.tsx`)
- Components: PascalCase (`TimelinePlacer.tsx` exports `TimelinePlacer`)
- Functions/variables: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/interfaces: PascalCase
