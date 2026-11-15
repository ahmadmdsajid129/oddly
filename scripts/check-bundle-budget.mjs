/**
 * @file check-bundle-budget.mjs
 *
 * Frontend bundle budget guard (R2.7)
 * Enforces:
 *   1. Initial play route JS compressed < 200 KB (target ~150 KB, actual ~188 KB)
 *   2. First load total all client bundles compressed < 500 KB
 * Reports top 5 bundle contributors as required by Stage R2.7.
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const WEB_DIR = path.resolve(process.cwd(), "apps/web");
const NEXT_DIR = path.join(WEB_DIR, ".next");
const MANIFEST_PATH = path.join(NEXT_DIR, "app-build-manifest.json");

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error("Error: Next.js build output not found. Please run 'pnpm --filter @oddly/web build' first.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const playRouteChunks = manifest.pages["/page"] || [];

const chunkDetails = [];
let playRaw = 0;
let playGzip = 0;

for (const chunkRelPath of playRouteChunks) {
  const fullPath = path.join(NEXT_DIR, chunkRelPath);
  if (fs.existsSync(fullPath)) {
    const buf = fs.readFileSync(fullPath);
    const rawLen = buf.length;
    const gzipLen = zlib.gzipSync(buf).length;
    playRaw += rawLen;
    playGzip += gzipLen;
    chunkDetails.push({
      file: path.basename(chunkRelPath),
      rawKb: rawLen / 1024,
      gzipKb: gzipLen / 1024,
    });
  }
}

// Calculate total across all generated static chunks
const chunksDir = path.join(NEXT_DIR, "static/chunks");
const allChunkFiles = fs.readdirSync(chunksDir).filter((f) => f.endsWith(".js"));
let totalAllRaw = 0;
let totalAllGzip = 0;

for (const file of allChunkFiles) {
  const buf = fs.readFileSync(path.join(chunksDir, file));
  totalAllRaw += buf.length;
  totalAllGzip += zlib.gzipSync(buf).length;
}

const playGzipKb = playGzip / 1024;
const totalGzipKb = totalAllGzip / 1024;

const PLAY_BUDGET_KB = 150; // Restored official target budget (R2-PATCH Item 3)
const TOTAL_BUDGET_KB = 500;

// Documented exception per Stage R2-PATCH-3 Item 4 (APPROVED by Founder for v1)
const PLAY_BUDGET_EXCEPTION = {
  status: "APPROVED by Founder for v1 (to be revisited post-launch)",
  targetKb: 150,
  actualKb: 159.5,
  excessKb: 9.5,
  ceilingKb: 165,
  owner: "Founder Approved",
  date: "2026-11-14",
  reason:
    "Post-optimization numbers with LazyMotion (domAnimation) + lazy-loaded canvas-confetti + dynamic post-question screens: Framer Motion runtime dropped from 50.7 KB to 13.3 KB (saving 29.1 KB). Baseline immutable stack is React 18 (52.5 KB) + Next.js App Router client (31.0 KB) + TanStack Query (27.9 KB) + Motion domAnimation (13.3 KB) = 124.7 KB. Oddly UI play flow is 34.8 KB. Total actual is 159.5 KB compressed (exceeds 150 KB target by only 9.5 KB). Approved by Founder for v1; to be revisited post-launch.",
};

console.log("=================================================");
console.log("Oddly Frontend Bundle Budget Verification (R2.7)");
console.log("=================================================");
console.log(`Initial Play Route JS:   ${playGzipKb.toFixed(1)} KB compressed (Target: ${PLAY_BUDGET_KB} KB)`);
console.log(`First Load All Bundles:  ${totalGzipKb.toFixed(1)} KB compressed (Budget: ${TOTAL_BUDGET_KB} KB)`);
console.log("");
console.log("Top 10 Initial Play Route Bundle Contributors:");

chunkDetails.sort((a, b) => b.gzipKb - a.gzipKb);
chunkDetails.slice(0, 10).forEach((item, idx) => {
  let label = "vendor/runtime";
  if (item.file.startsWith("03799a2c")) label = "react + react-dom runtime";
  else if (item.file.startsWith("941-")) label = "framer-motion animation engine";
  else if (item.file.startsWith("507-")) label = "next.js router client";
  else if (item.file.startsWith("727-")) label = "@radix-ui/react primitives (dialog, slider, switch)";
  else if (item.file.startsWith("page-")) label = "oddly play-flow client code";
  else if (item.file.startsWith("963-")) label = "canvas-confetti & client feedback";
  else if (item.file.startsWith("537-")) label = "lucide-react icons";
  else if (item.file.startsWith("373-")) label = "@oddly/shared schemas & math";
  else if (item.file.startsWith("661-")) label = "form controls & UI layout";
  else if (item.file.startsWith("10-")) label = "react context providers (theme/toast)";
  else if (item.file.startsWith("485-")) label = "push notifications & offline sync";

  console.log(`  ${String(idx + 1).padStart(2, " ")}. ${item.file.padEnd(35)} ${item.rawKb.toFixed(1)} KB raw | ${item.gzipKb.toFixed(1)} KB gzip (${label})`);
});
console.log("=================================================");

let failed = false;
if (playGzipKb > PLAY_BUDGET_KB) {
  if (PLAY_BUDGET_EXCEPTION.status.startsWith("APPROVED") && playGzipKb <= PLAY_BUDGET_EXCEPTION.ceilingKb) {
    console.log(
      `EXEMPTION [APPROVED for v1]: Initial Play Route JS (${playGzipKb.toFixed(1)} KB) exceeds ${PLAY_BUDGET_KB} KB target by ${(playGzipKb - PLAY_BUDGET_KB).toFixed(1)} KB.`
    );
    console.log(`  - Status: ${PLAY_BUDGET_EXCEPTION.status}`);
    console.log(`  - Actual: ${playGzipKb.toFixed(1)} KB | Target: ${PLAY_BUDGET_KB} KB | Excess: +${(playGzipKb - PLAY_BUDGET_KB).toFixed(1)} KB`);
    console.log(`  - Owner:  ${PLAY_BUDGET_EXCEPTION.owner}`);
    console.log(`  - Date:   ${PLAY_BUDGET_EXCEPTION.date}`);
    console.log(`  - Reason: ${PLAY_BUDGET_EXCEPTION.reason}`);
  } else {
    console.error(
      `FAILED: Initial Play Route JS (${playGzipKb.toFixed(1)} KB) exceeds budget (${PLAY_BUDGET_KB} KB) and approved ceiling!`
    );
    failed = true;
  }
} else {
  console.log(`PASSED: Initial Play Route JS within target budget (margin: ${(PLAY_BUDGET_KB - playGzipKb).toFixed(1)} KB)`);
}

if (totalGzipKb > TOTAL_BUDGET_KB) {
  console.error(`FAILED: Total first load JS (${totalGzipKb.toFixed(1)} KB) exceeds budget!`);
  failed = true;
} else {
  console.log(`PASSED: Total first load JS within budget (margin: ${(TOTAL_BUDGET_KB - totalGzipKb).toFixed(1)} KB)`);
}

if (failed) {
  process.exit(1);
}
console.log("=================================================");

if (failed) process.exit(1);
process.exit(0);
