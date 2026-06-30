# Upstream ponytail clone

**Path:** `ponytail/` (repo root, sibling to `.cursor/`)

This workspace keeps a shallow clone of [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) as reference — not loaded at runtime by Cursor.

## Use the clone for

- Diffing ladder wording when upstream releases
- `ponytail/docs/agent-portability.md` — official adapter map
- `ponytail/examples/` — before/after over-build traps
- `ponytail/benchmarks/` — measured impact data

## Use `.cursor/harness/` for

- Index and pointers (this harness)
- Wording you have customized for Afro routing

**Rule of thumb:** edit harness for Cursor behavior; pull from `ponytail/` only when syncing the local ladder reference.
