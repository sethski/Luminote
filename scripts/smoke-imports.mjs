/**
 * Smoke: verify all routed screen modules resolve (no runtime execution).
 * Run: node scripts/smoke-imports.mjs
 */
import { build } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const entries = [
  "src/app/main.tsx",
  "src/app/routes.ts",
  "src/features/home/Landing.tsx",
  "src/features/auth/Auth.tsx",
  "src/features/auth/AuthCallback.tsx",
  "src/components/layout/Root.tsx",
  "src/features/home/Home.tsx",
  "src/features/notes/AllNotes.tsx",
  "src/features/notes/Editor.tsx",
  "src/features/notes/Search.tsx",
  "src/features/settings/Settings.tsx",
  "src/features/study/CalendarPage.tsx",
  "src/features/media/UploadImage.tsx",
  "src/features/media/VoiceMemo.tsx",
  "src/features/hangout/Hangout.tsx",
  "src/features/hangout/ServerPage.tsx",
  "src/features/courses/Personal.tsx",
  "src/features/courses/CourseDetail.tsx",
  "src/features/home/Features.tsx",
  "src/features/study/Flashcards.tsx",
  "src/features/study/StudyPlanner.tsx",
  "src/lib/courseSync.ts",
  "api/delete-account.js",
];

try {
  await build({
    root: ROOT,
    logLevel: "error",
    build: {
      write: false,
      rollupOptions: {
        input: Object.fromEntries(entries.map((e) => [e, path.join(ROOT, e)])),
      },
    },
  });
  console.log(`PASS: ${entries.length} entry modules resolved`);
} catch (err) {
  console.error("FAIL:", err.message ?? err);
  process.exit(1);
}
