import { createOddlyClient, OddlyApiClient } from "@oddly/api-client";
import type { AnswerPayload } from "@oddly/shared";

const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    // In browser: use relative URL so Next.js rewrites /v1/* to Fastify backend
    return "";
  }
  return process.env.API_URL || "http://localhost:4000";
};

export const rawClient: OddlyApiClient = createOddlyClient({
  baseUrl: getBaseUrl(),
});

// Convenient domain-namespaced wrappers matching play flow patterns
export const api = {
  drops: {
    getToday: () => rawClient.getTodayDrop(),
    getByDate: (date: string) => rawClient.getDropByDate(date),
  },
  identity: {
    createGuest: async () => {
      let did = "did_guest";
      if (typeof window !== "undefined") {
        try {
          did = localStorage.getItem("oddly_did") || "";
          if (!did) {
            did = "did_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem("oddly_did", did);
          }
        } catch {
          // ignore
        }
      }
      return rawClient.registerGuest({ did });
    },
    getMe: () => rawClient.getMe(),
  },
  submissions: {
    create: (data: {
      drop_id: string;
      answers: AnswerPayload[];
      duration_ms: number;
      request_id: string;
      player_id?: string;
    }) =>
      rawClient.submitAnswers({
        drop_id: data.drop_id,
        player_id: data.player_id || "guest",
        request_id: data.request_id,
        timing_ms: data.duration_ms,
        answers: data.answers,
      }),
  },
  results: {
    get: (dropId: string) => rawClient.getResults(dropId),
  },
  content: {
    get: (locale = "en") => rawClient.getContent(locale),
  },
  pages: {
    get: (slug: string) => rawClient.getPage(slug),
  },
  cards: {
    get: (
      dropId: string,
      format?: "story" | "square" | "link",
      theme?: "dark" | "light" | "mythic"
    ) => rawClient.getCard(dropId, format, theme),
  },
  shares: {
    create: (dropId: string) => rawClient.createShare(dropId),
    get: (shortId: string) => rawClient.getShare(shortId),
  },
  auth: {
    login: (idToken: string, turnstileToken?: string) =>
      rawClient.loginOAuth(idToken, turnstileToken),
    merge: (data: { guest_player_id?: string; guest_did?: string }) =>
      rawClient.mergeGuest(data),
    logout: () => rawClient.logout(),
    getSession: () => rawClient.getSession(),
  },
};

export const oddlyApi = rawClient;
