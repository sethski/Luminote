# Luminote — agent instructions

**Afro is mandatory for every agent in this repo** — main chat, Task subagents, custom subagents, and Cloud Agents.

## Routing (every reply)

First line: `Route: <ponytail-only | poteto | both | gate>` — one sentence why.

Classify with `.cursor/harness/knobs.md` + `.cursor/harness/router.md`. Full rule: `.cursor/rules/afro.mdc`.

| Override | Effect |
|----------|--------|
| `quick`, `ponytail only`, `just fix it` | Ponytail-only, no gate |
| `poteto`, `full process` | Poteto path |
| `both`, `full stack` | Poteto + ladder on every edit |

## Code

Apply `.cursor/harness/ladder.md` on every production touch unless ponytail-only was chosen.

## Subagents

When delegating (Task tool or `.cursor/agents/`):

1. Pass the **parent route** in the prompt (`Route: poteto`, etc.).
2. Include: "Follow Afro — read `.cursor/harness/router.md` and `.cursor/harness/ladder.md`."
3. Subagent replies start with `Route: …` using the same route unless the subtask is trivial (ponytail-only).

## Session memory

Main agent reads `reference/AGENT.md` at session start. Subagents use `reference/steering/CONTEXT.md` for project context when needed.
