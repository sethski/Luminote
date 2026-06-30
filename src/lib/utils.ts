import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Reject open redirects — only same-origin relative app paths. */
export function safeAppPath(path: string, fallback = "/home"): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return fallback;
  return trimmed;
}

/** Strip executable markup before rendering stored note HTML. */
export function sanitizeNoteHtml(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, iframe, object, embed, link, meta, form, base").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith("on") || attr.name === "srcdoc") {
        el.removeAttribute(attr.name);
      }
    }
    const href = el.getAttribute("href")?.trim().toLowerCase() ?? "";
    if (el.tagName === "A" && (href.startsWith("javascript:") || href.startsWith("data:text/html"))) {
      el.removeAttribute("href");
    }
  });
  return doc.body.innerHTML;
}

/**
 * Cleans note content by removing technical metadata and formatting for display
 * Removes LUMINOTE drawing markers, base64 image data, HTML tags, and markdown
 * Returns "Drawing" if only metadata is present, otherwise returns truncated text
 */
export function getCleanPreview(content: string, maxLength: number = 80): string {
  if (!content) return "Empty note";
  
  // Remove LUMINOTE drawing markers
  let cleaned = content
    .replace(/<--LUMINOTEDRAWSTART-->/g, " ")
    .replace(/<--LUMINOTEDRAWEND-->/g, " ");
  
  // Remove base64 image data
  cleaned = cleaned.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/\s=]*/g, " ");
  
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, " ");
  
  // Remove markdown and special characters
  cleaned = cleaned
    .replace(/[\[\]{}]/g, " ")
    .replace(/[#*_`]/g, " ");
  
  // Clean up excessive whitespace
  cleaned = cleaned
    .replace(/\s+/g, " ")
    .trim();
  
  if (!cleaned) return "Drawing";
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + "..." : cleaned;
}
