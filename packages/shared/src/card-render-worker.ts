/**
 * @file card-render-worker.ts
 * @package @oddly/shared
 *
 * Worker thread execution task for Satori + Resvg share card rendering (P6.11, Architecture Sec 9).
 * Executed in Piscina worker threads capped to CPU cores.
 */

import { renderShareCardPng, type ShareCardData } from "./share-cards.js";

/**
 * Default export function invoked by Piscina worker thread.
 */
export default async function renderCardWorker(data: ShareCardData): Promise<Buffer> {
  return renderShareCardPng(data);
}
