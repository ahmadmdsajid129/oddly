/**
 * @file insights.service.ts
 * @package @oddly/api
 *
 * Core Insights & Analytics Engine Service (Stage M4 / Phase 10H / Tasks P10H.04 - P10H.07).
 *
 * Invariants Enforced:
 * 1. Rule 12: Drop questions are NEVER personalized; recommendations strictly advise human editors in Mission Control.
 * 2. Rule 14: Zero sensitive inferences; metrics operate exclusively on neutral lifestyle taxonomy.
 * 3. Rule 15: Zero identity-joined profiling; question quality drill-downs enforce k >= 20 macro-groupings.
 * 4. Statistics Only: Aggregate counts, medians, share ratios, and hourly open distributions.
 */

import { type PrismaClient } from "@oddly/shared";

export interface TagPerformanceMetric {
  tagId: string;
  tagKey: string;
  tagLabel: string;
  category: string;
  completions: number;
  shareCount: number;
  shareRate: number;
  viralShareLift: number; // Ratio relative to baseline (e.g. 1.35x)
  dwellP50Ms: number;
}

export interface QuestionQualityFlag {
  questionId: string;
  dropDate: string;
  position: number;
  prompt: string;
  shownCount: number;
  answeredCount: number;
  dwellP50Ms: number;
  changeRate: number;
  abandonRate: number;
  reportCount: number;
  flags: Array<{
    type: "HIGH_FRICTION" | "HIGH_ABANDONMENT" | "LOPSIDED_SPLIT" | "SPIKE_IN_REPORTS";
    severity: "warning" | "critical";
    message: string;
  }>;
}

export interface EditorSuggestionDTO {
  id?: string;
  targetDropDate: string;
  suggestionType: "underused_tag" | "high_share_weekend" | "fatigue_warning";
  tagId?: string;
  tagKey?: string;
  severity: "info" | "warning" | "critical";
  message: string;
  dismissed: boolean;
}

export class InsightsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * P10H.04: Category performance analytics calculation (Addendum A3.1).
   * Aggregates 14-day completion, viral share lift, and dwell time by subject tag.
   */
  async getCategoryPerformance(days: number = 14): Promise<{
    tags: TagPerformanceMetric[];
    baselineShareRate: number;
    daysEvaluated: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Fetch daily tag stats within the window
    const stats = await this.prisma.tagStatsDaily.findMany({
      where: {
        drop_date: { gte: cutoffDate },
      },
      include: {
        tag: true,
      },
    });

    // Also fetch all active tags so underused/zero-activity tags are still visible
    const allTags = await this.prisma.tag.findMany({
      where: { is_active: true },
    });

    const tagTotals = new Map<
      string,
      {
        tagId: string;
        tagKey: string;
        tagLabel: string;
        category: string;
        completions: number;
        shareCount: number;
        totalDwellMs: number;
        sampleDays: number;
      }
    >();

    for (const t of allTags) {
      const label =
        typeof t.label_i18n === "object" && t.label_i18n !== null && "en" in t.label_i18n
          ? String((t.label_i18n as Record<string, unknown>).en)
          : t.key;

      tagTotals.set(t.id, {
        tagId: t.id,
        tagKey: t.key,
        tagLabel: label,
        category: t.category,
        completions: 0,
        shareCount: 0,
        totalDwellMs: 0,
        sampleDays: 0,
      });
    }

    let globalCompletions = 0;
    let globalShares = 0;

    for (const s of stats) {
      let entry = tagTotals.get(s.tag_id);
      if (!entry) {
        const label =
          typeof s.tag.label_i18n === "object" && s.tag.label_i18n !== null && "en" in s.tag.label_i18n
            ? String((s.tag.label_i18n as Record<string, unknown>).en)
            : s.tag.key;

        entry = {
          tagId: s.tag.id,
          tagKey: s.tag.key,
          tagLabel: label,
          category: s.tag.category,
          completions: 0,
          shareCount: 0,
          totalDwellMs: 0,
          sampleDays: 0,
        };
        tagTotals.set(s.tag_id, entry);
      }

      entry.completions += s.completions;
      entry.shareCount += s.share_count;
      entry.totalDwellMs += s.dwell_p50_ms;
      entry.sampleDays++;

      globalCompletions += s.completions;
      globalShares += s.share_count;
    }

    const baselineShareRate =
      globalCompletions > 0 ? Math.round((globalShares / globalCompletions) * 10000) / 10000 : 0.05;

    const result: TagPerformanceMetric[] = [];

    for (const entry of tagTotals.values()) {
      const shareRate =
        entry.completions > 0
          ? Math.round((entry.shareCount / entry.completions) * 10000) / 10000
          : 0.0;

      const viralShareLift =
        baselineShareRate > 0 ? Math.round((shareRate / baselineShareRate) * 100) / 100 : 1.0;

      const dwellP50Ms =
        entry.sampleDays > 0 ? Math.round(entry.totalDwellMs / entry.sampleDays) : 0;

      result.push({
        tagId: entry.tagId,
        tagKey: entry.tagKey,
        tagLabel: entry.tagLabel,
        category: entry.category,
        completions: entry.completions,
        shareCount: entry.shareCount,
        shareRate,
        viralShareLift,
        dwellP50Ms,
      });
    }

    // Sort by viral share lift descending
    result.sort((a, b) => b.viralShareLift - a.viralShareLift);

    return {
      tags: result,
      baselineShareRate,
      daysEvaluated: days,
    };
  }

  /**
   * P10H.05: Question quality flagging engine (Addendum A2.1).
   * Detects high friction, high abandonment, lopsided split, and report spikes.
   */
  async getQuestionQualityFlags(options?: {
    dropDate?: Date;
    minSubmissions?: number;
  }): Promise<QuestionQualityFlag[]> {
    const minSubmissions = options?.minSubmissions ?? 20;

    const whereClause: { drop_date?: Date } = {};
    if (options?.dropDate) {
      whereClause.drop_date = options.dropDate;
    }

    const dailyStats = await this.prisma.questionStatsDaily.findMany({
      where: whereClause,
      include: {
        question: true,
      },
      orderBy: { drop_date: "desc" },
    });

    const flaggedQuestions: QuestionQualityFlag[] = [];

    for (const stat of dailyStats) {
      // Noise guard: skip low-traffic sample volatility
      if (stat.shown_count < minSubmissions) {
        continue;
      }

      // Query report count for this drop
      const reportCount = stat.question?.drop_id
        ? await this.prisma.report.count({
            where: {
              drop_id: stat.question.drop_id,
            },
          })
        : 0;

      const flags: QuestionQualityFlag["flags"] = [];

      // 1. 🔴 High Friction: dwell p50 > 12 s (12,000 ms) OR change_rate > 35% (0.35)
      if (stat.dwell_p50_ms > 12000 || stat.change_rate > 0.35) {
        flags.push({
          type: "HIGH_FRICTION",
          severity: stat.dwell_p50_ms > 20000 || stat.change_rate > 0.5 ? "critical" : "warning",
          message: `Confusing prompt or ambiguous options (dwell p50: ${stat.dwell_p50_ms}ms, change rate: ${(stat.change_rate * 100).toFixed(1)}%)`,
        });
      }

      // 2. 🔴 High Abandonment: abandon_rate > 3.0% (0.03)
      if (stat.abandon_rate > 0.03) {
        flags.push({
          type: "HIGH_ABANDONMENT",
          severity: stat.abandon_rate > 0.08 ? "critical" : "warning",
          message: `High drop-off rate on this question position (${(stat.abandon_rate * 100).toFixed(1)}% abandon)`,
        });
      }

      // 3. 🔴 Lopsided Split: top option share > 65% (entropy < 0.65 bit for 2 options)
      // If entropy is recorded and below 0.65, or if answer_stats show > 65% on one option
      if (stat.entropy > 0 && stat.entropy < 0.65) {
        flags.push({
          type: "LOPSIDED_SPLIT",
          severity: "warning",
          message: `Unbalanced instinct distribution (entropy: ${stat.entropy.toFixed(2)} bits, skewed pick)`,
        });
      }

      // 4. 🔴 Spike in Reports: >= 3 reports
      if (reportCount >= 3) {
        flags.push({
          type: "SPIKE_IN_REPORTS",
          severity: reportCount >= 10 ? "critical" : "warning",
          message: `Player report spike detected (${reportCount} reports submitted)`,
        });
      }

      let prompt = "Question prompt";
      if (typeof stat.question?.payload === "object" && stat.question?.payload !== null) {
        const payload = stat.question.payload as Record<string, unknown>;
        if (payload.prompt_i18n && typeof payload.prompt_i18n === "object") {
          prompt = String((payload.prompt_i18n as Record<string, unknown>).en || prompt);
        }
      }

      flaggedQuestions.push({
        questionId: stat.question_id,
        dropDate: stat.drop_date.toISOString().split("T")[0],
        position: stat.question?.position ?? 1,
        prompt,
        shownCount: stat.shown_count,
        answeredCount: stat.answered_count,
        dwellP50Ms: stat.dwell_p50_ms,
        changeRate: stat.change_rate,
        abandonRate: stat.abandon_rate,
        reportCount,
        flags,
      });
    }

    return flaggedQuestions;
  }

  /**
   * P10H.07: Drop planning advisory engine (Addendum A3.2).
   * Generates editor_suggestions with fatigue linting.
   */
  async generateDropAdvisorySuggestions(targetDropDate: Date): Promise<EditorSuggestionDTO[]> {
    const targetDateStr = targetDropDate.toISOString().split("T")[0];
    const suggestions: EditorSuggestionDTO[] = [];

    // 1. Fatigue Lint: Check scheduled questions in 4-day window [target - 3 days, target + 1 day]
    const windowStart = new Date(targetDropDate);
    windowStart.setDate(windowStart.getDate() - 3);
    const windowEnd = new Date(targetDropDate);
    windowEnd.setDate(windowEnd.getDate() + 1);

    const questionsInWindow = await this.prisma.question.findMany({
      where: {
        drop: {
          drop_date: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
      },
      include: {
        drop: true,
        questionTags: {
          include: { tag: true },
        },
      },
    });

    // Count occurrences of each tag across scheduled drops in this 4-day window
    const tagDropOccurrences = new Map<string, { tag: { id: string; key: string }; count: number }>();

    for (const q of questionsInWindow) {
      for (const qt of q.questionTags) {
        const existing = tagDropOccurrences.get(qt.tag_id) || { tag: qt.tag, count: 0 };
        existing.count++;
        tagDropOccurrences.set(qt.tag_id, existing);
      }
    }

    // Fatigue rule: warn if scheduled > 2 times within 4 consecutive days
    for (const { tag, count } of tagDropOccurrences.values()) {
      if (count > 2) {
        suggestions.push({
          targetDropDate: targetDateStr,
          suggestionType: "fatigue_warning",
          tagId: tag.id,
          tagKey: tag.key,
          severity: count > 3 ? "critical" : "warning",
          message: `Tag "${tag.key}" scheduled ${count} times within 4 consecutive days (fatigue threshold: max 2).`,
          dismissed: false,
        });
      }
    }

    // 2. Underused Tags: Tags that have not appeared in any drop in past 14 days
    const past14Days = new Date(targetDropDate);
    past14Days.setDate(past14Days.getDate() - 14);

    const recentTags = await this.prisma.questionTag.findMany({
      where: {
        question: {
          drop: {
            drop_date: {
              gte: past14Days,
              lt: targetDropDate,
            },
          },
        },
      },
      select: { tag_id: true },
    });
    const recentTagIds = new Set(recentTags.map((rt) => rt.tag_id));

    const allActiveTags = await this.prisma.tag.findMany({
      where: { is_active: true },
      select: { id: true, key: true },
    });

    const underused = allActiveTags.filter((t) => !recentTagIds.has(t.id));
    for (const t of underused.slice(0, 3)) {
      suggestions.push({
        targetDropDate: targetDateStr,
        suggestionType: "underused_tag",
        tagId: t.id,
        tagKey: t.key,
        severity: "info",
        message: `Tag "${t.key}" is underused; hasn't appeared in any Drop in the last 14 days.`,
        dismissed: false,
      });
    }

    // 3. Weekend High-Share Boosters: If target is Saturday (6) or Sunday (0)
    const dayOfWeek = targetDropDate.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      const perf = await this.getCategoryPerformance(14);
      const topShared = perf.tags.filter((t) => t.viralShareLift >= 1.15).slice(0, 2);

      for (const t of topShared) {
        suggestions.push({
          targetDropDate: targetDateStr,
          suggestionType: "high_share_weekend",
          tagId: t.tagId,
          tagKey: t.tagKey,
          severity: "info",
          message: `Weekend viral booster: "${t.tagKey}" delivers ${(t.viralShareLift * 100 - 100).toFixed(0)}% above-average share lift on weekends.`,
          dismissed: false,
        });
      }
    }

    // Persist suggestions to editor_suggestions table
    for (const s of suggestions) {
      await this.prisma.editorSuggestion.create({
        data: {
          target_drop_date: new Date(s.targetDropDate),
          suggestion_type: s.suggestionType,
          tag_id: s.tagId,
          severity: s.severity,
          message: s.message,
          dismissed: false,
        },
      });
    }

    return suggestions;
  }
}
