/**
 * @file metrics.ts
 * @package @oddly/worker
 *
 * Prometheus metrics instrumentation for Oddly background workers (R2.6)
 */

import client, { Registry } from "prom-client";

export const workerMetricsRegistry = new Registry();

client.collectDefaultMetrics({
  register: workerMetricsRegistry,
  prefix: "oddly_worker_",
});

export const queueDepthGauge = new client.Gauge({
  name: "oddly_queue_depth",
  help: "Number of jobs in queue by state (waiting, active, delayed, failed)",
  labelNames: ["queue_name", "state"],
  registers: [workerMetricsRegistry],
});

export const queueOldestJobAgeSeconds = new client.Gauge({
  name: "oddly_queue_oldest_job_age_seconds",
  help: "Age in seconds of the oldest waiting job in the queue",
  labelNames: ["queue_name"],
  registers: [workerMetricsRegistry],
});

export const finalBatchChunkProgress = new client.Gauge({
  name: "oddly_final_batch_chunk_progress",
  help: "Final batch matching chunk progress and status",
  labelNames: ["chunk_id", "status"],
  registers: [workerMetricsRegistry],
});

export const provisionalRefreshEvaluatedTotal = new client.Counter({
  name: "oddly_provisional_refresh_evaluated_total",
  help: "Total players re-evaluated during provisional pairing sweeps",
  registers: [workerMetricsRegistry],
});

export const provisionalUpgradesTotal = new client.Counter({
  name: "oddly_provisional_upgrades_total",
  help: "Total match upgrades discovered by provisional refresh worker",
  registers: [workerMetricsRegistry],
});

export const modeBPersistedTotal = new client.Counter({
  name: "oddly_mode_b_persisted_total",
  help: "Total Mode B asynchronous submissions persisted to PostgreSQL",
  registers: [workerMetricsRegistry],
});

export const modeBReconciledTotal = new client.Counter({
  name: "oddly_mode_b_reconciled_total",
  help: "Total Mode B submissions checked by reconciliation job",
  labelNames: ["status"],
  registers: [workerMetricsRegistry],
});

export const dlqQuarantinedTotal = new client.Counter({
  name: "oddly_dlq_quarantined_total",
  help: "Total poison jobs quarantined to DLQ by queue name and error classification",
  labelNames: ["queue_name", "classification"],
  registers: [workerMetricsRegistry],
});

export const dlqDepthGauge = new client.Gauge({
  name: "oddly_dlq_depth",
  help: "Current number of quarantined poison jobs awaiting manual replay or inspection",
  labelNames: ["queue_name"],
  registers: [workerMetricsRegistry],
});

export const dlqReplayedTotal = new client.Counter({
  name: "oddly_dlq_replayed_total",
  help: "Total poison jobs successfully replayed back into original BullMQ queues",
  labelNames: ["queue_name"],
  registers: [workerMetricsRegistry],
});



