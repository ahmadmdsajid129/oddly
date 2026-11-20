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
    create: async (
      data: {
        drop_id: string;
        answers: AnswerPayload[];
        duration_ms?: number;
        request_id: string;
        player_id?: string;
      },
      maxRetries = 2
    ): Promise<Awaited<ReturnType<typeof rawClient.submitAnswers>>> => {
      let attempt = 0;
      while (true) {
        try {
          return await rawClient.submitAnswers({
            drop_id: data.drop_id,
            player_id: data.player_id || "guest",
            request_id: data.request_id,
            timing_ms: data.duration_ms ?? 30000,
            answers: data.answers,
          });
        } catch (err: unknown) {
          const error = err as { status?: number; statusCode?: number; error?: string };
          const status = error?.status || error?.statusCode;
          // Handle 409 CONCURRENT_REQUEST by waiting briefly with jitter and replaying with same request_id (R1-PATCH Item 4)
          if ((status === 409 || error?.error === "CONCURRENT_REQUEST") && attempt < maxRetries) {
            attempt++;
            const jitterMs = 500 + Math.floor(Math.random() * 500);
            await new Promise((resolve) => setTimeout(resolve, jitterMs));
            continue;
          }
          throw err;
        }
      }
    },
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
  history: {
    get: (params?: { limit?: number; offset?: number }) =>
      rawClient.getHistory(params),
  },
  me: {
    getPreferences: () => rawClient.getPreferences(),
    updatePreferences: (prefs: Parameters<typeof rawClient.updatePreferences>[0]) =>
      rawClient.updatePreferences(prefs),
    exportData: () => rawClient.exportData(),
    deleteAccount: () => rawClient.deleteAccount(),
  },
  reports: {
    submit: (data: Parameters<typeof rawClient.submitReport>[0]) =>
      rawClient.submitReport(data),
  },
  keeps: {
    create: (dropId: string) => rawClient.createKeep(dropId),
    getIncoming: () => rawClient.getIncomingKeeps(),
    respond: (id: string, decision: "accept" | "decline", dropDate?: string) =>
      rawClient.respondKeep(id, decision, dropDate),
  },
  orbits: {
    list: () => rawClient.getOrbits(),
    get: (id: string) => rawClient.getOrbit(id),
    express: (id: string, expressionKey: string) =>
      rawClient.sendOrbitExpression(id, expressionKey),
    end: (id: string) => rawClient.endOrbit(id),
  },
  globe: {
    get: () => rawClient.getGlobe(),
  },
  telepathy: {
    get: (orbitId: string, dropDate?: string) => rawClient.getTelepathy(orbitId, dropDate),
    guess: (orbitId: string, guessedOption: string, dropDate?: string) =>
      rawClient.submitTelepathyGuess(orbitId, guessedOption, dropDate),
  },
  antitwin: {
    get: (dropId: string, sampleSize?: number, minPool?: number) =>
      rawClient.getAntiTwin(dropId, sampleSize, minPool),
  },
  events: {
    ingest: (
      events: Parameters<typeof rawClient.ingestEvents>[0],
      sessionId?: string
    ) => rawClient.ingestEvents(events, sessionId),
  },
  consents: {
    get: () => rawClient.getConsents(),
    update: (
      purpose: "analytics" | "personalisation",
      granted: boolean,
      policyVersion?: number
    ) => rawClient.updateConsent(purpose, granted, policyVersion),
  },
  memes: {
    getTemplates: () => rawClient.getMemeTemplates(),
    getCorner: () => rawClient.getMemeCorner(),
    submit: (data: Parameters<typeof rawClient.submitMemeCaption>[0]) =>
      rawClient.submitMemeCaption(data),
    getMySubmissions: () => rawClient.getMyMemeSubmissions(),
    rate: (submissionId: string, rating: "funny" | "not_for_me") =>
      rawClient.rateMeme(submissionId, rating),
    delete: (submissionId: string) => rawClient.deleteMemeSubmission(submissionId),
  },
  admin: {
    memes: {
      getCandidates: () => rawClient.getDropCandidates(),
      promoteCandidate: (submissionId: string, reason: string, targetDropDate?: string) =>
        rawClient.promoteDropCandidate(submissionId, reason, targetDropDate),
      approveCandidate: (submissionId: string, note: string) =>
        rawClient.approveDropCandidate(submissionId, note),
      rejectCandidate: (submissionId: string, reason: string) =>
        rawClient.rejectDropCandidate(submissionId, reason),
      takedown: (submissionId: string, reason: string, note?: string) =>
        rawClient.takedownMeme(submissionId, reason, note),
      moderate: (
        submissionId: string,
        action: "approve" | "reject" | "retire" | "takedown",
        reason: string,
        note?: string
      ) => rawClient.moderateMeme(submissionId, action, reason, note),
    },
  },
};

export const oddlyApi = rawClient;
