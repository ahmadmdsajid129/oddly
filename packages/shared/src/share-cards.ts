import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { colors, tiers } from "@oddly/ui-tokens";
import { generateQrCodeDataUrl } from "./qrcode.js";
import type { ShareFormat, Tier } from "./types.js";

export type ShareTheme = "dark" | "light" | "mythic";

export interface ShareCardData {
  score: number; // e.g. 4
  total?: number; // default 5
  tier: Tier; // "Common" | "Uncommon" | "Rare" | "Mythic"
  percentile: number; // e.g. 84
  twinCity?: string; // e.g. "Berlin, Germany"
  rarestPickTitle?: string; // e.g. "Violet for Monday Morning"
  streak?: number; // e.g. 7
  dateStr?: string; // e.g. "Nov 8, 2026"
  shortId: string; // e.g. "xK9mP2"
  appDomain?: string; // e.g. "oddly.app"
  format?: ShareFormat; // default "story"
  theme?: ShareTheme; // default "light" / cream desk
  side?: "front" | "back" | "composite";
  pickMatches?: Array<{
    question_number: number;
    label: string;
    matched: boolean;
  }>;
}

export interface CardDimensions {
  width: number;
  height: number;
}

export const CARD_DIMENSIONS: Record<string, CardDimensions> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  link: { width: 1200, height: 630 },
  front: { width: 1080, height: 1490 },
  back: { width: 1080, height: 1490 },
};

// Cached font buffer
let cachedFontBuffer: Buffer | null = null;

function getFontBuffer(): Buffer {
  if (cachedFontBuffer) {
    return cachedFontBuffer;
  }

  const possiblePaths = [
    path.resolve(__dirname, "../assets/fonts/noto-sans-regular.ttf"),
    path.resolve(process.cwd(), "packages/shared/assets/fonts/noto-sans-regular.ttf"),
    path.resolve(process.cwd(), "assets/fonts/noto-sans-regular.ttf"),
    path.resolve(__dirname, "../../assets/fonts/noto-sans-regular.ttf"),
  ];

  for (const fontPath of possiblePaths) {
    if (fs.existsSync(fontPath)) {
      cachedFontBuffer = fs.readFileSync(fontPath);
      return cachedFontBuffer;
    }
  }

  throw new Error("Embedded font not found for share card generation");
}

export interface ThemePalette {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  mint: string;
  violet: string;
  coral: string;
  sun: string;
  lavender: string;
  lilac: string;
  pillBg: string;
  pillText: string;
}

export function getThemePalette(_theme?: ShareTheme, tier?: Tier): ThemePalette {
  // Sticker Pop design: cream desk, physical paper cards, ink outlines
  const tierKey = (tier?.toLowerCase() || "common") as keyof typeof tiers;
  const tierConfig = tiers[tierKey] || tiers.common;

  return {
    bg: colors.cream,
    surface: colors.paper,
    border: colors.ink,
    text: colors.ink,
    textMuted: colors.muted,
    mint: colors.mint,
    violet: colors.violet,
    coral: colors.coral,
    sun: colors.sun,
    lavender: colors.lavender,
    lilac: colors.lilac,
    pillBg: tier === "Mythic" ? colors.sun : tierConfig.fill.startsWith("#") ? tierConfig.fill : colors.sun,
    pillText: colors.ink,
  };
}

/**
 * Builds the virtual DOM tree for Story layout (1080 x 1920) — Instagram Story Composite
 * Features the Front Card prominent on cream desk with the Back Card peeking beneath.
 */
function buildStoryTree(
  data: ShareCardData,
  palette: ThemePalette,
  qrDataUrl: string
): Record<string, unknown> {
  const total = data.total ?? 5;
  const shortUrl = `${data.appDomain || "oddly.app"}/c/${data.shortId}`;
  const twinLocation = data.twinCity ? `Stranger in ${data.twinCity}` : "A Stranger nearby";
  const rarityLine = `Only ${data.percentile}% of players matched you today`;

  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1920px",
        backgroundColor: palette.bg,
        color: palette.text,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "80px 60px",
        fontFamily: "Noto Sans, sans-serif",
      },
      children: [
        // Top Bar: Wordmark + Brand mark + Streak/Date
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          width: "36px",
                          height: "36px",
                          borderRadius: "18px",
                          backgroundColor: palette.violet,
                          border: `4px solid ${palette.border}`,
                        },
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "48px",
                          fontWeight: 800,
                          letterSpacing: "-0.03em",
                          color: palette.text,
                        },
                        children: "oddly",
                      },
                    },
                  ],
                },
              },
              // Streak badge or drop date
              data.streak && data.streak >= 3
                ? {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        backgroundColor: palette.coral,
                        border: `4px solid ${palette.border}`,
                        boxShadow: `4px 4px 0px ${palette.border}`,
                        padding: "12px 28px",
                        borderRadius: "9999px",
                        fontSize: "26px",
                        fontWeight: 700,
                        color: palette.text,
                      },
                      children: `🔥 ${data.streak}-Day Streak`,
                    },
                  }
                : {
                    type: "div",
                    props: {
                      style: {
                        backgroundColor: palette.lavender,
                        border: `3px solid ${palette.border}`,
                        boxShadow: `3px 3px 0px ${palette.border}`,
                        padding: "10px 24px",
                        borderRadius: "9999px",
                        fontSize: "24px",
                        fontWeight: 700,
                        color: palette.text,
                      },
                      children: data.dateStr || "Daily Drop",
                    },
                  },
            ],
          },
        },

        // Center: Peeking Composite Card Stack
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              position: "relative",
              width: "960px",
              height: "1380px",
              margin: "auto auto",
              alignItems: "center",
              justifyContent: "center",
            },
            children: [
              // Peeking Back Card (Sealed Violet underneath, tilted offset)
              {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    top: "20px",
                    left: "20px",
                    width: "880px",
                    height: "1260px",
                    backgroundColor: palette.violet,
                    border: `8px solid ${palette.border}`,
                    borderRadius: "40px",
                    boxShadow: `16px 16px 0px ${palette.border}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "20px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "36px",
                          fontWeight: 800,
                          color: colors.paper,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        },
                        children: "Your Twin Card",
                      },
                    },
                  ],
                },
              },

              // Main Front Card (Foreground, crisp ink outline & hard shadow)
              {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    top: "60px",
                    left: "60px",
                    width: "880px",
                    height: "1260px",
                    backgroundColor: palette.surface,
                    border: `10px solid ${palette.border}`,
                    borderRadius: "40px",
                    boxShadow: `20px 20px 0px ${palette.border}`,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "64px 54px",
                  },
                  children: [
                    // Top: Tier pill + oddly wordmark
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                backgroundColor: palette.pillBg,
                                border: `4px solid ${palette.border}`,
                                borderRadius: "9999px",
                                padding: "14px 32px",
                                fontSize: "28px",
                                fontWeight: 700,
                                color: palette.pillText,
                              },
                              children: `★ ${data.tier.toUpperCase()} TIER`,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "36px",
                                fontWeight: 800,
                                color: palette.text,
                              },
                              children: "oddly",
                            },
                          },
                        ],
                      },
                    },

                    // Center: Big Score
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          margin: "auto 0",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "144px",
                                fontWeight: 800,
                                color: palette.text,
                                lineHeight: 1,
                                letterSpacing: "-0.04em",
                              },
                              children: `${data.score} of ${total}`,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "30px",
                                fontWeight: 700,
                                color: palette.textMuted,
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                marginTop: "14px",
                              },
                              children: "Shared Answers",
                            },
                          },
                        ],
                      },
                    },

                    // Bottom: Location & Rarity
                    {
                      type: "div",
                      props: {
                        style: {
                          borderTop: `4px solid ${palette.border}`,
                          paddingTop: "32px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "36px",
                                fontWeight: 700,
                                color: palette.text,
                              },
                              children: twinLocation,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              },
                              children: [
                                {
                                  type: "div",
                                  props: {
                                    style: {
                                      fontSize: "26px",
                                      color: palette.textMuted,
                                    },
                                    children: rarityLine,
                                  },
                                },
                                {
                                  type: "div",
                                  props: {
                                    style: {
                                      fontSize: "26px",
                                      fontWeight: 700,
                                      color: palette.violet,
                                    },
                                    children: "oddly.fun",
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },

        // Bottom Footer Bar: QR code + CTA + short URL
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              backgroundColor: palette.surface,
              border: `6px solid ${palette.border}`,
              borderRadius: "32px",
              boxShadow: `10px 10px 0px ${palette.border}`,
              padding: "32px 48px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "34px",
                          fontWeight: 700,
                          color: palette.text,
                          marginBottom: "8px",
                        },
                        children: "Can you beat my match?",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "26px",
                          fontWeight: 700,
                          color: palette.violet,
                        },
                        children: shortUrl,
                      },
                    },
                  ],
                },
              },
              // QR Code image
              {
                type: "img",
                props: {
                  src: qrDataUrl,
                  style: {
                    width: "130px",
                    height: "130px",
                    borderRadius: "16px",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  };
}

/**
 * Builds the virtual DOM tree for Square layout (1080 x 1080)
 */
function buildSquareTree(
  data: ShareCardData,
  palette: ThemePalette,
  qrDataUrl: string
): Record<string, unknown> {
  const total = data.total ?? 5;
  const shortUrl = `${data.appDomain || "oddly.app"}/c/${data.shortId}`;
  const twinLocation = data.twinCity ? `Stranger in ${data.twinCity}` : "A Stranger nearby";

  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1080px",
        backgroundColor: palette.bg,
        color: palette.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "50px",
        fontFamily: "Noto Sans, sans-serif",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              width: "980px",
              height: "980px",
              backgroundColor: palette.surface,
              border: `8px solid ${palette.border}`,
              borderRadius: "40px",
              boxShadow: `16px 16px 0px ${palette.border}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "54px 60px",
            },
            children: [
              // Top bar
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                width: "32px",
                                height: "32px",
                                borderRadius: "16px",
                                backgroundColor: palette.violet,
                                border: `3.5px solid ${palette.border}`,
                              },
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "40px",
                                fontWeight: 800,
                                color: palette.text,
                              },
                              children: "oddly",
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          backgroundColor: palette.pillBg,
                          border: `4px solid ${palette.border}`,
                          padding: "10px 24px",
                          borderRadius: "9999px",
                          fontSize: "24px",
                          fontWeight: 700,
                          color: palette.pillText,
                        },
                        children: `★ ${data.tier.toUpperCase()} · ${data.percentile}%`,
                      },
                    },
                  ],
                },
              },

              // Middle Row: Score + Info
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                  },
                  children: [
                    // Left Column
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          width: "520px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "42px",
                                fontWeight: 700,
                                lineHeight: 1.2,
                                color: palette.text,
                                marginBottom: "16px",
                              },
                              children: `Matched with ${twinLocation}`,
                            },
                          },
                          data.rarestPickTitle
                            ? {
                                type: "div",
                                props: {
                                  style: {
                                    fontSize: "24px",
                                    color: palette.textMuted,
                                    marginBottom: "16px",
                                  },
                                  children: `Rarest pick: "${data.rarestPickTitle}"`,
                                },
                              }
                            : null,
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "26px",
                                fontWeight: 700,
                                color: palette.violet,
                              },
                              children: "Beat my match on oddly.app",
                            },
                          },
                        ].filter(Boolean),
                      },
                    },

                    // Right Column: Big Match Badge
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "250px",
                          height: "250px",
                          borderRadius: "32px",
                          backgroundColor: palette.bg,
                          border: `6px solid ${palette.border}`,
                          boxShadow: `8px 8px 0px ${palette.border}`,
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "88px",
                                fontWeight: 800,
                                color: palette.text,
                                lineHeight: 1,
                              },
                              children: `${data.score}/${total}`,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "20px",
                                fontWeight: 700,
                                color: palette.textMuted,
                                marginTop: "8px",
                                letterSpacing: "0.08em",
                              },
                              children: "MATCH",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },

              // Bottom Bar
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    backgroundColor: palette.bg,
                    borderRadius: "24px",
                    padding: "20px 32px",
                    border: `4px solid ${palette.border}`,
                    boxShadow: `6px 6px 0px ${palette.border}`,
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "26px",
                          fontWeight: 700,
                          color: palette.text,
                        },
                        children: shortUrl,
                      },
                    },
                    {
                      type: "img",
                      props: {
                        src: qrDataUrl,
                        style: {
                          width: "80px",
                          height: "80px",
                          borderRadius: "10px",
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

/**
 * Builds the virtual DOM tree for Link layout (1200 x 630 — OpenGraph)
 */
function buildLinkTree(
  data: ShareCardData,
  palette: ThemePalette,
  qrDataUrl: string
): Record<string, unknown> {
  const total = data.total ?? 5;
  const shortUrl = `${data.appDomain || "oddly.app"}/c/${data.shortId}`;
  const twinLocation = data.twinCity ? `Stranger in ${data.twinCity}` : "A Stranger nearby";

  return {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        backgroundColor: palette.bg,
        color: palette.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "50px 60px",
        fontFamily: "Noto Sans, sans-serif",
      },
      children: [
        // Left Column: Front Card Sticker
        {
          type: "div",
          props: {
            style: {
              width: "420px",
              height: "530px",
              backgroundColor: palette.surface,
              border: `6px solid ${palette.border}`,
              borderRadius: "28px",
              boxShadow: `12px 12px 0px ${palette.border}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "36px 32px",
            },
            children: [
              // Top
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          backgroundColor: palette.pillBg,
                          border: `3px solid ${palette.border}`,
                          borderRadius: "9999px",
                          padding: "6px 18px",
                          fontSize: "18px",
                          fontWeight: 700,
                          color: palette.pillText,
                        },
                        children: `★ ${data.tier.toUpperCase()}`,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "24px",
                          fontWeight: 800,
                          color: palette.text,
                        },
                        children: "oddly",
                      },
                    },
                  ],
                },
              },

              // Center
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "80px",
                          fontWeight: 800,
                          color: palette.text,
                          lineHeight: 1,
                        },
                        children: `${data.score} of ${total}`,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "18px",
                          fontWeight: 700,
                          color: palette.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginTop: "8px",
                        },
                        children: "Shared Answers",
                      },
                    },
                  ],
                },
              },

              // Bottom
              {
                type: "div",
                props: {
                  style: {
                    borderTop: `3px solid ${palette.border}`,
                    paddingTop: "16px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "20px",
                          fontWeight: 700,
                          color: palette.text,
                        },
                        children: twinLocation,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },

        // Right Column: Inviting Callout & QR Code
        {
          type: "div",
          props: {
            style: {
              width: "600px",
              height: "530px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "20px 0",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "52px",
                          fontWeight: 800,
                          color: palette.text,
                          lineHeight: 1.15,
                        },
                        children: "Can you beat my stranger twin match?",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "26px",
                          color: palette.textMuted,
                        },
                        children: "Answer today's 5 questions to see how our picks align.",
                      },
                    },
                  ],
                },
              },

              // Bottom row with QR code and URL
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: palette.surface,
                    border: `5px solid ${palette.border}`,
                    boxShadow: `8px 8px 0px ${palette.border}`,
                    borderRadius: "24px",
                    padding: "20px 32px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "28px",
                                fontWeight: 700,
                                color: palette.violet,
                              },
                              children: shortUrl,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "18px",
                                fontWeight: 600,
                                color: palette.textMuted,
                              },
                              children: "Play free on web & mobile",
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "img",
                      props: {
                        src: qrDataUrl,
                        style: {
                          width: "90px",
                          height: "90px",
                          borderRadius: "12px",
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

/**
 * Builds the virtual DOM tree for the Card Front face (1080 x 1490)
 */
export function buildFrontTree(
  data: ShareCardData,
  palette: ThemePalette,
  _qrDataUrl?: string
): Record<string, unknown> {
  const total = data.total ?? 5;
  const twinLocation = data.twinCity ? `Stranger in ${data.twinCity}` : "A Stranger nearby";
  const rarityLine = `Only ${data.percentile}% of players matched you today`;

  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1490px",
        backgroundColor: palette.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
        fontFamily: "Noto Sans, sans-serif",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              width: "960px",
              height: "1370px",
              backgroundColor: palette.surface,
              border: `10px solid ${palette.border}`,
              borderRadius: "44px",
              boxShadow: `16px 16px 0px ${palette.border}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "70px 60px",
            },
            children: [
              // Top Bar: Tier chip + Brandmark
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          backgroundColor: palette.pillBg,
                          border: `5px solid ${palette.border}`,
                          borderRadius: "9999px",
                          padding: "16px 36px",
                          fontSize: "30px",
                          fontWeight: 700,
                          color: palette.pillText,
                        },
                        children: `★ ${data.tier.toUpperCase()} TIER`,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          fontSize: "40px",
                          fontWeight: 800,
                          color: palette.text,
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                width: "32px",
                                height: "32px",
                                borderRadius: "16px",
                                backgroundColor: palette.violet,
                                border: `4px solid ${palette.border}`,
                              },
                            },
                          },
                          {
                            type: "div",
                            props: {
                              children: "oddly",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },

              // Center: Big Hero Score
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    margin: "auto 0",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "150px",
                          fontWeight: 800,
                          color: palette.text,
                          lineHeight: 1,
                          letterSpacing: "-0.04em",
                        },
                        children: `${data.score} of ${total}`,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "32px",
                          fontWeight: 700,
                          color: palette.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginTop: "16px",
                        },
                        children: "Shared Answers",
                      },
                    },
                  ],
                },
              },

              // Bottom Section: Location & Rarity
              {
                type: "div",
                props: {
                  style: {
                    borderTop: `5px solid ${palette.border}`,
                    paddingTop: "36px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "40px",
                          fontWeight: 700,
                          color: palette.text,
                        },
                        children: twinLocation,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "28px",
                                color: palette.textMuted,
                              },
                              children: rarityLine,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "28px",
                                fontWeight: 700,
                                color: palette.violet,
                              },
                              children: "oddly.fun",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

/**
 * Builds the virtual DOM tree for the Card Back face (1080 x 1490)
 */
export function buildBackTree(
  data: ShareCardData,
  palette: ThemePalette
): Record<string, unknown> {
  const defaultPicks = [
    { question_number: 1, label: "Pick 1", matched: data.score >= 1 },
    { question_number: 2, label: "Pick 2", matched: data.score >= 2 },
    { question_number: 3, label: "Pick 3", matched: data.score >= 3 },
    { question_number: 4, label: "Pick 4", matched: data.score >= 4 },
    { question_number: 5, label: "Pick 5", matched: data.score >= 5 },
  ];
  const picks = data.pickMatches && data.pickMatches.length === 5 ? data.pickMatches : defaultPicks;

  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1490px",
        backgroundColor: palette.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
        fontFamily: "Noto Sans, sans-serif",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              width: "960px",
              height: "1370px",
              backgroundColor: palette.surface,
              border: `10px solid ${palette.border}`,
              borderRadius: "44px",
              boxShadow: `16px 16px 0px ${palette.border}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "70px 60px",
            },
            children: [
              // Header
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: `5px solid ${palette.border}`,
                    paddingBottom: "32px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "36px",
                          fontWeight: 800,
                          color: palette.text,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        },
                        children: "Pick Overlap",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "32px",
                          fontWeight: 700,
                          color: palette.violet,
                        },
                        children: "oddly.fun",
                      },
                    },
                  ],
                },
              },

              // 5 Questions list
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "24px",
                    margin: "auto 0",
                  },
                  children: picks.map((p) => ({
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: palette.bg,
                        border: `5px solid ${palette.border}`,
                        borderRadius: "24px",
                        padding: "28px 36px",
                      },
                      children: [
                        {
                          type: "div",
                          props: {
                            style: {
                              fontSize: "32px",
                              fontWeight: 700,
                              color: palette.text,
                            },
                            children: `Question ${p.question_number}`,
                          },
                        },
                        {
                          type: "div",
                          props: {
                            style: {
                              backgroundColor: p.matched ? palette.mint : palette.coral,
                              border: `4px solid ${palette.border}`,
                              borderRadius: "9999px",
                              padding: "10px 28px",
                              fontSize: "26px",
                              fontWeight: 700,
                              color: palette.text,
                            },
                            children: p.matched ? "✓ Matched" : "✕ Differs",
                          },
                        },
                      ],
                    },
                  })),
                },
              },

              // Footer
              {
                type: "div",
                props: {
                  style: {
                    borderTop: `5px solid ${palette.border}`,
                    paddingTop: "32px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "26px",
                          fontWeight: 600,
                          color: palette.textMuted,
                        },
                        children: `Can you beat my match? oddly.fun/c/${data.shortId}`,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "26px",
                          fontWeight: 700,
                          color: palette.violet,
                        },
                        children: "oddly",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

/**
 * Generates an SVG string representation of the card using Satori.
 */
export async function generateShareCardSvg(data: ShareCardData): Promise<string> {
  const format = data.format || "story";
  const theme = data.theme || "light";
  const dimensions = CARD_DIMENSIONS[data.side === "front" || data.side === "back" ? data.side : format] || CARD_DIMENSIONS.story;
  const palette = getThemePalette(theme, data.tier);
  const fontBuffer = getFontBuffer();

  const shortUrl = `https://${data.appDomain || "oddly.app"}/c/${data.shortId}`;
  const qrDataUrl = await generateQrCodeDataUrl(shortUrl, {
    width: 200,
    color: {
      dark: palette.text,
      light: "#00000000",
    },
  });

  let vdom: Record<string, unknown>;
  if (data.side === "front") {
    vdom = buildFrontTree(data, palette, qrDataUrl);
  } else if (data.side === "back") {
    vdom = buildBackTree(data, palette);
  } else if (format === "square") {
    vdom = buildSquareTree(data, palette, qrDataUrl);
  } else if (format === "link") {
    vdom = buildLinkTree(data, palette, qrDataUrl);
  } else {
    vdom = buildStoryTree(data, palette, qrDataUrl);
  }

  const svg = await satori(vdom as unknown as Parameters<typeof satori>[0], {
    width: dimensions.width,
    height: dimensions.height,
    fonts: [
      {
        name: "Noto Sans",
        data: fontBuffer,
        weight: 400,
        style: "normal",
      },
    ],
  });

  return svg;
}

/**
 * Renders a high-resolution PNG Buffer using Satori and @resvg/resvg-js.
 */
export async function renderShareCardPng(data: ShareCardData): Promise<Buffer> {
  const format = data.format || "story";
  const dimensions = CARD_DIMENSIONS[data.side === "front" || data.side === "back" ? data.side : format] || CARD_DIMENSIONS.story;
  const svg = await generateShareCardSvg(data);

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: dimensions.width,
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return pngBuffer;
}

/**
 * Renders front face PNG
 */
export async function renderFrontCardPng(data: ShareCardData): Promise<Buffer> {
  return renderShareCardPng({ ...data, side: "front" });
}

/**
 * Renders back face PNG
 */
export async function renderBackCardPng(data: ShareCardData): Promise<Buffer> {
  return renderShareCardPng({ ...data, side: "back" });
}

/**
 * Renders story composite PNG
 */
export async function renderCompositeStoryPng(data: ShareCardData): Promise<Buffer> {
  return renderShareCardPng({ ...data, format: "story", side: "composite" });
}

// ---------------------------------------------------------------------------
// Anti-Twin & Orbit Satori Share Card Exports (Stage F4 / Tasks P10D.05, P10D.06)
// ---------------------------------------------------------------------------

export interface AntiTwinShareCardData {
  differedCount: number;
  total?: number;
  oppositeLocation?: string;
  oppositeAgeBand?: string;
  sampleSize?: number;
  shortId: string;
  appDomain?: string;
  side?: "front" | "back";
  dateStr?: string;
}

export interface OrbitShareCardData {
  milestoneDay: 14 | 30;
  coStreakDays: number;
  partnerLocation?: string;
  partnerAgeBand?: string;
  shortId: string;
  appDomain?: string;
  side?: "front" | "back";
  dateStr?: string;
}

export function buildAntiTwinFrontTree(
  data: AntiTwinShareCardData,
  qrDataUrl: string
): Record<string, unknown> {
  const total = data.total ?? 5;
  const oppLoc = data.oppositeLocation ? `Stranger in ${data.oppositeLocation}` : "A Stranger across the world";
  const oppAge = data.oppositeAgeBand || "18+";
  const sample = (data.sampleSize ?? 2000).toLocaleString();

  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1490px",
        backgroundColor: colors.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
        fontFamily: "Noto Sans, sans-serif",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              width: "960px",
              height: "1370px",
              backgroundColor: colors.paper,
              border: `10px solid ${colors.ink}`,
              borderRadius: "44px",
              boxShadow: `16px 16px 0px ${colors.ink}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "70px 60px",
            },
            children: [
              // Top Bar: Coral accent badge + Brandmark
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          backgroundColor: colors.coral,
                          border: `5px solid ${colors.ink}`,
                          borderRadius: "9999px",
                          padding: "16px 36px",
                          fontSize: "30px",
                          fontWeight: 700,
                          color: colors.ink,
                        },
                        children: "★ OPPOSITE TODAY",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          fontSize: "40px",
                          fontWeight: 800,
                          color: colors.ink,
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                width: "32px",
                                height: "32px",
                                borderRadius: "16px",
                                backgroundColor: colors.coral,
                                border: `4px solid ${colors.ink}`,
                              },
                            },
                          },
                          {
                            type: "div",
                            props: { children: "oddly" },
                          },
                        ],
                      },
                    },
                  ],
                },
              },

              // Hero: Differed on N of 5
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: "24px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "32px",
                          fontWeight: 700,
                          color: colors.muted,
                          textTransform: "uppercase",
                          letterSpacing: "4px",
                        },
                        children: "STRANGER OPPOSITE FOUND",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "92px",
                          fontWeight: 800,
                          color: colors.ink,
                          lineHeight: 1.05,
                        },
                        children: `Differed on ${data.differedCount} of ${total}`,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          backgroundColor: colors.lavender,
                          border: `5px solid ${colors.ink}`,
                          borderRadius: "9999px",
                          padding: "16px 40px",
                          fontSize: "32px",
                          fontWeight: 700,
                          color: colors.ink,
                        },
                        children: `${oppLoc} • ${oppAge}`,
                      },
                    },
                  ],
                },
              },

              // Card Body: Playful kind statement
              {
                type: "div",
                props: {
                  style: {
                    backgroundColor: colors.cream,
                    border: `6px solid ${colors.ink}`,
                    borderRadius: "28px",
                    padding: "36px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: "12px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "32px",
                          fontWeight: 700,
                          color: colors.ink,
                        },
                        children: "Different instincts make the world interesting.",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "24px",
                          fontWeight: 500,
                          color: colors.muted,
                        },
                        children: `Sampled from ${sample} players today.`,
                      },
                    },
                  ],
                },
              },

              // Footer: QR Code + Domain Link
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    borderTop: `4px solid ${colors.ink}`,
                    paddingTop: "24px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "32px",
                                fontWeight: 800,
                                color: colors.ink,
                              },
                              children: `${data.appDomain || "oddly.app"}/c/${data.shortId}`,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "24px",
                                fontWeight: 500,
                                color: colors.muted,
                              },
                              children: data.dateStr || "Today's Five Drop",
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "img",
                      props: {
                        src: qrDataUrl,
                        width: 140,
                        height: 140,
                        style: {
                          borderRadius: "14px",
                          border: `4px solid ${colors.ink}`,
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

export function buildAntiTwinBackTree(
  _data: AntiTwinShareCardData
): Record<string, unknown> {
  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1490px",
        backgroundColor: colors.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
        fontFamily: "Noto Sans, sans-serif",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              width: "960px",
              height: "1370px",
              backgroundColor: colors.coral,
              border: `10px solid ${colors.ink}`,
              borderRadius: "44px",
              boxShadow: `16px 16px 0px ${colors.ink}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "70px 60px",
              gap: "40px",
              textAlign: "center",
            },
            children: [
              // Sealed Brand Mark
              {
                type: "div",
                props: {
                  style: {
                    width: "180px",
                    height: "180px",
                    borderRadius: "90px",
                    backgroundColor: colors.paper,
                    border: `8px solid ${colors.ink}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `10px 10px 0px ${colors.ink}`,
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          width: "80px",
                          height: "80px",
                          borderRadius: "40px",
                          backgroundColor: colors.coral,
                          border: `6px solid ${colors.ink}`,
                        },
                      },
                    },
                  ],
                },
              },

              // Typography
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "80px",
                          fontWeight: 800,
                          color: colors.ink,
                        },
                        children: "oddly opposite",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "36px",
                          fontWeight: 600,
                          color: colors.ink,
                        },
                        children: "My stranger opposite today.",
                      },
                    },
                  ],
                },
              },

              // Sealed Badge
              {
                type: "div",
                props: {
                  style: {
                    backgroundColor: colors.paper,
                    border: `5px solid ${colors.ink}`,
                    borderRadius: "9999px",
                    padding: "16px 48px",
                    fontSize: "28px",
                    fontWeight: 700,
                    color: colors.ink,
                    letterSpacing: "2px",
                  },
                  children: "SEALED OPPOSITE PAIR",
                },
              },
            ],
          },
        },
      ],
    },
  };
}

export function buildOrbitFrontTree(
  data: OrbitShareCardData,
  qrDataUrl: string
): Record<string, unknown> {
  const isAnniversary = data.milestoneDay === 30;
  const badgeColor = isAnniversary ? colors.sun : colors.mint;
  const badgeText = isAnniversary ? "★ 30-DAY ANNIVERSARY" : "★ DAY 14 ORBIT CARD";
  const partnerLoc = data.partnerLocation ? `Stranger in ${data.partnerLocation}` : "A Stranger in Orbit";

  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1490px",
        backgroundColor: colors.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
        fontFamily: "Noto Sans, sans-serif",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              width: "960px",
              height: "1370px",
              backgroundColor: colors.paper,
              border: `10px solid ${colors.ink}`,
              borderRadius: "44px",
              boxShadow: `16px 16px 0px ${colors.ink}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "70px 60px",
            },
            children: [
              // Top Bar
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          backgroundColor: badgeColor,
                          border: `5px solid ${colors.ink}`,
                          borderRadius: "9999px",
                          padding: "16px 36px",
                          fontSize: "30px",
                          fontWeight: 700,
                          color: colors.ink,
                        },
                        children: badgeText,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          fontSize: "40px",
                          fontWeight: 800,
                          color: colors.ink,
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                width: "32px",
                                height: "32px",
                                borderRadius: "16px",
                                backgroundColor: badgeColor,
                                border: `4px solid ${colors.ink}`,
                              },
                            },
                          },
                          {
                            type: "div",
                            props: { children: "oddly" },
                          },
                        ],
                      },
                    },
                  ],
                },
              },

              // Hero
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: "24px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "32px",
                          fontWeight: 700,
                          color: colors.muted,
                          textTransform: "uppercase",
                          letterSpacing: "4px",
                        },
                        children: "COMMEMORATIVE ORBIT MILESTONE",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "92px",
                          fontWeight: 800,
                          color: colors.ink,
                        },
                        children: `${data.coStreakDays} Days in Orbit`,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          backgroundColor: colors.lavender,
                          border: `5px solid ${colors.ink}`,
                          borderRadius: "9999px",
                          padding: "16px 40px",
                          fontSize: "32px",
                          fontWeight: 700,
                          color: colors.ink,
                        },
                        children: `Shared journey with ${partnerLoc}`,
                      },
                    },
                  ],
                },
              },

              // Middle Badge
              {
                type: "div",
                props: {
                  style: {
                    backgroundColor: colors.cream,
                    border: `6px solid ${colors.ink}`,
                    borderRadius: "28px",
                    padding: "36px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: "12px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "34px",
                          fontWeight: 800,
                          color: colors.ink,
                        },
                        children: isAnniversary ? "🏆 30-Day Golden Anniversary" : "✨ Day 14 Keepsake Milestone",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "24px",
                          fontWeight: 500,
                          color: colors.muted,
                        },
                        children: "Daily instinct sync, silent sticker waves, and shared ritual.",
                      },
                    },
                  ],
                },
              },

              // Footer
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    borderTop: `4px solid ${colors.ink}`,
                    paddingTop: "24px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "32px",
                                fontWeight: 800,
                                color: colors.ink,
                              },
                              children: `${data.appDomain || "oddly.app"}/c/${data.shortId}`,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "24px",
                                fontWeight: 500,
                                color: colors.muted,
                              },
                              children: data.dateStr || "Oddly Orbit Club",
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "img",
                      props: {
                        src: qrDataUrl,
                        width: 140,
                        height: 140,
                        style: {
                          borderRadius: "14px",
                          border: `4px solid ${colors.ink}`,
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

export function buildOrbitBackTree(
  data: OrbitShareCardData
): Record<string, unknown> {
  const isAnniversary = data.milestoneDay === 30;
  const bgColor = isAnniversary ? colors.sun : colors.mint;

  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1490px",
        backgroundColor: colors.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
        fontFamily: "Noto Sans, sans-serif",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              width: "960px",
              height: "1370px",
              backgroundColor: bgColor,
              border: `10px solid ${colors.ink}`,
              borderRadius: "44px",
              boxShadow: `16px 16px 0px ${colors.ink}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "70px 60px",
              gap: "40px",
              textAlign: "center",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: "180px",
                    height: "180px",
                    borderRadius: "90px",
                    backgroundColor: colors.paper,
                    border: `8px solid ${colors.ink}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `10px 10px 0px ${colors.ink}`,
                    fontSize: "72px",
                  },
                  children: "🪐",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "80px",
                          fontWeight: 800,
                          color: colors.ink,
                        },
                        children: "oddly orbit",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "36px",
                          fontWeight: 600,
                          color: colors.ink,
                        },
                        children: `${data.coStreakDays} days connected in space.`,
                      },
                    },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    backgroundColor: colors.paper,
                    border: `5px solid ${colors.ink}`,
                    borderRadius: "9999px",
                    padding: "16px 48px",
                    fontSize: "28px",
                    fontWeight: 700,
                    color: colors.ink,
                    letterSpacing: "2px",
                  },
                  children: "PERMANENT MILESTONE BADGE",
                },
              },
            ],
          },
        },
      ],
    },
  };
}

/**
 * Renders Anti-Twin Satori share card PNG (P10D.05).
 */
export async function renderAntiTwinCardPng(data: AntiTwinShareCardData): Promise<Buffer> {
  const fontBuffer = getFontBuffer();
  const shortUrl = `https://${data.appDomain || "oddly.app"}/c/${data.shortId}`;
  const qrDataUrl = await generateQrCodeDataUrl(shortUrl, {
    width: 200,
    color: {
      dark: colors.ink,
      light: "#00000000",
    },
  });

  const vdom = data.side === "back" ? buildAntiTwinBackTree(data) : buildAntiTwinFrontTree(data, qrDataUrl);

  const svg = await satori(vdom as unknown as Parameters<typeof satori>[0], {
    width: 1080,
    height: 1490,
    fonts: [
      {
        name: "Noto Sans",
        data: fontBuffer,
        weight: 400,
        style: "normal",
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1080 },
  });

  return resvg.render().asPng();
}



/**
 * Renders Orbit Milestone Satori share card PNG for Day 14 and Day 30 (P10D.06).
 */
export async function renderOrbitCardPng(data: OrbitShareCardData): Promise<Buffer> {
  const fontBuffer = getFontBuffer();
  const shortUrl = `https://${data.appDomain || "oddly.app"}/c/${data.shortId}`;
  const qrDataUrl = await generateQrCodeDataUrl(shortUrl, {
    width: 200,
    color: {
      dark: colors.ink,
      light: "#00000000",
    },
  });

  const vdom = data.side === "back" ? buildOrbitBackTree(data) : buildOrbitFrontTree(data, qrDataUrl);

  const svg = await satori(vdom as unknown as Parameters<typeof satori>[0], {
    width: 1080,
    height: 1490,
    fonts: [
      {
        name: "Noto Sans",
        data: fontBuffer,
        weight: 400,
        style: "normal",
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1080 },
  });

  return resvg.render().asPng();
}



export interface AchievementShareCardData {
  badgeTitle: string;
  badgeDescription: string;
  badgeIconKey?: string;
  creatorAlias: string;
  macroRegion?: string;
  awardedDateStr: string;
  shortId: string;
  appDomain?: string;
  side?: "front" | "back";
  statLabel?: string;
  statValue?: string;
}

export function buildAchievementFrontTree(
  data: AchievementShareCardData,
  qrDataUrl: string
): Record<string, unknown> {
  const regionLabel = data.macroRegion ? `REGION: ${data.macroRegion.toUpperCase()}` : "COMMUNITY CREATOR";

  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1490px",
        backgroundColor: colors.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
        fontFamily: "Noto Sans, sans-serif",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              width: "960px",
              height: "1370px",
              backgroundColor: colors.paper,
              border: `10px solid ${colors.ink}`,
              borderRadius: "44px",
              boxShadow: `16px 16px 0px ${colors.ink}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "70px 60px",
            },
            children: [
              // Top Bar
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          backgroundColor: colors.violet,
                          color: colors.paper,
                          border: `3px solid ${colors.ink}`,
                          borderRadius: "999px",
                          padding: "10px 24px",
                          fontSize: "20px",
                          fontWeight: "800",
                          boxShadow: `4px 4px 0px ${colors.ink}`,
                        },
                        children: "★ ODDLY RECOGNITION",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          backgroundColor: colors.cream,
                          color: colors.ink,
                          border: `3px solid ${colors.ink}`,
                          borderRadius: "999px",
                          padding: "10px 24px",
                          fontSize: "18px",
                          fontWeight: "700",
                        },
                        children: regionLabel,
                      },
                    },
                  ],
                },
              },

              // Center Hero Badge
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "24px",
                    width: "100%",
                  },
                  children: [
                    // Badge Emblem Circle
                    {
                      type: "div",
                      props: {
                        style: {
                          width: "160px",
                          height: "160px",
                          borderRadius: "999px",
                          backgroundColor: colors.sun,
                          border: `8px solid ${colors.ink}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "72px",
                          boxShadow: `10px 10px 0px ${colors.ink}`,
                        },
                        children: "🏆",
                      },
                    },
                    // Badge Title
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "56px",
                          fontWeight: "900",
                          color: colors.ink,
                          textAlign: "center",
                          lineHeight: "1.1",
                        },
                        children: data.badgeTitle,
                      },
                    },
                    // Alias pill
                    {
                      type: "div",
                      props: {
                        style: {
                          backgroundColor: colors.coral,
                          color: colors.paper,
                          border: `4px solid ${colors.ink}`,
                          borderRadius: "999px",
                          padding: "12px 32px",
                          fontSize: "24px",
                          fontWeight: "800",
                          boxShadow: `6px 6px 0px ${colors.ink}`,
                        },
                        children: `Honoring ${data.creatorAlias}`,
                      },
                    },
                  ],
                },
              },

              // Bottom Details Bar
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    borderTop: `4px dashed ${colors.ink}`,
                    paddingTop: "32px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "16px",
                                fontWeight: "800",
                                color: colors.muted,
                                textTransform: "uppercase",
                              },
                              children: "Awarded On",
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "22px",
                                fontWeight: "800",
                                color: colors.ink,
                              },
                              children: data.awardedDateStr,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "15px",
                                fontWeight: "700",
                                color: colors.muted,
                              },
                              children: "Verified by Community Consensus",
                            },
                          },
                        ],
                      },
                    },
                    // QR Code
                    {
                      type: "img",
                      props: {
                        src: qrDataUrl,
                        width: "140",
                        height: "140",
                        style: {
                          border: `4px solid ${colors.ink}`,
                          borderRadius: "16px",
                          backgroundColor: colors.paper,
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

export function buildAchievementBackTree(
  data: AchievementShareCardData
): Record<string, unknown> {
  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1490px",
        backgroundColor: colors.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
        fontFamily: "Noto Sans, sans-serif",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              width: "960px",
              height: "1370px",
              backgroundColor: colors.paper,
              border: `10px solid ${colors.ink}`,
              borderRadius: "44px",
              boxShadow: `16px 16px 0px ${colors.ink}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "70px 60px",
            },
            children: [
              // Top Bar
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          backgroundColor: colors.sun,
                          color: colors.ink,
                          border: `3px solid ${colors.ink}`,
                          borderRadius: "999px",
                          padding: "10px 24px",
                          fontSize: "20px",
                          fontWeight: "800",
                          boxShadow: `4px 4px 0px ${colors.ink}`,
                        },
                        children: "★ BENCHMARK AUDIT",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "18px",
                          fontWeight: "700",
                          color: colors.muted,
                        },
                        children: `#${data.shortId}`,
                      },
                    },
                  ],
                },
              },

              // Benchmark Details
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "24px",
                    width: "100%",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "44px",
                          fontWeight: "900",
                          color: colors.ink,
                          lineHeight: "1.2",
                        },
                        children: data.badgeTitle,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "24px",
                          color: colors.ink,
                          lineHeight: "1.5",
                          backgroundColor: colors.cream,
                          border: `3px solid ${colors.ink}`,
                          borderRadius: "20px",
                          padding: "28px",
                        },
                        children: data.badgeDescription,
                      },
                    },
                    ...(data.statLabel && data.statValue
                      ? [
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                backgroundColor: colors.paper,
                                border: `3px solid ${colors.ink}`,
                                borderRadius: "20px",
                                padding: "20px 28px",
                                boxShadow: `6px 6px 0px ${colors.ink}`,
                              },
                              children: [
                                {
                                  type: "div",
                                  props: {
                                    style: {
                                      fontSize: "20px",
                                      fontWeight: "800",
                                      color: colors.muted,
                                    },
                                    children: data.statLabel,
                                  },
                                },
                                {
                                  type: "div",
                                  props: {
                                    style: {
                                      fontSize: "28px",
                                      fontWeight: "900",
                                      color: colors.violet,
                                    },
                                    children: data.statValue,
                                  },
                                },
                              ],
                            },
                          },
                        ]
                      : []),
                  ],
                },
              },

              // Bottom Rule Sign-off
              {
                type: "div",
                props: {
                  style: {
                    borderTop: `4px dashed ${colors.ink}`,
                    paddingTop: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "16px",
                          fontWeight: "800",
                          color: colors.ink,
                        },
                        children: "Oddly Consensus Recognition Protocol",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "14px",
                          color: colors.muted,
                        },
                        children: "Compliant with Rule 14 (No Sensitive Inference) and Rule 15 (No Profiling).",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

/**
 * Renders Achievement Satori share card PNG (P10I.05).
 */
export async function renderAchievementCardPng(
  data: AchievementShareCardData
): Promise<Buffer> {
  const fontBuffer = getFontBuffer();
  const shortUrl = `https://${data.appDomain || "oddly.app"}/b/${data.shortId}`;
  const qrDataUrl = await generateQrCodeDataUrl(shortUrl, {
    width: 200,
    color: {
      dark: colors.ink,
      light: "#00000000",
    },
  });

  const vdom =
    data.side === "back"
      ? buildAchievementBackTree(data)
      : buildAchievementFrontTree(data, qrDataUrl);

  const svg = await satori(vdom as unknown as Parameters<typeof satori>[0], {
    width: 1080,
    height: 1490,
    fonts: [
      {
        name: "Noto Sans",
        data: fontBuffer,
        weight: 400,
        style: "normal",
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1080 },
  });

  return resvg.render().asPng();
}

// ============================================================================
// Stage L4 (Phase 10O): Dedicated Memes Share Card (P10O.03)
// ============================================================================

export interface MemeShareCardData {
  score: number;
  total?: number;
  tier: Tier;
  percentile: number;
  templateKey?: string;
  caption?: string;
  twinCity?: string;
  shortId: string;
  appDomain?: string;
  side?: "front" | "back";
  pickMatches?: Array<{
    question_number: number;
    label: string;
    matched: boolean;
  }>;
}

function buildMemeCardFrontTree(data: MemeShareCardData, qrDataUrl: string) {
  const total = data.total ?? 5;
  const caption = data.caption || "When the alarm rings and reality hits";
  const templateKey = data.templateKey || "snooze-battle";

  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1490px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: colors.cream,
        padding: "64px",
      },
      children: [
        // Physical paper card with ink border and hard shadow
        {
          type: "div",
          props: {
            style: {
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              backgroundColor: colors.paper,
              borderRadius: "32px",
              border: `6px solid ${colors.ink}`,
              boxShadow: `12px 12px 0 ${colors.ink}`,
              padding: "56px",
            },
            children: [
              // Header Row: LaneChip + Brand Mark
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          backgroundColor: colors.lavender,
                          border: `4px solid ${colors.ink}`,
                          borderRadius: "999px",
                          padding: "10px 24px",
                        },
                        children: [
                          {
                            type: "span",
                            props: {
                              style: {
                                fontSize: "28px",
                                fontWeight: "800",
                                color: colors.violet,
                              },
                              children: "MEMES LANE",
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        },
                        children: [
                          {
                            type: "span",
                            props: {
                              style: {
                                fontSize: "36px",
                                fontWeight: "800",
                                color: colors.ink,
                              },
                              children: "oddly",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },

              // Hero Meme Frame (Physical sticker inside card)
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    backgroundColor: colors.cream,
                    border: `5px solid ${colors.ink}`,
                    borderRadius: "24px",
                    boxShadow: `8px 8px 0 ${colors.ink}`,
                    padding: "36px 28px",
                    margin: "24px 0",
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: {
                          fontSize: "24px",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          color: colors.muted,
                          letterSpacing: "2px",
                          marginBottom: "12px",
                        },
                        children: `TEMPLATE: ${templateKey.toUpperCase()}`,
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: {
                          fontSize: "38px",
                          fontWeight: "800",
                          color: colors.ink,
                          textAlign: "center",
                          lineHeight: "1.3",
                        },
                        children: `"${caption}"`,
                      },
                    },
                  ],
                },
              },

              // Match Result Callout
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: {
                          fontSize: "110px",
                          fontWeight: "800",
                          color: colors.ink,
                          lineHeight: "1",
                        },
                        children: `${data.score} of ${total}`,
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: {
                          fontSize: "30px",
                          fontWeight: "700",
                          color: colors.violet,
                          marginTop: "8px",
                        },
                        children: `${data.tier.toUpperCase()} MEME TWIN`,
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: {
                          fontSize: "26px",
                          fontWeight: "500",
                          color: colors.muted,
                          marginTop: "6px",
                        },
                        children: data.twinCity ? `Stranger in ${data.twinCity}` : "One stranger twin in the world",
                      },
                    },
                  ],
                },
              },

              // Footer: QR Code & Call to Action
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    borderTop: `4px solid ${colors.ink}`,
                    paddingTop: "24px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                        },
                        children: [
                          {
                            type: "span",
                            props: {
                              style: {
                                fontSize: "28px",
                                fontWeight: "800",
                                color: colors.ink,
                              },
                              children: "Find your Meme Twin",
                            },
                          },
                          {
                            type: "span",
                            props: {
                              style: {
                                fontSize: "22px",
                                color: colors.muted,
                              },
                              children: `${data.appDomain || "oddly.app"}/c/${data.shortId}?lane=memes`,
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "img",
                      props: {
                        src: qrDataUrl,
                        width: "120",
                        height: "120",
                        style: {
                          borderRadius: "16px",
                          border: `3px solid ${colors.ink}`,
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

export async function renderMemeShareCardPng(data: MemeShareCardData): Promise<Buffer> {
  const fontBuffer = getFontBuffer();
  const shortUrl = `https://${data.appDomain || "oddly.app"}/c/${data.shortId}?lane=memes`;
  const qrDataUrl = await generateQrCodeDataUrl(shortUrl, {
    width: 200,
    color: {
      dark: colors.ink,
      light: "#00000000",
    },
  });

  const vdom = buildMemeCardFrontTree(data, qrDataUrl);

  const svg = await satori(vdom as unknown as Parameters<typeof satori>[0], {
    width: 1080,
    height: 1490,
    fonts: [
      {
        name: "Noto Sans",
        data: fontBuffer,
        weight: 400,
        style: "normal",
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1080 },
  });

  return resvg.render().asPng();
}


