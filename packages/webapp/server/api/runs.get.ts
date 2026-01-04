import { prisma } from "@news-pipeline/database";

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = parseNumber(query.page as string | undefined, 1);
  const pageSize = Math.min(parseNumber(query.pageSize as string | undefined, 10), 20);
  const skip = (page - 1) * pageSize;

  type RunRow = {
    id: string;
    windowStart: Date;
    windowEnd: Date;
    createdAt: Date;
    _count: { events: number };
  };

  const [total, runs] = await Promise.all([
    prisma.generationRun.count(),
    prisma.generationRun.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        windowStart: true,
        windowEnd: true,
        createdAt: true,
        _count: { select: { events: true } },
      },
    }),
  ]) as [number, RunRow[]];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    page,
    pageSize,
    total,
    totalPages,
    runs: runs.map((run) => ({
      id: run.id,
      windowStart: run.windowStart,
      windowEnd: run.windowEnd,
      createdAt: run.createdAt,
      eventCount: run._count.events,
    })),
  };
});
