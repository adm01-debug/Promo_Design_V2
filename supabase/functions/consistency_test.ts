import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

/**
 * Validates consistency of data in Edge Function responses.
 */

const BASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321/functions/v1";
const TOKEN = Deno.env.get("SUPABASE_ANON_KEY") || "mock-token";

// O teste exige backend real; sem env no runner nao ha servidor (mesmo
// criterio da PR #7), entao ignoramos em vez de falhar.
const withBackend = { ignore: !Deno.env.get("SUPABASE_URL") || !Deno.env.get("SUPABASE_ANON_KEY") };

Deno.test({
  ...withBackend,
  name: "mockup-ai: consistent response structure",
  async fn() {
    const responses = await Promise.all(
      Array.from({ length: 10 }).map(() =>
        fetch(`${BASE_URL}/mockup-ai`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TOKEN}`,
          },
          body: JSON.stringify({
            action: "suggest-placement",
            productName: "Consistency Test",
            areaWidth: 10,
            areaHeight: 10,
          }),
        }).then((r) => r.json()),
      ),
    );

    for (const data of responses) {
      if (data.error) continue; // Skip errors for this consistency test
      assertEquals(typeof data.scale, "number");
      assertEquals(typeof data.xPercent, "number");
      assertEquals(typeof data.yPercent, "number");
      assertEquals(typeof data.rotation, "number");
      assertEquals(typeof data.requestId, "string");
    }
  },
});
