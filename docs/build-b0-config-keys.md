# Stage B0: App Config Keys Registry

This file documents every dynamic configuration key used across the Stage B0 build. All keys are loaded through the cached `app_config` reader with fallback to default values, never hardcoded in application logic.

| Key Name | Default Value | Type | Unit | Slice | Read By (File) | Used in Code? | Meaning & Operational Context |
|---|---|---|---|---|---|---|---|
| `lane.min_approved_drops_to_open` | `3` | `integer` | count | A1 | `services/api/src/routes/lanes.ts` | Yes | Minimum approved upcoming Drops required for a lane to transition to `open` status. |
| `lane.early_below` | `200` | `integer` | players | A1 | `packages/shared/src/seeds/lanes-seed.ts` | Planned | Threshold below which a lane displays the "Early lane" status chip. |
| `lane.closest_so_far_below` | `200` | `integer` | players | A3 | `packages/shared/src/matching.ts` | Planned | Threshold below which a twin match is labeled "Closest so far". |
| `match.neighbour_limit_k` | `32` | `integer` | count | A3 | `packages/shared/src/mutual-pairing.ts` | Yes | Size $K$ of candidate subgraph for tie group and mutual pairing search. |
| `match.tie_epsilon` | `0.01` | `float` | score | A3 | `packages/shared/src/tie-breaker.ts` | Yes | Maximum score difference $\epsilon$ from best candidate to form a tie group. |
| `match.weight_cap` | `3.5` | `float` | bits | A2 | `packages/shared/src/formats.ts` | Yes | Information weight cap $\max(I(a))$ to prevent extreme single-question dominance. |
| `match.min_questions_compared` | `3` | `integer` | count | A2 | `packages/shared/src/formats.ts` | Yes | Minimum questions two players must share for a valid similarity score. |
| `match.history_min_shared_days` | `5` | `integer` | days | A3 | `packages/shared/src/tie-breaker.ts` | Yes | Minimum shared play days within history window for BitMinHash agreement $H(u,v)$. |
| `match.history_window_days` | `28` | `integer` | days | A3 | `packages/shared/src/tie-breaker.ts` | Planned | Trailing calendar window for BitMinHash history signature aggregation. |
| `orbit.request_expiry_hours` | `48` | `integer` | hours | A7 | `services/api/src/routes/orbits.ts` | Planned | Expiration time for pending Keep requests before auto-expiring. |
| `orbit.max_active` | `3` | `integer` | count | A7 | `services/api/src/config/orbit.config.ts` | Yes | Maximum active Orbits a player may hold across all lanes simultaneously. |
| `orbit.rerequest_block_days` | `30` | `integer` | days | A7 | `services/api/src/routes/orbits.ts` | Planned | Cooldown period before a severed pair can re-request a Keep. |
| `telepathy.min_rounds` | `5` | `integer` | rounds | A8 | `packages/shared/src/telepathy.ts` | Planned | Minimum completed Telepathy rounds required before revealing Sync score. |
| `globe.delay_seconds` | `90` | `integer` | seconds | A9 | `services/worker/src/workers/globe.worker.ts` | Yes | Minimum time delay for publishing twin formation arcs to the Twin Globe. |
| `globe.min_live_arcs` | `10` | `integer` | count | A9 | `services/api/src/routes/globe.ts` | Planned | Minimum live arcs required before falling back to labelled historical replay. |
| `antitwin.sample` | `2000` | `integer` | players | A10 | `packages/shared/src/antitwin.ts` | Yes | Bounded candidate pool size sampled for determining today's Anti-twin. |
| `antitwin.min_pool` | `200` | `integer` | players | A10 | `packages/shared/src/antitwin.ts` | Yes | Minimum lane pool size required today for Anti-twin feature to activate. |
| `sync.min_shared` | `5` | `integer` | questions | A11 | `services/api/src/routes/orbits.ts` | Yes | Minimum shared questions on a subject tag before displaying tag agreement rate. |
| `unlock.streak.days` | `3` | `integer` | days | A12 | `services/api/src/routes/orbits.ts` | Planned | Required consecutive shared play days + expression for Door 2 (Streak). |
| `unlock.sync.min_score` | `0.60` | `float` | ratio | A12 | `services/api/src/routes/orbits.ts` | Planned | Minimum Sync accuracy ratio required for Door 3 (Sync). |
| `unlock.sync.rounds` | `5` | `integer` | rounds | A12 | `services/api/src/routes/orbits.ts` | Planned | Minimum completed Telepathy rounds required for Door 3 (Sync). |
| `unlock.trial.prompts` | `8` | `integer` | count | A12 | `services/api/src/routes/orbits.ts` | Planned | Number of 2-option prompts presented per Duo Trial attempt (Door 1). |
| `unlock.trial.window_hours` | `24` | `integer` | hours | A12 | `services/api/src/routes/orbits.ts` | Planned | Time window for partner to complete their trial picks before attempt expires. |
| `unlock.trial.pass_start` | `5` | `integer` | count | A12 | `services/api/src/routes/orbits.ts` | Planned | Initial required matching picks out of 8 to pass Duo Trial. |
| `unlock.trial.pass_floor` | `3` | `integer` | count | A12 | `services/api/src/routes/orbits.ts` | Planned | Minimum adaptive pass floor after repeated failed trial attempts. |
| `unlock.trial.cooldown_minutes` | `10` | `integer` | minutes | A12 | `services/api/src/routes/orbits.ts` | Planned | Cooldown time between starting new Duo Trial attempts in an Orbit. |
| `unlock.trial.retention_days` | `14` | `integer` | days | A12 | `services/worker/src/jobs/purge.job.ts` | Planned | Retention duration for detailed trial answers before automated purging. |
| `bonus.min_tie_size` | `3` | `integer` | players | B1 | `services/worker/src/jobs/bonus.job.ts` | Planned | Minimum tie group size required to trigger an additive bonus round offer (product.md F40 wrote 2; set to 3 per prompt conflict C-12). |
| `bonus.max_rounds` | `2` | `integer` | count | B1 | `services/worker/src/jobs/bonus.job.ts` | Planned | Maximum bonus rounds allowed for an unresolved tie group on a Drop. |
| `bonus.questions_per_round` | `3` | `integer` | count | B1 | `services/worker/src/jobs/bonus.job.ts` | Planned | Number of evergreen questions presented in a bonus round. |
| `bonus.pool_min_per_lane` | `40` | `integer` | count | B1 | `services/worker/src/jobs/bonus.job.ts` | Planned | Minimum evergreen questions required in lane bonus pool to offer rounds. |
| `bonus.window_hours` | `24` | `integer` | hours | B1 | `services/worker/src/jobs/bonus.job.ts` | Planned | Duration bonus round remains open for tie group participants. |
| `bonus.min_participants` | `3` | `integer` | count | B1 | `services/worker/src/jobs/bonus.job.ts` | Planned | Minimum participants who must complete bonus round for computation to execute (set to 3 per conflict C-12). |
| `bonus.retention_days` | `28` | `integer` | days | B1 | `services/worker/src/jobs/purge.job.ts` | Planned | Retention duration for raw bonus answers before automated purging. |
| `super.min_lanes` | `2` | `integer` | lanes | B2 | `services/worker/src/jobs/super-twin.job.ts` | Planned | Minimum distinct lanes where same candidate must be twin to qualify as Super Twin. |
| `super.min_similarity` | `0.80` | `float` | score | B2 | `services/worker/src/jobs/super-twin.job.ts` | Planned | Minimum per-lane similarity required in qualifying lanes for Super Twin. |
| `badge.tier1_lanes` | `2` | `integer` | lanes | B3 | `services/worker/src/jobs/collector-badge.job.ts` | Planned | Qualifying lanes required for Tier 1 Collector Badge. |
| `badge.tier2_lanes` | `3` | `integer` | lanes | B3 | `services/worker/src/jobs/collector-badge.job.ts` | Planned | Qualifying lanes required for Tier 2 Collector Badge. |
| `badge.tier3_lanes` | `5` | `integer` | lanes | B3 | `services/worker/src/jobs/collector-badge.job.ts` | Planned | Qualifying lanes required for Tier 3 Collector Badge. |
| `badge.min_similarity` | `0.60` | `float` | score | B3 | `services/worker/src/jobs/collector-badge.job.ts` | Planned | Minimum similarity score with twin for a lane to count toward Collector badge. |
| `badge.rarity_min_population` | `500` | `integer` | players | B3 | `services/api/src/routes/badges.ts` | Planned | Minimum player population required to display percentage rarity on badge card. |
| `friend.invite_expiry_days` | `7` | `integer` | days | B5 | `services/api/src/routes/friends.ts` | Planned | Expiry window for single-use friend Orbit invite links. |
| `friends.max_group` | `30` | `integer` | members | B5 | `services/api/src/routes/friends.ts` | Planned | Maximum allowed members in a Friends Compare group. |
