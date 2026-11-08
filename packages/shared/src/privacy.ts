/**
 * @file privacy.ts
 * @package @oddly/shared
 *
 * Privacy utilities for Oddly v1:
 *   - k-anonymity helpers for region and age data
 *   - AES-256-GCM encryption/decryption for PII fields (push tokens, etc.)
 *
 * Note: encryption key must be a 32-byte Buffer from an environment variable.
 * Never pass plaintext keys through these functions.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// k-Anonymity: Region
// ---------------------------------------------------------------------------

/**
 * Map a country/region code to a k-anonymous bucket.
 * Any region with fewer than `minGroupSize` players is merged into "Other".
 *
 * @param region        - ISO 3166-1 alpha-2 country code (e.g. "IN", "US")
 * @param regionCounts  - Map of region → player count in the population
 * @param minGroupSize  - k value: regions with fewer players → "Other"
 * @returns The original region code, or "Other"
 */
export function kAnonymizeRegion(
  region: string,
  regionCounts: Map<string, number>,
  minGroupSize: number = 5
): string {
  const count = regionCounts.get(region.toUpperCase()) ?? 0;
  return count >= minGroupSize ? region.toUpperCase() : "Other";
}

// ---------------------------------------------------------------------------
// k-Anonymity: Age Band
// ---------------------------------------------------------------------------

/** Standard age bands for k-anonymity (D-009 — no fine-grained age data). */
export const AGE_BANDS = [
  { label: "13-17", min: 13, max: 17 },
  { label: "18-24", min: 18, max: 24 },
  { label: "25-34", min: 25, max: 34 },
  { label: "35-44", min: 35, max: 44 },
  { label: "45+", min: 45, max: 999 },
] as const;

export type AgeBand = (typeof AGE_BANDS)[number]["label"];

/**
 * Convert a raw age to a k-anonymous age band string.
 *
 * @param age - Player's age in years
 * @returns Age band label (e.g. "18-24"), or "Unknown" if out of range
 */
export function kAnonymizeAgeBand(age: number): AgeBand | "Unknown" {
  if (!Number.isInteger(age) || age < 0) return "Unknown";
  for (const band of AGE_BANDS) {
    if (age >= band.min && age <= band.max) return band.label;
  }
  return "Unknown";
}

// ---------------------------------------------------------------------------
// AES-256-GCM Encryption / Decryption
// ---------------------------------------------------------------------------

const GCM_IV_LENGTH = 12;  // 96-bit IV (NIST recommended for GCM)
const GCM_AUTH_TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Encrypt plaintext with AES-256-GCM.
 *
 * Output format: base64(IV || AuthTag || Ciphertext)
 * The IV is randomly generated per encryption — never reuse IVs.
 *
 * @param plaintext - UTF-8 string to encrypt
 * @param key       - 32-byte Buffer (from env variable, e.g. PII_ENCRYPTION_KEY)
 * @returns Base64-encoded string: iv + authTag + ciphertext
 */
export function encryptPII(plaintext: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error(
      `encryptPII: key must be 32 bytes (got ${key.length})`
    );
  }

  const iv = randomBytes(GCM_IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Concatenate IV + authTag + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypt AES-256-GCM ciphertext produced by encryptPII.
 *
 * @param ciphertext - Base64 string from encryptPII
 * @param key        - Same 32-byte Buffer used for encryption
 * @returns Original UTF-8 plaintext
 * @throws If the data is tampered (auth tag mismatch) or key is wrong
 */
export function decryptPII(ciphertext: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error(
      `decryptPII: key must be 32 bytes (got ${key.length})`
    );
  }

  const combined = Buffer.from(ciphertext, "base64");

  if (combined.length < GCM_IV_LENGTH + GCM_AUTH_TAG_LENGTH + 1) {
    throw new Error("decryptPII: ciphertext is too short to be valid");
  }

  const iv = combined.subarray(0, GCM_IV_LENGTH);
  const authTag = combined.subarray(GCM_IV_LENGTH, GCM_IV_LENGTH + GCM_AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(GCM_IV_LENGTH + GCM_AUTH_TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

// ---------------------------------------------------------------------------
// Twin ID anonymisation
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";

/**
 * One-way hash a player UUID into a stable but opaque "twin token".
 * Used in ResultResponse so the web app never receives a raw player UUID.
 *
 * @param playerId - Raw player UUID
 * @param salt     - Per-drop salt (use drop_id) to prevent cross-day correlation
 * @returns 16-character hex token (64-bit collision-safe for display)
 */
export function hashTwinId(playerId: string, salt: string): string {
  const hash = createHash("sha256")
    .update(`${salt}:${playerId}`)
    .digest("hex");
  return hash.slice(0, 16);
}

