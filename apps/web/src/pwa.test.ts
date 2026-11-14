/**
 * @file pwa.test.ts
 * @package @oddly/web
 *
 * Automated test suite for Stage 10 PWA & Push Client (P10.01, P10.02, P10.08, P10.10).
 * Verifies Web App Manifest metadata, second-visit push prompting, and VAPID key encoding.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import manifest from "./app/manifest";
import {
  urlBase64ToUint8Array,
  shouldShowPushPrompt,
  recordVisit,
} from "./lib/push";

describe("Stage 10: PWA & Push Client (P10.01, P10.02, P10.08, P10.10)", () => {
  // In-memory localStorage mock
  const storageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal("localStorage", storageMock);
    vi.stubGlobal("window", {
      atob: (str: string) => Buffer.from(str, "base64").toString("binary"),
    });
    vi.stubGlobal("navigator", {
      serviceWorker: {},
    });
    vi.stubGlobal("Notification", {
      permission: "default",
    });
    // @ts-ignore
    window.Notification = Notification;
    // @ts-ignore
    window.PushManager = {};
  });

  // -------------------------------------------------------------------------
  // 1. Web App Manifest (P10.01)
  // -------------------------------------------------------------------------
  describe("Web App Manifest Metadata (P10.01)", () => {
    it("should provide valid manifest configuration for standalone PWA", () => {
      const config = manifest();

      expect(config.name?.toLowerCase()).toContain("oddly");
      expect(config.short_name?.toLowerCase()).toBe("oddly");
      expect(config.start_url).toBe("/");
      expect(config.display).toBe("standalone");
      expect(config.background_color).toBe("#FFF8F0");
      expect(config.theme_color).toBe("#6C4CF1");
    });

    it("should include 192x192, 512x512, and maskable icons, and all files exist on disk", () => {
      const config = manifest();
      expect(config.icons).toBeDefined();
      expect(config.icons?.length).toBeGreaterThanOrEqual(3);

      const sizes = config.icons?.map((i) => i.sizes);
      expect(sizes).toContain("192x192");
      expect(sizes).toContain("512x512");

      const purposes = config.icons?.map((i) => i.purpose);
      expect(purposes).toContain("maskable");

      const fs = require("node:fs");
      const path = require("node:path");
      const publicDir = path.resolve(__dirname, "../public");
      const requiredFiles = [
        "icon-192.png",
        "icon-512.png",
        "icon-512-maskable.png",
        "apple-touch-icon.png",
        "favicon.svg",
        "favicon-32.png",
        "og-default.png",
      ];

      for (const file of requiredFiles) {
        expect(fs.existsSync(path.join(publicDir, file)), `${file} must exist in public/`).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 2. VAPID Key Encoding (P10.02)
  // -------------------------------------------------------------------------
  describe("VAPID Base64 Encoding (P10.02)", () => {
    it("should correctly convert url-safe base64 VAPID string into Uint8Array", () => {
      const testKey =
        "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBKr3qBUYIHBQFLXYp5Nksh8U";
      const u8array = urlBase64ToUint8Array(testKey);

      expect(u8array).toBeInstanceOf(Uint8Array);
      expect(u8array.length).toBe(65); // standard uncompressed P-256 public key length
    });
  });

  // -------------------------------------------------------------------------
  // 3. Second-Visit Permission Prompt Logic (P10.02)
  // -------------------------------------------------------------------------
  describe("Second-Visit Permission Qualification (P10.02)", () => {
    it("should NOT show push prompt on user's first visit", () => {
      recordVisit(); // visit count = 1
      expect(localStorage.getItem("oddly_visit_count")).toBe("1");
      expect(shouldShowPushPrompt()).toBe(false);
    });

    it("should show push prompt on user's second visit when permission is default", () => {
      recordVisit(); // visit 1
      recordVisit(); // visit 2
      expect(localStorage.getItem("oddly_visit_count")).toBe("2");
      expect(shouldShowPushPrompt()).toBe(true);
    });

    it("should NOT show push prompt if user previously dismissed it", () => {
      localStorage.setItem("oddly_visit_count", "3");
      localStorage.setItem("oddly_push_prompt_dismissed", "true");

      expect(shouldShowPushPrompt()).toBe(false);
    });

    it("should NOT show push prompt if permission is already granted or denied", () => {
      localStorage.setItem("oddly_visit_count", "3");

      // Granted
      // @ts-ignore
      Notification.permission = "granted";
      expect(shouldShowPushPrompt()).toBe(false);

      // Denied
      // @ts-ignore
      Notification.permission = "denied";
      expect(shouldShowPushPrompt()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Service Worker Cache Versioning & Personalization Protection (R2.7)
  // -------------------------------------------------------------------------
  describe("Service Worker Policy & Cache Hygiene (R2.7)", () => {
    it("service worker script contains build-hash versioned cache name", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const swCode = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf8");

      expect(swCode).toMatch(/const BUILD_VERSION = "oddly-v1\.\d+\.\d+-\d+";/);
      expect(swCode).toContain("const CACHE_NAME = `oddly-static-${BUILD_VERSION}`;");
    });

    it("service worker purges stale cache buckets during activation", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const swCode = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf8");

      expect(swCode).toContain("caches.delete(key)");
      expect(swCode).toContain("self.clients.claim()");
    });

    it("strictly bypasses service worker cache for personalized and sensitive endpoints", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const swCode = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf8");

      const sensitiveRoutes = [
        "/v1/results",
        "/v1/me",
        "/v1/history",
        "/v1/submissions",
        "/v1/identity",
        "/v1/auth",
      ];

      for (const route of sensitiveRoutes) {
        expect(swCode).toContain(`url.pathname.startsWith("${route}")`);
      }
    });
  });
});
