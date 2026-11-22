import fs from 'node:fs';

const path = 'rules.md';
let content = fs.readFileSync(path, 'utf8');

// 1. Callout for Rule 1 and Theme legend under Section 1
if (!content.includes('callout-rule-1')) {
  const target = `## 1. Absolute Rules (Never Break)`;
  const headerBlock = `## 1. Absolute Rules (Never Break)

<!-- visual:start callout-rule-1 -->
> [!IMPORTANT]
> **Rule 1: Stop After Every Stage**  
> You must NEVER build multiple stages in one turn. Complete the assigned stage, update \`task.md\` and \`memory.md\`, emit the Stage Report, and immediately **STOP**. Wait for Founder instructions before proceeding.
<!-- visual:end callout-rule-1 -->

<!-- visual:start theme-legend -->
| Theme | Emoji | Core Focus |
|---|---|---|
| Stop & Scope | 🛑 | Stage boundaries, scope containment, and Founder gate controls |
| Privacy & Safety | 🔒 | DPDP compliance, zero deanonymisation, safety filters, and moderation |
| Testing & Quality | 🧪 | Honest tests, zero masked lint failures, and type safety |
| Data & Migrations | 🗄️ | Append-only logs, zero data loss, dynamic database state, and migrations |
| Design & Motion | 🎨 | Responsive performance, reduced-motion support, and UI token adherence |
| Money & Pressure | 💸 | Free-forever core loop, unpaywalled lanes, and zero coercive monetization |
| Lanes & Drops | 🛤️ | Lane isolation, Drop parity, deterministic tie-breaking, and honest counts |
<!-- visual:end theme-legend -->
`;
  content = content.replace(target, headerBlock);
}

// 2. Theme emojis for rules 1 to 28
const ruleEmojis = [
  { match: '1. **Stop After Every Stage:**', repl: '1. 🛑 **Stop After Every Stage:**' },
  { match: '2. **Never Fake Data or Matches:**', repl: '2. 🔒 **Never Fake Data or Matches:**' },
  { match: '3. **No Free-Text User Input:**', repl: '3. 🔒 **No Free-Text User Input:**' },
  { match: '4. **Never Expose Identifiers or Vectors:**', repl: '4. 🔒 **Never Expose Identifiers or Vectors:**' },
  { match: '5. **Never Commit Secrets:**', repl: '5. 🔒 **Never Commit Secrets:**' },
  { match: '6. **Strict MVP Scope Boundaries:**', repl: '6. 🛑 **Strict MVP Scope Boundaries:**' },
  { match: '7. **Never Hide Failing Tests or Lint Errors:**', repl: '7. 🧪 **Never Hide Failing Tests or Lint Errors:**' },
  { match: '8. **Never Overwrite or Rewrite History in `memory.md`:**', repl: '8. 🗄️ **Never Overwrite or Rewrite History in `memory.md`:**' },
  { match: '9. **No Unrecorded Dependencies:**', repl: '9. 🗄️ **No Unrecorded Dependencies:**' },
  { match: '10. **Never Block Interaction with Animation:**', repl: '10. 🎨 **Never Block Interaction with Animation:**' },
  { match: '11. **Everything Dynamic from Database (Override Addendum):**', repl: '11. 🗄️ **Everything Dynamic from Database (Override Addendum):**' },
  { match: '12. **Identical Drop Rule (Amended in Stage L0; Founder-approved, L0):**', repl: '12. 🛤️ **Identical Drop Rule (Amended in Stage L0; Founder-approved, L0):**' },
  { match: '13. **Lane Isolation (Founder-approved, L0; Rule L2):**', repl: '13. 🛤️ **Lane Isolation (Founder-approved, L0; Rule L2):**' },
  { match: '14. **No Text Shown to Another Player (Founder-approved, L0; Rule L3):**', repl: '14. 🔒 **No Text Shown to Another Player (Founder-approved, L0; Rule L3):**' },
  { match: '15. **Tie-Breaks are Auditable and Deterministic (Founder-approved, L0; Rule L4):**', repl: '15. 🛤️ **Tie-Breaks are Auditable and Deterministic (Founder-approved, L0; Rule L4):**' },
  { match: '16. **Honest Lane Stats (Founder-approved, L0; Rule L5):**', repl: '16. 🛤️ **Honest Lane Stats (Founder-approved, L0; Rule L5):**' },
  { match: '17. **No Pressure to Pay (Founder-approved, M0; extends Rule 3 \'Never Do\'):**', repl: '17. 💸 **No Pressure to Pay (Founder-approved, M0; extends Rule 3 \'Never Do\'):**' },
  { match: '18. **Meme Lab Rules (Founder-approved, M0):**', repl: '18. 🛤️ **Meme Lab Rules (Founder-approved, M0):**' },
  { match: '19. **Meme Moderation is Final and Fast (Founder-approved, M0):**', repl: '19. 🔒 **Meme Moderation is Final and Fast (Founder-approved, M0):**' },
  { match: '20. **Creator Consent and Anonymous Recognition (Founder-approved, M0):**', repl: '20. 🔒 **Creator Consent and Anonymous Recognition (Founder-approved, M0):**' },
  { match: '21. **Meme Drops Are the Same for All Players (Founder-approved, M0):**', repl: '21. 🛤️ **Meme Drops Are the Same for All Players (Founder-approved, M0):**' },
  { match: '22. **Analytics Only with Explicit Consent (Founder-approved, M0):**', repl: '22. 🔒 **Analytics Only with Explicit Consent (Founder-approved, M0):**' },
  { match: '23. **Forbidden Topics Stay Forbidden in Every Lane and Every Format (Founder-approved, L0; Rule L6):**', repl: '23. 🔒 **Forbidden Topics Stay Forbidden in Every Lane and Every Format (Founder-approved, L0; Rule L6):**' },
  { match: '24. **Situations Lane Safety (Founder-approved, L0; Rule L7):**', repl: '24. 🔒 **Situations Lane Safety (Founder-approved, L0; Rule L7):**' },
  { match: '25. **Lane Parity (Founder-approved, L0; Rule L8):**', repl: '25. 💸 **Lane Parity (Founder-approved, L0; Rule L8):**' },
  { match: '26. **No Lane Without a Drop (Founder-approved, L0; Rule L9):**', repl: '26. 🛤️ **No Lane Without a Drop (Founder-approved, L0; Rule L9):**' },
  { match: '27. **First-Run Promise (Founder-approved, L0; Rule L10):**', repl: '27. 🛤️ **First-Run Promise (Founder-approved, L0; Rule L10):**' },
  { match: '28. **Lane Choice is the Player\'s Own (Founder-approved, L0; Rule L11):**', repl: '28. 🛤️ **Lane Choice is the Player\'s Own (Founder-approved, L0; Rule L11):**' }
];

for (const r of ruleEmojis) {
  if (content.includes(r.match)) {
    content = content.replace(r.match, r.repl);
  }
}

// 3. Callout for Rule 17 (No pressure to pay)
if (!content.includes('callout-rule-17')) {
  const target = `17. 💸 **No Pressure to Pay (Founder-approved, M0; extends Rule 3 'Never Do'):**`;
  const callout = `<!-- visual:start callout-rule-17 -->
> [!WARNING]
> **Rule 17: No Pressure to Pay**  
> Daily play is always free. Never use guilt copy, fake urgency, countdowns, scarcity or "your streak is about to die" prompts to sell anything. Never show an offer at the moment of a streak break. Max 1 offer per 14 days (*config*); after 2 dismissals, stop for 90 days (*config*). Cancellation is as easy as purchase. Prices shown plainly.
<!-- visual:end callout-rule-17 -->

17. 💸 **No Pressure to Pay (Founder-approved, M0; extends Rule 3 'Never Do'):**`;
  content = content.replace(target, callout);
}

// 4. Callout for Section 9.1 Forbidden Topics
if (!content.includes('callout-forbidden-topics')) {
  const target = `### 9.1 Forbidden Topic List (Enforced by Admin Importer)`;
  const callout = `### 9.1 Forbidden Topic List (Enforced by Admin Importer)

<!-- visual:start callout-forbidden-topics -->
> [!WARNING]
> **Zero-Tolerance Forbidden Topics**  
> Questions, options, scenario texts, archetype labels, tags, alt text or free-text prompts must NEVER touch: politics (parties, leaders, elections, policies), religion, caste, sexuality, health, mental state, body image, income, or real named people/brands as targets of judgement. Automated tests fail the build when any seeded item matches this list.
<!-- visual:end callout-forbidden-topics -->
`;
  content = content.replace(target, callout);
}

// 5. Error matrix log level emojis
content = content.replace('| `warn`           | No retry; fix input', '| 🟡 `warn`        | No retry; fix input');
content = content.replace('| `info`           | 1 silent retry', '| 🟢 `info`        | 1 silent retry');
content = content.replace('| `warn`           | No retry                         |', '| 🟡 `warn`        | No retry                         |');
content = content.replace('| `info`           | No retry                         |', '| 🟢 `info`        | No retry                         |');
content = content.replace('| `info`           | Poll with exponential backoff', '| 🟢 `info`        | Poll with exponential backoff');
content = content.replace('| `info`           | No retry; redirect to recap', '| 🟢 `info`        | No retry; redirect to recap');
content = content.replace('| `info`           | No retry                         |', '| 🟢 `info`        | No retry                         |');
content = content.replace('| `warn`           | Retry strictly after `Retry-After` header |', '| 🟡 `warn`        | Retry strictly after `Retry-After` header |');
content = content.replace('| `info`           | Poll with backoff & jitter (5s, 10s, 30s) |', '| 🟢 `info`        | Poll with backoff & jitter (5s, 10s, 30s) |');
content = content.replace('| `warn`           | Exponential backoff with jitter + `Retry-After` |', '| 🟡 `warn`        | Exponential backoff with jitter + `Retry-After` |');
content = content.replace('| `warn`           | Retry on human solve', '| 🟡 `warn`        | Retry on human solve');
content = content.replace('| `info`           | Exponential backoff (500ms, 1s, 2s, 4s, 8s + jitter) |', '| 🟢 `info`        | Exponential backoff (500ms, 1s, 2s, 4s, 8s + jitter) |');
content = content.replace('| `error` (Sentry) | Manual retry button', '| 🔴 `error` (Sentry) | Manual retry button');
content = content.replace('| `error` (Alert)  | Backoff poll', '| 🔴 `error` (Alert)  | Backoff poll');
content = content.replace('| `warn`           | Automatic worker retry', '| 🟡 `warn`        | Automatic worker retry');

fs.writeFileSync(path, content, 'utf8');
console.log('Applied B6 visuals to rules.md');
