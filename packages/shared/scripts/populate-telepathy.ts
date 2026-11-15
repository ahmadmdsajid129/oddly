if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";
}

import { PrismaClient, selectTelepathyQuestion } from "@oddly/shared";

const prisma = new PrismaClient();

async function run() {
  const drops = await prisma.drop.findMany({
    include: {
      questions: {
        include: { answerOptions: true },
        orderBy: { position: "asc" },
      },
    },
  });

  console.log(`Found ${drops.length} drops to verify/update telepathy_question_id`);

  for (const drop of drops) {
    const candidate = selectTelepathyQuestion(drop.questions);
    const chosenQ = candidate || drop.questions[0];
    if (chosenQ) {
      await prisma.drop.update({
        where: { id: drop.id },
        data: { telepathy_question_id: chosenQ.id },
      });
      console.log(
        `Drop ${drop.drop_date.toISOString().slice(0, 10)}: telepathy_question_id -> ${chosenQ.id} (${chosenQ.type})`
      );
    }
  }

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
