# Reference knobs

Edit this file to tune the reference system. Agents read values from here — no hardcoded thresholds in `AGENT.md`.

| Setting | Value | Options / notes |
|---------|-------|-----------------|
| **Refresh interval (prompts)** | `20` | Prompts since last refresh → run delta scan |
| **Scan depth** | `full` | `full` · `shallow` (top 2 levels only) |
| **Scan exclusions** | `.git`, `node_modules`, `*.lock`, `dist` | Comma-separated globs; user additions from first-ever setup |
| **DECISIONS.md** | `on` | `on` · `off` |
| **DRIFT.md** | `on` | `on` · `off` |
| **Manual trigger** | `/refresh-context` | Forces full refresh regardless of prompt count |
