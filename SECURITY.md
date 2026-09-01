# Security policy

Please do not report security vulnerabilities in a public issue or pull request.

Send a private report to [samaluk@miuandes.cl](mailto:samaluk@miuandes.cl). Include
the affected area, steps to reproduce, impact, and (when possible) a minimal proof of
concept. Please do not include real credentials or personal data in the report.

We will acknowledge reports as soon as practical and coordinate a fix or mitigation
with the reporter. There is no guaranteed response or disclosure timeline yet.

## Session security model

ChronoTunes currently uses a random client-generated session identifier stored in the
browser's local storage to associate a browser with a player. This is a lightweight
game-session mechanism, not account authentication or proof of identity. Anyone who
obtains a session identifier may be able to act as that player, so do not use it for
sensitive data or assume it provides account-level security.

The public application is intended for game state and external playback references;
it should not be used to store secrets. Catalog administration and destructive data
operations are operational concerns and are not part of the public application API.
