import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../../..", ".env") });

const { prisma } = await import("../dist/index.js");

const runId = process.argv[2];
if (!runId) {
  console.error("Usage: pnpm -C packages/database db:delete-report <runId>");
  process.exit(1);
}

async function main() {
  await prisma.$connect();
  const run = await prisma.generationRun.findUnique({
    where: { id: runId },
    select: { id: true },
  });
  if (!run) {
    console.error(`[db] generationRun not found: ${runId}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const events = await prisma.event.findMany({
    where: { generationRunId: runId },
    select: { id: true },
  });
  const eventIds = events.map((event) => event.id);

  let linkCount = 0;
  if (eventIds.length) {
    const linkResult = await prisma.eventArticleLink.deleteMany({
      where: { eventId: { in: eventIds } },
    });
    linkCount = linkResult.count;
  }

  const eventResult = await prisma.event.deleteMany({
    where: { generationRunId: runId },
  });
  await prisma.generationRun.delete({ where: { id: runId } });

  console.log(
    `[db] deleted run=${runId} events=${eventResult.count} links=${linkCount}`
  );
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("[db] delete failed", error);
  await prisma.$disconnect();
  process.exit(1);
});
