# Project context

_Agent-maintained stable identity. Patch only when wrong._

## Purpose

Luminote is a student-focused note-taking and study app. Users capture notes, organize courses, plan study sessions, use flashcards, voice memos, and AI-assisted features.

## Stack

- **Frontend:** React 18, Vite 6, React Router 7, Tailwind CSS 4, Radix UI / shadcn-style components (`src/components/ui/`)
- **Backend:** Vercel serverless functions under `api/`
- **Database / auth:** Supabase (`src/lib/supabaseClient.ts`, SQL in `database/`)
- **AI:** OpenRouter proxy (`src/lib/qwen.ts`, `api/chat.js`, `supabase/functions/qwen-proxy/`)

## Constraints

- Deployed on Vercel (`vercel.json`)
- Environment secrets via `.env` (never commit)
- Figma-derived MVP screens; original design at figma.com/design/utqSpkttH2gvCvC0aB1mqQ

## Harness role

[Afro](https://github.com/Troy-LL/Afro) is **mandatory on every chat** in this workspace. Entry: `.cursor/rules/afro.mdc` (`alwaysApply: true`). Routes between ponytail (minimal) and poteto (full process). Session memory: `reference/`. User override only via `quick`, `ponytail only`, `poteto`, `full process`, `both`, or `full stack`. **`AGENTS.md`** at repo root extends Afro to Task subagents, custom agents, and Cloud Agents.
