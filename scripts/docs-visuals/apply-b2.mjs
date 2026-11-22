import fs from 'fs';

let content = fs.readFileSync('task.md', 'utf-8');
const lines = content.split(/\r?\n/);
const eol = content.includes('\r\n') ? '\r\n' : '\n';

// 1. Under dashboard table: add progress-overall.svg & donut-tasks.svg
// Find end of section 1 dashboard table
const newLines = [];
let inDashboard = false;
let dashboardDone = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('## 1. Master Progress Dashboard')) {
    inDashboard = true;
    newLines.push(line);
    continue;
  }

  if (inDashboard && !dashboardDone && line.startsWith('---')) {
    inDashboard = false;
    dashboardDone = true;
    newLines.push('');
    newLines.push('<!-- visual:start dashboard-visuals -->');
    newLines.push('![Overall Project Progress](docs/assets/progress-overall.svg)');
    newLines.push('');
    newLines.push('![Task Distribution](docs/assets/donut-tasks.svg)');
    newLines.push('<!-- visual:end dashboard-visuals -->');
    newLines.push(line);
    continue;
  }

  // Recommended Execution Order
  if (line.includes('### Recommended Execution Order')) {
    newLines.push(line);
    // Next line is blank, then the arrow line
    continue;
  }
  if (lines[i - 2] && lines[i - 2].includes('### Recommended Execution Order') && line.startsWith('`F1')) {
    newLines.push(line);
    newLines.push('');
    newLines.push('<!-- visual:start roadmap-visual -->');
    newLines.push('![Recommended Execution Order Stage Roadmap](docs/assets/roadmap-stages.svg)');
    newLines.push('<!-- visual:end roadmap-visual -->');
    continue;
  }

  // Above Phase Overview table
  if (line.includes('## 2. Phase Overview Table')) {
    newLines.push(line);
    newLines.push('');
    newLines.push('<!-- visual:start phases-visual -->');
    newLines.push('![Phases Progress](docs/assets/progress-phases.svg)');
    newLines.push('<!-- visual:end phases-visual -->');
    continue;
  }

  // Phase Overview table row formatting
  if (line.startsWith('| **Phase')) {
    const parts = line.split('|');
    if (parts.length >= 8) {
      // parts[0] is empty, parts[1] is Phase, parts[2] is Name, parts[3] is Priority, parts[4] is Status, parts[5] is Progress, parts[6] is Tasks, parts[7] is Stage
      const statusRaw = parts[4].trim();
      let statusEmoji = '';
      if (statusRaw.includes('COMPLETE')) statusEmoji = '✅ COMPLETE';
      else if (statusRaw.includes('PARTIAL')) statusEmoji = '🟡 PARTIAL';
      else if (statusRaw.includes('TODO')) statusEmoji = '⚪ TODO';
      else if (statusRaw.includes('BLOCKED')) statusEmoji = '🔴 BLOCKED';
      else statusEmoji = statusRaw;

      // Progress bar replacement
      const pctMatch = parts[5].match(/(\d+)%/);
      const pct = pctMatch ? parseInt(pctMatch[1], 10) : 0;
      const greenSquares = Math.round(pct / 10);
      const whiteSquares = 10 - greenSquares;
      const emojiBar = '`' + '🟩'.repeat(greenSquares) + '⬜'.repeat(whiteSquares) + ` ${pct}%` + '`';

      parts[4] = ` ${statusEmoji.padEnd(11)} `;
      parts[5] = ` ${emojiBar} `;
      newLines.push(parts.join('|'));
      continue;
    }
  }

  // Task rows in Phase breakdowns
  if (line.startsWith('| `[x] ') || line.startsWith('| `[ ] ')) {
    const parts = line.split('|');
    if (parts.length >= 9) {
      // parts[3] is Priority, parts[4] is Status
      const prioRaw = parts[3].trim();
      let prioWithEmoji = prioRaw;
      if (prioRaw === 'Critical') prioWithEmoji = '🔴 Critical';
      else if (prioRaw === 'High') prioWithEmoji = '🟠 High';
      else if (prioRaw === 'Medium') prioWithEmoji = '🟡 Medium';
      else if (prioRaw === 'Low') prioWithEmoji = '🟢 Low';

      const statusRaw = parts[4].trim();
      let statusWithEmoji = statusRaw;
      if (statusRaw === 'DONE') statusWithEmoji = '✅ DONE';
      else if (statusRaw === 'TODO') statusWithEmoji = '⚪ TODO';
      else if (statusRaw === 'IN PROGRESS') statusWithEmoji = '🟡 IN PROGRESS';
      else if (statusRaw === 'BLOCKED') statusWithEmoji = '🔴 BLOCKED';

      parts[3] = ` ${prioWithEmoji.padEnd(12)} `;
      parts[4] = ` ${statusWithEmoji.padEnd(14)} `;
      newLines.push(parts.join('|'));
      continue;
    }
  }

  newLines.push(line);
}

// Stage checklists progress bars in Section 4
// Find each "- **Stage ... Checklist"
const finalLines = [];
for (let i = 0; i < newLines.length; i++) {
  const line = newLines[i];
  if (line.startsWith('- **Stage ') && line.includes('Checklist')) {
    // Count items under this checklist until next checklist or section
    let totalItems = 0;
    let doneItems = 0;
    for (let j = i + 1; j < newLines.length; j++) {
      const subLine = newLines[j];
      if (subLine.startsWith('- **Stage ') || subLine.startsWith('## ') || subLine.startsWith('---')) break;
      if (subLine.includes('- [x]')) { totalItems++; doneItems++; }
      else if (subLine.includes('- [ ]')) { totalItems++; }
    }

    finalLines.push(line);
    if (totalItems > 0) {
      const pct = Math.round((doneItems / totalItems) * 100);
      const greenCount = Math.round(pct / 10);
      const whiteCount = 10 - greenCount;
      const bar = '🟩'.repeat(greenCount) + '⬜'.repeat(whiteCount);
      const safeId = line.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().replace(/--+/g, '-');
      finalLines.push(`  <!-- visual:start ${safeId}-bar -->`);
      finalLines.push(`  > ${bar} **${pct}%** (${doneItems}/${totalItems} verification items verified)`);
      finalLines.push(`  <!-- visual:end ${safeId}-bar -->`);
    }
    continue;
  }
  finalLines.push(line);
}

fs.writeFileSync('task.md', finalLines.join(eol), 'utf-8');
console.log('task.md successfully transformed with B2 visuals.');
