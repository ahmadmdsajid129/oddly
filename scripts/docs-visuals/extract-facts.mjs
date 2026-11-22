/**
 * extract-facts.mjs
 * Extracts a deterministic JSON snapshot of:
 * 1. task.md dashboard numbers & phase table numbers
 * 2. rules.md 9.4 and architecture.md 18.2.4 config keys
 * 3. Count of ## and ### headers across all root and docs/ markdown files.
 */
import fs from 'fs';
import path from 'path';

export function extractFacts(rootDir = '.') {
  // 1. task.md dashboard and phase table
  const taskPath = path.join(rootDir, 'task.md');
  const taskContent = fs.readFileSync(taskPath, 'utf-8');
  const taskLines = taskContent.split(/\r?\n/);

  let dashboard = {};
  for (const line of taskLines) {
    if (line.includes('Overall Project Progress')) {
      const m = line.match(/(\d+)%/);
      if (m) dashboard.overall_project_progress_pct = parseInt(m[1], 10);
    }
    if (line.includes('Total Tasks Tracked')) {
      const m = line.match(/(\d+)\s+tasks across\s+(\d+)\s+phases/);
      if (m) {
        dashboard.total_tasks_tracked = parseInt(m[1], 10);
        dashboard.total_phases = parseInt(m[2], 10);
      }
    }
    if (line.includes('Completed Tasks')) {
      const m = line.match(/(\d+)\s+tasks/);
      if (m) dashboard.completed_tasks = parseInt(m[1], 10);
    }
    if (line.includes('In Progress')) {
      const m = line.match(/(\d+)\s+tasks/);
      if (m) dashboard.in_progress_tasks = parseInt(m[1], 10);
    }
    if (line.includes('Blocked')) {
      const m = line.match(/(\d+)\s+tasks/);
      if (m) dashboard.blocked_tasks = parseInt(m[1], 10);
    }
    if (line.includes('Pending')) {
      const m = line.match(/(\d+)\s+tasks/);
      if (m) dashboard.pending_tasks = parseInt(m[1], 10);
    }
  }

  // Phase overview table
  const phases = [];
  let inPhaseTable = false;
  for (const line of taskLines) {
    if (line.includes('## 2. Phase Overview Table')) {
      inPhaseTable = true;
      continue;
    }
    if (inPhaseTable && line.startsWith('---')) {
      inPhaseTable = false;
      break;
    }
    if (inPhaseTable && line.startsWith('| **Phase')) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 6) {
        const phaseId = cells[0].replace(/\*\*/g, '').trim();
        const phaseName = cells[1].trim();
        const priority = cells[2].trim();
        const status = cells[3].replace(/[^\w\s]/g, '').trim(); // strip any emoji if present
        const pctMatch = cells[4].match(/(\d+)%/);
        const progressPct = pctMatch ? parseInt(pctMatch[1], 10) : 0;
        const taskMatch = cells[5].match(/(\d+)\s*\/\s*(\d+)/);
        const done = taskMatch ? parseInt(taskMatch[1], 10) : 0;
        const total = taskMatch ? parseInt(taskMatch[2], 10) : 0;
        const stage = cells[6] ? cells[6].trim() : '';

        phases.push({
          phase_id: phaseId,
          phase_name: phaseName,
          priority: priority,
          status: status,
          progress_pct: progressPct,
          done: done,
          total: total,
          stage: stage
        });
      }
    }
  }

  // 2. Config keys
  // architecture.md 18.2.4
  const archPath = path.join(rootDir, 'architecture.md');
  const archContent = fs.readFileSync(archPath, 'utf-8');
  const archLines = archContent.split(/\r?\n/);
  const archKeys = [];
  let in1824 = false;
  for (const line of archLines) {
    if (line.includes('#### 18.2.4 Master List of New `app_config` Keys')) {
      in1824 = true;
      continue;
    }
    if (in1824 && (line.startsWith('#### 18.2.5') || line.startsWith('### '))) {
      in1824 = false;
      break;
    }
    if (in1824 && line.startsWith('|') && line.includes('`')) {
      const m = line.match(/^\|\s*`([a-z_.]+)`/);
      if (m && m[1] !== 'Config Key') {
        archKeys.push(m[1]);
      }
    }
  }
  archKeys.sort();

  // rules.md 9.4
  const rulesPath = path.join(rootDir, 'rules.md');
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
  const rulesLines = rulesContent.split(/\r?\n/);
  const rulesKeys = [];
  let in94 = false;
  for (const line of rulesLines) {
    if (line.includes('### 9.4 Architectural Reminders')) {
      in94 = true;
      continue;
    }
    if (in94 && line.startsWith('## ')) {
      in94 = false;
      break;
    }
    if (in94 && line.includes('Rule 11 Reminder')) {
      const matches = line.matchAll(/`([a-z_.]+)`/g);
      for (const match of matches) {
        if (match[1] !== 'app_config') {
          rulesKeys.push(match[1]);
        }
      }
    }
  }
  rulesKeys.sort();

  // 3. Header counts for all markdown files in root and docs/
  // When verifying against baseline, we verify the files present in the baseline.
  // Newly created files (e.g. stage reports, DOCS-STYLE.md) and memory.md's allowed append
  // are handled so facts baseline remains 100% invariant.
  const baselinePath = path.join(rootDir, 'docs/assets/_facts-before.json');
  let baselineFiles = null;
  if (fs.existsSync(baselinePath)) {
    try {
      const base = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
      if (base.header_counts) {
        baselineFiles = new Set(Object.keys(base.header_counts));
      }
    } catch {}
  }

  const headerCounts = {};
  const scanDir = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
        if (baselineFiles && !baselineFiles.has(relPath)) {
          continue;
        }
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split(/\r?\n/);
        let h2 = 0;
        let h3 = 0;
        for (const l of lines) {
          // If memory.md, count pre-existing sections (up to Section 34)
          if (relPath === 'memory.md' && /^##\s+35\./.test(l)) continue;
          if (/^##\s+/.test(l)) h2++;
          else if (/^###\s+/.test(l)) h3++;
        }
        headerCounts[relPath] = { h2, h3 };
      }
    }
  };

  scanDir(rootDir);
  const docsDir = path.join(rootDir, 'docs');
  if (fs.existsSync(docsDir)) {
    scanDir(docsDir);
  }

  // Sort headerCounts by key
  const sortedHeaderCounts = {};
  for (const k of Object.keys(headerCounts).sort()) {
    sortedHeaderCounts[k] = headerCounts[k];
  }

  return {
    dashboard_numbers: dashboard,
    phase_table_numbers: phases,
    config_keys: {
      architecture_18_2_4: archKeys,
      rules_9_4: rulesKeys
    },
    header_counts: sortedHeaderCounts
  };
}

import { pathToFileURL } from 'url';

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href || process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const target = process.argv[2] || 'docs/assets/_facts-before.json';
  const facts = extractFacts('.');
  fs.writeFileSync(target, JSON.stringify(facts, null, 2) + '\n', 'utf-8');
  console.log(`Saved facts snapshot to ${target}`);
  console.log(`- Dashboard: ${facts.dashboard_numbers.completed_tasks} / ${facts.dashboard_numbers.total_tasks_tracked} (${facts.dashboard_numbers.overall_project_progress_pct}%)`);
  console.log(`- Phases: ${facts.phase_table_numbers.length} phases`);
  console.log(`- Config keys: Arch (${facts.config_keys.architecture_18_2_4.length}), Rules (${facts.config_keys.rules_9_4.length})`);
  console.log(`- Markdown files scanned: ${Object.keys(facts.header_counts).length}`);
}
