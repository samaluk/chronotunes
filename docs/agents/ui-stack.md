# UI stack

- Tailwind CSS v4.1 with fluid-tailwindcss
- shadcn/ui: Lyra style, Neutral base, Fuchsia theme
- Icons: Lucide
- Theming: next-themes (light/dark)
- Toasts: sonner
- i18n: next-intl (internationalization)

## Design-system lint (`@shadcn/lint`)

Oxlint loads `@shadcn/lint` from [`oxlint.config.ts`](../../oxlint.config.ts). Callers may use layout classes on primitives. Game Cards may also change spacing, color, effects, and motion. Status palettes (`amber`, `green`, `red`, `blue`, `orange`, `yellow`) and `bg-hero-glow` are allowed until they become theme tokens.

`shadcn/no-unknown-classes` stays off: the plugin cannot build this theme with fluid-tailwindcss.

After UI changes, run `pnpm check` and fix `@shadcn/lint` errors.
