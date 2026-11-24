import fs from "node:fs";

const schema = fs.readFileSync("packages/shared/prisma/schema.prisma", "utf8");
const models = [...schema.matchAll(/model\s+(\w+)\s+{([\s\S]*?)}/g)];
console.log("Total models:", models.length);

for (const m of models) {
  const name = m[1];
  const body = m[2];
  const map = body.match(/@@map\("([^"]+)"\)/);
  const table = map ? map[1] : name;
  const idLine = body.split("\n").find(l => l.includes("@id") || l.trim().startsWith("id "));
  const hasLane = body.includes("lane_id");
  console.log(
    name.padEnd(25) +
    table.padEnd(25) +
    (idLine ? idLine.trim() : "NO ID").slice(0, 35).padEnd(38) +
    (hasLane ? " [lane_id]" : "")
  );
}
