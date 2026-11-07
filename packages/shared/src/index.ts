/**
 * @oddly/shared
 * Core shared types, Zod schemas, constants, and mathematical scoring functions.
 */

export const ODDLY_VERSION = "1.0.0" as const;

export interface HealthCheckResult {
  ok: boolean;
  service: string;
  timestamp: string;
}

export function getAppMeta(): HealthCheckResult {
  return {
    ok: true,
    service: "oddly-shared",
    timestamp: new Date().toISOString(),
  };
}
