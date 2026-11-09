import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface CardStorageClient {
  putCard(key: string, buffer: Buffer, contentType?: string): Promise<string>;
  getCard(key: string): Promise<Buffer | null>;
  hasCard(key: string): Promise<boolean>;
  getPublicUrl(key: string): string;
}

export class LocalCardStorage implements CardStorageClient {
  private baseDir: string;
  private publicBaseUrl: string;

  constructor(baseDir?: string, publicBaseUrl?: string) {
    this.baseDir =
      baseDir ||
      process.env.STORAGE_LOCAL_DIR ||
      path.resolve(process.cwd(), ".oddly/storage");
    this.publicBaseUrl =
      publicBaseUrl || process.env.STORAGE_PUBLIC_URL || "/v1/cards";

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolvePath(key: string): string {
    const safeKey = key.replace(/\.\./g, "");
    return path.join(this.baseDir, safeKey);
  }

  async putCard(key: string, buffer: Buffer): Promise<string> {
    const filePath = this.resolvePath(key);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, buffer);
    return this.getPublicUrl(key);
  }

  async getCard(key: string): Promise<Buffer | null> {
    const filePath = this.resolvePath(key);
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      return await fs.promises.readFile(filePath);
    } catch {
      return null;
    }
  }

  async hasCard(key: string): Promise<boolean> {
    const filePath = this.resolvePath(key);
    return fs.existsSync(filePath);
  }

  getPublicUrl(key: string): string {
    const cleanKey = key.replace(/\\/g, "/");
    return `${this.publicBaseUrl}/${cleanKey}`;
  }
}

/**
 * Computes a deterministic content hash for card properties.
 */
export function computeCardContentHash(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  return crypto.createHash("sha256").update(json).digest("hex");
}

/**
 * Builds a content-hash storage key for share card files.
 */
export function computeCardStorageKey(
  submissionId: string,
  format: string,
  theme: string,
  contentHash: string
): string {
  const shortHash = contentHash.slice(0, 12);
  return `cards/${submissionId}/${format}_${theme}_${shortHash}.png`;
}

// Singleton storage client default
let defaultStorage: CardStorageClient | null = null;

export function getCardStorage(): CardStorageClient {
  if (!defaultStorage) {
    defaultStorage = new LocalCardStorage();
  }
  return defaultStorage;
}

