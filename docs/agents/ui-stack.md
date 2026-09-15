# UI stack

- Tailwind CSS v4.1 with fluid-tailwindcss
- shadcn/ui: Lyra style, Neutral base, Fuchsia theme
- Icons: Lucide
- Theming: next-themes (light/dark)
- Toasts: sonner
- i18n: next-intl (internationalization)

## Design-system lint (`@shadcn/lint`)

Oxlint loads `@shadcn/lint` from [`oxlint.config.ts`](../../oxlint.config.ts). All six rules are errors:

| Rule                     | Policy                                                                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-restyle`             | Callers may use layout classes on primitives. Game `Card`s may also change spacing, color, effects, and motion. `src/components/ui/**` is exempt (primitives own appearance). |
| `no-raw-colors`          | Use theme tokens (`primary`, `success`, `warning`, `info`, `destructive`, `muted`, …). Do not use default palettes (`amber-500`, `green-600`, …).                             |
| `no-arbitrary-values`    | Layout arbitrary values are allowed. Appearance scales belong in the theme. Primitives are exempt.                                                                            |
| `no-inline-styles`       | No `style={…}` for colors or layout.                                                                                                                                          |
| `require-static-classes` | Class names must be statically analyzable. Primitives are exempt.                                                                                                             |
| `no-unknown-classes`     | Classes must exist in this project's Tailwind theme.                                                                                                                          |

Status colors are `--success`, `--warning`, and `--info` in [`src/app/globals.css`](../../src/app/globals.css) (plus existing `--destructive`). Custom CSS (`hero-glow`, `dialog-body-scroll`, `animate-shake`) is registered with `@utility`.

`@plugin "fluid-tailwindcss"` cannot be used directly: `@shadcn/lint`'s theme worker `createRequire`s the CJS build and passes a namespace object into Tailwind (`b is not a function`). Load [`src/lib/fluid-tailwindcss-plugin.mjs`](../../src/lib/fluid-tailwindcss-plugin.mjs) instead, which re-exports the ESM plugin function.

If a report is a plugin bug, check [shadcn-ui/lint issues](https://github.com/shadcn-ui/lint/issues) before disabling. Disable only at the call site (`oxlint-disable-next-line shadcn/<rule>`), never the whole rule.

After UI changes, run `pnpm check` and fix `@shadcn/lint` errors.
