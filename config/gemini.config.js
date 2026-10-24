import { GoogleGenAI } from "@google/genai";

let aiInstance = null;

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

export const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

/**
 * Robust caller that tries the preferred model and falls back automatically
 * if a specific model experiences a 503 high demand spike or 404 version update.
 */
export const callGemini = async (contents) => {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured in server/.env");
  }

  const candidateModels = [
    process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.5-flash",
  ];

  const uniqueModels = Array.from(new Set(candidateModels));

  let lastError = null;
  for (const model of uniqueModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
      });
      if (response && response.text) {
        return response;
      }
    } catch (err) {
      console.warn(`[Gemini] Attempt with model '${model}' failed: ${err.message}. Trying fallback...`);
      lastError = err;
    }
  }

  throw lastError || new Error("All candidate Gemini models failed.");
};

/**
 * Recursively removes markdown asterisks (* and **) from strings or objects.
 */
export const stripAsterisks = (value) => {
  if (typeof value === "string") {
    return value
      .replace(/\*\*([^*]+)\*\*/g, "$1") // remove **bold**
      .replace(/\*([^*]+)\*/g, "$1")     // remove *italic*
      .replace(/^\s*\*\s+/gm, "• ")       // turn bullet * into clean bullet •
      .replace(/\s+\*\s+/g, " • ")       // mid-sentence asterisks to bullets
      .replace(/\*/g, "")                // remove any remaining stray *
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map(stripAsterisks);
  }
  if (value !== null && typeof value === "object") {
    const cleaned = {};
    for (const key of Object.keys(value)) {
      cleaned[key] = stripAsterisks(value[key]);
    }
    return cleaned;
  }
  return value;
};

/**
 * Safely parses JSON from an LLM response string that might be wrapped in ```json ... ``` code blocks.
 */
export const cleanJson = (raw) => {
  if (!raw) return null;
  let text = String(raw).trim();
  // Remove markdown code fence ```json ... ``` or ``` ... ```
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\n?/, "");
    text = text.replace(/```$/, "");
    text = text.trim();
  }
  try {
    const parsed = JSON.parse(text);
    return stripAsterisks(parsed);
  } catch (err) {
    // Attempt to extract the first balanced { ... } or [ ... ]
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
        return stripAsterisks(parsed);
      } catch (innerErr) {
        // failed inner parse
      }
    }
    const firstBracket = text.indexOf("[");
    const lastBracket = text.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        const parsed = JSON.parse(text.slice(firstBracket, lastBracket + 1));
        return stripAsterisks(parsed);
      } catch (innerErr) {
        // failed inner parse
      }
    }
    throw new Error(`Failed to parse AI response as JSON: ${err.message}. Response was: ${text.slice(0, 200)}...`);
  }
};
