/** Unit tests for the mockup-approval edge logic. */
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { CreateSchema, DecideSchema, isValidToken, parseJwtSub } from "./lib.ts";

Deno.test("isValidToken accepts a 48-char lowercase hex token", () => {
  assertEquals(isValidToken("a".repeat(48)), true);
});

Deno.test("isValidToken rejects malformed tokens", () => {
  assertEquals(isValidToken(""), false);
  assertEquals(isValidToken("a".repeat(47)), false);
  assertEquals(isValidToken("A".repeat(48)), false); // uppercase not allowed
  assertEquals(isValidToken("z".repeat(48)), false); // not hex
});

Deno.test("DecideSchema validates a decision payload", () => {
  const ok = DecideSchema.safeParse({ token: "a".repeat(48), status: "approved" });
  assertEquals(ok.success, true);
  const okNote = DecideSchema.safeParse({
    token: "a".repeat(48),
    status: "rejected",
    note: "ajustar cor",
  });
  assertEquals(okNote.success, true);
});

Deno.test("DecideSchema rejects bad status or token", () => {
  const bad = DecideSchema.safeParse({ token: "a".repeat(48), status: "maybe" });
  assertEquals(bad.success, false);
  const badTok = DecideSchema.safeParse({ token: "short", status: "approved" });
  assertEquals(badTok.success, false);
  const tooLong = DecideSchema.safeParse({
    token: "a".repeat(48),
    status: "approved",
    note: "x".repeat(1001),
  });
  assertEquals(tooLong.success, false);
});

Deno.test("CreateSchema validates create payload", () => {
  const ok = CreateSchema.safeParse({
    action: "create",
    mockup_id: "11111111-1111-4111-8111-111111111111",
  });
  assertEquals(ok.success, true);
  const withOpts = CreateSchema.safeParse({
    action: "create",
    mockup_id: "11111111-1111-4111-8111-111111111111",
    client_name: "ACME",
    valid_days: 14,
  });
  assertEquals(withOpts.success, true);
  const badDays = CreateSchema.safeParse({
    action: "create",
    mockup_id: "11111111-1111-4111-8111-111111111111",
    valid_days: 200,
  });
  assertEquals(badDays.success, false);
  const notUuid = CreateSchema.safeParse({ action: "create", mockup_id: "nope" });
  assertEquals(notUuid.success, false);
});

Deno.test("parseJwtSub extracts sub from a signed fake JWT", () => {
  // header.payload.sig — payload is base64url of {"sub":"user-123"}
  const b64 = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${b64("{}")}.${b64(JSON.stringify({ sub: "user-123" }))}.sig`;
  assertEquals(parseJwtSub(jwt), "user-123");
});

Deno.test("parseJwtSub returns null on garbage", () => {
  assertEquals(parseJwtSub(""), null);
  assertEquals(parseJwtSub("a.b.c"), null);
});
