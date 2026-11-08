import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
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
  theme?: ShareTheme; // default "dark"
}

export interface CardDimensions {
  width: number;
  height: number;
}

export const CARD_DIMENSIONS: Record<ShareFormat, CardDimensions> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  link: { width: 1200, height: 630 },
};

// Cached font buffer
let cachedFontBuffer: Buffer | null = null;

function getFontBuffer(): Buffer {
  if (cachedFontBuffer) {
    return cachedFontBuffer;
  }

  // Resolve font path relative to current module or known assets directory
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

interface ThemePalette {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  mint: string;
  violet: string;
  coral: string;
  pillBg: string;
  pillText: string;
}

function getThemePalette(theme: ShareTheme, tier: Tier): ThemePalette {
  if (theme === "light") {
    return {
      bg: "#FFF8F0",
      surface: "#FFFFFF",
      border: "#DDD6FA",
      text: "#14123A",
      textMuted: "#6B6488",
      mint: "#059669",
      violet: "#6C4CF1",
      coral: "#FF6B5E",
      pillBg: "#EEEAFE",
      pillText: "#14123A",
    };
  }

  if (theme === "mythic" || tier === "Mythic") {
    return {
      bg: "#120E30",
      surface: "#1D1645",
      border: "#8B72FF",
      text: "#FFFFFF",
      textMuted: "#C7BEF5",
      mint: "#34D399",
      violet: "#A78BFA",
      coral: "#FB7185",
      pillBg: "#2A1E66",
      pillText: "#FBBF24",
    };
  }

  // Default "dark"
  return {
    bg: "#14123A",
    surface: "#1E1B4B",
    border: "#3A3580",
    text: "#F4F1FF",
    textMuted: "#948BB4",
    mint: "#10B981",
    violet: "#8B72FF",
    coral: "#FF6B5E",
    pillBg: "#28245E",
    pillText: "#10B981",
  };
}

/**
 * Builds the virtual DOM tree for Story layout (1080 x 1920)
 */
function buildStoryTree(
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
        height: "1920px",
        backgroundColor: palette.bg,
        color: palette.text,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "100px 80px",
        fontFamily: "Noto Sans, sans-serif",
      },
      children: [
        // Top Bar: Wordmark + Brand mark
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
                    // Brand mark circles
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          position: "relative",
                          width: "56px",
                          height: "36px",
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
                                position: "absolute",
                                left: "0",
                              },
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                width: "36px",
                                height: "36px",
                                borderRadius: "18px",
                                backgroundColor: palette.coral,
                                position: "absolute",
                                left: "20px",
                                opacity: 0.85,
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "44px",
                          fontWeight: 700,
                          letterSpacing: "-0.03em",
                          color: palette.text,
                        },
                        children: "oddly",
                      },
                    },
                  ],
                },
              },
              // Streak badge if >= 3
              data.streak && data.streak >= 3
                ? {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        backgroundColor: palette.surface,
                        border: `2px solid ${palette.coral}`,
                        padding: "12px 24px",
                        borderRadius: "9999px",
                        fontSize: "26px",
                        fontWeight: 600,
                        color: palette.coral,
                      },
                      children: `🔥 ${data.streak}-Day Streak`,
                    },
                  }
                : {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "24px",
                        color: palette.textMuted,
                      },
                      children: data.dateStr || "Daily Drop",
                    },
                  },
            ],
          },
        },

        // Center Hero Block
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "40px 0",
            },
            children: [
              // Intersecting Venn diagram with glowing Mint center
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    width: "480px",
                    height: "320px",
                    marginBottom: "40px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          width: "280px",
                          height: "280px",
                          borderRadius: "140px",
                          backgroundColor: palette.violet,
                          opacity: 0.65,
                          position: "absolute",
                          left: "20px",
                        },
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          width: "280px",
                          height: "280px",
                          borderRadius: "140px",
                          backgroundColor: palette.coral,
                          opacity: 0.65,
                          position: "absolute",
                          right: "20px",
                        },
                      },
                    },
                    // Center overlap pill with big score
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "200px",
                          height: "200px",
                          borderRadius: "100px",
                          backgroundColor: palette.surface,
                          border: `4px solid ${palette.mint}`,
                          zIndex: 10,
                          boxShadow: "0 12px 36px rgba(16, 185, 129, 0.35)",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "76px",
                                fontWeight: 800,
                                color: palette.mint,
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
                                fontWeight: 600,
                                color: palette.textMuted,
                                textTransform: "uppercase",
                                marginTop: "6px",
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

              // Match Persona Line
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "36px",
                    fontWeight: 600,
                    color: palette.text,
                    marginBottom: "24px",
                    textAlign: "center",
                  },
                  children: `Matched with ${twinLocation}`,
                },
              },

              // Rarity Tier Pill
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    backgroundColor: palette.pillBg,
                    border: `2px solid ${palette.mint}`,
                    padding: "16px 36px",
                    borderRadius: "9999px",
                    fontSize: "32px",
                    fontWeight: 700,
                    color: palette.mint,
                    marginBottom: "32px",
                  },
                  children: `★ ${data.tier.toUpperCase()} TIER · ${data.percentile}% ODD`,
                },
              },

              // Rarest pick highlight card
              data.rarestPickTitle
                ? {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        backgroundColor: palette.surface,
                        border: `1px solid ${palette.border}`,
                        borderRadius: "24px",
                        padding: "24px 40px",
                        maxWidth: "760px",
                      },
                      children: [
                        {
                          type: "div",
                          props: {
                            style: {
                              fontSize: "20px",
                              fontWeight: 600,
                              color: palette.mint,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              marginBottom: "8px",
                            },
                            children: "RAREST SHARED PICK",
                          },
                        },
                        {
                          type: "div",
                          props: {
                            style: {
                              fontSize: "28px",
                              fontWeight: 600,
                              color: palette.text,
                              textAlign: "center",
                            },
                            children: `"${data.rarestPickTitle}"`,
                          },
                        },
                      ],
                    },
                  }
                : null,
            ].filter(Boolean),
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
              border: `1px solid ${palette.border}`,
              borderRadius: "32px",
              padding: "36px 48px",
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
                          fontSize: "36px",
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
                          fontWeight: 600,
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
                    width: "140px",
                    height: "140px",
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
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "70px 70px",
        fontFamily: "Noto Sans, sans-serif",
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
                          display: "flex",
                          position: "relative",
                          width: "48px",
                          height: "30px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                width: "30px",
                                height: "30px",
                                borderRadius: "15px",
                                backgroundColor: palette.violet,
                                position: "absolute",
                                left: "0",
                              },
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                width: "30px",
                                height: "30px",
                                borderRadius: "15px",
                                backgroundColor: palette.coral,
                                position: "absolute",
                                left: "18px",
                                opacity: 0.85,
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "36px",
                          fontWeight: 700,
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
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    backgroundColor: palette.pillBg,
                    border: `1.5px solid ${palette.mint}`,
                    padding: "10px 22px",
                    borderRadius: "9999px",
                    fontSize: "22px",
                    fontWeight: 700,
                    color: palette.mint,
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
                    width: "560px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "44px",
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
                              marginBottom: "20px",
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
                          fontWeight: 600,
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
                    width: "260px",
                    height: "260px",
                    borderRadius: "130px",
                    backgroundColor: palette.surface,
                    border: `5px solid ${palette.mint}`,
                    boxShadow: "0 10px 30px rgba(16, 185, 129, 0.3)",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "92px",
                          fontWeight: 800,
                          color: palette.mint,
                          lineHeight: 1,
                        },
                        children: `${data.score}/${total}`,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "22px",
                          fontWeight: 600,
                          color: palette.textMuted,
                          marginTop: "8px",
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
              backgroundColor: palette.surface,
              borderRadius: "24px",
              padding: "24px 36px",
              border: `1px solid ${palette.border}`,
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "28px",
                    fontWeight: 600,
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
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "50px 60px",
        fontFamily: "Noto Sans, sans-serif",
      },
      children: [
        // Top Header
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
                    gap: "12px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          position: "relative",
                          width: "44px",
                          height: "28px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                width: "28px",
                                height: "28px",
                                borderRadius: "14px",
                                backgroundColor: palette.violet,
                                position: "absolute",
                                left: "0",
                              },
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                width: "28px",
                                height: "28px",
                                borderRadius: "14px",
                                backgroundColor: palette.coral,
                                position: "absolute",
                                left: "16px",
                                opacity: 0.85,
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "32px",
                          fontWeight: 700,
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
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    backgroundColor: palette.pillBg,
                    border: `1.5px solid ${palette.mint}`,
                    padding: "8px 20px",
                    borderRadius: "9999px",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: palette.mint,
                  },
                  children: `★ ${data.tier.toUpperCase()} TIER · ${data.percentile}%`,
                },
              },
            ],
          },
        },

        // Middle Row
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
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    width: "720px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "42px",
                          fontWeight: 700,
                          color: palette.text,
                          marginBottom: "10px",
                        },
                        children: `Matched with ${twinLocation}`,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "24px",
                          color: palette.textMuted,
                          marginBottom: "16px",
                        },
                        children: data.rarestPickTitle
                          ? `Rarest pick: "${data.rarestPickTitle}"`
                          : "Find your stranger twin today",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "24px",
                          fontWeight: 600,
                          color: palette.violet,
                        },
                        children: shortUrl,
                      },
                    },
                  ],
                },
              },

              // Right Score & QR
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "24px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "180px",
                          height: "180px",
                          borderRadius: "90px",
                          backgroundColor: palette.surface,
                          border: `4px solid ${palette.mint}`,
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "64px",
                                fontWeight: 800,
                                color: palette.mint,
                                lineHeight: 1,
                              },
                              children: `${data.score}/${total}`,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "16px",
                                fontWeight: 600,
                                color: palette.textMuted,
                                marginTop: "6px",
                              },
                              children: "MATCH",
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
                          width: "110px",
                          height: "110px",
                          borderRadius: "14px",
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },

        // Bottom CTA
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "20px",
              color: palette.textMuted,
            },
            children: [
              {
                type: "div",
                props: {
                  children: "Can you beat my match? Answer today's 5 questions.",
                },
              },
              {
                type: "div",
                props: {
                  style: { color: palette.mint, fontWeight: 600 },
                  children: "oddly.app",
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
  const theme = data.theme || "dark";
  const dimensions = CARD_DIMENSIONS[format];
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
  if (format === "square") {
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
  const dimensions = CARD_DIMENSIONS[format];
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
