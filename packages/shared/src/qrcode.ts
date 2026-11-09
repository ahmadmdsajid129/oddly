import QRCode from "qrcode";

/**
 * Options for QR code rendering.
 */
export interface QrCodeOptions {
  margin?: number;
  width?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generates an SVG string representation of a QR code.
 * Optimized for server-side Satori card embedding.
 */
export async function generateQrCodeSvg(
  text: string,
  options?: QrCodeOptions
): Promise<string> {
  const margin = options?.margin ?? 1;
  const dark = options?.color?.dark ?? "#FFFFFF";
  const light = options?.color?.light ?? "#00000000"; // Transparent light background by default

  const svg = await QRCode.toString(text, {
    type: "svg",
    margin,
    color: {
      dark,
      light,
    },
  });

  return svg;
}

/**
 * Generates a base64 Data URL (image/png) for a QR code.
 */
export async function generateQrCodeDataUrl(
  text: string,
  options?: QrCodeOptions
): Promise<string> {
  const margin = options?.margin ?? 1;
  const width = options?.width ?? 200;
  const dark = options?.color?.dark ?? "#FFFFFF";
  const light = options?.color?.light ?? "#00000000";

  return await QRCode.toDataURL(text, {
    margin,
    width,
    color: {
      dark,
      light,
    },
  });
}

