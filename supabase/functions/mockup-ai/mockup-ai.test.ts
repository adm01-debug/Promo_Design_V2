import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/mockup-ai`;

Deno.test("mockup-ai: should fail with 401 if no auth header", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "remove-bg", imageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" }),
  });
  
  assertEquals(response.status, 401);
  await response.text();
});



Deno.test("mockup-ai: should fail with 400 if invalid action", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ action: "invalid-action" }),
  });
  
  assertEquals(response.status, 400);
  await response.text();
});


