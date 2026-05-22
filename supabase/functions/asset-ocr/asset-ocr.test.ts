import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";


const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/asset-ocr`;

Deno.test("asset-ocr: should fail with 401 if no auth header", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: crypto.randomUUID(), filePath: "test.jpg", mimeType: "image/jpeg" }),
  });
  
  assertEquals(response.status, 401);
  await response.body?.cancel();
});


Deno.test("asset-ocr: should fail with 400 if invalid body", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ invalid: "data" }),
  });
  
  assertEquals(response.status, 400);
  await response.body?.cancel();
});

