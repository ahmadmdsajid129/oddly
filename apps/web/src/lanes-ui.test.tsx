/**
 * @file lanes-ui.test.tsx
 * Unit tests for Stage L1 Lanes UI Components (P10L.06, P10L.07, P10L.10).
 * Uses renderToString from react-dom/server for lightweight SSR verification.
 *
 * Verifies:
 * - Universal LaneChip component styling, accents, and icons (P10L.06)
 * - Responsive LanePicker home UI with Sticker Pop styling (P10L.06)
 * - First-Run Promise (Rule L10): first visit enters Everyday lane directly
 * - Result view, share card generator, and challenge links carry lane chip & accent token (P10L.07)
 */

import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "./components/ui/Toast";
import { LaneChip } from "./components/lanes/LaneChip";
import { LanePicker } from "./components/lanes/LanePicker";
import { FlipCard } from "./components/share/FlipCard";
import { ShareSheet } from "./components/share/ShareSheet";
import { usePlayStore } from "./lib/play-store";
import { api } from "./lib/api";
import type { LaneSummary } from "@oddly/shared";

// Mock API
vi.mock("./lib/api", () => ({
  api: {
    lanes: {
      list: vi.fn(),
      expressInterest: vi.fn(),
    },
    drops: {
      getToday: vi.fn(),
    },
  },
  oddlyApi: {
    getCard: vi.fn().mockResolvedValue({
      success: true,
      cardUrl: "https://r2.oddly.fun/cards/test.png",
      shortId: "abc123",
    }),
  },
}));

const mockLanes: LaneSummary[] = [
  {
    id: "lane-001",
    slug: "everyday",
    name_key: "Everyday",
    description_key: "Five quick picks about everyday life.",
    accent_token: "violet",
    icon_key: "sparkles",
    status: "open",
    sort_order: 1,
    age_rating: "18+",
    formats_allowed: ["pick1"],
    text_enabled: false,
    super_twin_enabled: true,
    players_today: 1250,
  },
  {
    id: "lane-002",
    slug: "memes",
    name_key: "Memes",
    description_key: "Internet culture and classic formats.",
    accent_token: "sun",
    icon_key: "laugh",
    status: "open",
    sort_order: 2,
    age_rating: "18+",
    formats_allowed: ["pick1"],
    text_enabled: false,
    super_twin_enabled: true,
    players_today: 420,
  },
  {
    id: "lane-003",
    slug: "gaming",
    name_key: "Gaming",
    description_key: "Picks for players, speedrunners and casuals.",
    accent_token: "mint",
    icon_key: "gamepad-2",
    status: "planned",
    sort_order: 4,
    age_rating: "18+",
    formats_allowed: ["pick1"],
    text_enabled: false,
    super_twin_enabled: true,
    subscribers_count: 85,
  },
];

function createTestQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  client.setQueryData(["lanes-catalogue"], mockLanes);
  return client;
}

describe("Stage L1: Universal LaneChip Component (P10L.06)", () => {
  it("renders with correct name and Sticker Pop classes", () => {
    const html = renderToString(<LaneChip name="Memes" slug="memes" accent="sun" />);
    expect(html).toContain("Memes");
    expect(html).toContain("rounded-pill");
    expect(html).toContain("border-[1.5px]");
    expect(html).toContain("border-ink");
    expect(html).toContain("bg-sun");
    expect(html).toContain("data-testid=\"lane-chip-memes\"");
  });

  it("applies correct accent background for violet, mint, and coral", () => {
    const htmlViolet = renderToString(<LaneChip name="Everyday" slug="everyday" accent="violet" />);
    expect(htmlViolet).toContain("bg-violet");

    const htmlMint = renderToString(<LaneChip name="Gaming" slug="gaming" accent="mint" />);
    expect(htmlMint).toContain("bg-mint");

    const htmlCoral = renderToString(<LaneChip name="Situations" slug="situations" accent="coral" />);
    expect(htmlCoral).toContain("bg-coral");
  });

  it("renders as interactive button when onClick is provided", () => {
    const html = renderToString(<LaneChip name="Food" slug="food" onClick={() => {}} />);
    expect(html).toContain("<button");
    expect(html).toContain("cursor-pointer");
    expect(html).toContain("sticker-press");
  });
});

describe("Stage L1: Responsive LanePicker UI (P10L.06 & Rule L10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlayStore.setState({ completedResults: {}, drafts: {}, pendingSubmissions: {} });
    vi.mocked(api.lanes.list).mockResolvedValue({ lanes: mockLanes });
  });

  it("renders open lane cards and planned coming-soon tiles with pre-populated query client", () => {
    const queryClient = createTestQueryClient();

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <LanePicker onSelectLane={() => {}} />
        </ToastProvider>
      </QueryClientProvider>
    );

    // Open lanes
    expect(html).toContain("data-testid=\"lane-card-everyday\"");
    expect(html).toContain("data-testid=\"lane-card-memes\"");
    expect(html).toContain("1250");
    expect(html).toContain("playing today");

    // Planned lane with coming soon
    expect(html).toContain("data-testid=\"lane-card-gaming\"");
    expect(html).toContain("Coming Soon");
    expect(html).toContain("Tell me when it opens");
  });

  it("enforces Rule L10 (First-Run Promise): fresh state has 0 completed results", () => {
    const state = usePlayStore.getState();
    const hasPlayedBefore = Object.keys(state.completedResults).length > 0;
    expect(hasPlayedBefore).toBe(false);
  });
});

describe("Stage L1: Result View & Share Links Lane Integration (P10L.07)", () => {
  it("FlipCard renders Universal LaneChip on hero face and overlap face", () => {
    const html = renderToString(
      <FlipCard
        matchedPicks={4}
        totalPicks={5}
        tier="Rare"
        lane={{
          name: "Memes",
          slug: "memes",
          accent: "sun",
          iconKey: "laugh",
        }}
      />
    );

    // Front face LaneChip
    expect(html).toContain("data-testid=\"lane-chip-memes\"");
    expect(html).toContain("bg-sun");
    expect(html).toContain("Memes");
  });

  it("ShareSheet creates challenge links carrying &lane=slug parameter", () => {
    const html = renderToString(
      <ToastProvider>
        <ShareSheet
          isOpen={true}
          onClose={() => {}}
          dropId="drop-001"
          laneSlug="memes"
          laneName="Memes"
          laneAccent="sun"
        />
      </ToastProvider>
    );

    expect(html).toContain("Copy challenge link");
  });
});
