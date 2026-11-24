/**
 * @file demo-mode.ts
 * @package @oddly/shared
 *
 * Demo Mode & Synthetic Data Guardrail (Stage B0 / Slice A0).
 *
 * Enforces:
 * 1. ODDLY_DEMO=1 environment variable activates demo capabilities.
 * 2. Seeder strictly refuses to run if NODE_ENV === 'production' or if DB host/name looks production-like.
 * 3. Synthetic records are tagged with is_synthetic = true.
 * 4. In production code paths, synthetic rows are excluded from public counters, Globe arcs, and badges.
 */

export function isDemoMode(): boolean {
  return process.env.ODDLY_DEMO === "1" || process.env.NEXT_PUBLIC_ODDLY_DEMO === "1";
}

/**
 * Asserts that demo seeding or synthetic mutation is strictly forbidden on production.
 * Throws an explicit error if production environment or database is detected.
 */
export function assertDemoAllowed(databaseUrl?: string): void {
  const env = process.env.NODE_ENV;
  if (env === "production") {
    throw new Error(
      "DEMO_MODE_FORBIDDEN: Demo seeder and synthetic operations are strictly prohibited when NODE_ENV=production."
    );
  }

  const url = databaseUrl || process.env.DATABASE_URL || "";
  const lowerUrl = url.toLowerCase();

  const prodKeywords = [
    "prod",
    "production",
    "supabase.co",
    "neon.tech",
    "rds.amazonaws.com",
    "pooler.supabase",
    "azure.com",
  ];

  for (const kw of prodKeywords) {
    if (lowerUrl.includes(kw) && !lowerUrl.includes("test") && !lowerUrl.includes("demo")) {
      throw new Error(
        `DEMO_MODE_FORBIDDEN: Database URL matches production signature '${kw}'. Refusing to execute synthetic data generator.`
      );
    }
  }
}

/**
 * Appends is_synthetic exclusion clause when querying public counters or analytics.
 */
export function excludeSyntheticQuery<T extends Record<string, unknown>>(
  whereClause: T = {} as T
): T & { OR: Array<Record<string, unknown>> } {
  return {
    ...whereClause,
    OR: [
      { is_synthetic: false },
      { is_synthetic: null },
    ],
  };
}
