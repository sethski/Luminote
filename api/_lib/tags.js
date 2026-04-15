export const DEFAULT_TAGS = [
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

export const DEFAULT_TAG_NAME_SET = new Set(
  DEFAULT_TAGS.map((tag) => tag.name.toLowerCase())
);

export function normalizeTagName(input) {
  if (typeof input !== "string") return "";
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.toUpperCase() === "TODO") return "TODO";
  return trimmed
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeColor(input, fallback = "#64748B") {
  const raw = typeof input === "string" ? input.trim() : "";
  return /^#([A-Fa-f0-9]{6})$/.test(raw) ? raw.toUpperCase() : fallback;
}

export function toTagResponse(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    userId: row.user_id,
    isDefault: Boolean(row.is_default),
  };
}

export async function ensureDefaultTags(serviceClient) {
  const { data, error } = await serviceClient
    .from("tags")
    .select("name")
    .eq("is_default", true);

  if (error) {
    throw new Error(`Failed to read default tags: ${error.message}`);
  }

  const existing = new Set((data || []).map((row) => String(row.name).toLowerCase()));
  const missing = DEFAULT_TAGS.filter((tag) => !existing.has(tag.name.toLowerCase()));
  if (!missing.length) return;

  const { error: insertError } = await serviceClient
    .from("tags")
    .insert(missing.map((tag) => ({
      name: tag.name,
      color: tag.color,
      user_id: null,
      is_default: true,
    })));

  if (insertError) {
    throw new Error(`Failed to seed default tags: ${insertError.message}`);
  }
}