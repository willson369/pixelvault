import { NextResponse } from "next/server";
import { processNextAiJobs } from "@/lib/ai-worker";
import { pingCos, isCosConfigured } from "@/lib/cos";
import { prisma } from "@/lib/db";

export async function GET() {
  let dbOk = false;
  let dbMessage = "";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    dbMessage = "MySQL 连通正常";
  } catch (e) {
    dbMessage = e instanceof Error ? e.message : "MySQL 连接失败";
  }

  const cos = await pingCos();
  const processed = dbOk ? await processNextAiJobs(5) : 0;

  return NextResponse.json({
    ok: dbOk,
    db: { ok: dbOk, message: dbMessage },
    cos: { configured: isCosConfigured(), ...cos },
    aiJobsProcessed: processed,
  });
}

export async function POST() {
  const n = await processNextAiJobs(10);
  return NextResponse.json({ processed: n });
}
