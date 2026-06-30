# Reference budget — commit drafts

Thresholds for when the agent stages a commit draft in `reference/metrics/pending-commit.md`.

| Setting | Value | Notes |
|---------|-------|-------|
| **Commit draft interval** | `10` | Prompts since last commit draft → evaluate for draft |
| **Significance: new files** | `2` | ≥ N new files in session → always draft |
| **Significance: keywords** | `feature`, `refactor`, `migration`, `fix` | Any match in session → always draft |
| **Commit draft behavior** | `ask` | `ask` · `auto` · `off` — `ask` surfaces draft; user confirms before `git commit` |
| **QA before commit** | `on` | `on` · `off` — run the afro-development benchmark QA before drafting/confirming a commit |
| **QA trigger** | harness changes | Run QA when staged changes touch `.cursor/` (rules, harness specs, knobs) or `reference/`; skip for docs-only/trivial diffs |
| **QA blocks confirm** | `yes` | `yes` · `warn` — `yes` requires a QA pass (or explicit `commit anyway`) before `git commit`; `warn` records result but does not block |
