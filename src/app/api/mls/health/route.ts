import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const now = new Date();

  const [lastSync, listingCount, recentErrors] = await Promise.all([
    prisma.mlsSyncRun.findFirst({
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        status: true,
        syncType: true,
        totalRecords: true,
        insertedCount: true,
        updatedCount: true,
        deletedCount: true,
        errorCount: true,
      },
    }),

    prisma.mlsListing.count(),

    prisma.mlsSyncRun.count({
      where: {
        status: "FAILED",
        startedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const statusCounts = await prisma.mlsListing.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const lastSuccessfulSync = await prisma.mlsSyncRun.findFirst({
    where: { status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  const minutesSinceLastSync = lastSuccessfulSync?.completedAt
    ? Math.round(
        (now.getTime() - lastSuccessfulSync.completedAt.getTime()) / 60_000
      )
    : null;

  const STALE_THRESHOLD_MINUTES = 120;
  const feedFresh =
    minutesSinceLastSync !== null &&
    minutesSinceLastSync < STALE_THRESHOLD_MINUTES;

  const healthy =
    recentErrors < 3 && (minutesSinceLastSync === null || feedFresh);

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      timestamp: now.toISOString(),
      feed: {
        provider: "ampre-reso",
        configured: !!process.env.AMPRE_API_TOKEN,
        apiUrl: process.env.AMPRE_API_URL ?? "https://query.ampre.ca/odata",
        totalListings: listingCount,
        listingsByStatus: Object.fromEntries(
          statusCounts.map(
            (s: { status: string; _count: { _all: number } }) => [
              s.status,
              s._count._all,
            ]
          )
        ),
      },
      sync: {
        lastRun: lastSync
          ? {
              id: lastSync.id,
              startedAt: lastSync.startedAt,
              completedAt: lastSync.completedAt,
              status: lastSync.status,
              type: lastSync.syncType,
              records: {
                total: lastSync.totalRecords,
                inserted: lastSync.insertedCount,
                updated: lastSync.updatedCount,
                deleted: lastSync.deletedCount,
                errors: lastSync.errorCount,
              },
            }
          : null,
        lastSuccessfulSync: lastSuccessfulSync?.completedAt ?? null,
        minutesSinceLastSync,
        feedFresh,
        errorsLast24h: recentErrors,
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
