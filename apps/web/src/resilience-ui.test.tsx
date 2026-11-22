/**
 * @file resilience-ui.test.ts
 * @package @oddly/web
 *
 * Unit tests for Phase 1 Resilience & Degradation UI Kit:
 * - P1.20: DegradationBanner (L0-L4)
 * - P1.21: ModeBPendingScreen (Mode B async pending state)
 * - P1.22: OverloadScreens (FreshnessLabel, RateLimitScreen, ServiceOverloadScreen)
 * - P1.23: ResiliencePrimitives (AntiFlickerSkeleton, WidgetErrorBoundary)
 */

import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DegradationBanner } from "./components/ui/DegradationBanner";
import { ModeBPendingScreen } from "./components/ui/ModeBPendingScreen";
import {
  FreshnessLabel,
  RateLimitScreen,
  ServiceOverloadScreen,
} from "./components/ui/OverloadScreens";
import {
  AntiFlickerSkeleton,
  WidgetErrorBoundary,
} from "./components/ui/ResiliencePrimitives";

describe("Phase 1: Resilience & Degradation UI Kit", () => {
  describe("P1.20: DegradationBanner", () => {
    it("renders null for healthy level L0", () => {
      const html = renderToString(<DegradationBanner level="L0" />);
      expect(html).toBe("");
    });

    it("renders Level L1 Conserve banner with informational copy", () => {
      const html = renderToString(<DegradationBanner level="L1" />);
      expect(html).toContain("L1 Conserve");
      expect(html).toContain("High volume right now");
      expect(html).toContain('role="status"');
    });

    it("renders Level L2 High Traffic banner with core protection copy", () => {
      const html = renderToString(<DegradationBanner level="L2" />);
      expect(html).toContain("L2 High Traffic");
      expect(html).toContain("Busy right now. Your picks are safe.");
    });

    it("renders Level L3 Surge banner with non-dismissible state", () => {
      const html = renderToString(<DegradationBanner level="L3" />);
      expect(html).toContain("L3 Surge Active");
      expect(html).toContain("Very high traffic right now");
      expect(html).not.toContain("Dismiss status banner");
    });

    it("renders Level L4 Offline banner with device local storage copy", () => {
      const html = renderToString(<DegradationBanner level="L4" />);
      expect(html).toContain("L4 Offline Mode");
      expect(html).toContain("We are having trouble reaching our servers");
      expect(html).toContain("safely saved on this device");
    });

    it("renders custom override message when provided", () => {
      const html = renderToString(
        <DegradationBanner level="L2" customMessage="Morning push wave in progress." />
      );
      expect(html).toContain("Morning push wave in progress.");
    });
  });

  describe("P1.21: ModeBPendingScreen", () => {
    it("renders Mode B pending transition screen with brand copy", () => {
      const html = renderToString(
        <ModeBPendingScreen
          requestId="req_test_abc123456789"
          onCheckStatus={() => {}}
          onHome={() => {}}
        />
      );
      expect(html).toContain("Saved! Finding your twin...");
      expect(html).toContain("Lots of strangers are playing right now");
      expect(html).toContain("Picks Received");
      expect(html).toContain("Ticket:");
      expect(html).toContain("req_test_abc");
      expect(html).toContain("Check status");
      expect(html).toContain("Back home");
    });
  });

  describe("P1.22: OverloadScreens & FreshnessLabel", () => {
    it("renders FreshnessLabel with custom label or fallback", () => {
      const html = renderToString(
        <FreshnessLabel label="Serving cached results" isStale={true} />
      );
      expect(html).toContain("Serving cached results");
      expect(html).toContain('role="status"');
    });

    it("renders RateLimitScreen (429) with friendly copy and countdown timer", () => {
      const html = renderToString(
        <RateLimitScreen retryAfterSeconds={15} onRetry={() => {}} />
      );
      expect(html).toContain("Whoa, slow down a notch!");
      expect(html).toContain("HTTP 429 • Catch Your Breath");
      expect(html).toContain("Retry available in 15s");
      expect(html).toContain("Please wait (15s)");
    });

    it("renders ServiceOverloadScreen (503) with rush hour messaging", () => {
      const html = renderToString(
        <ServiceOverloadScreen retryAfterSeconds={30} onRetry={() => {}} />
      );
      expect(html).toContain("Everyone&#x27;s playing Oddly right now");
      expect(html).toContain("HTTP 503 • High Rush Hour");
      expect(html).toContain("Reconnecting in 30s");
      expect(html).toContain("Retry now anyway");
    });
  });

  describe("P1.23: ResiliencePrimitives & AntiFlicker", () => {
    it("renders AntiFlickerSkeleton container in loading state", () => {
      const html = renderToString(
        <AntiFlickerSkeleton
          isLoading={true}
          skeleton={<div data-testid="test-skeleton">Loading...</div>}
        >
          <div>Loaded Content</div>
        </AntiFlickerSkeleton>
      );
      expect(html).toContain("anti-flicker-skeleton-container");
      expect(html).toContain("Loading...");
      expect(html).not.toContain("Loaded Content");
    });

    it("renders AntiFlickerSkeleton content container when not loading", () => {
      const html = renderToString(
        <AntiFlickerSkeleton
          isLoading={false}
          skeleton={<div>Loading...</div>}
        >
          <div data-testid="test-content">Loaded Content</div>
        </AntiFlickerSkeleton>
      );
      expect(html).toContain("anti-flicker-content-container");
      expect(html).toContain("Loaded Content");
      expect(html).not.toContain("anti-flicker-skeleton-container");
    });

    it("WidgetErrorBoundary renders children when no error occurs", () => {
      const html = renderToString(
        <WidgetErrorBoundary name="TestWidget">
          <div>Healthy Widget Content</div>
        </WidgetErrorBoundary>
      );
      expect(html).toContain("Healthy Widget Content");
    });

    it("WidgetErrorBoundary static getDerivedStateFromError sets error state", () => {
      const error = new Error("Simulated widget failure");
      const state = WidgetErrorBoundary.getDerivedStateFromError(error);
      expect(state.hasError).toBe(true);
      expect(state.error).toBe(error);
    });

    it("WidgetErrorBoundary renders friendly sticker fallback when error state is active", () => {
      const boundary = new WidgetErrorBoundary({ name: "Meme Stream", children: <div>child</div> });
      boundary.state = { hasError: true, error: new Error("Test error") };
      const vdom = boundary.render();
      const html = renderToString(vdom as React.ReactElement);

      expect(html).toContain("Meme Stream took a nap");
      expect(html).toContain("The rest of your Drop is running smoothly");
      expect(html).toContain("Retry");
      expect(html).toContain('role="alert"');
    });
  });
});
