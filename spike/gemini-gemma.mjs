// spike/gemini-gemma.mjs
// Block 0 spike: Gemma 4 via Gemini API
// Run with: node spike/gemini-gemma.mjs [optional-image-path]

import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

// Automatically load .env if present (supported natively in Node.js 20.6+)
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {
    // Ignore if .env doesn't exist
  }
}

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable is not set.");
  process.exit(1);
}

const MODEL = "gemma-4-26b-a4b-it";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const SYSTEM_INSTRUCTION = `You are a skincare product reader.
Extract information from the provided input (text or label photo) into valid JSON with this exact schema:
{
  "kind": "skincare" | "not_skincare",
  "name": string or null (max 60 chars),
  "brand": string or null (max 40 chars),
  "type": "Cleanser" | "Toner" | "Serum" | "Eye cream" | "Moisturizer" | "Facial oil" | "Sunscreen" | null,
  "ingredients": [string] (max 40 items, each max 60 chars; only include ingredients clearly present in the input),
  "does": string (max 240 chars, friendly one-sentence summary of what it does based solely on the ingredients)
}
Return only JSON.`;

async function callGemma(parts) {
  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: SYSTEM_INSTRUCTION },
          ...parts
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  const start = performance.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const duration = (performance.now() - start) / 1000;

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorBody}`);
  }

  const json = await res.json();
  const responseParts = json.candidates?.[0]?.content?.parts || [];
  const answerPart = responseParts.slice().reverse().find(p => !p.thought && p.text);
  const candidate = answerPart ? answerPart.text : (responseParts[0]?.text || "");
  return { duration, text: candidate, rawResponse: json };
}

async function run() {
  console.log(`=== Block 0 Spike: ${MODEL} ===\n`);

  // Test 1: Mock pasted ingredients
  const mockIngredients = "Water, Niacinamide, Zinc PCA, Glycerin, Sodium Hyaluronate";
  console.log("--- Test 1: Pasted Ingredients ---");
  console.log(`Input: "${mockIngredients}"`);

  try {
    const { duration, text } = await callGemma([
      { text: `Analyze these skincare ingredients and extract product info:\n${mockIngredients}` }
    ]);

    console.log(`Response time: ${duration.toFixed(2)}s (Target: < 5.0s)`);
    console.log("Raw JSON Output:");
    console.log(text);

    try {
      const parsed = JSON.parse(text);
      console.log("JSON Parse Check: PASS");
      console.log(`Product Type: ${parsed.type}`);
    } catch {
      console.error("JSON Parse Check: FAIL");
    }
  } catch (err) {
    console.error("Test 1 failed:", err.message);
  }

  // Test 2: Optional image test
  const imagePath = process.argv[2];
  if (imagePath) {
    console.log("\n--- Test 2: Photo Label (Multimodal) ---");
    console.log(`Image path: ${imagePath}`);
    try {
      const buffer = await readFile(imagePath);
      const ext = imagePath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
      const base64Data = buffer.toString("base64");

      const { duration, text } = await callGemma([
        {
          inlineData: {
            mimeType: ext,
            data: base64Data
          }
        },
        { text: "Analyze this skincare product label photo and extract product info." }
      ]);

      console.log(`Response time: ${duration.toFixed(2)}s (Target: < 10.0s)`);
      console.log("Raw JSON Output:");
      console.log(text);

      try {
        const parsed = JSON.parse(text);
        console.log("JSON Parse Check: PASS");
        console.log(`Product Type: ${parsed.type}`);
      } catch {
        console.error("JSON Parse Check: FAIL");
      }
    } catch (err) {
      console.error("Test 2 failed:", err.message);
    }
  } else {
    console.log("\n[Note] Pass an image path as an argument to run Test 2: node spike/gemini-gemma.mjs <path-to-image>");
  }
}

run();
