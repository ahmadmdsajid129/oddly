/**
 * @file demo-mode.test.ts
 * @package @oddly/shared
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isDemoMode, assertDemoAllowed, excludeSyntheticQuery } from "./demo-mode.js";

describe("Slice A0: Demo Mode & Synthetic Guardrails", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("detects demo mode via ODDLY_DEMO=1", () => {
    process.env.ODDLY_DEMO = "1";
    expect(isDemoMode()).toBe(true);

    process.env.ODDLY_DEMO = "0";
    expect(isDemoMode()).toBe(false);
  });

  it("strictly forbids demo seeder in production environment", () => {
    process.env.NODE_ENV = "production";
    expect(() => assertDemoAllowed()).toThrow(/DEMO_MODE_FORBIDDEN.*NODE_ENV=production/);
  });

  it("strictly forbids demo seeder against production databases", () => {
    process.env.NODE_ENV = "development";
    expect(() =>
      assertDemoAllowed("postgresql://user:pass@db.production.supabase.co:5432/oddly")
    ).toThrow(/DEMO_MODE_FORBIDDEN.*production signature/);

    expect(() =>
      assertDemoAllowed("postgresql://user:pass@oddly-prod.rds.amazonaws.com:5432/oddly")
    ).toThrow(/DEMO_MODE_FORBIDDEN.*production signature/);
  });

  it("permits demo seeder in test / local development", () => {
    process.env.NODE_ENV = "test";
    expect(() =>
      assertDemoAllowed("postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public")
    ).not.toThrow();
  });

  it("excludes synthetic records from public counter queries", () => {
    const query = excludeSyntheticQuery({ drop_date: new Date() });
    expect(query).toHaveProperty("OR");
    expect(query.OR).toEqual([
      { is_synthetic: false },
      { is_synthetic: null },
    ]);
  });
});

