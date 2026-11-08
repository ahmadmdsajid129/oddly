/**
 * @file privacy.test.ts
 * @package @oddly/shared
 *
 * Unit tests for k-anonymity and AES-256-GCM encryption helpers.
 */

import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  decryptPII,
  encryptPII,
  hashTwinId,
  kAnonymizeAgeBand,
  kAnonymizeRegion,
} from "./privacy.js";

describe("kAnonymizeRegion", () => {
  const counts = new Map([
    ["IN", 100],
    ["US", 25],
    ["SG", 3],
  ]);

  it("returns region if count is >= minGroupSize", () => {
    expect(kAnonymizeRegion("IN", counts, 5)).toBe("IN");
    expect(kAnonymizeRegion("US", counts, 5)).toBe("US");
  });

  it("returns 'Other' if count < minGroupSize", () => {
    expect(kAnonymizeRegion("SG", counts, 5)).toBe("Other");
  });

  it("returns 'Other' for unobserved region", () => {
    expect(kAnonymizeRegion("BR", counts, 5)).toBe("Other");
  });
});

describe("kAnonymizeAgeBand", () => {
  it("maps ages into standard buckets", () => {
    expect(kAnonymizeAgeBand(15)).toBe("13-17");
    expect(kAnonymizeAgeBand(22)).toBe("18-24");
    expect(kAnonymizeAgeBand(30)).toBe("25-34");
    expect(kAnonymizeAgeBand(40)).toBe("35-44");
    expect(kAnonymizeAgeBand(55)).toBe("45+");
  });

  it("returns 'Unknown' for out of range or invalid age", () => {
    expect(kAnonymizeAgeBand(10)).toBe("Unknown");
    expect(kAnonymizeAgeBand(-5)).toBe("Unknown");
    expect(kAnonymizeAgeBand(NaN)).toBe("Unknown");
  });
});

describe("AES-256-GCM PII Encryption", () => {
  const key = randomBytes(32);

  it("encrypts and decrypts round-trip cleanly", () => {
    const secret = "fcm_push_token_982347109238470912384";
    const encrypted = encryptPII(secret, key);
    expect(encrypted).not.toBe(secret);

    const decrypted = decryptPII(encrypted, key);
    expect(decrypted).toBe(secret);
  });

  it("produces distinct ciphertexts for identical plaintext (different random IVs)", () => {
    const secret = "same_secret_token";
    const enc1 = encryptPII(secret, key);
    const enc2 = encryptPII(secret, key);
    expect(enc1).not.toBe(enc2);
    expect(decryptPII(enc1, key)).toBe(secret);
    expect(decryptPII(enc2, key)).toBe(secret);
  });

  it("throws when decrypting with wrong key", () => {
    const wrongKey = randomBytes(32);
    const encrypted = encryptPII("test_token", key);
    expect(() => decryptPII(encrypted, wrongKey)).toThrow();
  });

  it("throws when key length is invalid", () => {
    const invalidKey = randomBytes(16);
    expect(() => encryptPII("test", invalidKey)).toThrow();
    expect(() => decryptPII("test", invalidKey)).toThrow();
  });
});

describe("hashTwinId", () => {
  it("generates deterministic 16-character hex token", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const salt = "drop_2026-11-08";
    const token1 = hashTwinId(id, salt);
    const token2 = hashTwinId(id, salt);

    expect(token1).toHaveLength(16);
    expect(token1).toBe(token2);
  });

  it("generates different tokens across drops for same player (prevents cross-day linkability)", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const tokenDay1 = hashTwinId(id, "drop_2026-11-08");
    const tokenDay2 = hashTwinId(id, "drop_2026-11-09");
    expect(tokenDay1).not.toBe(tokenDay2);
  });
});
