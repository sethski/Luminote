/**
 * One-shot src/ reorganization: move files + rewrite relative imports.
 * Run: node scripts/reorganize-src.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

const UI_PRIMITIVES = [
  "accordion", "alert-dialog", "alert", "aspect-ratio", "avatar", "badge", "breadcrumb",
  "button", "card", "carousel", "chart", "checkbox", "collapsible", "command",
  "context-menu", "dialog", "drawer", "dropdown-menu", "form", "hover-card",
  "input-otp", "input", "label", "menubar", "navigation-menu", "pagination", "popover",
  "progress", "radio-group", "resizable", "scroll-area", "select", "separator", "sheet",
  "sidebar", "skeleton", "slider", "sonner", "switch", "table", "tabs", "textarea",
  "toast", "toggle-group", "toggle", "tooltip",
];

/** @type {Record<string, string>} old relative-to-src → new relative-to-src */
const MOVES = {
  "App.tsx": "app/App.tsx",
  "main.tsx": "app/main.tsx",
  "routes.ts": "app/routes.ts",
  "ProtectedRoute.tsx": "app/ProtectedRoute.tsx",
  "TimerContext.tsx": "app/TimerContext.tsx",

  "Auth.tsx": "features/auth/Auth.tsx",
  "AuthCallback.tsx": "features/auth/AuthCallback.tsx",
  "AuthContext.tsx": "features/auth/AuthContext.tsx",

  "AllNotes.tsx": "features/notes/AllNotes.tsx",
  "Editor.tsx": "features/notes/Editor.tsx",
  "Search.tsx": "features/notes/Search.tsx",
  "NotesContext.tsx": "features/notes/NotesContext.tsx",

  "Home.tsx": "features/home/Home.tsx",
  "Landing.tsx": "features/home/Landing.tsx",
  "Features.tsx": "features/home/Features.tsx",

  "Personal.tsx": "features/courses/Personal.tsx",
  "CourseDetail.tsx": "features/courses/CourseDetail.tsx",

  "Flashcards.tsx": "features/study/Flashcards.tsx",
  "StudyPlanner.tsx": "features/study/StudyPlanner.tsx",
  "calendar.tsx": "features/study/CalendarPage.tsx",

  "Hangout.tsx": "features/hangout/Hangout.tsx",
  "ServerPage.tsx": "features/hangout/ServerPage.tsx",

  "UploadImage.tsx": "features/media/UploadImage.tsx",
  "VoiceMemo.tsx": "features/media/VoiceMemo.tsx",

  "Settings.tsx": "features/settings/Settings.tsx",
  "ProfileSection.tsx": "features/settings/ProfileSection.tsx",

  "Root.tsx": "components/layout/Root.tsx",
  "FloatingTimer.tsx": "components/layout/FloatingTimer.tsx",
  "DeleteConfirmationModal.tsx": "components/modals/DeleteConfirmationModal.tsx",
  "ImageWithFallback.tsx": "components/ImageWithFallback.tsx",

  "supabaseClient.ts": "lib/supabaseClient.ts",
  "tagSystem.ts": "lib/tagSystem.ts",
  "utils.ts": "lib/utils.ts",
  "qwen.ts": "lib/qwen.ts",

  "use-mobile.ts": "hooks/use-mobile.ts",

  "index.css": "styles/index.css",
  "theme.css": "styles/theme.css",
  "fonts.css": "styles/fonts.css",
  "tailwind.css": "styles/tailwind.css",

  "vite-env_d.ts": "types/vite-env.d.ts",

  "luminote_schema.sql": "../database/luminote_schema.sql",
  "note_search_schema.sql": "../database/note_search_schema.sql",
  "ph_schools.json": "../database/ph_schools.json",

  "DELETE_MODAL_README.md": "../docs/internal/DELETE_MODAL_README.md",
  "DELETE_MODAL_GUIDE.md": "../docs/internal/DELETE_MODAL_GUIDE.md",
  "DELETE_MODAL_STYLING_REFERENCE.ts": "../docs/internal/DELETE_MODAL_STYLING_REFERENCE.ts",
  "DeleteModalExample.tsx": "../docs/internal/DeleteModalExample.tsx",
  "STUDYPLANNER_INTEGRATION.tsx": "../docs/internal/STUDYPLANNER_INTEGRATION.tsx",
  "README.md": "../docs/internal/src-README.md",
  "qwen-proxy.ts": "../supabase/functions/qwen-proxy/index.ts",
};

for (const name of UI_PRIMITIVES) {
  MOVES[`${name}.tsx`] = `components/ui/${name}.tsx`;
}

/** basename (no ext) → new path relative to src, or absolute for outside src */
const moduleMap = new Map();

function stem(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function registerModule(oldRel, newRel) {
  const base = stem(oldRel);
  moduleMap.set(base, newRel);
  // Calendar page renamed
  if (base === "calendar") moduleMap.set("calendar", newRel);
  if (oldRel === "calendar.tsx") {
    moduleMap.set("CalendarScreen", "features/study/CalendarPage.tsx");
  }
}

for (const [oldRel, newRel] of Object.entries(MOVES)) {
  registerModule(oldRel, newRel.startsWith("..") ? newRel : newRel);
}

// CalendarScreen export lives in CalendarPage.tsx
moduleMap.set("CalendarScreen", "features/study/CalendarPage.tsx");

function resolveImport(fromFileRel, spec) {
  if (!spec.startsWith(".")) return spec;

  // Asset paths (logo, etc.) — assets stay at src/assets/
  if (spec.includes("/assets/") || spec.startsWith("./assets")) {
    const fromAbs = path.join(SRC, path.dirname(fromFileRel));
    const toAbs = path.join(SRC, "assets", path.basename(spec));
    let rel = path.relative(fromAbs, toAbs).replace(/\\/g, "/");
    if (!rel.startsWith(".")) rel = `./${rel}`;
    return rel;
  }

  const importedBase = stem(spec.split("/").pop() ?? spec);
  let newTarget = moduleMap.get(importedBase);
  if (!newTarget || newTarget.startsWith("..")) return spec;

  const fromAbs = path.join(SRC, path.dirname(fromFileRel));
  const toAbs = path.join(SRC, newTarget);
  let rel = path.relative(fromAbs, toAbs).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel.replace(/\.tsx?$/, "");
}

function rewriteImports(content, fileRel) {
  return content.replace(
    /from (['"])(\.[^'"]+)\1/g,
    (match, quote, spec) => {
      const updated = resolveImport(fileRel, spec);
      return `from ${quote}${updated}${quote}`;
    },
  );
}

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

// 1. Move files
for (const [oldRel, newRel] of Object.entries(MOVES)) {
  const from = path.join(SRC, oldRel);
  if (!fs.existsSync(from)) {
    console.warn(`skip missing: ${oldRel}`);
    continue;
  }
  const to = newRel.startsWith("..")
    ? path.join(ROOT, newRel.replace(/^\.\.\//, ""))
    : path.join(SRC, newRel);
  ensureDirFor(to);
  fs.renameSync(from, to);
  console.log(`moved ${oldRel} → ${newRel}`);
}

// Remove duplicate src artifacts
for (const dup of ["package.json", "package-lock.json", "index.html", "vite_config.ts"]) {
  const p = path.join(SRC, dup);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`removed duplicate ${dup}`);
  }
}

// 2. Collect all ts/tsx files under src
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|css)$/.test(ent.name)) out.push(full);
  }
  return out;
}

const allFiles = walk(SRC);

// 3. Rewrite imports + special cases
for (const abs of allFiles) {
  const rel = path.relative(SRC, abs).replace(/\\/g, "/");
  let content = fs.readFileSync(abs, "utf8");
  content = rewriteImports(content, rel);

  // styles imports
  if (rel === "app/main.tsx") {
    content = content.replace(/import "\.\/index\.css"/, 'import "../styles/index.css"');
  }
  if (rel === "styles/index.css") {
    content = content.replace('@source "../**/*.{js,ts,jsx,tsx}";', '@source "../**/*.{js,ts,jsx,tsx}";');
    content = content.replace('@import "./theme.css"', '@import "./theme.css"');
  }

  // routes: CalendarScreen import path
  content = content.replace(
    /from "\.\/calendar"/g,
    'from "../features/study/CalendarPage"',
  );
  content = content.replace(
    /from "\.\.\/features\/study\/CalendarPage"/g,
    'from "../features/study/CalendarPage"',
  );

  // sidebar internal ui imports stay relative within components/ui
  fs.writeFileSync(abs, content);
}

// 4. Update root index.html entry
const indexHtml = path.join(ROOT, "index.html");
if (fs.existsSync(indexHtml)) {
  let html = fs.readFileSync(indexHtml, "utf8");
  html = html.replace('src="/src/main.tsx"', 'src="/src/app/main.tsx"');
  fs.writeFileSync(indexHtml, html);
}

// 5. Update vite alias
const viteConfig = path.join(ROOT, "vite.config.ts");
if (fs.existsSync(viteConfig)) {
  let vite = fs.readFileSync(viteConfig, "utf8");
  vite = vite.replace(
    "path.resolve(__dirname, '.')",
    "path.resolve(__dirname, 'src')",
  );
  fs.writeFileSync(viteConfig, vite);
}

console.log("\nDone. Run npm run build to verify.");
