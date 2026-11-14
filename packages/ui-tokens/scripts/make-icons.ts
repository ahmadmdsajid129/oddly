import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { colors } from "../src/tokens.js";

const require = createRequire(path.resolve(__dirname, "../../shared/package.json"));
const { Resvg } = require("@resvg/resvg-js");

const OUT_DIR = path.resolve(__dirname, "../../../apps/web/public");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function getFaviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none">
  <rect width="64" height="64" rx="16" fill="${colors.cream}"/>
  <rect x="2" y="2" width="60" height="60" rx="14" stroke="${colors.ink}" stroke-width="3"/>
  <circle cx="26" cy="32" r="16" fill="${colors.violet}" stroke="${colors.ink}" stroke-width="3"/>
  <circle cx="38" cy="32" r="16" fill="${colors.coral}" fill-opacity="0.9" stroke="${colors.ink}" stroke-width="3"/>
  <path d="M32 19.6C28.7 22.8 26.6 27.2 26.6 32C26.6 36.8 28.7 41.2 32 44.4C35.3 41.2 37.4 36.8 37.4 32C37.4 27.2 35.3 22.8 32 19.6Z" fill="${colors.mint}" stroke="${colors.ink}" stroke-width="3"/>
</svg>`;
}

function getAppIconSvg(size: number, isMaskable: boolean): string {
  if (isMaskable) {
    // 512x512 maskable: Violet background, motif in 80% safe zone
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="none">
  <rect width="${size}" height="${size}" fill="${colors.violet}"/>
  <g transform="translate(${size * 0.1}, ${size * 0.1}) scale(0.8)">
    <rect x="32" y="32" width="${size - 64}" height="${size - 64}" rx="64" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="16"/>
    <g transform="translate(${size * 0.15}, ${size * 0.2}) scale(0.7)">
      <circle cx="200" cy="256" r="140" fill="${colors.violet}" stroke="${colors.ink}" stroke-width="24"/>
      <circle cx="312" cy="256" r="140" fill="${colors.coral}" stroke="${colors.ink}" stroke-width="24"/>
      <path d="M256 148C227 176 209 214 209 256C209 298 227 336 256 364C285 336 303 298 303 256C303 214 285 176 256 148Z" fill="${colors.mint}" stroke="${colors.ink}" stroke-width="24"/>
    </g>
  </g>
</svg>`;
  }

  // Standard icon on cream desk
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="none">
  <rect width="${size}" height="${size}" fill="${colors.cream}"/>
  <rect x="${size * 0.05}" y="${size * 0.05}" width="${size * 0.9}" height="${size * 0.9}" rx="${size * 0.2}" fill="${colors.paper}" stroke="${colors.ink}" stroke-width="${Math.max(4, size * 0.04)}"/>
  <!-- Sticker Hard Shadow effect -->
  <g transform="translate(${size * 0.12}, ${size * 0.22}) scale(${size / 512 * 0.75})">
    <circle cx="190" cy="190" r="120" fill="${colors.violet}" stroke="${colors.ink}" stroke-width="20"/>
    <circle cx="290" cy="190" r="120" fill="${colors.coral}" stroke="${colors.ink}" stroke-width="20"/>
    <path d="M240 97C215 121 199 154 199 190C199 226 215 259 240 283C265 259 281 226 281 190C281 154 265 121 240 97Z" fill="${colors.mint}" stroke="${colors.ink}" stroke-width="20"/>
  </g>
</svg>`;
}

function getOgImageSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" fill="none">
  <rect width="1200" height="630" fill="${colors.cream}"/>
  
  <!-- Left Side: Sticker Card -->
  <g transform="translate(80, 65)">
    <!-- Hard shadow -->
    <rect x="16" y="16" width="440" height="500" rx="32" fill="${colors.ink}"/>
    <!-- Card Body -->
    <rect x="0" y="0" width="440" height="500" rx="32" fill="${colors.paper}" stroke="${colors.ink}" stroke-width="8"/>
    
    <!-- Tier badge -->
    <rect x="36" y="36" width="180" height="44" rx="22" fill="${colors.sun}" stroke="${colors.ink}" stroke-width="4"/>
    <text x="126" y="65" font-family="sans-serif" font-size="20" font-weight="bold" fill="${colors.ink}" text-anchor="middle">★ RARE TIER</text>
    
    <!-- Big score -->
    <text x="220" y="220" font-family="sans-serif" font-size="96" font-weight="900" fill="${colors.ink}" text-anchor="middle">4 of 5</text>
    <text x="220" y="270" font-family="sans-serif" font-size="22" font-weight="bold" fill="${colors.muted}" text-anchor="middle">SHARED ANSWERS</text>
    
    <!-- Divider -->
    <line x1="36" y1="320" x2="404" y2="320" stroke="${colors.ink}" stroke-width="4"/>
    
    <!-- Location & Rarity -->
    <text x="36" y="375" font-family="sans-serif" font-size="26" font-weight="bold" fill="${colors.ink}">Stranger in Berlin, Germany</text>
    <text x="36" y="420" font-family="sans-serif" font-size="18" fill="${colors.muted}">Only 0.4% of players matched you today</text>
    <text x="404" y="465" font-family="sans-serif" font-size="20" font-weight="bold" fill="${colors.violet}" text-anchor="end">oddly.fun</text>
  </g>
  
  <!-- Right Side: Brand & Message -->
  <g transform="translate(580, 110)">
    <!-- Brandmark -->
    <circle cx="30" cy="30" r="24" fill="${colors.violet}" stroke="${colors.ink}" stroke-width="4"/>
    <circle cx="58" cy="30" r="24" fill="${colors.coral}" stroke="${colors.ink}" stroke-width="4"/>
    <path d="M44 11.5C39.4 16.1 36.5 22.4 36.5 29.5C36.5 36.6 39.4 42.9 44 47.5C48.6 42.9 51.5 36.6 51.5 29.5C51.5 22.4 48.6 16.1 44 11.5Z" fill="${colors.mint}" stroke="${colors.ink}" stroke-width="4"/>
    <text x="100" y="42" font-family="sans-serif" font-size="44" font-weight="900" fill="${colors.ink}">oddly</text>
    
    <text x="0" y="160" font-family="sans-serif" font-size="52" font-weight="900" fill="${colors.ink}">Someone out there</text>
    <text x="0" y="225" font-family="sans-serif" font-size="52" font-weight="900" fill="${colors.ink}">is oddly like you.</text>
    
    <text x="0" y="295" font-family="sans-serif" font-size="24" font-weight="500" fill="${colors.muted}">Five daily picks. One stranger twin.</text>
    
    <!-- Button sticker -->
    <rect x="6" y="346" width="280" height="64" rx="20" fill="${colors.ink}"/>
    <rect x="0" y="340" width="280" height="64" rx="20" fill="${colors.violet}" stroke="${colors.ink}" stroke-width="5"/>
    <text x="140" y="380" font-family="sans-serif" font-size="22" font-weight="bold" fill="${colors.paper}" text-anchor="middle">Play Today's Drop →</text>
  </g>
</svg>`;
}

function renderPng(svg: string, width: number): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
  });
  return resvg.render().asPng();
}

async function main() {
  console.log("Generating PWA and Brand assets matching Sticker Pop design tokens...");

  // 1. favicon.svg
  const faviconSvg = getFaviconSvg();
  fs.writeFileSync(path.join(OUT_DIR, "favicon.svg"), faviconSvg);
  console.log("✓ favicon.svg");

  // 2. favicon-32.png
  const favicon32Png = renderPng(faviconSvg, 32);
  fs.writeFileSync(path.join(OUT_DIR, "favicon-32.png"), favicon32Png);
  console.log("✓ favicon-32.png");

  // 3. apple-touch-icon.png (180x180)
  const appleTouchSvg = getAppIconSvg(180, false);
  const appleTouchPng = renderPng(appleTouchSvg, 180);
  fs.writeFileSync(path.join(OUT_DIR, "apple-touch-icon.png"), appleTouchPng);
  console.log("✓ apple-touch-icon.png");

  // 4. icon-192.png (192x192)
  const icon192Svg = getAppIconSvg(192, false);
  const icon192Png = renderPng(icon192Svg, 192);
  fs.writeFileSync(path.join(OUT_DIR, "icon-192.png"), icon192Png);
  console.log("✓ icon-192.png");

  // 5. icon-512.png (512x512)
  const icon512Svg = getAppIconSvg(512, false);
  const icon512Png = renderPng(icon512Svg, 512);
  fs.writeFileSync(path.join(OUT_DIR, "icon-512.png"), icon512Png);
  console.log("✓ icon-512.png");

  // 6. icon-512-maskable.png (512x512 maskable)
  const iconMaskableSvg = getAppIconSvg(512, true);
  const iconMaskablePng = renderPng(iconMaskableSvg, 512);
  fs.writeFileSync(path.join(OUT_DIR, "icon-512-maskable.png"), iconMaskablePng);
  console.log("✓ icon-512-maskable.png");

  // 7. og-default.png (1200x630)
  const ogSvg = getOgImageSvg();
  const ogPng = renderPng(ogSvg, 1200);
  fs.writeFileSync(path.join(OUT_DIR, "og-default.png"), ogPng);
  console.log("✓ og-default.png");

  console.log("All PWA assets generated successfully in apps/web/public!");
}

main().catch((err) => {
  console.error("Failed to generate PWA assets:", err);
  process.exit(1);
});
