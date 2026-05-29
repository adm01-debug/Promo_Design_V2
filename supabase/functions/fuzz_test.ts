import { assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const BASE_URL = "http://localhost:54321/functions/v1";
const TOKEN = Deno.env.get("SUPABASE_ANON_KEY") || "mock-token";

async function callFunction(name: string, body: any, headers: Record<string, string> = {}) {
  try {
    const res = await fetch(`${BASE_URL}/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOKEN}`,
        ...headers,
      },
      body: body === null ? null : JSON.stringify(body),
    });
    return res;
  } catch (e) {
    return { status: 500, error: e };
  }
}

// Scenarios for fuzzing
const FUZZ_SCENARIOS = [
  { name: "Empty body", body: {} },
  { name: "Null body", body: null },
  { name: "Missing assetId", body: { filePath: "path/to.png", mimeType: "image/png" } },
  { name: "Invalid UUID assetId", body: { assetId: "123-abc", filePath: "path/to.png", mimeType: "image/png" } },
  { name: "Missing filePath", body: { assetId: crypto.randomUUID(), mimeType: "image/png" } },
  { name: "Invalid mimeType", body: { assetId: crypto.randomUUID(), filePath: "test.exe", mimeType: "application/x-msdownload" } },
  { name: "Extremely long filePath", body: { assetId: crypto.randomUUID(), filePath: "a".repeat(10000), mimeType: "image/png" } },
  { name: "Malicious payload (SQLi attempt)", body: { assetId: "'; DROP TABLE assets; --", filePath: "test.png", mimeType: "image/png" } },
  { name: "Large numeric assetId", body: { assetId: 1234567890, filePath: "test.png", mimeType: "image/png" } },
];

Deno.test("asset-ocr: fuzzing and validation", async () => {
  for (const scenario of FUZZ_SCENARIOS) {
    console.log(`Testing scenario: ${scenario.name}`);
    const res = await callFunction("asset-ocr", scenario.body);
    // We expect 400 or 401 (if unauthorized) but definitely not 500 crashing
    assertNotEquals(res.status, 500, `Scenario ${scenario.name} caused a 500 error`);
    if (res.status === 200) {
      console.warn(`Scenario ${scenario.name} unexpectedly returned 200`);
    }
  }
});

const MOCKUP_AI_FUZZ = [
  { name: "Missing action", body: { imageBase64: "data:image/png;base64,..." } },
  { name: "Invalid action", body: { action: "hack-system", imageBase64: "..." } },
  { name: "Remove-bg: too short base64", body: { action: "remove-bg", imageBase64: "abc" } },
  { name: "Suggest-placement: missing params", body: { action: "suggest-placement" } },
  { name: "Suggest-placement: negative area", body: { action: "suggest-placement", areaWidth: -10, areaHeight: -5 } },
  { name: "Suggest-placement: zero area", body: { action: "suggest-placement", areaWidth: 0, areaHeight: 0 } },
  { name: "Suggest-placement: massive area", body: { action: "suggest-placement", areaWidth: 99999999, areaHeight: 99999999 } },
];

Deno.test("mockup-ai: fuzzing and validation", async () => {
  for (const scenario of MOCKUP_AI_FUZZ) {
    console.log(`Testing scenario: ${scenario.name}`);
    const res = await callFunction("mockup-ai", scenario.body);
    assertNotEquals(res.status, 500, `Scenario ${scenario.name} caused a 500 error`);
  }
});
