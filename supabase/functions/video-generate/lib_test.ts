/**
 * Testes das regras puras do provedor de vídeo.
 * Sem rede: só as traduções app <-> provedor <-> banco.
 */
import { assertEquals, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  buildVideoRequest,
  describeTerminalError,
  mapProviderStatus,
  resolveProviderAspectRatio,
  resolveProviderDuration,
  videoStoragePath,
} from "./lib.ts";

// -- aspect ratio ------------------------------------------------------
// Nenhum modelo do catálogo aceita 4:5; 3:4 é o retrato suportado mais próximo.
Deno.test("resolveProviderAspectRatio mapeia 4:5 para 3:4", () => {
  assertStrictEquals(resolveProviderAspectRatio("4:5"), "3:4");
});

Deno.test("resolveProviderAspectRatio preserva os ratios suportados", () => {
  assertStrictEquals(resolveProviderAspectRatio("9:16"), "9:16");
  assertStrictEquals(resolveProviderAspectRatio("16:9"), "16:9");
  assertStrictEquals(resolveProviderAspectRatio("1:1"), "1:1");
});

// -- duração -----------------------------------------------------------
Deno.test("resolveProviderDuration mantém 5 e 10", () => {
  assertStrictEquals(resolveProviderDuration(5), 5);
  assertStrictEquals(resolveProviderDuration(10), 10);
});

Deno.test("resolveProviderDuration respeita o limite de 2s a 30s do modelo", () => {
  assertStrictEquals(resolveProviderDuration(1), 2);
  assertStrictEquals(resolveProviderDuration(45), 30);
});

// -- corpo do request --------------------------------------------------
Deno.test("buildVideoRequest monta o payload mínimo sem frames", () => {
  const body = buildVideoRequest({
    model: "alibaba/wan-3.0",
    prompt: "product rotating on a white pedestal",
    aspectRatio: "9:16",
    duration: 5,
  });
  assertEquals(body, {
    model: "alibaba/wan-3.0",
    prompt: "product rotating on a white pedestal",
    duration: 5,
    resolution: "720p",
    aspect_ratio: "9:16",
  });
  // frame_images vazio faria alguns provedores rejeitarem o request.
  assertEquals("frame_images" in body, false);
});

Deno.test("buildVideoRequest envia first_frame e last_frame na ordem certa", () => {
  const body = buildVideoRequest({
    model: "alibaba/wan-3.0",
    prompt: "smooth dolly-in on the product",
    aspectRatio: "4:5",
    duration: 10,
    startFrameUrl: "https://cdn.example.com/start.png",
    endFrameUrl: "https://cdn.example.com/end.png",
  });
  assertStrictEquals(body.aspect_ratio, "3:4");
  assertEquals(body.frame_images, [
    {
      type: "image_url",
      image_url: { url: "https://cdn.example.com/start.png" },
      frame_type: "first_frame",
    },
    {
      type: "image_url",
      image_url: { url: "https://cdn.example.com/end.png" },
      frame_type: "last_frame",
    },
  ]);
});

Deno.test("buildVideoRequest com só o último frame não inventa um primeiro", () => {
  const body = buildVideoRequest({
    model: "alibaba/wan-3.0",
    prompt: "ending on the logo reveal",
    aspectRatio: "16:9",
    duration: 5,
    endFrameUrl: "https://cdn.example.com/end.png",
  });
  assertEquals(body.frame_images?.length, 1);
  assertStrictEquals(body.frame_images?.[0].frame_type, "last_frame");
});

// -- status do provedor ------------------------------------------------
Deno.test("mapProviderStatus traduz os estados não terminais para generating", () => {
  assertStrictEquals(mapProviderStatus("pending"), "generating");
  assertStrictEquals(mapProviderStatus("in_progress"), "generating");
});

Deno.test("mapProviderStatus traduz completed para ready, não completed", () => {
  // O enum public.video_job_status não tem 'completed'.
  assertStrictEquals(mapProviderStatus("completed"), "ready");
});

Deno.test("mapProviderStatus trata cancelled, failed e expired", () => {
  assertStrictEquals(mapProviderStatus("cancelled"), "cancelled");
  assertStrictEquals(mapProviderStatus("failed"), "failed");
  assertStrictEquals(mapProviderStatus("expired"), "failed");
});

Deno.test("mapProviderStatus devolve null para status desconhecido", () => {
  // null => o chamador mantém o estado atual em vez de inventar um terminal.
  assertStrictEquals(mapProviderStatus("weird_new_state"), null);
});

// -- mensagens de erro -------------------------------------------------
Deno.test("describeTerminalError prioriza o detalhe do provedor", () => {
  assertStrictEquals(describeTerminalError("failed", "quota exceeded"), "quota exceeded");
});

Deno.test("describeTerminalError nunca devolve vazio (trigger exige error_message)", () => {
  for (const status of ["failed", "expired", "cancelled"]) {
    const msg = describeTerminalError(status, undefined);
    assertEquals(msg.trim().length > 0, true);
  }
  // string só com espaços também não pode passar.
  assertEquals(describeTerminalError("failed", "   ").trim().length > 0, true);
});

// -- storage -----------------------------------------------------------
Deno.test("videoStoragePath usa organização/video.mp4 no bucket privado", () => {
  assertStrictEquals(
    videoStoragePath(
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
    ),
    "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.mp4",
  );
});
