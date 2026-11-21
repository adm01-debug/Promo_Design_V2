/** Unit tests for the brand-share edge logic. */
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { CreateSchema, isValidToken, parseJwtSub } from "./lib.ts";

Deno.test("isValidToken accepts a 48-char lowercase hex token", () => {
  assertEquals(isValidToken("a".repeat(48)), true);
});

Deno.test("isValidToken rejects malformed tokens", () => {
  assertEquals(isValidToken(""), false);
  assertEquals(isValidToken("a".repeat(47)), false);
  assertEquals(isValidToken("A".repeat(48)), false); // uppercase not allowed
  assertEquals(isValidToken("z".repeat(48)), false); // not hex
});

Deno.test("CreateSchema validates a create payload", () => {
  const guideline = "11111111-1111-4111-8111-111111111111";
  const org = "22222222-2222-4222-8222-222222222222";
  const ok = CreateSchema.safeParse({
    action: "create",
    brand_guideline_id: guideline,
    organization_id: org,
  });
  assertEquals(ok.success, true);
  const withDays = CreateSchema.safeParse({
    action: "create",
    brand_guideline_id: guideline,
    organization_id: org,
    valid_days: 7,
  });
  assertEquals(withDays.success, true);
});

Deno.test("CreateSchema rejects bad payloads", () => {
  const guideline = "11111111-1111-4111-8111-111111111111";
  const org = "22222222-2222-4222-8222-222222222222";
  const wrongAction = CreateSchema.safeParse({
    action: "delete",
    brand_guideline_id: guideline,
    organization_id: org,
  });
  assertEquals(wrongAction.success, false);
  const notUuid = CreateSchema.safeParse({
    action: "create",
    brand_guideline_id: "nope",
    organization_id: org,
  });
  assertEquals(notUuid.success, false);
  const badDays = CreateSchema.safeParse({
    action: "create",
    brand_guideline_id: guideline,
    organization_id: org,
    valid_days: 200,
  });
  assertEquals(badDays.success, false);
  const daysZero = CreateSchema.safeParse({
    action: "create",
    brand_guideline_id: guideline,
    organization_id: org,
    valid_days: 0,
  });
  assertEquals(daysZero.success, false);
});

Deno.test("parseJwtSub extracts sub from a signed fake JWT", () => {
  const b64 = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${b64("{}")}.${b64(JSON.stringify({ sub: "user-123" }))}.sig`;
  assertEquals(parseJwtSub(jwt), "user-123");
});

Deno.test("parseJwtSub returns null on garbage", () => {
  assertEquals(parseJwtSub(""), null);
  assertEquals(parseJwtSub("a.b.c"), null);
  assertEquals(parseJwtSub("eyJ9.eyJzdWIiOiJ1c2VyIn0.sig"), "user");
});
