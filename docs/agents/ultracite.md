# Ultracite standards

This project uses **Oxlint** for linting and **Oxfmt** for formatting. The **Ultracite** npm package supplies shared presets: they are composed in [`oxlint.config.ts`](../../oxlint.config.ts) and [`oxfmt.config.ts`](../../oxfmt.config.ts) at the repository root (import paths such as `ultracite/oxlint/core` and `ultracite/oxfmt`). There is no Biome configuration in this repo.

## Core principles

- Write code that is accessible, performant, type-safe, and maintainable.
- Focus on clarity and explicit intent over brevity.

## Type safety and explicitness

- Use explicit types for function parameters and return values when they enhance clarity.
- Prefer `unknown` over `any` when the type is genuinely unknown.
- Use const assertions (`as const`) for immutable values and literal types.
- Leverage TypeScript's type narrowing instead of type assertions.
- Use meaningful variable names instead of magic numbers; extract constants.

## Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short non-component functions.
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops.
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access.
- Prefer template literals over string concatenation.
- Use destructuring for object and array assignments.
- Use `const` by default, `let` only when reassignment is needed, never `var`.

## Async and promises

- Always `await` promises in async functions.
- Use `async/await` syntax instead of promise chains for better readability.
- Handle errors appropriately in async code with try-catch blocks.
- Do not use async functions as Promise executors.

## Error handling and debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code.
- Throw `Error` objects with descriptive messages, not strings or other values.
- Use `try-catch` blocks meaningfully; do not catch errors just to rethrow them.
- Prefer early returns over nested conditionals for error cases.

## Code organization

- Keep functions focused and under reasonable cognitive complexity limits.
- Extract complex conditions into well-named boolean variables.
- Use early returns to reduce nesting.
- Prefer simple conditionals over nested ternary operators.
- Group related code together and separate concerns.

## Security

- Add `rel="noopener"` when using `target="_blank"` on links.
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary.
- Do not use `eval()` or assign directly to `document.cookie`.
- Validate and sanitize user input.

## Performance

- Avoid spread syntax in accumulators within loops.
- Use top-level regex literals instead of creating them in loops.
- Prefer specific imports over namespace imports.
- Avoid barrel files (index files that re-export everything).

## When Oxlint cannot help

Oxlint will catch many issues automatically. Focus on:

1. Business logic correctness
2. Meaningful naming
3. Architecture decisions
4. Edge cases
5. User experience
6. Documentation for complex logic (prefer self-documenting code)
