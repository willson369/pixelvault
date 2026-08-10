import { prisma } from "@/lib/db";
import { enrichAsset } from "@/lib/ai";

export async function processNextAiJobs(limit = 3) {
  const jobs = await prisma.aiJob.findMany({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { asset: true },
  });

  for (const job of jobs) {
    await prisma.aiJob.update({
      where: { id: job.id },
      data: { status: "running", attempts: { increment: 1 } },
    });

    try {
      const result = await enrichAsset({
        filename: job.asset.title,
        mimeType: job.asset.mimeType,
      });

      await prisma.asset.update({
        where: { id: job.assetId },
        data: {
          title: result.title,
          description: result.description,
          tags: result.tags.join(","),
          embedding: JSON.stringify(result.embedding),
          aiStatus: "done",
        },
      });

      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: "done", lastError: null },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "unknown";
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: "failed", lastError: message },
      });
      await prisma.asset.update({
        where: { id: job.assetId },
        data: { aiStatus: "failed" },
      });
    }
  }

  return jobs.length;
}
