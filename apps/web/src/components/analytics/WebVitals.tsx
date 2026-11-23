"use client";

/**
 * @file WebVitals.tsx
 * @package @oddly/web
 *
 * Core Web Vitals telemetry reporting (LCP, INP, CLS) (R2.7)
 * Samples 10% of sessions and reports to /api/v1/events via navigator.sendBeacon
 */

import { useReportWebVitals } from "next/web-vitals";
import { isAnalyticsConsented } from "@/lib/signals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    // 10% sampling to prevent flooding telemetry ingestion
    if (Math.random() > 0.1) return;
    if (!isAnalyticsConsented()) return;

    if (["LCP", "INP", "CLS", "FCP", "TTFB"].includes(metric.name)) {
      if (typeof window !== "undefined" && navigator.sendBeacon) {
        const payload = JSON.stringify({
          events: [
            {
              name: "web_vitals",
              properties: {
                metric: metric.name,
                value: metric.value,
                rating: metric.rating,
                metric_id: metric.id,
              },
              timestamp: new Date().toISOString(),
            },
          ],
        });

        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/v1/events", blob);
      }
    }
  });

  return null;
}
