import fs from 'node:fs';

const path = 'design.md';
let content = fs.readFileSync(path, 'utf8');

// 1. Palette SVG at top of Section 2
if (!content.includes('palette-svg')) {
  const target = `## 2. Colour tokens`;
  const block = `## 2. Colour tokens

<!-- visual:start palette-svg -->
![Oddly Colour Palette](docs/assets/palette.svg)
<!-- visual:end palette-svg -->
`;
  content = content.replace(target, block);
}

// 2. Tier chip row at Section 2.3
content = content.replace('| Common | 0 to 50 |', '| 🟪 Common | 0 to 50 |');
content = content.replace('| Uncommon | 50 to 80 |', '| 🟪 Uncommon | 50 to 80 |');
content = content.replace('| Rare | 80 to 95 |', '| 🟨 Rare | 80 to 95 |');
content = content.replace('| Mythic | 95 to 100 |', '| 🌈 Mythic | 95 to 100 |');

// 3. Typography specimen
if (!content.includes('typography-specimen')) {
  const target = `Type scale (mobile-first; use \`clamp\` where noted). Sizes in px, line-height in parentheses:`;
  const specimen = `<!-- visual:start typography-specimen -->
| Scale | Token | Specimen (Size / Leading) | Family | Usage Role |
|---|---|---|---|---|
| 🔠 56px | \`display-xl\` | **Aa** \`clamp(40, 12vw, 56)\` (1.0) | Bricolage Grotesque 800 | Share-card hero number ("4 of 5") |
| 🔠 32px | \`display-l\` | **Aa** \`clamp(26, 7vw, 32)\` (1.1) | Bricolage Grotesque 800 | Question text |
| 🔠 20px | \`display-m\` | **Aa** 20px (1.2) | Bricolage Grotesque 700 | Screen titles |
| 🔠 16px | \`button\` | **Aa** 16px (1.0) | Bricolage Grotesque 700 | All buttons and option rows |
| 🔡 12px | \`chip\` | **Aa** 12px (1.0) | Bricolage Grotesque 700 | Chips, badges |
| 📝 16px | \`body\` | Aa 16px (1.5) | Inter 400 | Paragraphs |
| 📝 14px | \`body-s\` | Aa 14px (1.5) | Inter 400/500 | Helper text |
| 📝 12px | \`caption\` | Aa 12px (1.4) | Inter 500 | Footnotes, never below 12 |
<!-- visual:end typography-specimen -->

Type scale (mobile-first; use \`clamp\` where noted). Sizes in px, line-height in parentheses:`;
  content = content.replace(target, specimen);
}

// 4. Component states table with emojis in Section 5
content = content.replace('| Rest | As above |', '| 🟢 Rest | As above |');
content = content.replace('| Hover (only inside `@media (hover:hover) and (pointer:fine)`) |', '| 🟡 Hover (only inside `@media (hover:hover) and (pointer:fine)`) |');
content = content.replace('| Pressed / `:active` (touch and mouse) |', '| 🟠 Pressed / `:active` (touch and mouse) |');
content = content.replace('| Focus-visible | Keep the outline,', '| 🔵 Focus-visible | Keep the outline,');
content = content.replace('| Loading | Label replaced by 3 bouncing dots', '| ⏳ Loading | Label replaced by 3 bouncing dots');
content = content.replace('| Disabled | **Avoid disabling.**', '| ⚪ Disabled | **Avoid disabling.**');
content = content.replace('| Success flash | After a successful action,', '| ✨ Success flash | After a successful action,');

fs.writeFileSync(path, content, 'utf8');
console.log('Applied B5 visuals to design.md');
