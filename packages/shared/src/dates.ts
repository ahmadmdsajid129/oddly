/**
 * @file dates.ts
 * @package @oddly/shared
 *
 * Date and timezone utilities for Oddly v1.
 *
 * Key facts:
 *   - Oddly's "Twin Day" is defined in IST (UTC+5:30).
 *   - The drop opens at 07:00 IST and closes at 23:59:59 IST.
 *   - A player's streak is the number of consecutive IST days they submitted.
 *   - All DB timestamps are stored in UTC; IST conversion happens here.
 *
 * We use native Date arithmetic (no Luxon/dayjs) to keep deps minimal.
 * IST = UTC + 5h 30m = UTC + 19800 seconds.
 */

/** IST offset in milliseconds from UTC */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 19800000ms

// ---------------------------------------------------------------------------
// Core: UTC ↔ IST
// ---------------------------------------------------------------------------

/**
 * Shift a UTC Date to IST by adding the IST offset.
 * Returns a new Date whose .toISOString() represents the IST wall clock.
 *
 * Example: 2026-11-07T01:30:00Z → 2026-11-07T07:00:00 (IST)
 */
export function utcToIst(utcDate: Date): Date {
  return new Date(utcDate.getTime() + IST_OFFSET_MS);
}

/**
 * Shift an IST Date back to UTC.
 */
export function istToUtc(istDate: Date): Date {
  return new Date(istDate.getTime() - IST_OFFSET_MS);
}

// ---------------------------------------------------------------------------
// Twin Day
// ---------------------------------------------------------------------------

/**
 * Get the Oddly "Twin Day" (YYYY-MM-DD in IST) for a given UTC timestamp.
 *
 * Example:
 *   UTC 2026-11-07T00:00:00Z → IST 2026-11-07T05:30:00 → "2026-11-07"
 *   UTC 2026-11-06T20:00:00Z → IST 2026-11-07T01:30:00 → "2026-11-07"
 *   UTC 2026-11-06T18:00:00Z → IST 2026-11-06T23:30:00 → "2026-11-06"
 *
 * @param utcDate - Any UTC Date
 * @returns YYYY-MM-DD string in IST
 */
export function getTwinDay(utcDate: Date): string {
  const ist = utcToIst(utcDate);
  const year = ist.getUTCFullYear();
  const month = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// Drop open/close windows
// ---------------------------------------------------------------------------

/**
 * Compute the UTC timestamp when a drop opens (07:00 IST on dropDate).
 *
 * @param dropDate - YYYY-MM-DD (IST date)
 * @returns UTC Date for 07:00 IST
 */
export function dropOpensAt(dropDate: string): Date {
  // Parse date parts
  const [year, month, day] = dropDate.split("-").map(Number) as [
    number,
    number,
    number
  ];
  // 07:00 IST = 01:30 UTC (IST - 5h30m)
  const istOpen = new Date(Date.UTC(year, month - 1, day, 7, 0, 0));
  return istToUtc(istOpen); // subtract IST offset
}

/**
 * Compute the UTC timestamp when a drop closes (23:59:59 IST on dropDate).
 *
 * @param dropDate - YYYY-MM-DD (IST date)
 * @returns UTC Date for 23:59:59 IST
 */
export function dropClosesAt(dropDate: string): Date {
  const [year, month, day] = dropDate.split("-").map(Number) as [
    number,
    number,
    number
  ];
  const istClose = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
  return istToUtc(istClose);
}

/**
 * Is a drop currently open (accepting submissions)?
 *
 * @param dropDate  - YYYY-MM-DD (IST)
 * @param currentUtc - Current UTC timestamp (defaults to now)
 * @returns true if the drop is currently live
 */
export function isDayOpen(dropDate: string, currentUtc: Date = new Date()): boolean {
  const opensAt = dropOpensAt(dropDate);
  const closesAt = dropClosesAt(dropDate);
  return currentUtc >= opensAt && currentUtc <= closesAt;
}

/**
 * Returns the YYYY-MM-DD (IST) of the current/today's drop.
 */
export function todayDropDate(now: Date = new Date()): string {
  return getTwinDay(now);
}

// ---------------------------------------------------------------------------
// Streak calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the current streak (consecutive IST days with submission).
 *
 * Rules:
 *   - Streak = number of consecutive IST days ending on the most recent date.
 *   - Duplicates are removed (a player can only submit once per day).
 *   - If the most recent submission is not today or yesterday → streak = 0.
 *
 * @param submissionDates - Array of YYYY-MM-DD IST dates (order not required)
 * @param today           - Today's IST date as YYYY-MM-DD (defaults to now)
 * @returns Current streak count (0 if streak is broken)
 */
export function calculateStreak(
  submissionDates: string[],
  today: string = getTwinDay(new Date())
): number {
  if (submissionDates.length === 0) return 0;

  // Deduplicate and sort descending
  const uniqueDates = [...new Set(submissionDates)].sort().reverse();

  // The streak must include today or yesterday to still be "active"
  const mostRecent = uniqueDates[0]!;
  const yesterday = offsetDate(today, -1);

  if (mostRecent !== today && mostRecent !== yesterday) {
    return 0; // Streak broken
  }

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const expected = offsetDate(uniqueDates[i - 1]!, -1);
    if (uniqueDates[i] === expected) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Offset a YYYY-MM-DD date string by N days.
 *
 * @param dateStr - YYYY-MM-DD
 * @param days    - Positive = forward, negative = backward
 * @returns New YYYY-MM-DD
 */
export function offsetDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number) as [
    number,
    number,
    number
  ];
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the number of seconds until the next drop opens (07:00 IST).
 * Used for the countdown timer.
 *
 * @param currentUtc - Current UTC timestamp
 * @returns Seconds until next 07:00 IST
 */
export function secondsUntilNextDrop(currentUtc: Date = new Date()): number {
  const todayStr = getTwinDay(currentUtc);

  // Try today's drop first
  let nextOpen = dropOpensAt(todayStr);

  // If today's drop has already opened, target tomorrow
  if (currentUtc >= nextOpen) {
    nextOpen = dropOpensAt(offsetDate(todayStr, 1));
  }

  return Math.max(0, Math.ceil((nextOpen.getTime() - currentUtc.getTime()) / 1000));
}
