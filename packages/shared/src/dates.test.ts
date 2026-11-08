/**
 * @file dates.test.ts
 * @package @oddly/shared
 *
 * Unit tests for UTC/IST date arithmetic, drop windows, and streak calculations.
 */

import { describe, expect, it } from "vitest";
import {
  calculateStreak,
  dropClosesAt,
  dropOpensAt,
  getTwinDay,
  isDayOpen,
  istToUtc,
  offsetDate,
  utcToIst,
} from "./dates.js";

describe("UTC ↔ IST conversions", () => {
  it("converts 01:30 UTC to 07:00 IST (+5h30m)", () => {
    const utc = new Date("2026-11-08T01:30:00.000Z");
    const ist = utcToIst(utc);
    expect(ist.getUTCHours()).toBe(7);
    expect(ist.getUTCMinutes()).toBe(0);
  });

  it("converts 07:00 IST back to 01:30 UTC", () => {
    const istClock = new Date("2026-11-08T07:00:00.000Z");
    const utc = istToUtc(istClock);
    expect(utc.toISOString()).toBe("2026-11-08T01:30:00.000Z");
  });
});

describe("getTwinDay", () => {
  it("correctly identifies IST calendar date across UTC midnight", () => {
    // 2026-11-07 20:00 UTC = 2026-11-08 01:30 IST
    const lateUtc = new Date("2026-11-07T20:00:00.000Z");
    expect(getTwinDay(lateUtc)).toBe("2026-11-08");

    // 2026-11-07 18:00 UTC = 2026-11-07 23:30 IST
    const earlierUtc = new Date("2026-11-07T18:00:00.000Z");
    expect(getTwinDay(earlierUtc)).toBe("2026-11-07");
  });
});

describe("Drop open and close times", () => {
  const dropDate = "2026-11-08";

  it("computes 07:00 IST as 01:30 UTC for drop open", () => {
    const openUtc = dropOpensAt(dropDate);
    expect(openUtc.toISOString()).toBe("2026-11-08T01:30:00.000Z");
  });

  it("computes 23:59:59 IST as 18:29:59 UTC for drop close", () => {
    const closeUtc = dropClosesAt(dropDate);
    expect(closeUtc.toISOString()).toBe("2026-11-08T18:29:59.000Z");
  });

  it("correctly checks if drop is open", () => {
    const beforeOpen = new Date("2026-11-08T01:00:00.000Z");
    const duringDay = new Date("2026-11-08T10:00:00.000Z");
    const afterClose = new Date("2026-11-08T19:00:00.000Z");

    expect(isDayOpen(dropDate, beforeOpen)).toBe(false);
    expect(isDayOpen(dropDate, duringDay)).toBe(true);
    expect(isDayOpen(dropDate, afterClose)).toBe(false);
  });
});

describe("calculateStreak", () => {
  const today = "2026-11-08";

  it("returns 0 for no submissions", () => {
    expect(calculateStreak([], today)).toBe(0);
  });

  it("returns 1 for playing today only", () => {
    expect(calculateStreak([today], today)).toBe(1);
  });

  it("returns 1 for playing yesterday if today has not been submitted yet", () => {
    const yesterday = "2026-11-07";
    expect(calculateStreak([yesterday], today)).toBe(1);
  });

  it("returns consecutive days streak", () => {
    const dates = ["2026-11-08", "2026-11-07", "2026-11-06", "2026-11-05"];
    expect(calculateStreak(dates, today)).toBe(4);
  });

  it("handles unsorted and duplicate dates gracefully", () => {
    const dates = [
      "2026-11-06",
      "2026-11-08",
      "2026-11-07",
      "2026-11-08",
      "2026-11-05",
    ];
    expect(calculateStreak(dates, today)).toBe(4);
  });

  it("breaks streak if there is a missed day", () => {
    // missed 2026-11-06
    const dates = ["2026-11-08", "2026-11-07", "2026-11-05", "2026-11-04"];
    expect(calculateStreak(dates, today)).toBe(2);
  });

  it("returns 0 if last submission was 2 or more days ago", () => {
    const dates = ["2026-11-05", "2026-11-04"];
    expect(calculateStreak(dates, today)).toBe(0);
  });
});

describe("offsetDate", () => {
  it("increments and decrements dates across month boundaries", () => {
    expect(offsetDate("2026-10-31", 1)).toBe("2026-11-01");
    expect(offsetDate("2026-11-01", -1)).toBe("2026-10-31");
  });
});
