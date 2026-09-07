# Agent workflow

- Do not create documentation files unless explicitly requested.
- Do not add emojis unless explicitly requested.

ChronoTunes uses a human-directed, issue-based engineering workflow. GitHub Issues hold durable specs, tickets, dependencies, and handoff notes. Do not create a repository-local task queue or run an unattended loop over pending work.

## Choose the smallest useful path

A small, explicit request can go straight to implementation. Keep the request as the acceptance criteria and do not create an issue merely to restate it.

Use the full workflow when a change needs product clarification, spans more than one reviewable slice, or must survive a handoff:

1. Clarify the idea. For product work with unresolved choices, use the Matt Pocock `grill-with-docs` approach. Ask one consequential question at a time. Record stable domain terms in `CONTEXT.md` and architectural decisions in `docs/adr/` only when the conversation settles them.
2. Agree on the spec. Publish the agreed behavior as a GitHub Issue. Describe user-visible outcomes, constraints, non-goals, and acceptance criteria. Do not prescribe file names or function signatures unless the constraint truly requires them.
3. Split the build. Break a large spec into tracer-bullet tickets that each deliver an end-to-end behavior. Record blocking edges with GitHub's native issue dependencies. A ticket should be small enough to implement and review in one focused session.
4. Implement one ticket. Claim the issue before editing, read its body and comments, then read the relevant repository guidance. Agree on the public test seams before adding tests. Work in red, green, refactor slices and keep unrelated cleanup out of the diff.
5. Review and verify. Review the diff against both repository standards and the originating request or issue. Run focused tests during development, then the full pre-submit suite from `commands.md`.
6. Report the result. State what changed and how it was verified. Update or close the issue only after every acceptance criterion passes. Commit, push, or open a pull request only when the user requested it or the active workflow requires it.

The matching Matt Pocock skill chain, when installed, is `grill-with-docs` to `to-spec` to `to-tickets` to `implement`. `implement` uses `tdd` at agreed seams and finishes with `code-review`. The process above remains authoritative when those skills are unavailable.

## Ticket readiness

- `needs-triage` means the report has not been evaluated.
- `needs-info` means implementation is blocked on information from the reporter or product owner.
- `ready-for-agent` means the behavior has been verified where applicable and the issue has an actionable brief with testable acceptance criteria.
- `ready-for-human` means the next step requires human judgment or action.
- `wontfix` means the repository has deliberately rejected the work.

Keep exactly one workflow-state label on a triaged issue. See `triage-labels.md` for the repository's label mapping.

## Bugs and large investigations

For a bug or performance regression, establish a feedback loop that reproduces the problem before changing production code. Minimize the reproduction, form and test a concrete hypothesis, implement the smallest fix, and keep the reproduction as a regression test.

Use `wayfinder` only when the destination is known but the route is too uncertain for one session. Its issues answer planning questions. They do not implement features. When the map is resolved, return to the spec and ticket workflow.

## Friction and lessons

Frog records unresolved workflow friction; lessons record verified knowledge that should outlive the original task. These are different queues.

- Run `pnpx frog list` before logging friction so existing entries are visible.
- Log recurring tooling, documentation, API, test, convention, or workflow friction with `pnpx frog log`.
- Do not log global, system, internal, temporary, or already-resolved problems.
- Treat the root `LESSONS.md` as a staging inbox. Do not read the whole inbox in every session; read it when the task is relevant or when reviewing and promoting lessons.
- Record only durable discoveries verified by current code, tests, documentation, or reproducible behavior.
- Promote reviewed lessons with `.agents/skills/lessons-to-config/SKILL.md`, preferring tests or other enforcement, then code-local explanations, subsystem documentation, ADRs, scoped guidance, reusable skills, commands, or specialized agents. Use root `AGENTS.md` only for short rules that truly apply everywhere.

ChronoTunes uses Frog Action-only mode. The workflow uses the repository `GITHUB_TOKEN`, accepts no inbound reports, and does not report to other repositories. Cross-repository targets remain deferred by design. The workflow runs only for default-branch pushes, trusted Frog issue events, manual runs, and the daily sweep.
