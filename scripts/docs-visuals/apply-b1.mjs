import fs from 'fs';

let content = fs.readFileSync('README.md', 'utf-8');

const banner = `<!-- visual:start banner -->
![Oddly Banner](docs/assets/banner.svg)

<p align="center">
  <img src="docs/assets/badges/badge-stage.svg" alt="Stage: L0 Complete" />
  <img src="docs/assets/badges/badge-tasks.svg" alt="Tasks: 237 / 393 (60%)" />
  <img src="docs/assets/badges/badge-stack.svg" alt="Stack: Next.js 14 · Fastify · BullMQ" />
  <img src="docs/assets/badges/badge-license.svg" alt="License: Proprietary" />
</p>
<!-- visual:end banner -->

`;

if (!content.includes('<!-- visual:start banner -->')) {
  content = banner + content;
}

const whereWeAre = `

<!-- visual:start where-we-are -->
### Where We Are
![Overall Project Progress](docs/assets/progress-overall.svg)

![Recommended Execution Order Stage Roadmap](docs/assets/roadmap-stages.svg)
<!-- visual:end where-we-are -->`;

if (!content.includes('<!-- visual:start where-we-are -->')) {
  content = content.replace(/(> Daily five-pick game finding your stranger twin anywhere in the world in under 30 seconds\.)/, '$1' + whereWeAre);
}

// Documentation map table
content = content
  .replace('| **Product Specification**  | [`product.md`]', '| 📘 **Product Specification** | [`product.md`]')
  .replace('| **Technical Architecture** | [`architecture.md`]', '| 🏗️ **Technical Architecture** | [`architecture.md`]')
  .replace('| **Rules & Standards**      | [`rules.md`]', '| 📏 **Rules & Standards** | [`rules.md`]')
  .replace('| **Design System**          | [`design.md`]', '| 🎨 **Design System** | [`design.md`]')
  .replace('| **Task Breakdown**         | [`task.md`]', '| ✅ **Task Breakdown** | [`task.md`]')
  .replace('| **Living Memory**          | [`memory.md`]', '| 🧠 **Living Memory** | [`memory.md`]');

fs.writeFileSync('README.md', content, 'utf-8');
console.log('README.md successfully updated with B1 visuals.');
