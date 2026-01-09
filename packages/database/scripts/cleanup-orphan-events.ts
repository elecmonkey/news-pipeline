import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../../..", ".env") });

const confirm = process.argv.includes("--confirm");

const { prisma } = await import("../dist/index.js");

type IdRow = { id: string };

async function main() {
  await prisma.$connect();

  const orphanEvents = (await prisma.$queryRawUnsafe(
    'SELECT e."id" FROM "Event" e LEFT JOIN "GenerationRun" g ON e."generationRunId" = g."id" WHERE g."id" IS NULL'
  )) as IdRow[];

  const orphanEventIds = orphanEvents.map((row) => row.id);
  console.log(`[db] orphan events=${orphanEventIds.length}`);

  if (!confirm || orphanEventIds.length === 0) {
    if (!confirm) {
      console.log("[db] dry run only. Re-run with --confirm to delete.");
    }
    await prisma.$disconnect();
    return;
  }

  const linkResult = await prisma.eventArticleLink.deleteMany({
    where: { eventId: { in: orphanEventIds } },
  });
  const eventResult = await prisma.event.deleteMany({
    where: { id: { in: orphanEventIds } },
  });

  console.log(
    `[db] deleted orphan events=${eventResult.count} links=${linkResult.count}`
  );
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("[db] cleanup orphan events failed", error);
  await prisma.$disconnect();
  process.exit(1);
});
