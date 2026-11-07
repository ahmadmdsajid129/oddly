import { describe, it, expect } from "vitest";
import { ODDLY_VERSION, getAppMeta } from "./index.js";

describe("Shared package core verification", () => {
  it("exports correct version", () => {
    expect(ODDLY_VERSION).toBe("1.0.0");
  });

  it("returns healthy application metadata", () => {
    const meta = getAppMeta();
    expect(meta.ok).toBe(true);
    expect(meta.service).toBe("oddly-shared");
    expect(typeof meta.timestamp).toBe("string");
  });
});
