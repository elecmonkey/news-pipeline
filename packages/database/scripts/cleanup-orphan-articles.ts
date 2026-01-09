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

  const orphanArticles = (await prisma.$queryRawUnsafe(
    'SELECT a."id" FROM "Article" a LEFT JOIN "EventArticleLink" l ON a."id" = l."articleId" WHERE l."articleId" IS NULL'
  )) as IdRow[];

  const orphanArticleIds = orphanArticles.map((row) => row.id);
  console.log(`[db] orphan articles=${orphanArticleIds.length}`);

  if (!confirm || orphanArticleIds.length === 0) {
    if (!confirm) {
      console.log("[db] dry run only. Re-run with --confirm to delete.");
    }
    await prisma.$disconnect();
    return;
  }

  const articleResult = await prisma.article.deleteMany({
    where: { id: { in: orphanArticleIds } },
  });

  console.log(`[db] deleted orphan articles=${articleResult.count}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("[db] cleanup orphan articles failed", error);
  await prisma.$disconnect();
  process.exit(1);
});
