/**
 * @file index.ts
 * @package @oddly/api-client
 *
 * Universal typed API client for web, workers, and admin services (P3.12).
 */

import type {
  AnswerPayload,
  ContentResponse,
  DropResponse,
  HealthCheckResult,
  ResultResponse,
} from "@oddly/shared";

export interface OddlyClientConfig {
  baseUrl: string;
  fetchFn?: typeof fetch;
  headers?: Record<string, string>;
}

export interface GuestRegistrationResponse {
  player_id: string;
  did: string;
  region: string;
  age_band: string;
  streak: number;
}

export interface PlayerMeResponse {
  authenticated: boolean;
  player_id: string | null;
  streak: number;
}

export interface PublicConfigResponse {
  features: Record<string, unknown>;
  timing: Record<string, unknown>;
  tiers: Array<{
    tier: string;
    min_percentile: number;
    max_percentile: number;
    label: string;
    description: string;
    badge_color: string;
  }>;
}

export interface PageResponse {
  slug: string;
  title: string;
  body_md: string;
  updated_at: string;
}

export interface SubmitResponse {
  ok: boolean;
  status: "accepted" | "duplicate";
  submission_id: string;
  oddness: {
    raw_score: number;
    percentile: number;
    tier: string;
  };
  match: {
    twin_token: string;
    similarity_score: number;
    is_provisional: boolean;
  } | null;
}

export interface WorldStatsResponse {
  drop_id: string;
  total_players: number;
  tier_distribution: Record<string, number>;
  rarest_pick: {
    question_id: string;
    value: string;
    count: number;
    percentage: number;
  } | null;
}

export interface CardResponse {
  success: boolean;
  format: string;
  theme: string;
  cardUrl: string;
  storageKey: string;
  shortId: string;
}

export interface CreateShareResponse {
  success: boolean;
  shortId: string;
  shareUrl: string;
}

export interface PublicShareResponse {
  success: boolean;
  shortId: string;
  dropId: string;
  dropDate: string;
  sharerScore: number;
  sharerTier: string;
  sharerPercentile: number;
  twinCity?: string;
  answers: Array<{
    questionId: string;
    value: unknown;
  }>;
  questions: Array<{
    id: string;
    type: string;
    prompt: string;
    options?: unknown;
    media_url?: string | null;
  }>;
}

export interface OAuthResponse {
  ok: boolean;
  account: {
    id: string;
    displayName: string;
    emailHash: string;
  };
  mergedHistory: {
    merged: boolean;
    submissionsCount: number;
    currentStreak: number;
  };
}

export interface MergeGuestResponse {
  ok: boolean;
  merged_submissions_count: number;
  current_streak: number;
}

export interface LogoutResponse {
  ok: boolean;
  message: string;
}

export interface HistoryResponse {
  ok: boolean;
  items: Array<{
    submissionId: string;
    dropId: string;
    dropDate: string;
    completedAt: string;
    sharerScore: number;
    sharerTier: string;
    sharerPercentile: number;
    twinCity: string;
    shareCardUrl: string | null;
    answersCount: number;
  }>;
  total: number;
  streak: {
    current: number;
    longest: number;
    total_played: number;
    next_milestone: number;
  };
}

export interface SessionResponse {
  authenticated: boolean;
  account: {
    id: string;
    displayName: string;
    emailHash: string;
  } | null;
}

export class OddlyApiClient {
  private baseUrl: string;
  private fetchFn: typeof fetch;
  private defaultHeaders: Record<string, string>;

  constructor(config: OddlyClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.fetchFn = config.fetchFn ?? fetch;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...(config.headers || {}),
    };
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      ...this.defaultHeaders,
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await this.fetchFn(url, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!res.ok) {
      let errorMessage = res.statusText;
      try {
        const errorBody = (await res.json()) as { message?: string };
        if (errorBody?.message) {
          errorMessage = errorBody.message;
        }
      } catch {
        // Fallback to res.statusText
      }
      throw new Error(
        errorMessage || `Request to ${path} failed with HTTP ${res.status}`
      );
    }

    return res.json();
  }

  /** System health check */
  async getHealth(): Promise<HealthCheckResult> {
    return this.request<HealthCheckResult>("/health");
  }

  /** Today's active drop and polymorphic questions */
  async getTodayDrop(): Promise<DropResponse> {
    return this.request<DropResponse>("/v1/drop/today");
  }

  /** Fetch a specific drop by IST calendar date */
  async getDropByDate(date: string): Promise<DropResponse> {
    return this.request<DropResponse>(`/v1/drop/${date}`);
  }

  /** Dynamic UI copy strings for a locale */
  async getContent(locale = "en"): Promise<ContentResponse> {
    return this.request<ContentResponse>(`/v1/content/${locale}`);
  }

  /** CMS static markdown page (about, privacy, faq) */
  async getPage(slug: string): Promise<PageResponse> {
    return this.request<PageResponse>(`/v1/pages/${slug}`);
  }

  /** Public runtime configuration and tier definitions */
  async getPublicConfig(): Promise<PublicConfigResponse> {
    return this.request<PublicConfigResponse>("/v1/config/public");
  }

  /** Register or verify a guest device */
  async registerGuest(data: {
    did: string;
    region?: string;
    age_band?: string;
  }): Promise<GuestRegistrationResponse> {
    return this.request<GuestRegistrationResponse>("/v1/identity/guest", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /** Fetch current player session and streak */
  async getMe(): Promise<PlayerMeResponse> {
    return this.request<PlayerMeResponse>("/v1/me");
  }

  /** Submit player's 5 answers */
  async submitAnswers(data: {
    drop_id: string;
    player_id: string;
    request_id: string;
    timing_ms?: number;
    answers: AnswerPayload[];
  }): Promise<SubmitResponse> {
    return this.request<SubmitResponse>("/v1/submissions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /** View personal drop results */
  async getResults(dropId: string, playerId?: string): Promise<ResultResponse> {
    const query = playerId ? `?player_id=${encodeURIComponent(playerId)}` : "";
    return this.request<ResultResponse>(`/v1/results/${dropId}${query}`);
  }

  /** Global community statistics for a drop */
  async getWorldStats(dropId: string): Promise<WorldStatsResponse> {
    return this.request<WorldStatsResponse>(`/v1/world/${dropId}`);
  }

  /** Share card for a drop */
  async getCard(
    dropId: string,
    format: "story" | "square" | "link" = "story",
    theme: "dark" | "light" | "mythic" = "dark"
  ): Promise<CardResponse> {
    return this.request<CardResponse>(
      `/v1/results/${dropId}/card?format=${format}&theme=${theme}`
    );
  }

  /** Generate or retrieve viral short link */
  async createShare(dropId: string): Promise<CreateShareResponse> {
    return this.request<CreateShareResponse>("/v1/shares", {
      method: "POST",
      body: JSON.stringify({ dropId }),
    });
  }

  /** Resolve public challenge link and receiver payload */
  async getShare(shortId: string): Promise<PublicShareResponse> {
    return this.request<PublicShareResponse>(`/v1/shares/${shortId}`);
  }

  /** Google OAuth sign-in and guest history merge */
  async loginOAuth(
    idToken: string,
    turnstileToken?: string
  ): Promise<OAuthResponse> {
    return this.request<OAuthResponse>("/v1/auth/oauth", {
      method: "POST",
      body: JSON.stringify({
        provider: "google",
        id_token: idToken,
        turnstile_token: turnstileToken,
      }),
    });
  }

  /** Explicit guest history merge into account */
  async mergeGuest(data: {
    guest_player_id?: string;
    guest_did?: string;
  }): Promise<MergeGuestResponse> {
    return this.request<MergeGuestResponse>("/v1/auth/merge-guest", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /** Sign out and clear session cookies */
  async logout(): Promise<LogoutResponse> {
    return this.request<LogoutResponse>("/v1/auth/logout", {
      method: "POST",
    });
  }

  /** Current session status */
  async getSession(): Promise<SessionResponse> {
    return this.request<SessionResponse>("/v1/auth/session");
  }

  /** Player historical gameplay and past sealed drops */
  async getHistory(params?: { limit?: number; offset?: number }): Promise<HistoryResponse> {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return this.request<HistoryResponse>(`/v1/history${qs}`);
  }
}

export function createOddlyClient(config: OddlyClientConfig): OddlyApiClient {
  return new OddlyApiClient(config);
}

