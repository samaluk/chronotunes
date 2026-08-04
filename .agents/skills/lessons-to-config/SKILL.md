---
name: lessons-to-config
description: Promote validated lessons from a repository lesson inbox into their durable final form—mechanical enforcement, code-local explanations, documentation, scoped agent rules, reusable skills, commands, or specialized agents—and remove promoted lessons. Use when a lesson inbox has accumulated durable discoveries, after substantial debugging or refactoring, or when asked to institutionalize lessons for future coding-agent sessions.
---

# Lessons to Config

Turn accumulated lessons into repository structure that makes future sessions benefit automatically.

This skill is intentionally **repository-agnostic**. It must never accumulate knowledge about a particular repository, owner, product, domain, technology stack, filesystem layout, deployment environment, or organization. Repository-specific knowledge belongs in that repository's own code, docs, tests, configuration, agent instructions, skills, commands, or lesson inbox—not in this shared skill.

A lesson inbox is staging, not canonical documentation and not permanent context. A successful run leaves each reviewed lesson either promoted to a better home, deliberately retained with a reason, merged with an existing canonical source, or deleted as obsolete/noisy.

## Portability invariant

Keep this skill reusable unchanged across unrelated repositories.

- Do not edit this skill to add repository-specific examples, paths, commands, conventions, architecture, provider quirks, or domain rules.
- Do not copy lesson content into this skill.
- Do not make routing decisions based on assumptions from a previous repository or session.
- Discover the current repository's structure fresh on each invocation.
- If a repository needs custom policy for when to capture or promote lessons, put that policy in the repository's own agent documentation, not here.

## Core principle

Prefer the **lowest-level, most enforceable, most local** final form that prevents rediscovery.

A lesson that can become a test, static rule, type constraint, schema constraint, package boundary, script guard, generated check, or CI assertion should usually become that instead of prose. A lesson about one surprising implementation detail should live next to that detail. A procedure should become an on-demand skill or deterministic command. A broad repository rule should reach root agent instructions only when it truly needs always-on context.

Do not preserve history merely because it was expensive to learn. Preserve the rule, invariant, guardrail, procedure, or explanation that changes future behavior.

## Inputs

1. Find the repository's explicit lesson inbox. Prefer the repository's established convention; `LESSONS.md` is a common default when none exists.
2. Read the repository's agent/configuration structure before routing anything, including as applicable:
   - root and scoped agent instructions
   - reusable skills
   - commands and scripts
   - developer and package documentation
   - ADRs or architecture docs
   - tests, lint/static rules, schemas, generated checks, CI
3. Read only the code/docs needed to validate and place each lesson correctly.

Do not preload unrelated repository context.

## Workflow

### 1. Inventory and normalize

For each lesson, extract:

- **Observation** — what happened?
- **Durable knowledge** — what remains true?
- **Scope** — line/function/module/package/subtree/repository/workflow?
- **Audience** — runtime code, developers, coding agents, operators, or users?
- **Failure mode** — what future mistake or wasted investigation does this prevent?
- **Confidence** — is it verified by current code/tests/docs/behavior?

Rewrite mentally from narrative history into an actionable invariant. Do not immediately edit files.

### 2. Validate before promoting

A lesson is promotable only if it is still true and materially useful.

Check current code, configuration, docs, tests, generated artifacts, and relevant live state when needed.

- **Obsolete / fixed / false** → delete from the inbox.
- **Duplicate** → merge into the existing canonical source; delete the duplicate lesson.
- **Unverified or situational** → retain with a short reason or convert to an investigation/issue when appropriate; do not harden speculation into config.
- **Durable and verified** → promote.

Never turn a temporary workaround into permanent guidance when the underlying problem can and should be fixed.

### 3. Choose the final form

Use this precedence as a default, not a blind rule:

1. **Mechanical enforcement**
   - regression test
   - type/API/package boundary
   - lint/static-analysis rule
   - schema/config validation
   - script/CLI guard
   - CI check
   - generated assertion

   Choose this when the repository can make the mistake impossible or immediately visible.

2. **Code-local `WHY` explanation**

   Choose this when the lesson explains a surprising implementation constraint that cannot be made self-evident. Explain the reason, not the syntax, beside the affected code.

3. **Package/module README or developer documentation**

   Choose this for usage contracts, setup, integration behavior, architecture explanations, operational procedures, or information primarily needed while working in one subsystem.

4. **ADR / architecture documentation**

   Choose this for durable design decisions, tradeoffs, boundaries, or decisions future maintainers may otherwise reverse accidentally.

5. **Scoped agent rule**

   Choose subtree-level agent instructions when the rule applies only to that subtree. Prefer scoped instructions over root context.

6. **Reusable skill**

   Choose this for a non-trivial repeatable multi-step procedure that should load on demand rather than remain always in context. Prefer updating an existing skill over creating an overlapping one.

7. **Command / script**

   Choose this when a repeated operation can be made deterministic and directly invokable. A skill may explain when/how while a command performs the operation.

8. **Specialized agent**

   Choose this only when the task genuinely benefits from a distinct role, tool set, permission boundary, or bounded context—not merely because the instructions are long.

9. **Root always-on agent instructions**

   Use only for short, high-value constraints that apply broadly to relevant sessions and cannot be enforced or scoped more narrowly.

A single lesson may yield more than one artifact when the artifacts serve different purposes, such as an enforcement check plus concise subsystem documentation. Avoid redundant copies of the same instruction.

See `references/routing.md` for a compact routing table and neutral examples.

### 4. Promote with minimal context cost

When editing final forms:

- Keep rules concise and imperative.
- Link to detailed docs instead of copying them into always-on agent context.
- Put guidance as close as possible to the code/workflow it governs.
- Prefer one canonical source. Remove superseded or duplicated guidance.
- Preserve repository conventions and generated blocks.
- Prefer vendor-neutral locations when they already work across the repository's agent tooling.
- Do not create a new skill, command, or specialized agent when an existing one can be extended coherently.
- Do not expose secrets, credentials, personal data, private infrastructure details, or sensitive research/data content while promoting a lesson. Route operational secrets to the repository's existing secret-management mechanism and document only the non-secret invariant.

### 5. Update the lesson inbox

After a lesson has a verified canonical destination:

- remove it from the inbox, or
- if the repository intentionally keeps promotion history, replace it with a terse pointer only when that convention already exists.

Do not keep the full lesson duplicated in staging.

If the inbox becomes empty, keep only minimal inbox instructions when agents rely on the file's existence; otherwise follow repository convention.

### 6. Validate

Run the narrowest relevant checks for the artifacts changed, then broader repository checks when practical.

Examples include:

- tests for new mechanical guardrails
- lint/format/static checks for code or config
- docs/link checks
- skill frontmatter/discovery validation
- command/script smoke tests
- agent-instruction review for contradictions and duplicated scope

Inspect the final diff for accidental context growth, duplicated rules, leaked secrets, and repo-specific edits to this shared skill.

## Interaction with friction tracking

This skill is not a friction tracker.

- **Friction still unresolved and should be fixed** → keep it in the repository's friction/issue system.
- **Durable knowledge discovered while resolving or navigating friction** → capture it in the lesson inbox, then promote it with this skill.
- **Resolved friction with no remaining durable invariant** → no lesson is required.

Do not turn every friction entry into a permanent rule.

## Quality bar

A promotion is good when a future agent gets the benefit **without needing to know the original lesson existed**.

Prefer:

- a failing regression test over “remember not to do X”
- a structural boundary over a prose boundary rule
- a deterministic command over several manual steps
- local subsystem docs over root agent context
- a scoped rule over a global one
- an on-demand skill over a long always-on procedure
- deletion over stale lore

## Completion report

At the end, summarize each reviewed lesson compactly:

- lesson
- disposition: promoted / merged / retained / deleted
- canonical destination
- enforcement or validation added

Also report contradictions found in existing instructions and lessons intentionally retained because they need more evidence.
