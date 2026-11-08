import { createOddlyClient, OddlyApiClient } from "@oddly/api-client";

const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    // In browser: use relative URL so Next.js rewrites /v1/* to Fastify backend
    return "";
  }
  return process.env.API_URL || "http://localhost:4000";
};

export const api: OddlyApiClient = createOddlyClient({
  baseUrl: getBaseUrl(),
});
