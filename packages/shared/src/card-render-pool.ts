/**
 * @file card-render-pool.ts
 * @package @oddly/shared
 *
 * Piscina Worker Thread Pool for Satori + Resvg Share Card Rendering (P6.11, Architecture Sec 9).
 *
 * Architectural Invariants:
 *   1. Keep CPU off the Event Loop: SVG layout (Satori) and C++ rasterization (Resvg)
 *      run in dedicated worker threads, preventing event-loop lag on Fastify and BullMQ.
 *   2. Capped to CPU cores: maxThreads is strictly bounded by os.cpus().length (default 4).
 *   3. Graceful fallback: If worker threads fail or are disabled, seamlessly falls back
 *      to direct in-process rendering without dropping cards.
 */

import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import Piscina from "piscina";
import type { ShareCardData } from "./share-cards.js";
import { renderShareCardPng } from "./share-cards.js";

export interface CardRenderPoolStats {
  isPoolActive: boolean;
  maxThreads: number;
  queueSize: number;
  completed: number;
  durationMsAvg: number;
}

let poolInstance: Piscina | null = null;
let poolInitFailed = false;
let totalCompleted = 0;
let totalDurationMs = 0;

/**
 * Resolves the absolute path to the worker script across tsx, ts-node, and compiled dist.
 */
function resolveWorkerPath(): string {
  const possiblePaths = [
    path.resolve(__dirname, "./card-render-worker.js"),
    path.resolve(__dirname, "./card-render-worker.ts"),
    path.resolve(process.cwd(), "packages/shared/src/card-render-worker.ts"),
    path.resolve(process.cwd(), "packages/shared/dist/card-render-worker.js"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback default
  return path.resolve(__dirname, "./card-render-worker.js");
}

/**
 * Initializes the singleton Piscina thread pool.
 */
export function getCardRenderPool(): Piscina | null {
  if (poolInitFailed) {
    return null;
  }

  if (!poolInstance) {
    try {
      const workerPath = resolveWorkerPath();
      const cpuCount = os.cpus()?.length || 4;
      const maxThreads = Math.max(
        1,
        Math.min(cpuCount, Number(process.env.CARD_RENDER_MAX_THREADS || cpuCount))
      );

      // Detect if we need tsx loader in execArgv for TypeScript source execution
      const isTsSource = workerPath.endsWith(".ts");
      const execArgv = isTsSource ? ["--import", "tsx"] : undefined;

      poolInstance = new Piscina({
        filename: workerPath,
        maxThreads,
        minThreads: 1,
        idleTimeout: 30000,
        execArgv,
      });
    } catch (err) {
      console.warn("[CardRenderPool] Failed to initialize Piscina pool, using in-process fallback:", err);
      poolInitFailed = true;
      return null;
    }
  }

  return poolInstance;
}

/**
 * Renders a share card PNG buffer using the Piscina worker thread pool (P6.11).
 * Capped to CPU cores and falls back to in-process render on thread error.
 */
export async function renderCardWithPool(data: ShareCardData): Promise<Buffer> {
  const start = Date.now();
  const pool = getCardRenderPool();

  if (pool) {
    try {
      const result = await pool.run(data);
      const buffer = Buffer.isBuffer(result) ? result : Buffer.from(result);
      totalCompleted++;
      totalDurationMs += Date.now() - start;
      return buffer;
    } catch (err) {
      console.warn("[CardRenderPool] Worker thread execution failed, falling back to direct render:", err);
    }
  }

  // Direct in-process fallback
  const fallbackBuffer = await renderShareCardPng(data);
  totalCompleted++;
  totalDurationMs += Date.now() - start;
  return fallbackBuffer;
}

/**
 * Returns diagnostic statistics for the card render thread pool.
 */
export function getCardRenderPoolStats(): CardRenderPoolStats {
  const pool = poolInstance;
  const cpuCount = os.cpus()?.length || 4;
  const maxThreads = Math.max(
    1,
    Math.min(cpuCount, Number(process.env.CARD_RENDER_MAX_THREADS || cpuCount))
  );

  return {
    isPoolActive: Boolean(pool && !poolInitFailed),
    maxThreads,
    queueSize: pool?.queueSize ?? 0,
    completed: totalCompleted,
    durationMsAvg: totalCompleted > 0 ? Math.round(totalDurationMs / totalCompleted) : 0,
  };
}

/**
 * Destroys the worker thread pool gracefully during application shutdown.
 */
export async function destroyCardRenderPool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.destroy();
    poolInstance = null;
  }
}

