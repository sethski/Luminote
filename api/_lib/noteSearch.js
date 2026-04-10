function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWords(text) {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(" ")
    .map((w) => w.trim())
    .filter(Boolean);
}

function prefixSimilarity(a, b) {
  const len = Math.min(a.length, b.length);
  let i = 0;
  while (i < len && a[i] === b[i]) i += 1;
  return len === 0 ? 0 : i / Math.max(a.length, b.length);
}

function fuzzyTokenMatch(token, words) {
  if (token.length < 4) return false;
  return words.some((word) => {
    if (!word) return false;
    if (word.includes(token) || token.includes(word)) return true;
    return prefixSimilarity(token, word) >= 0.75;
  });
}

function buildMatchedText(note, query, tokens) {
  const content = note.content || "";
  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const normalizedQuery = normalize(query);
  const exactSentence = sentences.find((s) => normalize(s).includes(normalizedQuery));
  if (exactSentence) return exactSentence;

  const tokenSentence = sentences.find((s) => {
    const ns = normalize(s);
    return tokens.some((t) => t.length >= 3 && ns.includes(t));
  });
  if (tokenSentence) return tokenSentence;

  const fallback = content.replace(/\s+/g, " ").trim();
  return fallback.length > 220 ? `${fallback.slice(0, 220)}...` : fallback;
}

function scoreNote(note, query) {
  const normalizedQuery = normalize(query);
  const tokens = normalizeWords(query);

  const title = normalize(note.title || "");
  const content = normalize(note.content || "");
  const tags = (note.tags || []).map((t) => normalize(t));
  const searchableWords = normalizeWords(`${title} ${content} ${tags.join(" ")}`);

  let score = 0;

  if (!normalizedQuery) {
    return { score: 0, matchedText: "" };
  }

  if (title.includes(normalizedQuery)) score += 150;
  if (content.includes(normalizedQuery)) score += 120;
  if (tags.some((t) => t.includes(normalizedQuery))) score += 100;

  let tokenHits = 0;
  for (const token of tokens) {
    if (title.includes(token)) {
      score += 35;
      tokenHits += 1;
      continue;
    }
    if (tags.some((tag) => tag.includes(token))) {
      score += 30;
      tokenHits += 1;
      continue;
    }
    if (content.includes(token)) {
      score += 20;
      tokenHits += 1;
      continue;
    }
    if (fuzzyTokenMatch(token, searchableWords)) {
      score += 8;
      tokenHits += 1;
    }
  }

  if (tokens.length > 1 && tokenHits === tokens.length) {
    score += 40;
  }

  if (normalizedQuery.length >= 8) {
    const queryFragments = normalizedQuery.split(" ").filter((part) => part.length >= 4);
    const fragmentMatches = queryFragments.filter((part) => content.includes(part)).length;
    score += fragmentMatches * 10;
  }

  const matchedText = score > 0 ? buildMatchedText(note, query, tokens) : "";
  return { score, matchedText };
}

export function rankMatchingNotes(notes, query) {
  const ranked = notes
    .map((note) => {
      const { score, matchedText } = scoreNote(note, query);
      return { note, score, matchedText };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Date.parse(b.note.updated_at || "") - Date.parse(a.note.updated_at || ""));

  return ranked;
}
