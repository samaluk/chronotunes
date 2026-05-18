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
- Use `next/head` or the App Router metadata API for head elements.
- Use Server Components for async data fetching instead of async Client Components.
