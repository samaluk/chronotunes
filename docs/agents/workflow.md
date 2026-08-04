# Agent workflow

- Do not create documentation files unless explicitly requested.
- Do not add emojis unless explicitly requested.

## Friction and lessons

Frog records unresolved workflow friction; lessons record verified knowledge that should outlive the original task. These are different queues.

- Run `pnpx frog list` before logging friction so existing entries are visible.
- Log recurring tooling, documentation, API, test, convention, or workflow friction with `pnpx frog log`.
- Do not log global, system, internal, temporary, or already-resolved problems.
- Treat the root `LESSONS.md` as a staging inbox. Do not read the whole inbox in every session; read it when the task is relevant or when reviewing and promoting lessons.
- Record only durable discoveries verified by current code, tests, documentation, or reproducible behavior.
- Promote reviewed lessons with `.agents/skills/lessons-to-config/SKILL.md`, preferring tests or other enforcement, then code-local explanations, subsystem documentation, ADRs, scoped guidance, reusable skills, commands, or specialized agents. Use root `AGENTS.md` only for short rules that truly apply everywhere.

ChronoTunes uses Frog Action-only mode. The workflow uses the repository `GITHUB_TOKEN`, accepts no inbound reports, and does not report to other repositories. Cross-repository targets remain deferred by design. The workflow runs only for default-branch pushes, trusted Frog issue events, manual runs, and the daily sweep.
