const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b:free";

const apiKey = process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.error("Missing API key. Set VITE_OPENROUTER_API_KEY or OPENROUTER_API_KEY and retry.");
  process.exit(1);
}

const payload = {
  model: MODEL,
  max_tokens: 32,
  temperature: 0,
  messages: [
    { role: "system", content: "You are a health check bot. Reply with exactly: OK" },
    { role: "user", content: "Health check" }
  ]
};

try {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost",
      "X-Title": "Luminote Runtime Check"
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();

  if (!res.ok) {
    console.error(`OpenRouter check failed (${res.status}).`);
    console.error(text);
    process.exit(2);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("OpenRouter returned non-JSON response.");
    console.error(text);
    process.exit(3);
  }

  const content = parsed?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    console.error("OpenRouter returned no message content.");
    console.error(text);
    process.exit(4);
  }

  console.log("OpenRouter check passed.");
  console.log(`Model: ${MODEL}`);
  console.log(`Reply: ${content}`);
} catch (err) {
  console.error("OpenRouter check crashed.");
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(5);
}
