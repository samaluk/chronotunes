## [2026-01-18 19:18:00] - S17: Submit Placement Mutation
Thread: 
Run: 20260118-174814-58161 (iteration 13)
Run log: /Users/smaluk/dev/personal/chronotunes/.ralph/runs/run-20260118-174814-58161-iter-13.log
Run summary: /Users/smaluk/dev/personal/chronotunes/.ralph/runs/run-20260118-174814-58161-iter-13.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: 70413eb fix: reorder validation checks in submitPlacement mutation
- Post-commit status: clean
- Verification:
  - Command: pnpm biome check . -> PASS
  - Command: pnpm test convex/rounds.test.ts -> PASS (15/15 tests)
  - Command: pnpm test -> PASS (84/84 tests)
- Files changed:
  - convex/rounds.ts (reordered validation checks in submitPlacement mutation)
- What was implemented:
  - Fixed submitPlacement mutation validation order to check phase first, then turn player, then preview
  - This ensures non-turn players get "Only the turn player can submit placement" error instead of "Please preview your placement first"
  - All 5 existing tests for submitPlacement pass (plus 10 from S15/S16 for 15 total in rounds.test.ts)
- **Learnings for future iterations:**
  - Validation order matters for error messages - check authorization before business logic
  - When a test expects a specific error, check that validation order produces the correct error first
  - The submitPlacement mutation and tests were already implemented; only needed to fix validation order
