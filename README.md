# ChronoTunes

ChronoTunes is a browser-based multiplayer music timeline game. Players listen to a
track and place it in chronological order on their timeline while other players can
bet on the result. It is an independent project inspired by the format of music
timeline party games.

ChronoTunes is not affiliated with, endorsed by, or sponsored by Hitster or its
publisher. Hitster is a trademark of its respective owner. Spotify and YouTube are
separate services and trademarks of their respective owners; ChronoTunes does not
include or redistribute their audio. Playback uses links to publicly available
YouTube videos.

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

The local app uses Convex for realtime game state. Run `pnpm convex:dev` in a second
terminal to start the local backend and configure the development environment. Seed
the demo catalog after the backend is ready:

```bash
pnpm exec convex run seed:seed --deployment local
```

## Checks and tests

Run the same checks used by pull requests:

```bash
pnpm check
pnpm next:typegen
pnpm convex:typegen
pnpm test:once
pnpm build
```

The project uses pnpm. Pull-request automation runs on GitHub-hosted Ubuntu runners.

## Catalog and deployment

A catalog is factual track metadata—title, artist, year, and optional identifiers—plus
references to external playback services. Audio files are not bundled. The repository
contains only a small independently selected demo catalog for local play; the
production Convex catalog is maintained separately and is not a promise of a hosted
service. There is currently no supported turnkey self-hosting or catalog-import
product.

Earlier private development used catalogs derived from public Hitster Spotify playlists
and matched to YouTube results with project tooling. Those historical commits remain
in Git history and are documented honestly for provenance; they are not the source of
the distributed demo catalog.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks, and pull-request guidance.
Please read [SECURITY.md](SECURITY.md) before reporting a vulnerability.

## License

The source code is available under the [MIT License](LICENSE). Third-party services,
trademarks, and externally hosted media remain subject to their own terms.
