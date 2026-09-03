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
service.

### Importing a catalog from a Spotify playlist

Operators can import and validate a game catalog from any public Spotify playlist URL, URI, or identifier:

```bash
# Validate tracks and inspect diagnostics without database changes
pnpm import:spotify https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M --dry-run

# Or with just:
just import-spotify 37i9dQZF1DXcBWIGoYBM5M "--dry-run"

# Atomically replace the catalog with validated tracks:
pnpm import:spotify 37i9dQZF1DXcBWIGoYBM5M --replace
```

#### Accepted inputs

- Web URLs: `https://open.spotify.com/playlist/{id}` or regional variants (e.g. `https://open.spotify.com/intl-es/playlist/{id}?si=...`)
- Spotify URIs: `spotify:playlist:{id}`
- Bare IDs: alphanumeric Spotify playlist identifier (e.g. `37i9dQZF1DXcBWIGoYBM5M`)

#### Credentials & environment variables

- `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`: Spotify Developer credentials for accessing the Spotify Web API. Recommended for retrieving complete track metadata including album release dates and full pagination. Can also be passed via `--client-id` and `--client-secret`.
- `SPOTIFY_TOKEN`: A pre-obtained Spotify bearer token (optional alternative, `--token`).
- `YOUTUBE_API_KEY`: Google YouTube Data API v3 key used by the external playback resolver to find YouTube video IDs. Can also be passed via `--api-key`.
- `CONVEX_DEPLOYMENT`: Target Convex deployment (`local`, `dev`, or `prod`, defaults to `local`).

#### Diagnostic reporting & safety

- Missing, duplicate, unavailable, and malformed tracks produce categorized reports rather than corrupting the catalog.
- Catalog replacement is performed via internal Convex administrative functions (`catalog_admin:replaceCatalog` and `catalog_admin:importSpotifyPlaylist`) that cannot be triggered through the public application API.
- All tracks are validated before database mutations; if any batch item violates catalog invariants, the operation aborts without modifying the existing catalog.

#### Service limitations

- **Spotify Web API rate limits**: Requests are subject to Spotify API rate limits (HTTP 429).
- **Market & regional availability**: Tracks unavailable or restricted in certain regions (`is_playable: false`) or local audio files are excluded to maintain game consistency.
- **Public embed fallback**: When unauthenticated, the importer falls back to Spotify's public embed page, which does not provide album release dates and is limited in track count. Supplying Spotify API credentials is recommended.
- **YouTube Data API quota**: YouTube search operations consume quota units (100 units per search query) against the Google Cloud project's daily quota limit.

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
