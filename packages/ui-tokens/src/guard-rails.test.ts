import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { radius, shadows } from "./tokens.js";

describe("D1.9 Design Guard Rails & Consistency Enforcement", () => {
  it("proves approved radii set contains only the 4 allowed token sizes", () => {
    const allowed = new Set(["10px", "14px", "20px", "999px"]);
    for (const [key, val] of Object.entries(radius)) {
      assert.ok(
        allowed.has(val),
        `Radius token '${key}' has value '${val}' which is not in the allowed set (10px, 14px, 20px, 999px)`
      );
    }
  });

  it("proves shadow tokens have zero blur (hard offset sticker shadows)", () => {
    // Expected pattern: "<x> <y> 0 <color>" where blur is strictly 0
    for (const [key, val] of Object.entries(shadows)) {
      const parts = val.trim().split(/\s+/);
      const blurPart = parts[2];
      assert.strictEqual(
        blurPart,
        "0",
        `Shadow token '${key}' has value '${val}' with non-zero blur '${blurPart}'. Sticker pop requires hard offset shadows with zero blur.`
      );
    }
  });

  it("proves tokens.css defines the approved sticker pop CSS variables", () => {
    const cssPath = path.resolve(__dirname, "./tokens.css");
    const content = fs.readFileSync(cssPath, "utf-8");

    assert.ok(content.includes("--color-ink: #14123A;"));
    assert.ok(content.includes("--color-cream: #FFF8F0;"));
    assert.ok(content.includes("--color-paper: #FFFFFF;"));
    assert.ok(content.includes("--color-violet: #6C4CF1;"));
    assert.ok(content.includes("--shadow-sticker: 4px 4px 0 #14123A;"));
    assert.ok(content.includes("--radius-l: 20px;"));
  });

  it("proves play flow components import brand colors from tokens and contain zero hardcoded hexes", () => {
    const playDir = path.resolve(__dirname, "../../../apps/web/src/components/play");
    if (!fs.existsSync(playDir)) return;

    const files = fs.readdirSync(playDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
    for (const file of files) {
      const filePath = path.join(playDir, file);
      const content = fs.readFileSync(filePath, "utf-8");

      // Match hex patterns except comments or allowed test placeholders
      const matches = content.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      assert.strictEqual(
        matches.length,
        0,
        `Play flow component '${file}' contains hardcoded hex literal(s): ${matches.join(", ")}. Must import from @oddly/ui-tokens.`
      );
    }
  });
});

