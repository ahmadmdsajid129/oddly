<USER_REQUEST>
# STAGE R2: RELIABILITY REMEDIATION, WAVE 2 (prompt for the AI coding agent)

> Prerequisite: Stage R1 and R1-PATCH are complete and reviewed. If R1-PATCH is not done, stop and tell the Founder.
> Follow the staged protocol: update `task.md` and `memory.md` as you work, mark a task DONE only if code AND a test prove it, print a Stage Report with exact verification commands, then STOP and wait.
> Code changes are allowed ONLY for the items below. If anything conflicts with the Scale and Reliability Addendum, stop and ask.

## Ground rules for this stage

1. **No production data exists yet,** so schema changes may be destructive in development. Still write every migration in expand, migrate, contract style and rehearse it on a database seeded with 1,000,000 synthetic rows.
2. **Real infrastructure in tests.** Tests for partitioning, Redis roles, caching and circuit breakers must run against real Postgres 16 and Redis 7 (Docker), not mocks or simulators. In `memory.md` state for each test whether it used real services or mocks. If Docker (or real Postgres and Redis) is not available on the Founder's machine, STOP after reporting that and ask the Founder to fix the environment; do not substitute mocks for the proofs in R2.0 to R2.4.
3. **Everything tunable lives in `app_config`** (thresholds, intervals, TTLs, caps), read through the cached config layer. Env vars hold only connection strings and process limits.
4. **Dependencies allowed in this stage** (record each in `architecture.md` with version, purpose, feature): `opossum`, `prom-client`, `size-limit` (with the file plugin), `@axe-core/playwright`. Nothing else without asking.
5. **Out of scope (do not build):** async persist Mode B (keep the `PERSIST_MODE` flag and a clearly labelled stub; document it for a later wave), distributed tracing, dashboards, synthetic probes and status page (Stage 12), load tests (Stage 13), infrastructure as code (Stage 14).

---

## R2.0 Real-infrastructure gate (do this FIRST)

The R1 and R1-PATCH proofs ran against mocks and simulators (MockRedis, simulated statement-timeout aborts, in-memory repositories). Until they pass on real services they are not proven.

1. Confirm `docker --version` and `docker compose version` work, then start Postgres 16 and Redis 7 from `infra/docker-compose.yml`. If they do not work, stop and tell the Founder exactly what is missing.
2. Add a separate suite `pnpm test:integration` (and a CI job with service containers) that runs against the real services and does not use `MockRedis` or in-memory repositories. Keep the fast mocked unit tests as they are.
3. Port these proofs to the integration suite and run them for real:
   a) `pg_sleep(5)` through the API's database client is cancelled at about 3 s with SQLSTATE 57014, on every pooled connection (run it 20 times concurrently); worker and final-batch queries use their longer timeouts;
   b) two real API processes sharing a real Redis receive 20 concurrent duplicate submissions: exactly one row is written and the others get the correct duplicate or 409 response;
   c) the 10,000-player pipeline with real Postgres: stage, open, close, chunked final batch, with timings recorded;
   d) kill the real worker process mid final-batch, restart it, and show only unfinished chunks rerun and the final results match an uninterrupted run byte for byte;
   e) the real Redis-backed rate limiter limits across two API processes;
   f) SIGTERM to the real API process with a request in flight lets the request finish.
4. Fix whatever breaks. Report each failure and fix honestly in `memory.md` (Bugs and fixes). Continue to R2.1 only when all six pass, and list the results in the Stage Report.

---

## R2.1 Table partitioning and retention (Stage 2 gap)

- Range-partition `submissions`, `answers` (submission_answers), `matches` and `answer_stats` by a `drop_date` column, using raw SQL migrations (Prisma does not manage partitions natively). Keep the Prisma models mapped to the parent tables, and add a CI guard so `prisma migrate` can never drop or recreate a partitioned table (for example a `prisma migrate diff` check).
- **Constraint design:** unique keys on a partitioned table must include the partition key. Use `(drop_date, request_id)` and `(drop_date, user_id)` unique indexes, and denormalise `drop_date` onto child tables with composite keys. Explain in `architecture.md` how idempotency still works (the client always sends the drop id, so `drop_date` is derivable; the Redis lock covers cross-day duplicates).
- Add a `DEFAULT` partition that raises an alert when it receives rows (a partition was missed).
- **Partition manager job** (worker, scheduled, idempotent): pre-create partitions at least 14 days ahead; alert when fewer than 7 future partitions exist.
- **Retention job** (config: `retention_answers_days` default 90, `retention_guest_days` default 90, `retention_matches_days` default 365): before dropping an `answers` partition, make sure per-user summaries already exist; then detach and drop the partition. History must keep working from `matches` and summaries. Guests expire by inactivity.
- **Proof:** a test that `EXPLAIN` shows partition pruning on the hot queries (submit lookup, result lookup, final-batch scan); a benchmark script `pnpm bench:partition` that inserts 1,000,000 synthetic submissions (about 7 rows each) and reports insert rate and p95 for the hot queries, partitioned versus not; a test that a missing partition triggers the default-partition alert; a test that the retention job leaves history intact.

## R2.2 Redis roles, key hygiene and TTLs

- Create three clients from one factory: `cache`, `counters`, `queue`, reading `CACHE_REDIS_URL`, `COUNTERS_REDIS_URL`, `QUEUE_REDIS_URL` (fall back to `REDIS_URL` when unset, with a startup warning in production). BullMQ uses the `queue` client (with `maxRetriesPerRequest: null`).
- Role assignment: `cache` = content, config, Drop JSON, rate-limit counters (eviction allowed); `counters` = live answer counters, vectors, buckets, **idempotency locks** (no eviction); `queue` = BullMQ (no eviction, persistence on).
- Central key builder (`keys.ts`) with mandatory prefixes (`cache:`, `counter:`, `queue:`) and a wrapper that **refuses any write without a TTL** unless the key is registered as TTL-exempt in a list with a reason. Add a unit test that scans the codebase for raw Redis writes that bypass the wrapper.
- `docker-compose.yml`: three Redis services with the right policies (`allkeys-lru` for cache, `noeviction` + AOF for counters and queue). At startup the app reads `CONFIG GET maxmemory-policy` and logs an error if a role has the wrong policy.
- Tests: kill the cache Redis and prove submissions still succeed; fill the cache Redis and prove counters are untouched; prove TTLs are set on every key type.

## R2.3 Cache-first reads, ETag and 304 (edge and caching policy)

- Shared helper that produces a weak ETag from a content hash, handles `If-None-Match` and returns `304 Not Modified`.
- Apply the policy table from the Addendum (Section 5.1) to every public route: `/v1/drop/today` (`s-maxage=5, stale-while-revalidate=30, stale-if-error=3600`), immutable `/v1/drops/:id.json`, content bundle (hash-versioned URL plus pointer endpoint), `/v1/pages/:slug`, `/v1/config/public`, new `/v1/stats/today` (cached counter, `s-maxage=10`), new `/v1/time`, `/v1/world/:dropId`, share pages. Personalised routes (`results`, `history`, `me`) get `private, no-store`.
- **Redis-first reads:** drop, content, config and pages read from Redis first (`cache` role) and fall back to Postgres on a miss, with a short single-flight lock so a stampede of misses causes one database read. Invalidate on publish through a function `invalidateContent(keys)` that the Stage 11 admin will call (write it now, test it now).
- **Route policy enforcement test:** every registered route must have a row in the per-route policy table (timeout, rate-limit class, cache policy, idempotency, priority lane, degradation behaviour); the test fails if a route is added without one.
- Tests: ETag round trip returns 304; headers match the table for every route (snapshot); a miss stampede of 200 concurrent requests causes one database read; stale content is served when the database is down (`stale-if-error` behaviour at the app level).

## R2.4 Circuit breakers

- Wrap with `opossum` (settings from `app_config`: timeout, error threshold, reset time): Redis cache reads, Redis counters, Turnstile, Google token verification, Cloudflare R2 uploads, Web Push sends. Postgres hot-path queries keep their timeouts and get a breaker only if tests show it helps (justify in `memory.md`).
- Fallbacks: cache breaker open then read Postgres directly (bounded); Turnstile breaker open then **fail-open only for low-risk actions** with a tighter rate limit (configurable, default fail-closed for sign-up); Google breaker open then a friendly message while guest play continues; R2 breaker open then cards render on demand and the share link falls back to a text-only preview; Push breaker open then jobs retry later with backoff.
- Expose breaker states in metrics. Do NOT include them in `/ready`.
- Tests with fault injection (latency, errors) prove: breaker opens after the threshold, fast-fails, goes half-open, and recovers; user-facing behaviour matches the fallback table.

## R2.5 Degradation ladder wiring (L0 to L4)

- `degradation` module: reads `app_config.degradation_level` (cached 5 s) with a manual override that beats automatic levels; sets `x-oddly-degradation-level` on every API response; `GET /v1/config/public` returns the level plus banner copy keys.
- **Controller job** (worker, every 10 s, single leader): computes the level from event-loop delay, in-process p95 submit latency, queue lag, error rate and DB pool wait, using the Addendum triggers; **up fast (1 minute), down slow (5 healthy minutes)**; logs and alerts every change.
- Behaviours to implement now:
  - L1: `/v1/stats/today` cache 60 s; provisional refresh interval doubled; `/v1/events` sampled 50% (return `202`); card render on demand only.
  - L2: twin-upgrade notifications paused; history, world and settings reads served stale up to 10 minutes; low-priority routes return `503 OVERLOADED` with `Retry-After`; admin writes blocked.
  - L3: new sign-ups disabled (guest play continues); analytics off; notifications limited to Drop-live; matching deferred: submit returns the pending result and the client shows the "Saved. Finding your twin..." screen (provisional match is computed by the worker). Mode B persistence stays a documented stub.
  - L4: client-side only for now: the app shows the offline banner and keeps picks on the device. The static fallback comes in Stage 14.
- Web client: **status banner** component (text from `app_content` keys; if the content system is not wired yet, use the copy registry and note it), pending screen with jittered polling, stale-data labels, 429 and 503 friendly screens with a countdown, and error boundaries per area, as specified in `design.md` Section 13. Respect reduced motion.
- Tests: force each level via `app_config` and assert API behaviour and UI states; test hysteresis (no flapping); test that a level change never loses a submission.

## R2.6 Metrics and alert rules as code (foundation for Stage 12)

- `prom-client` on API and worker: request duration histogram and error counters per route (RED), event-loop lag, heap and RSS, DB pool in-use and waiting, cache hit and miss counters, breaker state, degradation level gauge, queue depth and oldest-job age per queue, final-batch chunk progress, idempotency conflicts, shed requests.
- `GET /metrics` protected by an internal bearer token (not public). Metric names and labels documented in `docs/slo.md`; no high-cardinality labels (no user ids).
- Alert rules as Prometheus rule files in `infra/alerts/` for the alerts table in the Addendum (Section 14.1). Validate them with `promtool check rules` if available, otherwise with a schema test.
- Tests: scraping `/metrics` after traffic shows the expected series; a unit test checks the route label cardinality is bounded.

## R2.7 Frontend delivery checks

- **Bundle budget:** add `size-limit` with budgets (initial JS for the play route about 150 KB compressed; first load total about 500 KB). Run it in CI and fail on regression. Report the real current numbers in the Stage Report; if over budget, list the top 5 contributors and fix the cheap ones (lazy-load confetti, share sheet, settings).
- **Accessibility tests (P1.19):** install `@axe-core/playwright`; write Playwright tests for landing, each question type, review, reveal, result, share sheet, login panel, history, settings; fail CI on serious or critical violations; report any you could not fix.
- **Service worker:** version cache names with the build hash, delete old caches on activate, cache the question illustration SVGs, never cache personalised API responses, keep the offline page. Test the update flow (new version replaces the old without stale assets).
- Web Vitals reporting (LCP, INP, CLS) to the analytics layer, sampled.

## R2.9 Matching accuracy under clamping, and bucket memory budget

- **Accuracy test that actually clamps:** the earlier 100% agreement results only covered pools of 2,000 or fewer, where nothing is clamped. Using the answer distributions from the blueprint simulation (skewed colours and numbers, some correlated answers), generate 50,000 and 200,000 players, run the bounded matcher with `MAX_MATCH_CANDIDATES` at 2,000, and compare against brute force on a random 1% sample. Report: how often the twin found has the same similarity as the true best; the mean and 99th-percentile similarity gap; the share of players for whom the true best twin was outside the candidate set. Set a target in `docs/slo.md` (for example: same similarity for at least 98% of players, 99th-percentile gap under 0.05) and tune bucket order and caps until it holds, or document honestly where it does not.
- **Bucket memory budget:** each submission adds 16 sub-hash set entries. Measure real Redis memory for 100,000 players (`MEMORY USAGE`, `INFO memory`) and extrapolate to 10 lakh in `docs/capacity-model.md`. Reduce it: store compact integer participant ids (not 36-character UUIDs) in the buckets with a lookup table, cap each bucket to a configured maximum size using reservoir sampling (for example 200 members) so popular buckets stay bounded, and keep the 4-of-5 and 3-of-5 buckets only if the accuracy test shows they help. Re-run the accuracy test after capping.
- Tests: bucket cap enforced; memory per player below the budget you document; identical results on rerun.

## R2.10 Provisional refresh worker (task P9.04)

- Implement the provisional refresh job for real: every N minutes (from `app_config`, doubled at L1), re-evaluate only players whose candidate buckets received new members since their last evaluation; update `matches` only if the new twin improves similarity; enqueue a twin-upgrade notification only under the upgrade rule (similarity up by 0.10 or matched picks 3 to 4 or 5), maximum one per user per day, respecting quiet hours and caps.
- Tests (real Postgres and Redis): a late-arriving close twin upgrades an earlier player once; no upgrade when the improvement is small; a second improvement the same day sends no second notification; the job is idempotent and resumable; work per run is bounded.
- Mark P9.04 DONE only when this exists and is tested.

## R2.8 Documentation and honesty

- Update `architecture.md` (partition design and constraints, Redis roles, route policy table filled for every route, breaker table, degradation behaviours implemented versus planned), `docs/degradation-playbook.md`, `docs/slo.md` (metric names), `docs/failure-modes.md` (what is now mitigated in code), `rules.md` (any new rule you introduced), `design.md` (anything you changed), `task.md` and `memory.md` (ADRs and bugs found).
- Tell me what you could not finish and what you assumed. Do not mark DONE without code AND a test.

## Stage Report requirements

List: files changed; migrations added and how they were rehearsed; benchmark numbers (insert rate and p95 query times, partitioned versus not); test counts and which used real Postgres and Redis; real bundle sizes; axe results; degradation behaviours implemented versus deferred; open questions (maximum 3). Include exact commands to verify each item. Then say: **"Stage R2 complete. Please review. Type 'proceed to Stage 11' when ready."** and wait.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-11-10T16:31:17+05:30.

The user's current state is as follows:
Active Document: e:\Oddly\services\worker\src\pipeline.test.ts (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- e:\Oddly\services\worker\src\scheduler.ts (LANGUAGE_UNSPECIFIED)
- e:\Oddly\memory.md (LANGUAGE_UNSPECIFIED)
- e:\Oddly\services\api\src\server.ts (LANGUAGE_UNSPECIFIED)
- e:\Oddly\apps\web\src\app\c\[shortId]\page.tsx (LANGUAGE_UNSPECIFIED)
- e:\Oddly\infra\terraform\README.md (LANGUAGE_UNSPECIFIED)
</ADDITIONAL_METADATA>