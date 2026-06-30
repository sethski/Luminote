export type AppTag = {
  id: string;
  name: string;
  color: string;
  userId: string | null;
  isDefault: boolean;
};

export const DEFAULT_TAG_DEFINITIONS: Array<{ name: string; color: string }> = [
  { name: "Assignment", color: "#3B82F6" },
  { name: "Major", color: "#1D4ED8" },
  { name: "Minor", color: "#60A5FA" },
  { name: "TODO", color: "#F97316" },
  { name: "Readings", color: "#0EA5E9" },
  { name: "Practice", color: "#10B981" },
  { name: "Project", color: "#8B5CF6" },
  { name: "Personal", color: "#14B8A6" },
  { name: "Planning", color: "#F59E0B" },
  { name: "Dump", color: "#64748B" },
];

export const DEFAULT_TAG_NAMES = DEFAULT_TAG_DEFINITIONS.map((tag) => tag.name);

export const FALLBACK_TAGS: AppTag[] = DEFAULT_TAG_DEFINITIONS.map((tag, index) => ({
  id: `fallback-${index + 1}`,
  name: tag.name,
  color: tag.color,
  userId: null,
  isDefault: true,
}));

export function normalizeTagName(input: string): string {
  const cleaned = String(input || "").trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  if (cleaned.toUpperCase() === "TODO") return "TODO";
  return cleaned
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getTagStyle(tagName: string, selected = false): { bg: string; text: string; border: string } {
  const name = tagName.toUpperCase();

  const academic = ["ASSIGNMENT", "MAJOR", "MINOR", "READINGS", "PRACTICE", "PROJECT"];
  const planning = ["TODO", "PLANNING", "DUMP"];

  if (academic.includes(name)) {
    return selected
      ? { bg: "#DBEAFE", text: "#1D4ED8", border: "#93C5FD" }
      : { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" };
  }

  if (planning.includes(name)) {
    return selected
      ? { bg: "#FFEDD5", text: "#C2410C", border: "#FDBA74" }
      : { bg: "#FFF7ED", text: "#9A3412", border: "#FED7AA" };
  }

  if (name === "PERSONAL") {
    return selected
      ? { bg: "#CCFBF1", text: "#0F766E", border: "#5EEAD4" }
      : { bg: "#F0FDFA", text: "#115E59", border: "#99F6E4" };
  }

  return selected
    ? { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" }
    : { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" };
}
