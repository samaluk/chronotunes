# React and Next.js

## Component structure

- One component per `.tsx` file (except `components/ui/`).
- Extract subcomponents to separate files.
- Use function declarations for components (no arrow component exports).
- Arrow functions are fine for callbacks and short non-component helpers.

```typescript
export function PlayerCard({ player }: PlayerCardProps) {
  return <div>...</div>;
}
```

## React and JSX

- Use function components over class components.
- Call hooks at the top level only, never conditionally.
- Specify all dependencies in hook dependency arrays.
- Use the `key` prop for list items (prefer unique IDs over array indices).
- Nest children between opening and closing tags instead of passing as props.
- Do not define components inside other components.
- Use semantic HTML and ARIA attributes for accessibility.
- Provide meaningful alt text for images.
- Use proper heading hierarchy.
- Add labels for form inputs.
- Include keyboard event handlers alongside mouse events.
- Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles.
- React 19+: use ref as a prop instead of `React.forwardRef`.

## Next.js specifics

- Use the Next.js `<Image>` component instead of `<img>` tags.
- Use the App Router metadata API (`export const metadata` / `generateMetadata`) for head elements, not `next/head` (Pages Router only).
- Use Server Components for async data fetching instead of async Client Components.

## Instant navigation and connectivity

`cacheComponents` and `partialPrefetching` are enabled. Keep cookie reads inside
`LocalizedProviders`, beneath the root Suspense boundary. The initial HTML shows
a language-neutral ChronoTunes shell; translated content streams after the locale
cookie resolves. That content has its own `lang` attribute, and `DocumentLanguage`
updates the document language on hydration and locale changes.

The lobby's URL-dependent content has a separate Suspense boundary using
`LobbyLoadingScreen`. Static chrome already prerenders without `use cache`.
Convex owns live lobby, player, and game data, so do not cache it with Next.js.

Use `Link` from `@/i18n/routing` for navigation without side effects. Its default
prefetch loads the shared route shell. Create, join, and leave remain buttons
because navigation follows a successful mutation. Join and leave prefetch their
known destinations while the mutation runs. Creating a lobby has no destination
code until the server responds.

`experimental.useOffline` retries Next.js navigations and Server Actions after
connectivity returns. A prefetched shell can render offline, but creating or
joining a lobby still needs Convex. Convex manages its own WebSocket reconnection
and mutation queue; Next.js does not cache or synchronize game state. A full
reload offline still needs the network because the app has no service worker.

Vercel enables immutable assets automatically for Next.js 16.3. Keep its native
adapter configuration. To verify a deployment, inspect a generated
`/_next/static/immutable/` asset for `Cache-Control: public,max-age=31536000,immutable`.
The existing `scripts/vercel-build.sh` remains the deployment build entry point.
