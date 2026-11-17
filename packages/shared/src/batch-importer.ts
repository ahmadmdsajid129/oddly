/**
 * @file batch-importer.ts
 * @package @oddly/shared
 *
 * Question Batch Importer & Safety Validation Engine (Stage M1 / Phase 10E / Tasks P10E.03, P10E.04 / Rules 9.1, 9.2, 14).
 *
 * Invariants:
 * 1. Strict validation: Every meme question must carry render_variant='meme', valid template_key, and >= 1 neutral tag.
 * 2. Forbidden-topics check: Rejects any batch touching Section 9.1 categories.
 * 3. Dry-run support: Performs complete validation without database writes.
 * 4. Mathematical parity: Does not alter answer options, vector indices, or scoring inputs.
 */

import { isForbiddenTag } from "./taxonomy.js";
import { dropOpensAt, dropClosesAt } from "./dates.js";
import type { PrismaClient } from "./db.js";

export interface BatchOptionItem {
  value: string;
  label: string;
  display_order: number;
  illustration_key?: string;
}

export interface BatchQuestionItem {
  position: number;
  type: "text" | "number" | "colour" | "image" | "word";
  render_variant?: "standard" | "meme";
  template_key?: string;
  tags?: string[];
  payload: Record<string, unknown>;
  answer_options?: BatchOptionItem[];
}

export interface BatchDropItem {
  drop_date: string; // YYYY-MM-DD
  theme_key?: string;
  questions: BatchQuestionItem[];
}

export interface BatchData {
  batch_id?: string;
  description?: string;
  drops: BatchDropItem[];
}

export type BatchJsonInput = BatchData;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  totalDrops: number;
  totalQuestions: number;
  memeQuestionCount: number;
}

/**
 * Validates a batch payload without performing database mutations.
 */
export function validateBatch(
  batch: BatchData,
  knownTemplateKeys?: Set<string>,
  knownTagKeys?: Set<string>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalQuestions = 0;
  let memeQuestionCount = 0;

  if (!batch.batch_id || typeof batch.batch_id !== "string") {
    errors.push("Missing or invalid batch_id");
  }

  if (!Array.isArray(batch.drops) || batch.drops.length === 0) {
    errors.push("Batch must contain an array of drops");
    return {
      valid: false,
      errors,
      warnings,
      totalDrops: 0,
      totalQuestions: 0,
      memeQuestionCount: 0,
    };
  }

  let previousDropTypes: string[] = [];

  for (let dIdx = 0; dIdx < batch.drops.length; dIdx++) {
    const drop = batch.drops[dIdx]!;
    const dropDate = drop.drop_date;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dropDate)) {
      errors.push(`Drop index ${dIdx}: Invalid drop_date format '${dropDate}'. Expected YYYY-MM-DD.`);
    }

    if (!Array.isArray(drop.questions) || drop.questions.length !== 5) {
      errors.push(`Drop ${dropDate}: Must contain exactly 5 questions (found ${drop.questions?.length ?? 0}).`);
      continue;
    }

    const currentDropTypes: string[] = [];

    for (let qIdx = 0; qIdx < drop.questions.length; qIdx++) {
      totalQuestions++;
      const q = drop.questions[qIdx]!;

      if (q.position !== qIdx + 1) {
        errors.push(`Drop ${dropDate}, Q${qIdx + 1}: Position mismatch (${q.position} !== ${qIdx + 1}).`);
      }

      currentDropTypes.push(q.type);

      // Invariant: "no same question type in the same slot on consecutive days"
      if (previousDropTypes[qIdx] && previousDropTypes[qIdx] === q.type) {
        warnings.push(`Drop ${dropDate}, Q${q.position}: Type '${q.type}' repeats in same position from previous day.`);
      }

      // Check intra-drop consecutive repetition (warning if 3 consecutive of same type)
      if (
        qIdx >= 2 &&
        drop.questions[qIdx - 1]?.type === q.type &&
        drop.questions[qIdx - 2]?.type === q.type
      ) {
        warnings.push(
          `Drop ${dropDate}, Q${q.position}: 3 consecutive questions share the same type '${q.type}'.`
        );
      }

      // Check tags against forbidden topics
      if (q.tags && Array.isArray(q.tags)) {
        if (q.tags.length === 0 && q.render_variant === "meme") {
          errors.push(`Drop ${dropDate}, Q${q.position}: Meme questions must carry >= 1 subject tag.`);
        }
        for (const tagKey of q.tags) {
          if (isForbiddenTag(tagKey)) {
            errors.push(
              `Drop ${dropDate}, Q${q.position}: Tag '${tagKey}' violates Section 9.1 Forbidden Topic List!`
            );
          }
          if (knownTagKeys && !knownTagKeys.has(tagKey)) {
            warnings.push(`Drop ${dropDate}, Q${q.position}: Tag '${tagKey}' is not yet in taxonomy table.`);
          }
        }
      }

      // Meme question validation (ADR-041 / Rules 9.2 & 14)
      if (q.render_variant === "meme") {
        memeQuestionCount++;

        // Must reuse Type 1 (text) or Type 4 (image)
        if (q.type !== "text" && q.type !== "image") {
          errors.push(
            `Drop ${dropDate}, Q${q.position}: Meme question must be type 'text' or 'image', found '${q.type}'.`
          );
        }

        // Must have >= 1 tag
        if (!q.tags || q.tags.length === 0) {
          errors.push(`Drop ${dropDate}, Q${q.position}: Meme question must carry at least 1 subject tag.`);
        }

        // Must have valid template_key
        if (!q.template_key) {
          errors.push(`Drop ${dropDate}, Q${q.position}: Meme question missing required template_key.`);
        } else if (knownTemplateKeys && !knownTemplateKeys.has(q.template_key)) {
          errors.push(
            `Drop ${dropDate}, Q${q.position}: Meme template_key '${q.template_key}' not found in registry.`
          );
        }

        // Prompt length limit for language-light humor
        const prompt = (q.payload?.prompt || q.payload?.text) as string | undefined;
        if (prompt && prompt.length > 120) {
          warnings.push(
            `Drop ${dropDate}, Q${q.position}: Meme prompt is ${prompt.length} chars (recommended <= 120).`
          );
        }
      }
    }

    previousDropTypes = currentDropTypes;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalDrops: batch.drops.length,
    totalQuestions,
    memeQuestionCount,
  };
}

/**
 * Imports a batch into PostgreSQL with dry run support.
 */
export async function importBatchJson(
  prisma: PrismaClient,
  batch: BatchData,
  options: { dryRun?: boolean } = {}
): Promise<{
  success: boolean;
  dryRun: boolean;
  validation: ValidationResult;
  importedDrops?: number;
  importedQuestions?: number;
}> {
  // Query existing templates and tags for validation
  const existingTemplates = await prisma.memeTemplate.findMany({ select: { key: true } });
  const existingTags = await prisma.tag.findMany({ select: { key: true } });

  const templateKeySet = new Set(existingTemplates.map((t) => t.key));
  const tagKeySet = new Set(existingTags.map((t) => t.key));

  const validation = validateBatch(batch, templateKeySet, tagKeySet);

  if (!validation.valid) {
    return {
      success: false,
      dryRun: Boolean(options.dryRun),
      validation,
    };
  }

  if (options.dryRun) {
    return {
      success: true,
      dryRun: true,
      validation,
      importedDrops: validation.totalDrops,
      importedQuestions: validation.totalQuestions,
    };
  }

  // Database mutations
  const templateIdMap = new Map<string, string>();
  const allTemplates = await prisma.memeTemplate.findMany();
  for (const t of allTemplates) {
    templateIdMap.set(t.key, t.id);
  }

  const tagIdMap = new Map<string, string>();
  const allTags = await prisma.tag.findMany();
  for (const t of allTags) {
    tagIdMap.set(t.key, t.id);
  }

  let importedDrops = 0;
  let importedQuestions = 0;

  for (const dropItem of batch.drops) {
    const dropDateStr = dropItem.drop_date;
    const dropDateObj = new Date(`${dropDateStr}T00:00:00.000Z`);
    const opensAt = dropOpensAt(dropDateStr);
    const closesAt = dropClosesAt(dropDateStr);

    const drop = await prisma.drop.upsert({
      where: { drop_date: dropDateObj },
      update: {
        opens_at: opensAt,
        closes_at: closesAt,
        theme_key: dropItem.theme_key ?? null,
      },
      create: {
        drop_date: dropDateObj,
        opens_at: opensAt,
        closes_at: closesAt,
        theme_key: dropItem.theme_key ?? null,
      },
    });
    importedDrops++;

    for (const qItem of dropItem.questions) {
      const templateId = qItem.template_key ? templateIdMap.get(qItem.template_key) ?? null : null;

      const question = await prisma.question.upsert({
        where: {
          drop_id_position: {
            drop_id: drop.id,
            position: qItem.position,
          },
        },
        update: {
          type: qItem.type as any,
          render_variant: qItem.render_variant ?? "standard",
          template_id: templateId,
          payload: qItem.payload as any,
        },
        create: {
          drop_id: drop.id,
          position: qItem.position,
          type: qItem.type as any,
          render_variant: qItem.render_variant ?? "standard",
          template_id: templateId,
          payload: qItem.payload as any,
        },
      });
      importedQuestions++;

      // Answer options
      if (qItem.answer_options && qItem.answer_options.length > 0) {
        await prisma.answerOption.deleteMany({ where: { question_id: question.id } });
        for (const opt of qItem.answer_options) {
          await prisma.answerOption.create({
            data: {
              question_id: question.id,
              label: opt.label,
              value: opt.value,
              display_order: opt.display_order,
              illustration_key: opt.illustration_key ?? null,
            },
          });
        }
      }

      // Connect question tags
      if (qItem.tags && qItem.tags.length > 0) {
        await prisma.questionTag.deleteMany({ where: { question_id: question.id } });
        for (const tagKey of qItem.tags) {
          const tagId = tagIdMap.get(tagKey);
          if (tagId) {
            await prisma.questionTag.create({
              data: {
                question_id: question.id,
                tag_id: tagId,
              },
            });
          }
        }
      }
    }

    // Telepathy question assignment
    const dropQuestions = await prisma.question.findMany({
      where: { drop_id: drop.id },
      include: { answerOptions: true },
      orderBy: { position: "asc" },
    });
    const candidate =
      dropQuestions.find(
        (q) =>
          (q.type === "text" || q.type === "image") &&
          q.answerOptions.length >= 2 &&
          q.answerOptions.length <= 4
      ) || dropQuestions[0];

    if (candidate) {
      await prisma.drop.update({
        where: { id: drop.id },
        data: { telepathy_question_id: candidate.id },
      });
    }
  }

  return {
    success: true,
    dryRun: false,
    validation,
    importedDrops,
    importedQuestions,
  };
}

