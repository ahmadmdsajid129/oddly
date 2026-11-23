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
  LaneSummary,
  LaneDetail,
  PlayerLanePrefResponse,
} from "@oddly/shared";

export type { ResultResponse, LaneSummary, LaneDetail, PlayerLanePrefResponse };

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
  degradation_level?: "L0" | "L1" | "L2" | "L3" | "L4";
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
  mode?: "sync" | "async";
  request_id?: string;
  message?: string;
  submission_id?: string;
  oddness?: {
    raw_score: number;
    percentile: number;
    tier: string;
  } | null;
  match?: {
    twin_token: string;
    similarity_score: number;
    is_provisional: boolean;
  } | null;
}

export interface SubmissionStatusResponse {
  ok: boolean;
  status: "pending" | "persisted";
  request_id: string;
  submission_id?: string | null;
  oddness?: {
    raw_score: number;
    percentile: number;
    tier: string;
  } | null;
  match?: {
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

export interface PreferencesResponse {
  ok: boolean;
  preferences: {
    notifications_enabled: boolean;
    quiet_hours_enabled: boolean;
    quiet_hours_start: string;
    quiet_hours_end: string;
    theme: string;
  };
}

export interface ExportDataResponse {
  ok: boolean;
  export_date: string;
  account: {
    id: string;
    displayName: string;
    emailHash: string;
    createdAt: string;
  } | null;
  submissions_count: number;
  submissions: Record<string, unknown>[];
  streaks: {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
  };
}

export interface ReportResponse {
  ok: boolean;
  report_id: string;
  message: string;
}

export interface KeepResponse {
  ok: boolean;
  keep_id?: string;
  status?: string;
  message?: string;
  error?: string;
}

export interface IncomingKeepItem {
  id: string;
  drop_date: string;
  similarity_snapshot: number;
  region: string;
  age_band: string;
  created_at: string;
}

export interface ServerTimeResponse {
  server_time_utc: string;
  server_time_ms: number;
  ist_date: string;
  seconds_until_next_drop: number;
}

export interface IncomingKeepsResponse {
  ok: boolean;
  incoming: IncomingKeepItem[];
}

export interface RespondKeepResponse {
  ok: boolean;
  decision: "accept" | "decline";
  orbit_id?: string;
  message: string;
}

export interface OrbitListItem {
  orbit_id: string;
  status: "active" | "ended";
  started_on: string;
  co_streak_current: number;
  co_streak_best: number;
  last_co_date: string | null;
  partner: {
    region: string;
    age_band: string;
  };
}

export interface OrbitsListResponse {
  ok: boolean;
  orbits: OrbitListItem[];
}

export interface OrbitExpressionItem {
  id: string;
  is_from_me: boolean;
  expression_key: string;
  created_at: string;
}

export interface OrbitDetail {
  id: string;
  status: "active" | "ended";
  started_on: string;
  co_streak_current: number;
  co_streak_best: number;
  partner: {
    region: string;
    age_band: string;
  };
  today_expressions: OrbitExpressionItem[];
  can_express_today: boolean;
}

export interface TelepathyQuestion {
  id: string;
  position: number;
  type: "text" | "image";
  prompt: string;
  answer_options: Array<{
    id: string;
    label: string;
    value: string;
    display_order: number;
    illustration_key?: string | null;
  }>;
}

export interface TelepathyReveal {
  partner_pick: string;
  is_match: boolean;
  baseline_p: number;
}

export interface TelepathySyncSummary {
  total_rounds: number;
  matches: number;
  sync_score: number;
  baseline_score: number;
  lift: number;
  unlocked: boolean;
  min_rounds: number;
}

export interface TelepathyRoundResponse {
  drop_date: string;
  question: TelepathyQuestion | null;
  has_both_submitted: boolean;
  caller_submitted: boolean;
  partner_submitted: boolean;
  my_guess: {
    guessed_option: string;
    locked_at: string;
  } | null;
  partner_guess_locked: boolean;
  reveal: TelepathyReveal | null;
  sync_summary: TelepathySyncSummary | null;
}

export interface OrbitDetailResponse {
  ok: boolean;
  orbit: OrbitDetail;
}

export interface SendExpressionResponse {
  ok: boolean;
  expression_key: string;
  created_at: string;
  message: string;
}

export interface EndOrbitResponse {
  ok: boolean;
  status: "ended";
  message: string;
}

export interface OrbitSubjectSyncItem {
  tag_id: string;
  tag_key: string;
  label_i18n: Record<string, string>;
  category: string;
  status: "unlocked" | "locked";
  shared_questions: number;
  agreement_count: number | null;
  agreement_percentage: number | null;
  lock_reason: string | null;
}

export interface OrbitSubjectSyncResponse {
  ok: boolean;
  orbit_id: string;
  min_shared_threshold: number;
  sync_items: OrbitSubjectSyncItem[];
}

export interface BadgeDefinitionDto {
  id: string;
  key: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  icon_key: string;
  status: string;
}

export interface CreatorBadgeDto {
  id: string;
  badge: BadgeDefinitionDto;
  meme_id: string | null;
  awarded_at: string;
}

export interface MyBadgesResponse {
  ok: boolean;
  badges: CreatorBadgeDto[];
}

export interface FeaturedMemeItem {
  id: string;
  week_start_date: string;
  caption_text: string;
  curator_notes: string | null;
  template: {
    illustration_registry_key: string;
    alt_text_i18n: Record<string, string>;
  };
  author_region: string;
  raters_count: number;
  funny_percentage: number;
  published_at: string;
}

export interface FeaturedMemesResponse {
  ok: boolean;
  current_week: FeaturedMemeItem | null;
  archive: FeaturedMemeItem[];
}

export interface GlobeArc {
  id: string;
  from_region: string;
  from_coords: [number, number];
  to_region: string;
  to_coords: [number, number];
  count: number;
}

export interface UserOrbitLine {
  orbit_id: string;
  partner_region: string;
  partner_coords: [number, number];
  user_coords: [number, number];
}

export interface GlobeResponse {
  ok: boolean;
  mode: "live" | "replay";
  status_text: string;
  arcs: GlobeArc[];
  user_orbits: UserOrbitLine[];
  live_count: number;
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

  async requestWithMeta<T>(
    path: string,
    options: RequestInit & { etag?: string } = {}
  ): Promise<{ data: T | null; status: number; etag: string | null; notModified: boolean }> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...((options.headers as Record<string, string>) || {}),
    };
    if (options.etag) {
      headers["If-None-Match"] = options.etag;
    }

    const res = await this.fetchFn(url, {
      ...options,
      headers,
      credentials: "include",
    });

    const responseEtag = res.headers.get("etag") || res.headers.get("ETag");

    if (res.status === 304) {
      return { data: null, status: 304, etag: responseEtag, notModified: true };
    }

    if (!res.ok) {
      let errorMessage = res.statusText;
      try {
        const errorBody = (await res.json()) as { message?: string };
        if (errorBody?.message) {
          errorMessage = errorBody.message;
        }
      } catch {}
      throw new Error(errorMessage || `Request to ${path} failed with HTTP ${res.status}`);
    }

    const data = (await res.json()) as T;
    return { data, status: res.status, etag: responseEtag, notModified: false };
  }

  /** System health check */
  async getHealth(): Promise<HealthCheckResult> {
    return this.request<HealthCheckResult>("/health");
  }

  /** Today's active drop and polymorphic questions (supports optional lane) */
  async getTodayDrop(laneSlug?: string): Promise<DropResponse> {
    const url = laneSlug && laneSlug !== "everyday"
      ? `/v1/drop/today?lane=${encodeURIComponent(laneSlug)}`
      : "/v1/drop/today";
    return this.request<DropResponse>(url);
  }

  /** Stage L1: Subject Lanes Methods (P10L.04, P10L.05, P10L.08) */
  async getLanes(): Promise<{ lanes: LaneSummary[] }> {
    return this.request<{ lanes: LaneSummary[] }>("/v1/lanes");
  }

  async getLane(idOrSlug: string): Promise<{ lane: LaneDetail; is_resting: boolean; current_drop: DropResponse | null; message?: string }> {
    return this.request<{ lane: LaneDetail; is_resting: boolean; current_drop: DropResponse | null; message?: string }>(`/v1/lanes/${encodeURIComponent(idOrSlug)}`);
  }

  async expressLaneInterest(laneId: string, consent = true): Promise<{ ok: boolean; message: string; lane_id: string }> {
    return this.request<{ ok: boolean; message: string; lane_id: string }>(`/v1/lanes/${encodeURIComponent(laneId)}/interest`, {
      method: "POST",
      body: JSON.stringify({ consent }),
    });
  }

  async getLanePrefs(): Promise<{ prefs: PlayerLanePrefResponse[] }> {
    return this.request<{ prefs: PlayerLanePrefResponse[] }>("/v1/me/lane-prefs");
  }

  async updateLanePrefs(prefs: { lane_id: string; notify: boolean }[]): Promise<{ ok: boolean; count: number }> {
    return this.request<{ ok: boolean; count: number }>("/v1/me/lane-prefs", {
      method: "PUT",
      body: JSON.stringify({ prefs }),
    });
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

  /** Precise server time synchronization for client countdowns (P4.14) */
  async getServerTime(): Promise<ServerTimeResponse> {
    return this.request<ServerTimeResponse>("/v1/time");
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

  /** Check asynchronous Mode B submission status */
  async getSubmissionStatus(requestId: string): Promise<SubmissionStatusResponse> {
    return this.request<SubmissionStatusResponse>(`/v1/submissions/status/${encodeURIComponent(requestId)}`);
  }

  /** View personal drop results */
  async getResults(dropId: string, playerId?: string): Promise<ResultResponse> {
    const query = playerId ? `?player_id=${encodeURIComponent(playerId)}` : "";
    return this.request<ResultResponse>(`/v1/results/${dropId}${query}`);
  }

  /** View personal drop results with ETag 304 conditional polling (Task P5.10) */
  async getResultsWithEtag(
    dropId: string,
    etag?: string,
    playerId?: string
  ): Promise<{ data: ResultResponse | null; notModified: boolean; etag: string | null }> {
    const query = playerId ? `?player_id=${encodeURIComponent(playerId)}` : "";
    const res = await this.requestWithMeta<ResultResponse>(`/v1/results/${dropId}${query}`, { etag });
    return { data: res.data, notModified: res.notModified, etag: res.etag };
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

  /** Refresh session access token and rotate refresh token (P7.06, P7.10) */
  async refreshToken(): Promise<{
    ok: boolean;
    message: string;
    account: { id: string; displayName: string; emailHash: string };
  }> {
    return this.request("/v1/auth/refresh", {
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

  /** Retrieve user preferences */
  async getPreferences(): Promise<PreferencesResponse> {
    return this.request<PreferencesResponse>("/v1/me/preferences");
  }

  /** Update user preferences */
  async updatePreferences(prefs: Partial<PreferencesResponse["preferences"]>): Promise<{ ok: boolean; message: string }> {
    return this.request<{ ok: boolean; message: string }>("/v1/me/preferences", {
      method: "PUT",
      body: JSON.stringify(prefs),
    });
  }

  /** Export all user data as JSON per DPDP portability (P8.05) */
  async exportData(): Promise<ExportDataResponse> {
    return this.request<ExportDataResponse>("/v1/me/export", {
      method: "POST",
    });
  }

  /** Erase account and data per DPDP Right to Erasure (P8.06) */
  async deleteAccount(): Promise<{ ok: boolean; message: string }> {
    return this.request<{ ok: boolean; message: string }>("/v1/me", {
      method: "DELETE",
    });
  }

  /** Submit a moderation report (P8.07) */
  async submitReport(data: {
    target_type: "drop" | "question" | "twin" | "other";
    target_id: string;
    reason: "inappropriate" | "offensive" | "bot_abuse" | "technical_glitch" | "other";
    note?: string;
  }): Promise<ReportResponse> {
    return this.request<ReportResponse>("/v1/reports", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /** Send a Keep request to today's locked twin (P10A.04) */
  async createKeep(dropId: string): Promise<KeepResponse> {
    return this.request<KeepResponse>("/v1/keeps", {
      method: "POST",
      body: JSON.stringify({ drop_id: dropId }),
    });
  }

  /** List incoming pending Keep connection requests (P10A.04) */
  async getIncomingKeeps(): Promise<IncomingKeepsResponse> {
    return this.request<IncomingKeepsResponse>("/v1/keeps/incoming");
  }

  /** Respond to an incoming Keep request (P10A.04) */
  async respondKeep(
    id: string,
    decision: "accept" | "decline",
    dropDate?: string
  ): Promise<RespondKeepResponse> {
    return this.request<RespondKeepResponse>(`/v1/keeps/${id}/respond`, {
      method: "POST",
      body: JSON.stringify({ decision, drop_date: dropDate }),
    });
  }

  /** List active Orbits for the current authenticated player (P10A.05) */
  async getOrbits(): Promise<OrbitsListResponse> {
    return this.request<OrbitsListResponse>("/v1/orbits");
  }

  /** Get single Orbit detail and expressions (P10A.05) */
  async getOrbit(id: string): Promise<OrbitDetailResponse> {
    return this.request<OrbitDetailResponse>(`/v1/orbits/${id}`);
  }

  /** Get aggregate subject sync rates for an Orbit (P10I.01, Rule 19) */
  async getOrbitSubjectSync(id: string): Promise<OrbitSubjectSyncResponse> {
    return this.request<OrbitSubjectSyncResponse>(`/v1/orbits/${id}/subject-sync`);
  }

  /** Get player earned creator recognition badges (P10I.04) */
  async getMyBadges(): Promise<MyBadgesResponse> {
    return this.request<MyBadgesResponse>("/v1/badges/mine");
  }

  /** Get curated Meme of the Week and archive (P10I.06) */
  async getFeaturedMemes(): Promise<FeaturedMemesResponse> {
    return this.request<FeaturedMemesResponse>("/v1/memes/featured");
  }

  /** Send daily tactile expression (The Wave) in Orbit (P10A.05, P10B.04) */
  async sendOrbitExpression(
    id: string,
    expressionKey: string
  ): Promise<SendExpressionResponse> {
    return this.request<SendExpressionResponse>(`/v1/orbits/${id}/express`, {
      method: "POST",
      body: JSON.stringify({ expression_key: expressionKey }),
    });
  }

  /** End an Orbit instantly (P10A.08) */
  async endOrbit(id: string): Promise<EndOrbitResponse> {
    return this.request<EndOrbitResponse>(`/v1/orbits/${id}/end`, {
      method: "POST",
    });
  }

  /** Retrieve aggregated macro-region arcs and Orbit lines for Twin Globe (P10B.06) */
  async getGlobe(): Promise<GlobeResponse> {
    return this.request<GlobeResponse>("/v1/globe");
  }

  /** Get current Telepathy round state for an Orbit (P10C.04) */
  async getTelepathy(
    orbitId: string,
    dropDate?: string
  ): Promise<{ ok: boolean; round: TelepathyRoundResponse }> {
    const qs = dropDate ? `?drop_date=${encodeURIComponent(dropDate)}` : "";
    return this.request<{ ok: boolean; round: TelepathyRoundResponse }>(
      `/v1/orbits/${orbitId}/telepathy${qs}`
    );
  }

  /** Lock in Telepathy guess for today's drop (P10C.04, P10C.05) */
  async submitTelepathyGuess(
    orbitId: string,
    guessedOption: string,
    dropDate?: string
  ): Promise<{ ok: boolean; round: TelepathyRoundResponse }> {
    const qs = dropDate ? `?drop_date=${encodeURIComponent(dropDate)}` : "";
    return this.request<{ ok: boolean; round: TelepathyRoundResponse }>(
      `/v1/orbits/${orbitId}/telepathy/guess${qs}`,
      {
        method: "POST",
        body: JSON.stringify({ guessed_option: guessedOption }),
      }
    );
  }

  /** Retrieve Anti-Twin opposite match for a drop (P10D.03, ADR-040) */
  async getAntiTwin(
    dropId: string,
    sampleSize?: number,
    minPool?: number
  ): Promise<AntiTwinResponse> {
    const params = new URLSearchParams();
    if (sampleSize) params.set("sample_size", sampleSize.toString());
    if (minPool) params.set("min_pool", minPool.toString());
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request<AntiTwinResponse>(`/v1/results/${dropId}/anti-twin${qs}`);
  }

  /** Ingest telemetry events batch (P10F.03) */
  async ingestEvents(
    events: Array<{
      event_name: string;
      drop_date: string;
      props?: Record<string, unknown>;
      timestamp_ms?: number;
    }>,
    sessionId?: string
  ): Promise<{ ok: boolean; accepted: number; dropped?: boolean; consented?: boolean }> {
    return this.request<{ ok: boolean; accepted: number; dropped?: boolean; consented?: boolean }>(
      "/v1/events",
      {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          events,
        }),
      }
    );
  }

  /** Get player DPDP consent states (P10F.04) */
  async getConsents(): Promise<{
    ok: boolean;
    analytics: boolean;
    personalisation: boolean;
    policy_version: number;
    analytics_id?: string | null;
  }> {
    return this.request<{
      ok: boolean;
      analytics: boolean;
      personalisation: boolean;
      policy_version: number;
      analytics_id?: string | null;
    }>("/v1/consents");
  }

  /** Update player DPDP consent purpose (P10F.04) */
  async updateConsent(
    purpose: "analytics" | "personalisation",
    granted: boolean,
    policyVersion: number = 1
  ): Promise<{ ok: boolean; purpose: string; granted: boolean }> {
    return this.request<{ ok: boolean; purpose: string; granted: boolean }>("/v1/consents", {
      method: "PUT",
      body: JSON.stringify({
        purpose,
        granted,
        policy_version: policyVersion,
      }),
    });
  }

  /** Get active meme templates for caption composer (P10G.02, P10G.03) */
  async getMemeTemplates(): Promise<{
    ok: boolean;
    templates: Array<{
      id: string;
      key: string;
      illustration_registry_key: string;
      aspect: string;
      alt_text_i18n: Record<string, unknown>;
      license_note: string;
    }>;
  }> {
    return this.request<{
      ok: boolean;
      templates: Array<{
        id: string;
        key: string;
        illustration_registry_key: string;
        aspect: string;
        alt_text_i18n: Record<string, unknown>;
        license_note: string;
      }>;
    }>("/v1/memes/templates");
  }

  /** Get tailored post-drop Meme Corner card via exposure engine (P10G.04, P10G.06) */
  async getMemeCorner(): Promise<{
    ok: boolean;
    meme: {
      id: string;
      template_id: string;
      template_key: string;
      illustration_registry_key: string;
      caption_text: string;
      aspect: string;
      alt_text?: string;
      wilson_lb: number;
      is_exploration: boolean;
    } | null;
  }> {
    return this.request<{
      ok: boolean;
      meme: {
        id: string;
        template_id: string;
        template_key: string;
        illustration_registry_key: string;
        caption_text: string;
        aspect: string;
        alt_text?: string;
        wilson_lb: number;
        is_exploration: boolean;
      } | null;
    }>("/v1/memes/corner");
  }

  /** Submit community meme caption (P10G.02, P10G.03) */
  async submitMemeCaption(data: {
    template_id: string;
    caption_text: string;
    turnstile_token: string;
    attest_originality: boolean;
  }): Promise<{
    ok: boolean;
    submission: {
      id: string;
      author_player_id: string;
      template_id: string;
      caption_text: string;
      status: string;
      created_at: string;
    };
  }> {
    return this.request<{
      ok: boolean;
      submission: {
        id: string;
        author_player_id: string;
        template_id: string;
        caption_text: string;
        status: string;
        created_at: string;
      };
    }>("/v1/memes/submissions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /** List author's own meme submissions (P10G.02, P10G.03) */
  async getMyMemeSubmissions(): Promise<{
    ok: boolean;
    submissions: Array<{
      id: string;
      template_id: string;
      caption_text: string;
      status: string;
      moderation_reason: string | null;
      created_at: string;
    }>;
  }> {
    return this.request<{
      ok: boolean;
      submissions: Array<{
        id: string;
        template_id: string;
        caption_text: string;
        status: string;
        moderation_reason: string | null;
        created_at: string;
      }>;
    }>("/v1/memes/submissions/mine");
  }

  /** Submit rating for a post-drop meme (P10G.04, P10G.05) */
  async rateMeme(
    submissionId: string,
    rating: "funny" | "not_for_me"
  ): Promise<{
    ok: boolean;
    submission_id: string;
    rating: "funny" | "not_for_me";
    raters: number;
    wilson_lb: number;
  }> {
    return this.request<{
      ok: boolean;
      submission_id: string;
      rating: "funny" | "not_for_me";
      raters: number;
      wilson_lb: number;
    }>(`/v1/memes/${encodeURIComponent(submissionId)}/rating`, {
      method: "POST",
      body: JSON.stringify({ rating }),
    });
  }

  /** Get Drop candidates list for Mission Control (P10G.07) */
  async getDropCandidates(): Promise<{
    ok: boolean;
    count: number;
    candidates: Array<{
      id: string;
      caption_text: string;
      template_key: string;
      illustration_registry_key: string;
      raters: number;
      funny_count: number;
      funny_percentage: number;
      wilson_lb: number;
      status: string;
      promoted_by: string | null;
      promoted_at: string | null;
      approved_by: string | null;
      approved_at: string | null;
      is_dual_approved: boolean;
    }>;
  }> {
    return this.request("/v1/admin/memes/candidates");
  }

  /** Step 1: Promote meme candidate to Drop pool (P10G.07) */
  async promoteDropCandidate(
    submissionId: string,
    reason: string,
    targetDropDate?: string
  ): Promise<{
    ok: boolean;
    submission_id: string;
    status: string;
    promoted_by: string;
    action_id: string;
    message: string;
  }> {
    return this.request(`/v1/admin/memes/${encodeURIComponent(submissionId)}/promote`, {
      method: "POST",
      body: JSON.stringify({ reason, target_drop_date: targetDropDate }),
    });
  }

  /** Step 2: Second admin dual-approval for Drop candidate (P10G.07) */
  async approveDropCandidate(
    submissionId: string,
    note: string
  ): Promise<{
    ok: boolean;
    submission_id: string;
    status: string;
    promoted_by: string;
    approved_by: string;
    action_id: string;
    message: string;
  }> {
    return this.request(`/v1/admin/memes/${encodeURIComponent(submissionId)}/approve-candidate`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  }

  /** Reject candidate promotion from Drop pool (P10G.07) */
  async rejectDropCandidate(
    submissionId: string,
    reason: string
  ): Promise<{
    ok: boolean;
    submission_id: string;
    status: string;
    rejected_by: string;
    message: string;
  }> {
    return this.request(`/v1/admin/memes/${encodeURIComponent(submissionId)}/reject-candidate`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  /** Creator self-service delete flow (P10G.08) */
  async deleteMemeSubmission(submissionId: string): Promise<{
    ok: boolean;
    id: string;
    status: string;
    message: string;
  }> {
    return this.request(`/v1/memes/${encodeURIComponent(submissionId)}`, {
      method: "DELETE",
    });
  }

  /** Immediate moderator takedown action (P10G.08) */
  async takedownMeme(
    submissionId: string,
    reason: string,
    note?: string
  ): Promise<{
    ok: boolean;
    id: string;
    status: string;
    action: string;
    action_id: string;
    message: string;
  }> {
    return this.request(`/v1/admin/memes/${encodeURIComponent(submissionId)}/takedown`, {
      method: "POST",
      body: JSON.stringify({ reason, note }),
    });
  }

  /** General moderation action: approve, reject, retire, takedown (P10G.08) */
  async moderateMeme(
    submissionId: string,
    action: "approve" | "reject" | "retire" | "takedown",
    reason: string,
    note?: string
  ): Promise<{
    ok: boolean;
    id: string;
    status: string;
    action: string;
    action_id: string;
    message: string;
  }> {
    return this.request(`/v1/admin/memes/${encodeURIComponent(submissionId)}/moderate`, {
      method: "POST",
      body: JSON.stringify({ action, reason, note }),
    });
  }
}

export interface AntiTwinResponse {
  ok: boolean;
  drop_id: string;
  drop_date?: string;
  pool_insufficient?: boolean;
  pool_count?: number;
  min_pool_size?: number;
  notice?: string;
  differed_count?: number;
  sample_size?: number;
  opposite?: {
    region: string;
    age_band: string;
  };
  own_differed_questions?: Array<{
    question_id: string;
    position: number;
    prompt: string;
    your_answer: string;
  }>;
  note?: string;
  degraded?: boolean;
}

export function createOddlyClient(config: OddlyClientConfig): OddlyApiClient {
  return new OddlyApiClient(config);
}

