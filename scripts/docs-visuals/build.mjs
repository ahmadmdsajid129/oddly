/**
 * scripts/docs-visuals/build.mjs
 * Oddly Documentation Visuals Generator
 * Plain Node.js (v20+) ES Module with zero external dependencies.
 *
 * Mirrors design.md Section 2.1 "Sticker pop" tokens:
 * ink: #14123A, cream: #FFF8F0, paper: #FFFFFF, violet: #6C4CF1,
 * lavender: #EEEAFE, lilac: #CDBFFF, mint: #3DDBB0, sun: #FFD23F,
 * coral: #FF6B5E, muted: #5B5780, error: #D92D4B
 */

import fs from 'fs';
import path from 'path';

// Core Design Tokens
const TOKENS = {
  ink: '#14123A',
  cream: '#FFF8F0',
  paper: '#FFFFFF',
  violet: '#6C4CF1',
  lavender: '#EEEAFE',
  lilac: '#CDBFFF',
  mint: '#3DDBB0',
  sun: '#FFD23F',
  coral: '#FF6B5E',
  muted: '#5B5780',
  error: '#D92D4B',
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  displayFont: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 1. Parse task.md dashboard numbers & phase overview table
 */
function parseTaskMarkdown(taskPath) {
  const content = fs.readFileSync(taskPath, 'utf-8');
  const lines = content.split(/\r?\n/);

  const dashboard = {
    progress_pct: 0,
    total_tasks: 0,
    total_phases: 0,
    done: 0,
    in_progress: 0,
    blocked: 0,
    todo: 0,
  };

  for (const line of lines) {
    if (line.includes('Overall Project Progress')) {
      const m = line.match(/(\d+)%/);
      if (m) dashboard.progress_pct = parseInt(m[1], 10);
    }
    if (line.includes('Total Tasks Tracked')) {
      const m = line.match(/(\d+)\s+tasks across\s+(\d+)\s+phases/);
      if (m) {
        dashboard.total_tasks = parseInt(m[1], 10);
        dashboard.total_phases = parseInt(m[2], 10);
      }
    }
    if (line.includes('Completed Tasks')) {
      const m = line.match(/(\d+)\s+tasks/);
      if (m) dashboard.done = parseInt(m[1], 10);
    }
    if (line.includes('In Progress')) {
      const m = line.match(/(\d+)\s+tasks/);
      if (m) dashboard.in_progress = parseInt(m[1], 10);
    }
    if (line.includes('Blocked')) {
      const m = line.match(/(\d+)\s+tasks/);
      if (m) dashboard.blocked = parseInt(m[1], 10);
    }
    if (line.includes('Pending')) {
      const m = line.match(/(\d+)\s+tasks/);
      if (m) dashboard.todo = parseInt(m[1], 10);
    }
  }

  // Parse Phase Overview Table
  const phases = [];
  let inPhaseTable = false;
  for (const line of lines) {
    if (line.includes('## 2. Phase Overview Table')) {
      inPhaseTable = true;
      continue;
    }
    if (inPhaseTable && line.startsWith('---')) {
      inPhaseTable = false;
      break;
    }
    if (inPhaseTable && line.startsWith('| **Phase')) {
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 6) {
        const phaseId = cells[0].replace(/\*\*/g, '').trim();
        const phaseName = cells[1].trim();
        const priority = cells[2].trim();
        const status = cells[3].replace(/[^\w\s]/g, '').trim();
        const pctMatch = cells[4].match(/(\d+)%/);
        const progressPct = pctMatch ? parseInt(pctMatch[1], 10) : 0;
        const taskMatch = cells[5].match(/(\d+)\s*\/\s*(\d+)/);
        const done = taskMatch ? parseInt(taskMatch[1], 10) : 0;
        const total = taskMatch ? parseInt(taskMatch[2], 10) : 0;
        const stage = cells[6] ? cells[6].trim() : '';

        phases.push({
          phaseId,
          phaseName,
          priority,
          status,
          progressPct,
          done,
          total,
          stage,
        });
      }
    }
  }

  // Parse Recommended Execution Order
  let executionOrder = '';
  for (const line of lines) {
    if (line.startsWith('`F1') && line.includes('→')) {
      executionOrder = line.replace(/`/g, '').trim();
      break;
    }
  }

  return { dashboard, phases, executionOrder };
}

/**
 * 2. Validate arithmetic invariants
 */
function validateNumbers(data) {
  const sumDone = data.phases.reduce((acc, p) => acc + p.done, 0);
  const sumTotal = data.phases.reduce((acc, p) => acc + p.total, 0);
  const sumTodo = sumTotal - sumDone;

  const mismatches = [];
  if (sumDone !== data.dashboard.done) {
    mismatches.push(`Done count mismatch: dashboard says ${data.dashboard.done}, sum of phases is ${sumDone}`);
  }
  if (sumTotal !== data.dashboard.total_tasks) {
    mismatches.push(`Total count mismatch: dashboard says ${data.dashboard.total_tasks}, sum of phases is ${sumTotal}`);
  }
  if (sumTodo !== data.dashboard.todo) {
    mismatches.push(`Todo count mismatch: dashboard says ${data.dashboard.todo}, sum of phases is ${sumTodo}`);
  }

  if (mismatches.length > 0) {
    console.error('FATAL: Task data validation failed!');
    mismatches.forEach((m) => console.error('  - ' + m));
    process.exit(1);
  }
}

/**
 * 3. SVG Generators
 */

// Helper to wrap card with Sticker pop 4px hard offset shadow & 2.5px ink outline
function stickerCard(x, y, w, h, fill = TOKENS.paper, rx = 14) {
  return `
    <rect x="${x + 4}" y="${y + 4}" width="${w}" height="${h}" rx="${rx}" fill="${TOKENS.ink}" />
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${TOKENS.ink}" stroke-width="2.5" />
  `;
}

// 3.1 progress-overall.svg
function generateProgressOverall(data) {
  const w = 760;
  const h = 100;
  const trackW = 560;
  const trackH = 26;
  const trackX = 30;
  const trackY = 48;
  const pct = data.dashboard.progress_pct;
  const fillW = Math.round((trackW * pct) / 100);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <title>Overall Project Progress: ${pct}%</title>
  <desc>Overall progress bar: ${data.dashboard.done} of ${data.dashboard.total_tasks} tasks completed (${pct}%).</desc>
  <style>
    .title { font-family: ${TOKENS.fontFamily}; font-size: 16px; font-weight: 800; fill: ${TOKENS.ink}; }
    .badge { font-family: ${TOKENS.fontFamily}; font-size: 13px; font-weight: 800; fill: ${TOKENS.ink}; }
    .subtext { font-family: ${TOKENS.fontFamily}; font-size: 14px; font-weight: 700; fill: ${TOKENS.ink}; }
  </style>

  ${stickerCard(10, 8, w - 24, h - 20, TOKENS.paper, 14)}

  <!-- Title & Counts -->
  <text x="30" y="36" class="title">ODDLY V1 &bull; MASTER PROGRESS</text>
  <text x="600" y="36" class="subtext" text-anchor="end">${data.dashboard.done} / ${data.dashboard.total_tasks} tasks</text>

  <!-- Progress Track -->
  <rect x="${trackX + 3}" y="${trackY + 3}" width="${trackW}" height="${trackH}" rx="13" fill="${TOKENS.ink}" />
  <rect x="${trackX}" y="${trackY}" width="${trackW}" height="${trackH}" rx="13" fill="${TOKENS.lavender}" stroke="${TOKENS.ink}" stroke-width="2.5" />

  <!-- Progress Fill -->
  <rect x="${trackX}" y="${trackY}" width="${fillW}" height="${trackH}" rx="13" fill="${TOKENS.mint}" stroke="${TOKENS.ink}" stroke-width="2.5" />

  <!-- Percentage Sticker Pill -->
  <rect x="${trackX + trackW + 18}" y="${trackY - 2}" width="90" height="30" rx="15" fill="${TOKENS.ink}" />
  <rect x="${trackX + trackW + 15}" y="${trackY - 5}" width="90" height="30" rx="15" fill="${TOKENS.sun}" stroke="${TOKENS.ink}" stroke-width="2.5" />
  <text x="${trackX + trackW + 60}" y="${trackY + 15}" class="badge" text-anchor="middle">${pct}% DONE</text>
</svg>`;
}

// 3.2 donut-tasks.svg
function generateDonutTasks(data) {
  const w = 460;
  const h = 260;
  const cx = 130;
  const cy = 130;
  const r = 80;
  const strokeW = 34;

  const total = data.dashboard.total_tasks;
  const done = data.dashboard.done;
  const todo = data.dashboard.todo;
  const inProgress = data.dashboard.in_progress;
  const blocked = data.dashboard.blocked;

  const circumference = 2 * Math.PI * r;
  const doneDash = (done / total) * circumference;
  const todoDash = (todo / total) * circumference;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <title>Tasks Distribution: ${done} Done, ${todo} To Do</title>
  <desc>Donut chart: Done ${done}, In Progress ${inProgress}, Blocked ${blocked}, Pending ${todo}, Total ${total}.</desc>
  <style>
    .val { font-family: ${TOKENS.fontFamily}; font-size: 26px; font-weight: 900; fill: ${TOKENS.ink}; }
    .lbl { font-family: ${TOKENS.fontFamily}; font-size: 11px; font-weight: 800; fill: ${TOKENS.muted}; letter-spacing: 0.5px; }
    .leg { font-family: ${TOKENS.fontFamily}; font-size: 13px; font-weight: 700; fill: ${TOKENS.ink}; }
    .card-title { font-family: ${TOKENS.fontFamily}; font-size: 14px; font-weight: 800; fill: ${TOKENS.ink}; }
  </style>

  ${stickerCard(10, 10, w - 24, h - 24, TOKENS.paper, 14)}

  <!-- Background Track Outline -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TOKENS.ink}" stroke-width="${strokeW + 5}" />
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TOKENS.lavender}" stroke-width="${strokeW}" />

  <!-- Done Slice (Mint) -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TOKENS.mint}" stroke-width="${strokeW}"
          stroke-dasharray="${doneDash.toFixed(2)} ${circumference.toFixed(2)}"
          transform="rotate(-90 ${cx} ${cy})" />

  <!-- Inner Cutout Fill -->
  <circle cx="${cx}" cy="${cy}" r="${r - strokeW / 2 - 1}" fill="${TOKENS.paper}" stroke="${TOKENS.ink}" stroke-width="2.5" />

  <!-- Center Text -->
  <text x="${cx}" y="${cy + 2}" class="val" text-anchor="middle">${total}</text>
  <text x="${cx}" y="${cy + 19}" class="lbl" text-anchor="middle">TOTAL TASKS</text>

  <!-- Legend -->
  <text x="260" y="44" class="card-title">STATUS BREAKDOWN</text>

  <!-- Done item -->
  <rect x="260" y="60" width="16" height="16" rx="4" fill="${TOKENS.mint}" stroke="${TOKENS.ink}" stroke-width="2" />
  <text x="286" y="73" class="leg">Done: <tspan font-weight="800">${done}</tspan> (${Math.round((done / total) * 100)}%)</text>

  <!-- Todo item -->
  <rect x="260" y="92" width="16" height="16" rx="4" fill="${TOKENS.lavender}" stroke="${TOKENS.ink}" stroke-width="2" />
  <text x="286" y="105" class="leg">To Do: <tspan font-weight="800">${todo}</tspan> (${Math.round((todo / total) * 100)}%)</text>

  <!-- In Progress item -->
  <rect x="260" y="124" width="16" height="16" rx="4" fill="${TOKENS.sun}" stroke="${TOKENS.ink}" stroke-width="2" />
  <text x="286" y="137" class="leg">In Progress: <tspan font-weight="800">${inProgress}</tspan></text>

  <!-- Blocked item -->
  <rect x="260" y="156" width="16" height="16" rx="4" fill="${TOKENS.coral}" stroke="${TOKENS.ink}" stroke-width="2" />
  <text x="286" y="169" class="leg">Blocked: <tspan font-weight="800">${blocked}</tspan></text>

  <!-- Reliability stamp pill -->
  <rect x="262" y="194" width="160" height="26" rx="13" fill="${TOKENS.ink}" />
  <rect x="260" y="192" width="160" height="26" rx="13" fill="${TOKENS.cream}" stroke="${TOKENS.ink}" stroke-width="2" />
  <text x="340" y="209" font-family="${TOKENS.fontFamily}" font-size="11px" font-weight="800" fill="${TOKENS.ink}" text-anchor="middle">★ HONEST ESTIMATE</text>
</svg>`;
}

// 3.3 progress-phases.svg
function generateProgressPhases(data) {
  const groups = [
    { title: 'Core Foundation (Phases 0–10)', prefix: ['Phase 0', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', 'Phase 6', 'Phase 7', 'Phase 8', 'Phase 9', 'Phase 10'] },
    { title: 'Connection Features (Phases 10A–10D)', prefix: ['Phase 10A', 'Phase 10B', 'Phase 10C', 'Phase 10D'] },
    { title: 'Memes &amp; Signals Engine (Phases 10E–10K)', prefix: ['Phase 10E', 'Phase 10F', 'Phase 10G', 'Phase 10H', 'Phase 10I', 'Phase 10J', 'Phase 10K'] },
    { title: 'Lanes Universe (Phases 10L–10S)', prefix: ['Phase 10L', 'Phase 10M', 'Phase 10N', 'Phase 10O', 'Phase 10P', 'Phase 10Q', 'Phase 10R', 'Phase 10S'] },
    { title: 'Admin &amp; Operations (Phase 11)', prefix: ['Phase 11'] },
    { title: 'Launch &amp; Scaling (Phases 12–16)', prefix: ['Phase 12', 'Phase 13', 'Phase 14', 'Phase 15', 'Phase 16'] },
  ];

  const w = 780;
  const rowH = 26;
  const headerH = 34;
  let totalH = 40;
  groups.forEach((g) => {
    totalH += headerH + g.prefix.length * rowH + 12;
  });

  let svgRows = '';
  let curY = 30;

  groups.forEach((g) => {
    svgRows += `
      <rect x="25" y="${curY}" width="730" height="24" rx="6" fill="${TOKENS.ink}" />
      <text x="35" y="${curY + 16}" class="gh">${g.title}</text>
    `;
    curY += headerH;

    g.prefix.forEach((pid) => {
      const p = data.phases.find((x) => x.phaseId === pid);
      if (!p) return;

      const barX = 260;
      const barW = 340;
      const barH = 16;
      const fillW = Math.round((barW * p.done) / p.total) || 0;

      const trackClass = p.priority === 'Critical' ? 'tk-crit' : 'tk';
      const fillClass = p.status === 'COMPLETE' ? 'f-mint' : p.status === 'PARTIAL' ? 'f-sun' : 'f-lav';
      const badgeClass = p.status === 'COMPLETE' ? 'b-mint' : p.status === 'PARTIAL' ? 'b-sun' : 'b-lav';
      const displayName = p.phaseName.length > 24 ? p.phaseName.slice(0, 23) + '…' : p.phaseName;

      svgRows += `<text x="30" y="${curY + 13}" class="pid">${escapeXml(p.phaseId)}</text><text x="95" y="${curY + 13}" class="pname">${escapeXml(displayName)}</text><rect x="${barX + 2}" y="${curY + 2}" width="${barW}" height="${barH}" class="sh"/><rect x="${barX}" y="${curY}" width="${barW}" height="${barH}" class="${trackClass}"/>${fillW > 0 ? `<rect x="${barX}" y="${curY}" width="${fillW}" height="${barH}" class="${fillClass}"/>` : ''}<text x="612" y="${curY + 13}" class="pcount">${p.done}/${p.total}</text><rect x="670" y="${curY - 1}" width="78" height="18" class="${badgeClass}"/><text x="709" y="${curY + 12}" class="pstatus">${escapeXml(p.status)}</text>`;

      curY += rowH;
    });

    curY += 8;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${totalH}" viewBox="0 0 ${w} ${totalH}">
  <title>Oddly Phase Overview: 36 Phases</title>
  <desc>Horizontal progress bars grouped by Core, Connection, Memes, Lanes, Admin, and Launch.</desc>
  <style>
    text { font-family: ${TOKENS.fontFamily}; }
    .gh { font-size: 12px; font-weight: 800; fill: ${TOKENS.paper}; }
    .pid { font-size: 11px; font-weight: 800; fill: ${TOKENS.ink}; }
    .pname { font-size: 11px; font-weight: 600; fill: ${TOKENS.ink}; }
    .pcount { font-size: 11px; font-weight: 700; fill: ${TOKENS.ink}; }
    .pstatus { font-size: 9px; font-weight: 800; fill: ${TOKENS.ink}; text-anchor: middle; }
    .sh { fill: ${TOKENS.ink}; rx: 8px; }
    .tk { fill: ${TOKENS.lavender}; stroke: ${TOKENS.ink}; stroke-width: 2; rx: 8px; }
    .tk-crit { fill: ${TOKENS.lavender}; stroke: ${TOKENS.coral}; stroke-width: 2.5; rx: 8px; }
    .f-mint { fill: ${TOKENS.mint}; stroke: ${TOKENS.ink}; stroke-width: 2; rx: 8px; }
    .f-sun { fill: ${TOKENS.sun}; stroke: ${TOKENS.ink}; stroke-width: 2; rx: 8px; }
    .f-lav { fill: ${TOKENS.lavender}; stroke: ${TOKENS.ink}; stroke-width: 2; rx: 8px; }
    .b-mint { fill: ${TOKENS.mint}; stroke: ${TOKENS.ink}; stroke-width: 1.5; rx: 9px; }
    .b-sun { fill: ${TOKENS.sun}; stroke: ${TOKENS.ink}; stroke-width: 1.5; rx: 9px; }
    .b-lav { fill: ${TOKENS.lavender}; stroke: ${TOKENS.ink}; stroke-width: 1.5; rx: 9px; }
  </style>
  <rect x="14" y="14" width="${w - 24}" height="${totalH - 24}" rx="14" fill="${TOKENS.ink}" />
  <rect x="10" y="10" width="${w - 24}" height="${totalH - 24}" rx="14" fill="${TOKENS.paper}" stroke="${TOKENS.ink}" stroke-width="2.5" />
  ${svgRows}
</svg>`;
}

// 3.4 roadmap-stages.svg
function generateRoadmapStages(data) {
  const stagePills = [
    { label: 'F1', status: 'done', hint: 'Orbit Backend' },
    { label: 'M0', status: 'done', hint: 'Memes/Signals' },
    { label: 'L0', status: 'done', hint: 'Lanes Docs' },
    { label: 'L1', status: 'next', hint: 'Lanes Plumbing' },
    { label: 'L2', status: 'later', hint: 'Richer Formats' },
    { label: 'L3', status: 'later', hint: 'Twin Depth' },
    { label: 'F2', status: 'later', hint: 'Orbit/Globe UI' },
    { label: 'F3', status: 'later', hint: 'Telepathy' },
    { label: 'F4', status: 'later', hint: 'Anti-Twin' },
    { label: 'M1', status: 'later', hint: 'Meme Questions' },
    { label: 'M2', status: 'later', hint: 'Signals Found.' },
    { label: 'L4', status: 'later', hint: 'Memes Lane' },
    { label: 'Phase 11', status: 'later', hint: 'Admin Panel' },
    { label: 'L5', status: 'later', hint: 'Situations' },
    { label: 'L7', status: 'later', hint: 'Super Twin' },
    { label: 'M3-M8, L6, L8', status: 'on_command', hint: 'On Founder Call' },
  ];

  const w = 820;
  const pillW = 86;
  const pillH = 46;
  const cols = 5;
  const rows = Math.ceil(stagePills.length / cols);
  const startX = 30;
  const startY = 65;
  const gapX = 70;
  const gapY = 40;
  const h = startY + rows * (pillH + gapY) + 10;

  let svgContent = '';

  stagePills.forEach((s, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = startX + col * (pillW + gapX);
    const y = startY + row * (pillH + gapY);

    let fill = TOKENS.lavender;
    let stroke = TOKENS.ink;
    let strokeDash = 'none';
    let badgeText = 'PLANNED';
    let badgeFill = TOKENS.lavender;

    if (s.status === 'done') {
      fill = TOKENS.mint;
      badgeText = 'DONE';
      badgeFill = TOKENS.mint;
    } else if (s.status === 'next') {
      fill = TOKENS.sun;
      badgeText = 'NEXT';
      badgeFill = TOKENS.sun;
    } else if (s.status === 'on_command') {
      fill = TOKENS.cream;
      strokeDash = '5,4';
      badgeText = 'COMMAND';
      badgeFill = TOKENS.coral;
    }

    svgContent += `
      ${idx < stagePills.length - 1 && col < cols - 1 ? `
        <line x1="${x + pillW + 5}" y1="${y + pillH / 2}" x2="${x + pillW + gapX - 10}" y2="${y + pillH / 2}" stroke="${TOKENS.ink}" stroke-width="2.5" />
        <polygon points="${x + pillW + gapX - 10},${y + pillH / 2 - 4} ${x + pillW + gapX - 2},${y + pillH / 2} ${x + pillW + gapX - 10},${y + pillH / 2 + 4}" fill="${TOKENS.ink}" />
      ` : ''}
      ${idx < stagePills.length - 1 && col === cols - 1 ? `
        <path d="M ${x + pillW / 2} ${y + pillH + 5} v 16 h -${(cols - 1) * (pillW + gapX) - 30} v 12" fill="none" stroke="${TOKENS.ink}" stroke-width="2" stroke-dasharray="3,3" />
      ` : ''}
      <rect x="${x + 3}" y="${y + 3}" width="${pillW}" height="${pillH}" rx="12" fill="${TOKENS.ink}" />
      <rect x="${x}" y="${y}" width="${pillW}" height="${pillH}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-dasharray="${strokeDash}" />
      <text x="${x + pillW / 2}" y="${y + 20}" class="lbl-main" text-anchor="middle">${escapeXml(s.label)}</text>
      <text x="${x + pillW / 2}" y="${y + 34}" class="lbl-hint" text-anchor="middle">${escapeXml(s.hint)}</text>
      <rect x="${x + pillW - 24}" y="${y - 8}" width="30" height="14" rx="7" fill="${TOKENS.ink}" />
      <rect x="${x + pillW - 25}" y="${y - 9}" width="30" height="14" rx="7" fill="${badgeFill}" stroke="${TOKENS.ink}" stroke-width="1.2" />
      <text x="${x + pillW - 10}" y="${y + 1}" class="lbl-chip" text-anchor="middle">${badgeText}</text>
    `;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <title>Recommended Execution Order Roadmap</title>
  <desc>Stage execution sequence from F1 through M0, L0, L1, L2, L3 to Phase 11 and later.</desc>
  <style>
    text { font-family: ${TOKENS.fontFamily}; }
    .hdr { font-size: 15px; font-weight: 800; fill: ${TOKENS.ink}; }
    .sub { font-size: 12px; font-weight: 700; fill: ${TOKENS.muted}; }
    .lbl-main { font-size: 12px; font-weight: 900; fill: ${TOKENS.ink}; }
    .lbl-hint { font-size: 9px; font-weight: 700; fill: ${TOKENS.ink}; }
    .lbl-chip { font-size: 7px; font-weight: 800; fill: ${TOKENS.ink}; }
  </style>
  <rect x="14" y="14" width="${w - 24}" height="${h - 24}" rx="14" fill="${TOKENS.ink}" />
  <rect x="10" y="10" width="${w - 24}" height="${h - 24}" rx="14" fill="${TOKENS.paper}" stroke="${TOKENS.ink}" stroke-width="2.5" />

  <text x="30" y="38" class="hdr">STAGE ROADMAP &bull; RECOMMENDED EXECUTION ORDER</text>
  <text x="760" y="38" class="sub" text-anchor="end">Current Target: Stage L1</text>
  <line x1="30" y1="48" x2="760" y2="48" stroke="${TOKENS.lavender}" stroke-width="2" />

  ${svgContent}
</svg>`;
}

// 3.5 palette.svg
function generatePalette() {
  const w = 780;
  const h = 330;

  const coreColors = [
    { name: 'ink', hex: '#14123A', role: 'Text, outlines, shadows', textColor: '#FFFFFF' },
    { name: 'cream', hex: '#FFF8F0', role: 'Desk background', textColor: '#14123A' },
    { name: 'paper', hex: '#FFFFFF', role: 'Cards, sheets', textColor: '#14123A' },
    { name: 'violet', hex: '#6C4CF1', role: 'Primary brand, links', textColor: '#FFFFFF' },
    { name: 'lavender', hex: '#EEEAFE', role: 'Soft fills, Common', textColor: '#14123A' },
    { name: 'lilac', hex: '#CDBFFF', role: 'Uncommon tier', textColor: '#14123A' },
    { name: 'mint', hex: '#3DDBB0', role: 'Success, Done, Match', textColor: '#14123A' },
    { name: 'sun', hex: '#FFD23F', role: 'In progress, Rare', textColor: '#14123A' },
    { name: 'coral', hex: '#FF6B5E', role: 'Warning, Todo, Streaks', textColor: '#14123A' },
    { name: 'muted', hex: '#5B5780', role: 'Secondary text', textColor: '#FFFFFF' },
    { name: 'error', hex: '#D92D4B', role: 'Critical alert', textColor: '#FFFFFF' },
  ];

  const tiers = [
    { name: 'Common', pct: '0 to 50%', fill: TOKENS.lavender, border: TOKENS.ink },
    { name: 'Uncommon', pct: '50 to 80%', fill: TOKENS.lilac, border: TOKENS.ink },
    { name: 'Rare', pct: '80 to 95%', fill: TOKENS.sun, border: TOKENS.ink },
    { name: 'Mythic', pct: '95 to 100%', fill: 'url(#mythicGrad)', border: TOKENS.ink },
  ];

  let swatches = '';
  coreColors.forEach((c, idx) => {
    const col = idx % 6;
    const row = Math.floor(idx / 6);
    const x = 30 + col * 120;
    const y = 60 + row * 85;

    swatches += `
      <!-- Swatch shadow -->
      <rect x="${x + 3}" y="${y + 3}" width="105" height="40" rx="8" fill="${TOKENS.ink}" />
      <!-- Swatch box -->
      <rect x="${x}" y="${y}" width="105" height="40" rx="8" fill="${c.hex}" stroke="${TOKENS.ink}" stroke-width="2" />
      <text x="${x + 8}" y="${y + 24}" font-family="${TOKENS.fontFamily}" font-size="11px" font-weight="900" fill="${c.textColor}">${c.name}</text>
      <text x="${x + 8}" y="${y + 55}" font-family="${TOKENS.fontFamily}" font-size="10px" font-weight="800" fill="${TOKENS.ink}">${c.hex}</text>
      <text x="${x + 8}" y="${y + 68}" font-family="${TOKENS.fontFamily}" font-size="8px" font-weight="600" fill="${TOKENS.muted}">${escapeXml(c.role)}</text>
    `;
  });

  let tierChips = '';
  tiers.forEach((t, idx) => {
    const x = 30 + idx * 178;
    const y = 250;
    tierChips += `
      <!-- Tier shadow -->
      <rect x="${x + 3}" y="${y + 3}" width="160" height="44" rx="12" fill="${TOKENS.ink}" />
      <!-- Tier box -->
      <rect x="${x}" y="${y}" width="160" height="44" rx="12" fill="${t.fill}" stroke="${TOKENS.ink}" stroke-width="2.5" />
      <text x="${x + 12}" y="${y + 20}" font-family="${TOKENS.fontFamily}" font-size="12px" font-weight="900" fill="${TOKENS.ink}">★ ${t.name}</text>
      <text x="${x + 12}" y="${y + 35}" font-family="${TOKENS.fontFamily}" font-size="10px" font-weight="700" fill="${TOKENS.ink}">${t.pct}</text>
    `;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <title>Oddly Sticker Pop Palette and Tier Chips</title>
  <desc>Core design system color tokens from design.md section 2.1 and oddness tier chips from section 2.3.</desc>
  <defs>
    <linearGradient id="mythicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF6B5E" />
      <stop offset="35%" stop-color="#FFD23F" />
      <stop offset="70%" stop-color="#3DDBB0" />
      <stop offset="100%" stop-color="#6C4CF1" />
    </linearGradient>
  </defs>

  <rect x="14" y="14" width="${w - 24}" height="${h - 24}" rx="14" fill="${TOKENS.ink}" />
  <rect x="10" y="10" width="${w - 24}" height="${h - 24}" rx="14" fill="${TOKENS.paper}" stroke="${TOKENS.ink}" stroke-width="2.5" />

  <text x="30" y="38" font-family="${TOKENS.fontFamily}" font-size="15px" font-weight="900" fill="${TOKENS.ink}">STICKER POP CORE PALETTE &bull; DESIGN TOKENS</text>
  <text x="750" y="38" font-family="${TOKENS.fontFamily}" font-size="11px" font-weight="700" fill="${TOKENS.muted}" text-anchor="end">Source: design.md §2.1</text>
  <line x1="30" y1="46" x2="750" y2="46" stroke="${TOKENS.lavender}" stroke-width="1.5" />

  ${swatches}

  <text x="30" y="235" font-family="${TOKENS.fontFamily}" font-size="14px" font-weight="900" fill="${TOKENS.ink}">ODDNESS TIER CHIPS &bull; PERCENTILE BANDS</text>
  <line x1="30" y1="242" x2="750" y2="242" stroke="${TOKENS.lavender}" stroke-width="1.5" />

  ${tierChips}
</svg>`;
}

// 3.6 banner.svg
function generateBanner() {
  const w = 800;
  const h = 180;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <title>Oddly — Find your twin</title>
  <desc>Oddly logo banner with three overlapping sticker pop circles in violet, coral and mint on warm cream desk.</desc>

  <!-- Desk background card with 4px hard shadow -->
  <rect x="14" y="14" width="${w - 24}" height="${h - 24}" rx="18" fill="${TOKENS.ink}" />
  <rect x="10" y="10" width="${w - 24}" height="${h - 24}" rx="18" fill="${TOKENS.cream}" stroke="${TOKENS.ink}" stroke-width="2.5" />

  <!-- Overlapping Sticker Circles -->
  <!-- Circle 1: Violet -->
  <circle cx="94" cy="94" r="50" fill="${TOKENS.ink}" />
  <circle cx="90" cy="90" r="50" fill="${TOKENS.violet}" stroke="${TOKENS.ink}" stroke-width="2.5" />

  <!-- Circle 2: Coral -->
  <circle cx="144" cy="94" r="42" fill="${TOKENS.ink}" />
  <circle cx="140" cy="90" r="42" fill="${TOKENS.coral}" stroke="${TOKENS.ink}" stroke-width="2.5" />

  <!-- Circle 3: Mint -->
  <circle cx="184" cy="94" r="34" fill="${TOKENS.ink}" />
  <circle cx="180" cy="90" r="34" fill="${TOKENS.mint}" stroke="${TOKENS.ink}" stroke-width="2.5" />

  <!-- Mini Star in Violet Circle -->
  <polygon points="90,72 95,84 107,85 98,93 101,105 90,98 79,105 82,93 73,85 85,84" fill="${TOKENS.paper}" stroke="${TOKENS.ink}" stroke-width="1.5" />

  <!-- Brand Typography -->
  <text x="245" y="96" font-family="${TOKENS.displayFont}" font-size="54px" font-weight="900" fill="${TOKENS.ink}" letter-spacing="-1px">oddly</text>

  <!-- Tagline Badge -->
  <rect x="250" y="114" width="160" height="28" rx="14" fill="${TOKENS.ink}" />
  <rect x="248" y="112" width="160" height="28" rx="14" fill="${TOKENS.sun}" stroke="${TOKENS.ink}" stroke-width="2" />
  <text x="328" y="131" font-family="${TOKENS.fontFamily}" font-size="12px" font-weight="900" fill="${TOKENS.ink}" text-anchor="middle">★ FIND YOUR TWIN</text>

  <text x="430" y="131" font-family="${TOKENS.fontFamily}" font-size="13px" font-weight="700" fill="${TOKENS.muted}">Daily 5-question instinct match at 07:00 IST</text>

  <!-- Right Side Badge Sticker -->
  <rect x="674" y="54" width="94" height="74" rx="12" fill="${TOKENS.ink}" />
  <rect x="670" y="50" width="94" height="74" rx="12" fill="${TOKENS.paper}" stroke="${TOKENS.ink}" stroke-width="2.5" />
  <text x="717" y="78" font-family="${TOKENS.fontFamily}" font-size="22px" font-weight="900" fill="${TOKENS.violet}" text-anchor="middle">v1.0</text>
  <text x="717" y="98" font-family="${TOKENS.fontFamily}" font-size="10px" font-weight="800" fill="${TOKENS.ink}" text-anchor="middle">STICKER POP</text>
  <text x="717" y="112" font-family="${TOKENS.fontFamily}" font-size="8px" font-weight="700" fill="${TOKENS.muted}" text-anchor="middle">CREAM DESK</text>
</svg>`;
}

// 3.7 Badges
function generateBadges(data) {
  const badge = (label, val, fill) => {
    const lblW = label.length * 8 + 16;
    const valW = val.length * 8 + 16;
    const totalW = lblW + valW;
    const h = 26;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW + 4}" height="${h + 4}" viewBox="0 0 ${totalW + 4} ${h + 4}">
  <title>${escapeXml(label)}: ${escapeXml(val)}</title>
  <rect x="3" y="3" width="${totalW}" height="${h}" rx="6" fill="${TOKENS.ink}" />
  <rect x="1" y="1" width="${totalW}" height="${h}" rx="6" fill="${TOKENS.paper}" stroke="${TOKENS.ink}" stroke-width="1.8" />
  <!-- Label section -->
  <rect x="1" y="1" width="${lblW}" height="${h}" rx="6" fill="${TOKENS.ink}" />
  <rect x="${lblW - 4}" y="1" width="4" height="${h}" fill="${TOKENS.ink}" />
  <text x="${lblW / 2}" y="17" font-family="${TOKENS.fontFamily}" font-size="11px" font-weight="800" fill="${TOKENS.paper}" text-anchor="middle">${escapeXml(label)}</text>
  <!-- Value section -->
  <rect x="${lblW}" y="1" width="${valW}" height="${h}" rx="6" fill="${fill}" stroke="${TOKENS.ink}" stroke-width="1.8" />
  <text x="${lblW + valW / 2}" y="17" font-family="${TOKENS.fontFamily}" font-size="11px" font-weight="800" fill="${TOKENS.ink}" text-anchor="middle">${escapeXml(val)}</text>
</svg>`;
  };

  return {
    'badge-stage.svg': badge('stage', 'L0 complete', TOKENS.mint),
    'badge-tasks.svg': badge('tasks', `${data.dashboard.done} / ${data.dashboard.total_tasks} (${data.dashboard.progress_pct}%)`, TOKENS.sun),
    'badge-stack.svg': badge('stack', 'Next.js · Fastify · BullMQ', TOKENS.lavender),
    'badge-license.svg': badge('license', 'All Rights Reserved', TOKENS.cream),
  };
}

/**
 * 4. Main Build Runner
 */
export function buildDocsVisuals(rootDir = '.') {
  const taskPath = path.join(rootDir, 'task.md');
  const assetsDir = path.join(rootDir, 'docs', 'assets');
  const badgesDir = path.join(assetsDir, 'badges');

  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
  if (!fs.existsSync(badgesDir)) fs.mkdirSync(badgesDir, { recursive: true });

  const data = parseTaskMarkdown(taskPath);
  validateNumbers(data);

  const outputs = [
    { name: 'progress-overall.svg', content: generateProgressOverall(data), dir: assetsDir },
    { name: 'donut-tasks.svg', content: generateDonutTasks(data), dir: assetsDir },
    { name: 'progress-phases.svg', content: generateProgressPhases(data), dir: assetsDir },
    { name: 'roadmap-stages.svg', content: generateRoadmapStages(data), dir: assetsDir },
    { name: 'palette.svg', content: generatePalette(), dir: assetsDir },
    { name: 'banner.svg', content: generateBanner(), dir: assetsDir },
  ];

  const badges = generateBadges(data);
  for (const [name, content] of Object.entries(badges)) {
    outputs.push({ name, content, dir: badgesDir });
  }

  outputs.forEach((item) => {
    const fullPath = path.join(item.dir, item.name);
    fs.writeFileSync(fullPath, item.content.trim() + '\n', 'utf-8');
    const sizeKb = (Buffer.byteLength(item.content, 'utf-8') / 1024).toFixed(1);
    console.log(`[docs-visuals] Wrote ${path.relative(rootDir, fullPath).replace(/\\/g, '/')} (${sizeKb} KB)`);
  });

  return outputs;
}

import { pathToFileURL } from 'url';
if (process.argv[1] && (import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href || import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')))) {
  buildDocsVisuals('.');
}
