"use client";

/**
 * @file WebVitals.tsx
 * @package @oddly/web
 *
 * Core Web Vitals telemetry reporting (LCP, INP, CLS) (R2.7)
 * Samples 10% of sessions and reports to /v1/events via navigator.sendBeacon
 */

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    // 10% sampling to prevent flooding telemetry ingestion
    if (Math.random() > 0.1) return;

    if (["LCP", "INP", "CLS", "FCP", "TTFB"].includes(metric.name)) {
      if (typeof window !== "undefined" && navigator.sendBeacon) {
        const payload = JSON.stringify({
          event: "web_vitals",
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          id: metric.id,
        });

        navigator.sendBeacon("/v1/events", payload);
      }
    }
  });

  return null;
}
