# Reference

Low-maintenance tools for **session memory**, **steering context**, and **commit-draft milestones**. Plain files only — no runtime dependencies.

## Layout

| Path | Role |
|------|------|
| `AGENT.md` | Portable agent instructions (session start, scans, drafts) |
| `knobs.md` | Tunables — refresh interval, scan depth, exclusions |
| `budget.md` | Commit-draft thresholds, significance keywords, and QA-gate settings |
| `metrics/sessions.jsonl` | Append-only prompt counter |
| `metrics/state.md` | Human-readable countdown and status |
| `metrics/pending-commit.md` | Ephemeral commit draft (created when triggered) |
| `steering/CODEBASE.md` | AI-facing repo manifest (auto-generated) |
| `steering/CONTEXT.md` | Stable project identity |
| `steering/DECISIONS.md` | Append-only decision log |
| `steering/DRIFT.md` | Delta scan drift notes |

## Quick tuning

- **Refresh cadence:** `knobs.md` → Refresh interval (prompts)
- **Commit drafts:** `budget.md` → Commit draft interval, significance keywords
- **QA gate:** `budget.md` → QA before commit / QA blocks confirm — runs the `../afro-development/` benchmark before harness commits
- **Force rescan:** say `/refresh-context` in chat

## Harness hook

`.cursor/rules/afro.mdc` rule 8 points agents to `AGENT.md` at session start. The `reference/` folder is framework-agnostic — only the harness pointer changes if you rename or ship this as a standalone tool.

## First session

On the first prompt, the agent asks about scan exclusions, walks the repo, and fills `steering/CODEBASE.md` and `CONTEXT.md`. After that, normal sessions only increment counters unless a refresh or commit draft is due.
