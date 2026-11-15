import { describe, expect, it, vi } from "vitest";
import { api } from "./lib/api";
import { oddlyApi } from "./lib/api";

describe("Stage F4 (Phase 10D): Web Anti-Twin Client & Invariants", () => {
  it("fetches Anti-Twin result via api.antitwin.get", async () => {
    const mockResponse = {
      ok: true,
      drop_id: "drop-test-1",
      drop_date: "2026-11-15",
      differed_count: 4,
      sample_size: 2000,
      opposite: {
        region: "Western Europe",
        age_band: "25-34",
      },
      own_differed_questions: [
        {
          question_id: "q1",
          position: 1,
          prompt: "Morning or Night?",
          your_answer: "Morning",
        },
      ],
      note: "Different instincts make the world interesting. Opposite paths today!",
    };

    vi.spyOn(oddlyApi, "getAntiTwin").mockResolvedValue(mockResponse);

    const res = await api.antitwin.get("drop-test-1");
    expect(res.ok).toBe(true);
    expect(res.differed_count).toBe(4);
    expect(res.sample_size).toBe(2000);
    expect(res.opposite?.region).toBe("Western Europe");
    expect(res.own_differed_questions).toHaveLength(1);

    vi.restoreAllMocks();
  });

  it("handles low pool insufficient notice gracefully", async () => {
    const mockLowPool = {
      ok: true,
      drop_id: "drop-test-2",
      drop_date: "2026-11-15",
      pool_insufficient: true,
      pool_count: 14,
      min_pool_size: 200,
      notice: "Not enough players yet today to find a genuine opposite. Check back this evening.",
    };

    vi.spyOn(oddlyApi, "getAntiTwin").mockResolvedValue(mockLowPool);

    const res = await api.antitwin.get("drop-test-2");
    expect(res.ok).toBe(true);
    expect(res.pool_insufficient).toBe(true);
    expect(res.pool_count).toBe(14);
    expect(res.notice).toContain("Not enough players yet today");
    expect(res.opposite).toBeUndefined();

    vi.restoreAllMocks();
  });

  it("strictly enforces zero opposite pick exposure in response payload (Rule 4)", async () => {
    const mockResponse = {
      ok: true,
      drop_id: "drop-test-3",
      differed_count: 5,
      sample_size: 2000,
      opposite: {
        region: "Tokyo, Japan",
        age_band: "18-24",
      },
      own_differed_questions: [
        {
          question_id: "q1",
          position: 1,
          prompt: "Coffee or Tea?",
          your_answer: "Coffee",
        },
      ],
    };

    vi.spyOn(oddlyApi, "getAntiTwin").mockResolvedValue(mockResponse);

    const res = await api.antitwin.get("drop-test-3");
    // Ensure no opposite picks or vectors are exposed
    expect(res).not.toHaveProperty("opposite_answers");
    expect(res).not.toHaveProperty("opposite_picks");
    expect(res).not.toHaveProperty("vectors");

    vi.restoreAllMocks();
  });

  it("verifies sample size and min pool parameters are passed in request", async () => {
    const spy = vi.spyOn(oddlyApi, "getAntiTwin").mockResolvedValue({
      ok: true,
      drop_id: "drop-test-4",
    });

    await api.antitwin.get("drop-test-4", 500, 100);
    expect(spy).toHaveBeenCalledWith("drop-test-4", 500, 100);

    vi.restoreAllMocks();
  });
});
