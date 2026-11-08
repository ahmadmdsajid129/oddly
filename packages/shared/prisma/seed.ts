/**
 * @file seed.ts
 * @package @oddly/shared
 *
 * Authoritative dynamic database seed script for Oddly v1.
 * Loads:
 *   1. content.json -> app_content table (all UI copy, D-005)
 *   2. config.json -> app_config table (feature flags & runtime limits, D-005)
 *   3. tiers.json -> tier_definitions table (dynamic thresholds, D-005)
 *   4. batch_001.json -> drops, questions, answer_options tables (14 days of gameplay)
 *
 * Idempotent: can be executed repeatedly without duplication.
 */

import { PrismaClient, DropStatus, QuestionType, TierEnum } from "../generated/client/index.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { dropOpensAt, dropClosesAt } from "../src/dates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Oddly database seed...");

  // 1. Seed app_content
  const contentPath = join(__dirname, "seed", "content.json");
  const contentData: Array<{ key: string; locale: string; value: string }> = JSON.parse(
    readFileSync(contentPath, "utf-8")
  );

  console.log(`  Seeding ${contentData.length} app_content strings...`);
  for (const item of contentData) {
    await prisma.appContent.upsert({
      where: {
        key_locale: {
          key: item.key,
          locale: item.locale,
        },
      },
      update: { value: item.value },
      create: {
        key: item.key,
        locale: item.locale,
        value: item.value,
      },
    });
  }

  // 2. Seed app_config
  const configPath = join(__dirname, "seed", "config.json");
  const configData: Array<{ key: string; value: any }> = JSON.parse(
    readFileSync(configPath, "utf-8")
  );

  console.log(`  Seeding ${configData.length} app_config items...`);
  for (const item of configData) {
    await prisma.appConfig.upsert({
      where: { key: item.key },
      update: { value: item.value },
      create: {
        key: item.key,
        value: item.value,
      },
    });
  }

  // 3. Seed tier_definitions
  const tiersPath = join(__dirname, "seed", "tiers.json");
  const tiersData: Array<{
    tier: "Common" | "Uncommon" | "Rare" | "Mythic";
    min_percentile: number;
    max_percentile: number;
    label: string;
    description: string;
    badge_color: string;
  }> = JSON.parse(readFileSync(tiersPath, "utf-8"));

  console.log(`  Seeding ${tiersData.length} tier definitions...`);
  for (const item of tiersData) {
    await prisma.tierDefinition.upsert({
      where: { tier: item.tier as TierEnum },
      update: {
        min_percentile: item.min_percentile,
        max_percentile: item.max_percentile,
        label: item.label,
        description: item.description,
        badge_color: item.badge_color,
      },
      create: {
        tier: item.tier as TierEnum,
        min_percentile: item.min_percentile,
        max_percentile: item.max_percentile,
        label: item.label,
        description: item.description,
        badge_color: item.badge_color,
      },
    });
  }

  // 4. Seed 14-day question batch (batch_001.json)
  const batchPath = join(__dirname, "seed", "batch_001.json");
  const batchData = JSON.parse(readFileSync(batchPath, "utf-8"));

  console.log(`  Seeding ${batchData.drops.length} drops from ${batchData.batch_id}...`);
  for (const dropItem of batchData.drops) {
    const dropDateStr = dropItem.drop_date; // YYYY-MM-DD
    const dropDateObj = new Date(`${dropDateStr}T00:00:00.000Z`);
    const opensAt = dropOpensAt(dropDateStr);
    const closesAt = dropClosesAt(dropDateStr);

    const drop = await prisma.drop.upsert({
      where: { drop_date: dropDateObj },
      update: {
        opens_at: opensAt,
        closes_at: closesAt,
      },
      create: {
        drop_date: dropDateObj,
        opens_at: opensAt,
        closes_at: closesAt,
        status: DropStatus.pending,
      },
    });

    for (const qItem of dropItem.questions) {
      const question = await prisma.question.upsert({
        where: {
          drop_id_position: {
            drop_id: drop.id,
            position: qItem.position,
          },
        },
        update: {
          type: qItem.type as QuestionType,
          payload: qItem.payload,
        },
        create: {
          drop_id: drop.id,
          position: qItem.position,
          type: qItem.type as QuestionType,
          payload: qItem.payload,
        },
      });

      // Insert or clean answer options for this question
      if (qItem.answer_options && qItem.answer_options.length > 0) {
        // Clear previous options to keep idempotent
        await prisma.answerOption.deleteMany({
          where: { question_id: question.id },
        });

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
    }
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
