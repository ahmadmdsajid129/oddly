import type { Job } from "bullmq";
import {
  renderShareCardPng,
  computeCardContentHash,
  computeCardStorageKey,
  getCardStorage,
  type ShareCardData,
  type Tier,
} from "@oddly/shared";

export interface RenderCardJobData {
  submissionId: string;
  dropId: string;
  format: "story" | "square" | "link";
  theme?: "dark" | "light" | "mythic";
  score: number;
  total?: number;
  tier: Tier;
  percentile: number;
  twinCity?: string;
  rarestPickTitle?: string;
  streak?: number;
  shortId: string;
  dateStr?: string;
  appDomain?: string;
}

export interface RenderCardJobResult {
  success: boolean;
  storageKey: string;
  publicUrl: string;
  durationMs: number;
}

/**
 * BullMQ processor for asynchronous share card generation.
 * Generates PNG buffer, writes to storage, and returns the public URL.
 */
export async function processRenderCardJob(
  job: Job<RenderCardJobData>
): Promise<RenderCardJobResult> {
  const start = Date.now();
  const data = job.data;
  const format = data.format || "story";
  const theme = data.theme || "dark";

  const cardData: ShareCardData = {
    score: data.score,
    total: data.total ?? 5,
    tier: data.tier,
    percentile: data.percentile,
    twinCity: data.twinCity,
    rarestPickTitle: data.rarestPickTitle,
    streak: data.streak,
    dateStr: data.dateStr,
    shortId: data.shortId,
    appDomain: data.appDomain,
    format,
    theme,
  };

  // 1. Render PNG Buffer via Satori + Resvg
  const pngBuffer = await renderShareCardPng(cardData);

  // 2. Compute deterministic content-hash key
  const contentHash = computeCardContentHash({
    submissionId: data.submissionId,
    format,
    theme,
    score: data.score,
    tier: data.tier,
    percentile: data.percentile,
  });

  const storageKey = computeCardStorageKey(data.submissionId, format, theme, contentHash);

  // 3. Put into storage client
  const storage = getCardStorage();
  const publicUrl = await storage.putCard(storageKey, pngBuffer);
  const durationMs = Date.now() - start;

  return {
    success: true,
    storageKey,
    publicUrl,
    durationMs,
  };
}
