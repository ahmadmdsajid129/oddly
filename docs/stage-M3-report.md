# Stage M3 Report: Meme Lab — User Captions & Moderation Queue (Phase 10G)

**Date:** 2026-11-20  
**Branch:** `main` (synchronized with `origin/main`)  
**Commit Milestone:** `stage-M3-complete`  
**Prerequisites:** Stage M2 (Phase 10F: Signals Foundation)  
**Status:** **COMPLETE (9/9 Tasks Delivered, 100% Monorepo Verification)**

---

## 1. Executive Summary

Phase 10G (Stage M3) delivers the **Meme Lab**, introducing user-authored captions and an asynchronous moderation and exposure pipeline for Oddly v1.

The implementation strictly satisfies:
- **`rules.md` Rule 18 (Scoped Free-Text Exception):** User captions are strictly limited to $\le 100$ characters and are completely isolated with **zero public exposure** until passed through human moderation in Mission Control.
- **Design System & UI Pattern Rule:** Warm cream desk (`#FFF8F0`), ink outline (`2.5px solid #14123A`), hard offset shadow (`4px 4px 0 #14123A` with 0 blur), tactile press-flat interaction, `@oddly/ui-tokens` imports only, and touch targets $\ge 44 \times 44\text{px}$.
- **Non-Drop Surface Isolation:** Meme Corner and Meme Lab operate strictly on non-Drop surfaces (`/recap`, `/memes/new`), completely decoupled from the core 5-question daily Drop matching engine.
- **ADR 043 (Wilson Lower Bound Scoring & Two-Person Approval):** A rigorous binomial Wilson score lower bound calculation with a minimum 200-rater threshold ($N \ge 200$) before promotion eligibility, and a mandatory two-person dual-admin approval workflow before inclusion in daily Drops.

---

## 2. Deliverables & Verification Matrix

| Task ID | Deliverable | Spec Reference | Status | Verification |
|---|---|---|---|---|
| `P10G.01` | Database migrations: `meme_submissions`, `meme_ratings`, `meme_stats`, `meme_exposures`, `moderation_actions`, `app_config` seeds | ADR 043, Schema 007 | **DONE** | Migration `007_meme_lab.sql` applied to PostgreSQL 16; Prisma Client v5.22.0 models generated. |
| `P10G.02` | Meme Lab submission API: `POST /v1/memes/submissions` (Turnstile, duplicate check, $\le 100$ char limit) | Rule 18, `memes.ts` | **DONE** | Validates Turnstile, enforces Rule 18 length cap, exact and Levenshtein near-duplicate rejection, daily cap 2/day, sheds at L2+. |
| `P10G.03` | Caption composer UI (`/memes/new`) with template carousel, live preview, and character counter | Design System, `apps/web/src/app/memes/new` | **DONE** | Vector illustration carousel, live sticker card preview, dynamic $\le 100$ char counter with warning at 85 chars, $\ge 44\text{px}$ targets. |
| `P10G.04` | Post-drop Meme Corner card on `/recap` with "Funny" and "Not for me" reaction buttons | Non-Drop Surface, `MemeCornerCard.tsx` | **DONE** | Tactile sticker card, binary reaction buttons with press-flat interaction, and creator CTA to `/memes/new`. |
| `P10G.05` | Rating ingestion API `POST /v1/memes/:id/rating` and Wilson score worker | ADR 043, `WilsonScoringJob` | **DONE** | Enforces 1 vote per user (409 ALREADY_RATED), real-time and batch Wilson scoring with $N \ge 200$ threshold guard. |
| `P10G.06` | Exposure engine: 80% exploitation / 20% exploration traffic, freshness retirement, and diversity caps | `MemesRepository`, `GET /v1/memes/corner` | **DONE** | 80/20 traffic allocation, zero duplicate impressions per user, 7-day template cooldown, author exclusion, 14-day freshness retirement. |
| `P10G.07` | Drop candidate list generation in Mission Control with two-person approval workflow | Section A5.2, `/v1/admin/memes/*` | **DONE** | Filters $N \ge 200$ and $\text{wilson\_lb} \ge 0.70$. Step 1 promote; Step 2 dual approval enforces promoter $\ne$ approver (403 on violation). |
| `P10G.08` | Creator delete flow (`DELETE /v1/memes/:id`) and moderation takedown actions | Section A5.1, `memes.ts` | **DONE** | Author self-service soft-deletion (status $\to$ `retired`); moderator instant takedown with immutable audit logging. |
| `P10G.09` | Automated abuse-case tests: rating brigading, sockpuppets, rate limits, and Turnstile bypass | Anti-abuse suite, `memes-abuse.integration.test.ts` | **DONE** | 11 automated abuse scenarios verified: Turnstile bypass, daily spam cap, duplicate caption, sockpuppet ring resistance, privilege escalation. |

---

## 3. Core Architectural Invariants Proven

### 1. Rule 18 Free-Text Exception Invariant
- Community free-text input is restricted solely to Meme Lab captions.
- Hard validation caps caption length at $\le 100$ characters.
- Initial submission status is strictly `'queued'`.
- The Exposure Engine (`selectMemeForPlayer`) exclusively queries `'approved'` memes, guaranteeing **zero public exposure** for unmoderated content.

### 2. ADR 043 Wilson Score Lower Bound & Sockpuppet Ring Resistance
- Normal ratio ratings ($\frac{\text{positive}}{\text{total}}$) are vulnerable to small sample bias.
- Oddly calculates the 95% confidence lower bound of the binomial distribution:
  $$W = \frac{\hat{p} + \frac{z^2}{2n} - z \sqrt{\frac{\hat{p}(1-\hat{p}) + \frac{z^2}{4n}}{n}}}{1 + \frac{z^2}{n}} \quad (z = 1.95996)$$
- **200 Rater Threshold Guard:** Until a submission collects $N \ge 200$ ratings, its Wilson score lower bound is strictly held at `0.0`. A ring of 10–50 sockpuppet accounts voting 100% "funny" receives zero ranking advantage.

### 3. Two-Person Dual-Admin Approval Rule
- To maintain editorial tone and prevent accidental or rogue promotion of community memes into live daily Drops, Mission Control enforces a two-person rule:
  $$\text{Promoter Admin ID} \ne \text{Approver Admin ID}$$
- An administrator who promotes a meme candidate into the Drop pool cannot provide the second approval. Attempts are blocked at the API layer with HTTP `403 TWO_PERSON_RULE_VIOLATION`.

### 4. Balanced Exposure & Diversity Caps
- **80% Exploitation:** Serves top-rated community memes ($N \ge 200$) ordered by descending Wilson score.
- **20% Exploration:** Serves fresh submissions ($N < 200$) ordered by least impressions to ensure every caption gathers votes.
- **Diversity Caps:** A user is never shown the same submission twice; template cooldown prevents showing the same illustration template within 7 days; authors are excluded from seeing their own submissions.

---

## 4. Test Suite Summary

Total Meme Lab test coverage across monorepo: **60 passing tests**:

1. **API Meme Submission Integration (`memes.integration.test.ts`):** 17/17 passed
2. **API Exposure Engine Integration (`memes-exposure.integration.test.ts`):** 7/7 passed
3. **API Candidate & Dual-Approval Integration (`memes-candidate.integration.test.ts`):** 7/7 passed
4. **API Creator Deletion & Takedowns (`memes-takedown.integration.test.ts`):** 7/7 passed
5. **API Automated Anti-Abuse Suite (`memes-abuse.integration.test.ts`):** 11/11 passed
6. **Worker Wilson Score Recalculation (`wilson-scoring.test.ts`):** 3/3 passed
7. **Frontend Meme Corner Card (`meme-corner.test.ts`):** 5/5 passed
8. **Frontend Caption Composer (`meme-composer.test.ts`):** 9/9 passed
9. **Monorepo Build & Quality:**
   - `turbo run typecheck`: 6/6 packages passing (0 type errors)
   - `turbo run lint`: 6/6 packages passing (0 ESLint errors or warnings)
   - `apps/web` production build: `/memes/new` static route prerendered cleanly (8.6 kB)

---

## 5. Next Steps

Stage M3 (Phase 10G) is **100% complete**. All code, database migrations, tests, and documentation are committed and pushed directly to `main`.

Per Rule 1, execution is paused for Founder review and authorization before initiating Stage M4 (Phase 10H: Insights Engine — Statistics Only).

