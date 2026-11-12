/**
 * Load and Stress Test Script for Freight-Quest
 * This script simulates multiple concurrent requests to Edge Functions to measure latency and stability.
 */

import { randomUUID } from "crypto";

const BASE_URL = process.env.SUPABASE_URL
  ? `\${process.env.SUPABASE_URL}/functions/v1`
  : "http://localhost:54321/functions/v1";

const TOKEN = process.env.SUPABASE_ANON_KEY || "mock-token";

const CONCURRENCY = 50; // Requests at once
const TOTAL_REQUESTS = 500; // Total per run

async function runTest(functionName, body) {
  const start = Date.now();
  try {
    const res = await fetch(`\${BASE_URL}/\${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer \${TOKEN}`,
        "X-Request-Id": randomUUID(),
      },
      body: JSON.stringify(body),
    });
    const duration = Date.now() - start;
    return { status: res.status, duration, ok: res.ok };
  } catch (e) {
    return { status: 500, duration: Date.now() - start, ok: false, error: e.message };
  }
}

async function stressTest(functionName, payloadGenerator) {
  console.log(`--- Stress Testing \${functionName} ---`);
  console.log(`Concurrency: \${CONCURRENCY}, Total: \${TOTAL_REQUESTS}`);

  const results = [];
  const batches = Math.ceil(TOTAL_REQUESTS / CONCURRENCY);

  for (let i = 0; i < batches; i++) {
    const promises = [];
    for (let j = 0; j < CONCURRENCY; j++) {
      if (i * CONCURRENCY + j >= TOTAL_REQUESTS) break;
      promises.push(runTest(functionName, payloadGenerator()));
    }
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    process.stdout.write(".");
  }

  console.log("\n--- Results ---");
  const successful = results.filter((r) => r.ok).length;
  const failed = results.length - successful;
  const avgDuration = results.reduce((acc, r) => acc + r.duration, 0) / results.length;
  const maxDuration = Math.max(...results.map((r) => r.duration));
  const minDuration = Math.min(...results.map((r) => r.duration));

  const statusCodes = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  console.log(`Successful: \${successful}`);
  console.log(`Failed: \${failed}`);
  console.log(`Avg Latency: \${avgDuration.toFixed(2)}ms`);
  console.log(`Max Latency: \${maxDuration}ms`);
  console.log(`Min Latency: \${minDuration}ms`);
  console.log(`Status Codes:`, statusCodes);

  if (failed > 0) {
    console.warn("WARNING: Some requests failed during stress test!");
  }
}

// Run
(async () => {
  // Test mockup-ai (suggest-placement is lightweight and easier to simulate)
  await stressTest("mockup-ai", () => ({
    action: "suggest-placement",
    productName: "Stress Test Product",
    templateId: "custom",
    areaWidth: Math.random() * 100,
    areaHeight: Math.random() * 100,
  }));

  // Test asset-ocr with invalid IDs (to trigger fast error paths and measure overhead)
  await stressTest("asset-ocr", () => ({
    assetId: randomUUID(),
    filePath: "test.png",
    mimeType: "image/png",
  }));
})();
