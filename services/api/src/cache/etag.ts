/**
 * @file etag.ts
 * @package @oddly/api
 *
 * Weak ETag Generator and 304 Not Modified Conditional Request Helper (R2.3)
 */

import crypto from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Computes a deterministic weak ETag from response content.
 * Format: W/"<sha256-16chars>"
 */
export function createWeakEtag(content: string | Buffer | object): string {
  const serialized =
    typeof content === "string"
      ? content
      : Buffer.isBuffer(content)
      ? content.toString("utf-8")
      : JSON.stringify(content);

  const hash = crypto.createHash("sha256").update(serialized).digest("hex").slice(0, 16);
  return `W/"${hash}"`;
}

/**
 * Evaluates If-None-Match header and returns 304 if client cache is fresh.
 * Returns true if 304 was sent (caller should return immediately).
 */
export function handleConditionalRequest(
  req: FastifyRequest,
  reply: FastifyReply,
  content: string | Buffer | object
): boolean {
  const etag = createWeakEtag(content);
  reply.header("ETag", etag);

  const clientEtag = req.headers["if-none-match"];
  if (clientEtag && (clientEtag === etag || clientEtag === etag.replace('W/', ''))) {
    reply.status(304).send();
    return true;
  }

  return false;
}

