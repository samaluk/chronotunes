# ChronoTunes

Browser-based multiplayer music timeline game (Hitster clone) with YouTube audio.

## Getting started

```bash
mise install
hk install --global
pnpm install
pnpm dev
```

The global hk hooks are a no-op outside repositories with an `hk.pkl` file. If mise is not
available, install hk with Homebrew (`brew install hk`) or another method from the
[hk installation guide](https://hk.jdx.dev/getting_started.html#installation).

Open `http://localhost:3000` in your browser.

Edit `src/app/page.tsx` to update the landing page.
