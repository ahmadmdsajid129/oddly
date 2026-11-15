/**
 * @file seed-meme-taxonomy.ts
 * @package @oddly/shared
 *
 * Populates PostgreSQL database with 14 neutral subject tags and curated meme vector templates (P10E.02).
 */

import { PrismaClient } from "../generated/client/index.js";
import { SEED_NEUTRAL_TAGS } from "../src/taxonomy.js";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public",
    },
  },
});

const CURATED_MEME_TEMPLATES = [
  {
    key: "snooze-battle",
    illustration_registry_key: "weekend-nap",
    aspect: "1:1",
    alt_text_i18n: { en: "An alarm clock facing off against a warm, fluffy blanket" },
    license_note: "Oddly Vector Registry v1 - CC0 / In-House",
    status: "active",
  },
  {
    key: "overthinking-3am",
    illustration_registry_key: "sky-starry",
    aspect: "1:1",
    alt_text_i18n: { en: "Staring up into a vast starry night sky wondering if penguins have knees" },
    license_note: "Oddly Vector Registry v1 - CC0 / In-House",
    status: "active",
  },
  {
    key: "chai-urgency",
    illustration_registry_key: "path-chai",
    aspect: "1:1",
    alt_text_i18n: { en: "A steaming glass of hot cutting chai at a cozy street stall in the rain" },
    license_note: "Oddly Vector Registry v1 - CC0 / In-House",
    status: "active",
  },
  {
    key: "battery-anxiety",
    illustration_registry_key: "island-torch",
    aspect: "1:1",
    alt_text_i18n: { en: "A glowing torch beam dwindling down to 1% in the dark" },
    license_note: "Oddly Vector Registry v1 - CC0 / In-House",
    status: "active",
  },
  {
    key: "browser-tabs-clutter",
    illustration_registry_key: "island-notebook",
    aspect: "1:1",
    alt_text_i18n: { en: "A notebook bursting with hundreds of tiny sticky bookmarks" },
    license_note: "Oddly Vector Registry v1 - CC0 / In-House",
    status: "active",
  },
  {
    key: "midnight-refrigerator",
    illustration_registry_key: "market-sweets",
    aspect: "1:1",
    alt_text_i18n: { en: "The mystical golden glow of an open refrigerator at midnight" },
    license_note: "Oddly Vector Registry v1 - CC0 / In-House",
    status: "active",
  },
  {
    key: "indie-cinema-vibe",
    illustration_registry_key: "weekend-cinema",
    aspect: "1:1",
    alt_text_i18n: { en: "Vintage movie projector casting warm light across an empty cinema" },
    license_note: "Oddly Vector Registry v1 - CC0 / In-House",
    status: "active",
  },
  {
    key: "neon-street-cravings",
    illustration_registry_key: "path-neon",
    aspect: "1:1",
    alt_text_i18n: { en: "Vibrant neon signs glowing over a bustling night food market" },
    license_note: "Oddly Vector Registry v1 - CC0 / In-House",
    status: "active",
  },
];

async function main() {
  console.log("Seeding neutral subject taxonomy (14 tags)...");
  for (const tag of SEED_NEUTRAL_TAGS) {
    await prisma.tag.upsert({
      where: { key: tag.key },
      update: {
        label_i18n: tag.label_i18n,
        category: tag.category,
        is_active: true,
      },
      create: {
        id: randomUUID(),
        key: tag.key,
        label_i18n: tag.label_i18n,
        category: tag.category,
        is_active: true,
      },
    });
  }
  console.log(`Seeded ${SEED_NEUTRAL_TAGS.length} neutral subject tags.`);

  console.log("Seeding curated vector meme templates...");
  for (const tpl of CURATED_MEME_TEMPLATES) {
    await prisma.memeTemplate.upsert({
      where: { key: tpl.key },
      update: {
        illustration_registry_key: tpl.illustration_registry_key,
        aspect: tpl.aspect,
        alt_text_i18n: tpl.alt_text_i18n,
        license_note: tpl.license_note,
        status: tpl.status,
      },
      create: {
        id: randomUUID(),
        key: tpl.key,
        illustration_registry_key: tpl.illustration_registry_key,
        aspect: tpl.aspect,
        alt_text_i18n: tpl.alt_text_i18n,
        license_note: tpl.license_note,
        status: tpl.status,
      },
    });
  }
  console.log(`Seeded ${CURATED_MEME_TEMPLATES.length} vector meme templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

