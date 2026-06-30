# Reference system — agent instructions

Portable session-start procedure. Any harness can point here; paths below are relative to repo root.

**Canonical addresses**

| What | Path |
|------|------|
| Tunables | `reference/knobs.md` |
| Commit thresholds + QA settings | `reference/budget.md` |
| Benchmark QA suite | `../afro-development/` (runner.md, subagents/registry.md) |
| Prompt log | `reference/metrics/sessions.jsonl` |
| Human-readable state | `reference/metrics/state.md` |
| Pending commit draft | `reference/metrics/pending-commit.md` |
| Repo manifest (AI-only) | `reference/steering/CODEBASE.md` |
| Project identity | `reference/steering/CONTEXT.md` |
| Decision log | `reference/steering/DECISIONS.md` |
| Drift log | `reference/steering/DRIFT.md` |

---

## When to run

At **session start**, before routing or other work — unless the user said `quick` / `ponytail only` / `just fix it` and the task is trivial formatting only.

Also run when the user says **`/refresh-context`** or **`refresh context`** (forces full scan regardless of count).

---

## Mode detection

Read `reference/metrics/sessions.jsonl` (last line = current state) and `reference/metrics/pending-commit.md` if it exists.

| Mode | Condition |
|------|-----------|
| `first_ever` | `sessions.jsonl` missing or empty |
| `commit_draft_pending` | `pending-commit.md` exists and has a suggested message (not skipped) |
| `refresh_due` | `since_refresh` ≥ Refresh interval in `reference/knobs.md`, OR manual `/refresh-context` |
| `normal` | Otherwise |

**Priority:** `commit_draft_pending` → `first_ever` → `refresh_due` → `normal`

---

## Session counter

Append **one line** to `reference/metrics/sessions.jsonl` per user message (each prompt in the thread counts as one prompt for metrics).

```json
{"ts": "ISO8601", "session": N, "prompt_total": N, "since_refresh": N, "since_commit_draft": N, "trigger": "first_ever|normal|refresh_done|manual|commit_draft_pending"}
```

**Field rules**

- `session` — increment when starting a new chat thread; same thread keeps the same session number (read last line; if this is a continuation, keep `session`).
- `prompt_total` — monotonic all-time count (+1 each prompt).
- `since_refresh` — +1 each prompt; reset to `0` after a context refresh completes.
- `since_commit_draft` — +1 each prompt; reset to `0` after user confirms/skips a commit draft.
- `trigger` — what mode ran this update.

Rewrite `reference/metrics/state.md` after every counter update (human-readable countdown).

**Progress bar** in `state.md`: 20 blocks, filled = `round(since_refresh / threshold * 20)`.

---

## Mode: `commit_draft_pending`

1. Surface `pending-commit.md` to the user **before** other work.
2. Options: **confirm** · **edit** [new message] · **skip**
3. **confirm** — first run the **QA gate** (see below) if the draft has no fresh QA result; then run `git add` for listed files, `git commit -m "<message>"`, delete `pending-commit.md`, append JSONL with `trigger: commit_draft_pending`, reset `since_commit_draft`.
4. **edit** — use user's message, then same as confirm (QA gate still applies).
5. **skip** — delete `pending-commit.md`, reset `since_commit_draft`, continue.

Do not auto-commit without explicit user confirmation. If **QA blocks confirm** is `yes` in `budget.md` and QA failed, do not commit — report the failing disciplines and wait for a fix or an explicit `commit anyway`.

---

## Mode: `first_ever`

1. **Ask the user** (AskQuestion or plain ask):
   - Anything in this repo to **never** include in the codebase map?
   - Any **file patterns** to permanently exclude from future scans?
2. Merge answers into `reference/knobs.md` → Scan exclusions (keep defaults: `.git`, `node_modules`, `*.lock`, `dist`).
3. Run **full repo scan** (see Scan procedures below).
4. Write `reference/steering/CODEBASE.md`, `CONTEXT.md`; ensure `DECISIONS.md` and `DRIFT.md` scaffolds exist.
5. Append JSONL with `trigger: first_ever`, `since_refresh: 1`, rewrite `state.md`.
6. Proceed with normal routing.

If the user cannot answer (async), use `knobs.md` defaults and note in `DRIFT.md` that exclusions were not customized.

---

## Mode: `refresh_due`

1. Run **delta scan** (see Scan procedures below).
2. Patch `CODEBASE.md` — prefer delta section `## Changes since [date]` plus inline fixes; do not full-rewrite unless manifest is badly stale.
3. If `DRIFT.md` is `on` in knobs — append drift entry (see Drift detection below).
4. Append JSONL with `trigger: refresh_done`, `since_refresh: 0`, rewrite `state.md`.
5. Proceed with normal routing.

---

## Mode: `normal`

1. Append JSONL with `trigger: normal`, increment counters, rewrite `state.md`.
2. Read `reference/steering/CODEBASE.md` and `CONTEXT.md` for ambient context (do not re-scan the whole repo).
3. Proceed with normal routing.

---

## Scan procedures

Read `reference/knobs.md` for **Scan depth** and **Scan exclusions**.

### Full scan (`first_ever` or `/refresh-context`)

1. Walk repo tree; respect exclusions (globs: `.git`, `node_modules`, `*.lock`, `dist`, plus user patterns).
2. **full** — all depths. **shallow** — top 2 directory levels only.
3. For each non-trivial file (skip lock files, binaries, empty configs): one-line purpose summary.
4. Write `CODEBASE.md` in manifest format (below).
5. Write or update `CONTEXT.md` — project purpose, stack, constraints, harness role (stable; patch only if wrong).

### Delta scan (`refresh_due`)

1. List current tree (same exclusions/depth).
2. Diff against paths listed in `CODEBASE.md`.
3. **Added** — append to manifest with summaries.
4. **Removed** — mark removed or delete lines; note in drift.
5. **Changed** — update one-line summary if purpose changed.
6. Update `GENERATED` header and `KNOWN DRIFT` footer in `CODEBASE.md`.

### `CODEBASE.md` manifest format (AI-facing only)

```
GENERATED: ISO8601 | SESSION: N | DEPTH: full|shallow
EXCLUSIONS: [comma-separated list from knobs.md]
---
ROOT
  path/to/file.md    → one-line purpose
  path/to/dir/
    nested.md        → one-line purpose
---
KEY ENTRY POINTS: [top-level entry files, e.g. .cursor/rules/afro.mdc → harness]
LAST DECISIONS: see reference/steering/DECISIONS.md
KNOWN DRIFT: none | brief note
```

Dense, structured, fast to parse. Not human documentation.

---

## Drift detection

When `DRIFT.md` is `on` in `reference/knobs.md`, during every **delta scan**:

Detect:

- Files in `CODEBASE.md` that no longer exist
- New significant files not in `CODEBASE.md`
- `CONTEXT.md` contradicts current repo state

**If drift found**, append:

```markdown
## [DATE] — Delta scan (session N, prompt N)
- Added: [files or none]
- Removed: [files or none]
- Noted: [inconsistency with CONTEXT.md or none]
```

**If no drift**, append one line:

```markdown
## [DATE] — No drift detected.
```

Update `KNOWN DRIFT` in `CODEBASE.md` footer to match latest entry.

---

## Decision logging

When `DECISIONS.md` is `on` in `reference/knobs.md`, append when **any** of:

- User chose between two named approaches
- Agent recommended and user confirmed an architectural pattern
- Significant refactor, migration, or tool choice in session
- User says `log this` / `log decision`

```markdown
## [DATE] — [One-line summary]
Reason: [why]
Alternatives considered: [if any]
```

Append-only. Do not rewrite past entries.

---

## Commit draft (session end)

Read `reference/budget.md`. At **end of session** (after completing user task), evaluate significance:

| Trigger | Condition |
|---------|-----------|
| Count | `since_commit_draft` ≥ Commit draft interval |
| New files | ≥ Significance: new files created this session |
| Keywords | Session text or changes match Significance: keywords |

If **Commit draft behavior** is `off`, skip.

If triggered and there are committable changes (`git status` shows staged/unstaged meaningful files):

1. Run the **QA gate** (see below) when `QA before commit` is `on` and the diff matches `QA trigger`.
2. Write `reference/metrics/pending-commit.md`:

```markdown
# Pending commit draft
Session: N | Generated: ISO8601

## Suggested message
feat(scope): [summary]

## Changed files
- [list from git status]

## QA
Result: pass | fail | skipped (docs-only)
Disciplines: [routing, gate-compliance, ...] — pass/fail each
Evidence: [result file paths under ../afro-development/results/ or one-line rationale]

## Confirm / Edit / Skip
Reply with: confirm · edit [new message] · skip
```

3. Do **not** commit in the same turn unless user already confirmed.

Next session surfaces this via `commit_draft_pending` mode.

---

## QA gate (before commits)

Goal: never commit a change to the Afro harness without confirming the benchmark still passes. Read `reference/budget.md` for `QA before commit`, `QA trigger`, and `QA blocks confirm`.

**When to run**

- `QA before commit` is `on`, **and**
- the staged/unstaged diff touches a `QA trigger` path (`.cursor/` rules, harness specs, knobs, or `reference/`).
- Docs-only or trivial diffs → record `Result: skipped (docs-only)` and proceed.

**Pick disciplines from what changed** (suite lives at `../afro-development/`):

| Changed file | Disciplines to run |
|--------------|--------------------|
| `.cursor/harness/router.md`, `.cursor/rules/afro.mdc` | routing, gate-compliance, override-reliability, gate-off-routing, thread-coherence, attachment-complexity |
| `.cursor/harness/knobs.md` | routing, gate-compliance, attachment-complexity, gate-off-routing |
| `.cursor/harness/ladder.md` | ladder-compliance, code-quality |
| `reference/` | routing (smoke) — confirm no harness regression |

**Procedure**

1. Open `../afro-development/runner.md` and `../afro-development/subagents/registry.md`.
2. Launch the selected discipline subagents (Task tool, `readonly: true`) against the affected fixtures in `../afro-development/prompts/fixtures.json`.
3. Collect JSON; parent writes `../afro-development/results/<fixture>__<discipline>__<timestamp>.json` (these belong to the afro-development repo, not Afro).
4. Compare against `../afro-development/results/rollup-latest.json`. **Pass** = no discipline regresses below its current rate.
5. Write the outcome into the draft's `## QA` block.

**On result**

- **pass** — proceed with the commit flow.
- **fail** and `QA blocks confirm: yes` — stop. Report failing disciplines; fix the harness or wait for explicit `commit anyway`.
- **fail** and `QA blocks confirm: warn` — record the failure in the draft and continue.

A passing harness change should also refresh `../afro-development/results/rollup-latest.json` and the dashboard canvas (committed in the afro-development repo, separately from the Afro commit).

---

## Manual overrides

| User says | Effect |
|-----------|--------|
| `/refresh-context` | Force full scan now |
| `skip reference` | Skip counter/scan this turn only (log `trigger: normal` still if user wants metrics) |
| `log this` / `log decision` | Append to `DECISIONS.md` |

---

## Integration note

Harness entry: `.cursor/rules/afro.mdc` rule 8 points here. If harness is renamed or moved, update only that pointer — `reference/` stays unchanged.
