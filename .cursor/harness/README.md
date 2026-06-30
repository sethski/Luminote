# Agent harness — reference index

Context library for this workspace. The router lives in `.cursor/rules/afro.mdc` (short); details in `router.md` and `knobs.md`.
Read this file when you need the active local procedure or canonical wording.

## When to open what

| User intent | Read |
|-------------|------|
| Route / classify / QA gate | `router.md` + `knobs.md` |
| Tune thresholds | `knobs.md` |
| Full workflow / subagents | `router.md` §E |
| Canonical ponytail ladder | `ladder.md` |
| Upstream ponytail (sync only) | `upstream.md` → optional local `ponytail/` clone |
| Session state, prompt count, context age | `reference/metrics/state.md` → `reference/AGENT.md` |

## Not active

External adapters and project-local install packs are not part of the active harness. Track future work in `../../../afro-development/Futures/` from this folder.

## Maintenance

- **Knobs:** `knobs.md` only (not the MDC).
- **Router logic:** `router.md` + slim `afro.mdc`.
- **Ladder:** keep `ladder.md` local and testable.

