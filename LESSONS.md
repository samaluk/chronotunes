# Lessons inbox

This is a staging inbox for durable, verified discoveries. It is not a journal and is not read in every session. Keep entries short enough to review and promote.

Record a lesson only when it is still true, materially useful, and would prevent future rediscovery. Prefer invariants, deterministic-testing rules, generated-artifact requirements, architecture boundaries, and stable framework or external-service behavior. Temporary bugs, one-off workarounds, and service outages do not belong here.

Use this shape for new entries:

```md
## Short lesson title

- Observation: what happened.
- Durable rule: what remains true.
- Evidence: test, code, documentation, or reproducible behavior.
- Scope: the code, workflow, or subsystem affected.
```

When promoting lessons, read the repository guidance and use `.agents/skills/lessons-to-config/SKILL.md`. Prefer enforcement or the narrowest existing documentation home. Remove an entry after it has been promoted, merged into an existing rule, or deliberately discarded as obsolete or unverified.
