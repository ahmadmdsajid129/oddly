# Stage L0-FIX Report: Documentation Corrections and Standards Alignment

> **Stage Milestone:** Stage L0-FIX (Documentation Cleanup & Alignment — Docs Only, No Code)  
> **Status:** COMPLETE  
> **Date:** 2026-11-22  
> **Branch:** `stage-L0-fix-docs`  
> **Tag:** `stage-L0-fix-complete`  
> **Author:** System Architecture & Matching Team  
> **Reviewer:** Founder  

---

## 1. Status of Assigned Items

### Item 1: `product.md` F34 Config Key Names
- **Status:** DONE
- **Location:** `product.md` line 934
- **Action:** Replaced legacy/inconsistent names (`twin_depth_enabled`, `history_tiebreak_enabled`, `tie_epsilon`, `tie_candidate_k`, `history_window_days`, `min_shared_history_days`) with exact canonical names:
  `- **Feature Flags & Config:** `feature.twin_depth` (bool, default false until Stage L3 is built), `match.history_tiebreak_enabled` (bool), `match.tie_epsilon` (0.01), `match.neighbour_limit_k` (32), `match.history_window_days` (28), `match.history_min_shared_days` (5).`
- **Global Search:** Scanned all `.md` files including `docs/`. Zero other occurrences of the old names existed in any active documentation file.

### Item 2: `product.md` Stale Header and Brand Text
- **Item 2a (Header Date):** DONE — `product.md` line 3 updated to `Last updated: 2026-11-22`.
- **Item 2b (Brand Story Verbatim):** DONE — `product.md` line 175 updated clause from `"the same five for everyone on Earth"` to `"the same five for everyone who picks the same lane"`. Touch no other word. Added Section 16 Change Log with entry `"2026-11-22: Founder-approved edit to 5.1, Stage L0-FIX."` (lines 1165–1169).
- **Item 2c (Core Value "Safe by Design"):** DONE — `product.md` line 188 replaced `"by eliminating free text, chat, and precise locations"` with:
  `"by keeping answers structured, never showing one player's typed words to another, and never showing precise locations. Any text answer or chat feature stays off until its safety gate passes."`
- **Item 2d ("Noticed, not changed"):**
  The following lines in `product.md` contain phrases mentioning "no free text", "no chat", "no profiles" or "the same five for everyone". Kept untouched for Founder review:
  1. `product.md:10` — *"Every day at 07:00 IST, Oddly drops five instinct-based questions—identical for everyone on Earth. Players answer on intuition without profiles, feeds, chat, or followers."* (Section 1 overview summary)
  2. `product.md:90` — *"- **NO chat, DMs, or handle/contact exchange:** Users cannot message their twin or exchange contact info. Handle swap, DMs, and external contact exchange are **Permanently Not Planned** (preventing abuse and stalking by design)."* (Section 3 non-goals)
  3. `product.md:186` — *"1. **Tiny:** Respect human time. Never demand homework, quizzes, or profiles."* (Section 5.2 Core Values)
  4. `product.md:565` — *"- **One-Tap Expressions (The Wave):** Picked from a fixed, curated database set (*(config: `orbit.expression_set`, default: 6 stickers)*, no free text), at most 1 expression per direction per day."* (F19 Keep & Orbit)

### Item 3: Ordering, Numbering & Key Sync Tidy-ups
- **Item 3a (`architecture.md` ADR Reordering):** DONE — `architecture.md` section 18.10 (lines 1041–1080) reordered so blocks strictly run ADR 045, 046, 047, 048, 049, 050. Block count verified before (6) and after (6).
- **Item 3b (`design.md` Section 12C.9 Position):** DONE — `design.md` moved Section 12C.9 ("Bundle Size Budget Guardrails") so it sits before Section 12C.10 (line 615). Duplicate block at line 624 deleted so 12C.9 appears exactly once.
- **Item 3c (`rules.md` Section 6 Renaming):** DONE — `rules.md` lines 147–156 renamed second Section 6 ("Constraints and Guardrails") to `## 6A. Constraints and Guardrails`, with subsections `### 6A.1 Technical & Operational Constraints` and `### 6A.2 Legal & Privacy Guardrails`. Checked all references; `task.md` references to "spec section 6.1, 6.2" point to `docs/admin-panel-spec.md` and were left intact.
- **Config Key Synchronization:** DONE
  - `architecture.md` section 18.2.4: `text.min_confidence` set to `0.7` (line 863); `text.max_questions_per_drop` verified as `1`.
  - `rules.md` section 9.4: `text.max_questions_per_drop` set to `1` (line 252); `match.weight_cap_enabled` added as `match.weight_cap_enabled (true for new lanes, false for Everyday until the Founder decides)`.
  - Both lists now have exactly 27 identical keys with an empty diff.
- **`product.md` F37 and F38 Config Keys:** DONE
  - F37 (line 1028): `feature.say_it` (false in v1), `text.raw_retention_days` (7), `text.history_retention_days` (28), `text.max_chars` (80).
  - F38 (line 1053): `feature.super_twin` (bool), `super.min_lanes` (2), `super.min_similarity` (0.80).

---

## 2. Verification Outputs

### 2.1 Tab Scan
```
$ grep -nP '\t' rules.md product.md architecture.md design.md memory.md task.md docs/*.md
(no hits - 0 tabs found across all files)
```

### 2.2 Bare LaTeX Words Scan
```
$ grep -nE '[^\\a-zA-Z](epsilon|cdot|Vert)[ {_(]' rules.md product.md architecture.md design.md memory.md task.md docs/*.md
docs/stage-L0-prompt.md:424:4. Tie settings: epsilon 0.01, K = 32, history window 28 days, minimum shared days 5?
```
*Note: The single hit is in `docs/stage-L0-prompt.md`, which is a historical prompt reference. Zero hits in all active system documents (`rules.md`, `product.md`, `architecture.md`, `design.md`, `memory.md`, `task.md`, and all other `docs/*.md`).*

### 2.3 Duplicate Headers Scan
```
for f in rules.md product.md architecture.md design.md task.md; do echo $f; grep -E '^#{2,4} ' $f | sort | uniq -d; done

rules.md: (empty - 0 duplicate headers)
product.md: (empty - 0 duplicate headers)
architecture.md: (empty - 0 duplicate headers)
design.md: (empty - 0 duplicate headers)
task.md: (empty - 0 duplicate headers)
```

### 2.4 Config Key Parity (27 Keys)
Side-by-side comparison between `architecture.md` 18.2.4 and `rules.md` 9.4:

| Sorted Architecture 18.2.4 Keys | Sorted Rules 9.4 Keys | Agreement |
|---|---|:---:|
| `lane.closest_so_far_below` | `lane.closest_so_far_below` | MATCH |
| `lane.early_below` | `lane.early_below` | MATCH |
| `lane.expected_players_threshold_for_entropy_rule` | `lane.expected_players_threshold_for_entropy_rule` | MATCH |
| `lane.max_legacy_formats_in_everyday` | `lane.max_legacy_formats_in_everyday` | MATCH |
| `lane.min_approved_drops_to_open` | `lane.min_approved_drops_to_open` | MATCH |
| `lane.min_high_entropy_questions` | `lane.min_high_entropy_questions` | MATCH |
| `lane.missing_drop_alert_hours` | `lane.missing_drop_alert_hours` | MATCH |
| `match.group_size_display_cap` | `match.group_size_display_cap` | MATCH |
| `match.history_min_shared_days` | `match.history_min_shared_days` | MATCH |
| `match.history_tiebreak_enabled` | `match.history_tiebreak_enabled` | MATCH |
| `match.history_window_days` | `match.history_window_days` | MATCH |
| `match.min_questions_compared` | `match.min_questions_compared` | MATCH |
| `match.mutual_pairing_enabled` | `match.mutual_pairing_enabled` | MATCH |
| `match.neighbour_limit_k` | `match.neighbour_limit_k` | MATCH |
| `match.tie_epsilon` | `match.tie_epsilon` | MATCH |
| `match.weight_cap` | `match.weight_cap` | MATCH |
| `match.weight_cap_enabled` | `match.weight_cap_enabled` | MATCH |
| `super.min_lanes` | `super.min_lanes` | MATCH |
| `super.min_similarity` | `super.min_similarity` | MATCH |
| `text.archetype_weight_a` | `text.archetype_weight_a` | MATCH |
| `text.disable_days` | `text.disable_days` | MATCH |
| `text.history_retention_days` | `text.history_retention_days` | MATCH |
| `text.max_chars` | `text.max_chars` | MATCH |
| `text.max_questions_per_drop` | `text.max_questions_per_drop` | MATCH |
| `text.min_confidence` | `text.min_confidence` | MATCH |
| `text.raw_retention_days` | `text.raw_retention_days` | MATCH |
| `text.rejection_limit_per_day` | `text.rejection_limit_per_day` | MATCH |

**Diff output:**
```
$ Compare-Object $arch $rules
(empty - 0 differences across all 27 keys)
```

### 2.5 Information Weight Cap Verification
Every mention of `match.weight_cap` across the repository specifies **3.5 bits**:
- `architecture.md:848` — `match.weight_cap | Float | 3.5`
- `architecture.md:932` — `W_max = 3.5 bits (config match.weight_cap)`
- `rules.md:252` — `match.weight_cap (3.5)`
- `product.md:897` — `match.weight_cap (default: 3.5 bits)`
- `docs/lanes-and-matching.md:32` — `w_max = 3.5 (config: match.weight_cap)`
- `docs/admin-panel-spec.md:664` — `match.weight_cap (3.5)`

---

## 3. Scope Confirmation

- **Zero code files touched:** No files in `apps/`, `services/`, `packages/*/src` modified.
- **Zero migrations or seeds touched:** No database files or prisma schemas modified.
- **Zero package configs touched:** `package.json`, `pnpm-lock.yaml`, and workspace configs untouched.
- **Documentation only:** All changes strictly confined to Markdown documentation files.
