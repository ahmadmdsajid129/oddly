/**
 * @file clock.ts
 * @package @oddly/worker
 *
 * IST Timeline & Clock Acceleration Harness (P9.01, P9.05).
 * Converts IST wall-clock schedules to UTC cron intervals and provides
 * a 10-minute accelerated test cycle when CLOCK_ACCELERATION=true.
 */

export interface ScheduleTimelineConfig {
  stageCron: string;    // 06:30 IST -> 01:00 UTC
  openCron: string;     // 07:00 IST -> 01:30 UTC
  archiveCron: string;  // 06:59 IST -> 01:29 UTC
  pairingCron: string;  // Every 5 minutes
  isAccelerated: boolean;
  cycleLengthSeconds: number;
}

/**
 * Returns timeline schedule configuration based on environment.
 */
export function getTimelineConfig(): ScheduleTimelineConfig {
  const isAccelerated = process.env.CLOCK_ACCELERATION === "true" || process.env.NODE_ENV === "test";

  if (isAccelerated) {
    // 10-minute accelerated loop:
    // 0m: stage, 1m: open, every 1m: pairing, 9m: archive/close
    return {
      stageCron: "*/10 * * * *",
      openCron: "1-59/10 * * * *",
      archiveCron: "9-59/10 * * * *",
      pairingCron: "*/1 * * * *",
      isAccelerated: true,
      cycleLengthSeconds: 600,
    };
  }

  // Standard IST Production Schedule (UTC conversion: IST is UTC+5:30):
  // 06:30 IST = 01:00 UTC
  // 07:00 IST = 01:30 UTC
  // 06:59 IST = 01:29 UTC
  return {
    stageCron: "0 1 * * *",      // 06:30 IST (01:00 UTC)
    openCron: "30 1 * * *",      // 07:00 IST (01:30 UTC)
    archiveCron: "29 1 * * *",   // 06:59 IST (01:29 UTC)
    pairingCron: "*/5 * * * *",  // Every 5 minutes
    isAccelerated: false,
    cycleLengthSeconds: 86400,
  };
}

/**
 * Determines drop lifecycle phase for a given timestamp.
 */
export function getDropLifecyclePhase(date = new Date()): "staging" | "live" | "closing" {
  // Convert current UTC time to IST (UTC + 5 hours 30 mins)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(date.getTime() + istOffsetMs);
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Staging window: 06:30 to 06:59 IST (390 to 419 minutes)
  if (totalMinutes >= 390 && totalMinutes < 420) {
    return "staging";
  }

  // Closing / Archive transition: exactly 06:59 IST (419 minutes)
  if (totalMinutes === 419) {
    return "closing";
  }

  // Live game window: 07:00 IST through 06:58 IST next morning
  return "live";
}

