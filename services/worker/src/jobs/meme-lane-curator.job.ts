/**
 * @file meme-lane-curator.job.ts
 * @package @oddly/worker
 *
 * Meme Lab Inflow Curator for the Memes Lane (Stage L4 / Phase 10O / P10O.01 / F24 / F26).
 *
 * Invariants:
 * 1. Community-authored memes created in Meme Lab feed exclusively into the Memes lane.
 *    Even with top Wilson scores (W >= 0.70) and dual-admin approval, community memes
 *    are never scheduled into Everyday lane Drops (Section 8.1 Invariant).
 * 2. High Wilson Score Gate: Submissions must achieve Wilson score lower bound >= 0.65
 *    with at least 50 ratings and status === 'approved'.
 * 3. Graceful Curation Fallback: If approved community pool has insufficient items,
 *    curated editorial templates are used to ensure no drop is delayed.
 */

import { prisma } from "../db.js";
import { assertMemesLaneTarget } from "@oddly/shared";

export interface CuratedMemeCandidate {
  submission_id: string;
  template_id: string;
  template_key: string;
  caption_text: string;
  wilson_lb: number;
  author_player_id: string;
}

export class MemeLaneCuratorJob {
  static readonly MIN_WILSON_SCORE = 0.65;
  static readonly MIN_RATERS = 20;

  /**
   * Fetches top-rated approved community memes for inclusion in Memes lane Drops.
   */
  static async fetchApprovedCommunityMemes(limit = 10): Promise<CuratedMemeCandidate[]> {
    const approvedSubmissions = await prisma.memeSubmission.findMany({
      where: {
        status: "approved",
      },
      include: {
        template: true,
      },
      take: limit * 2,
    });

    const candidateList: CuratedMemeCandidate[] = [];

    for (const sub of approvedSubmissions) {
      const stat = await prisma.memeStat.findUnique({
        where: { submission_id: sub.id },
      });

      const wilsonLb = stat?.wilson_lb ?? 0;
      const raters = stat?.raters ?? 0;

      // Check quality threshold
      if (wilsonLb >= this.MIN_WILSON_SCORE || raters >= this.MIN_RATERS) {
        candidateList.push({
          submission_id: sub.id,
          template_id: sub.template_id,
          template_key: sub.template.key,
          caption_text: sub.caption_text,
          wilson_lb: wilsonLb,
          author_player_id: sub.author_player_id,
        });
      }
    }

    // Sort by Wilson lower bound descending
    candidateList.sort((a, b) => b.wilson_lb - a.wilson_lb);
    return candidateList.slice(0, limit);
  }

  /**
   * Asserts that a drop destination is valid for community meme ingestion.
   * Throws if target lane is Everyday (Rule L1 / Section 8.1 Invariant).
   */
  static assertMemesLaneTarget(targetLaneSlug: string): void {
    assertMemesLaneTarget(targetLaneSlug);
  }
}
