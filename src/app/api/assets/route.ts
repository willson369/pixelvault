import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publicUrlForKey } from "@/lib/cos";
import { cosineSimilarity, parseEmbedding, enrichAsset } from "@/lib/ai";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const mode = searchParams.get("mode") || "keyword"; // keyword | semantic
  const teamId = searchParams.get("teamId");

  const teamIds = (
    await prisma.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    })
  ).map((m) => m.teamId);

  const where = {
    OR: [
      { userId: session.user.id, teamId: null as string | null },
      ...(teamIds.length ? [{ teamId: { in: teamIds } }] : []),
    ],
    ...(teamId ? { teamId } : {}),
  };

  let assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (q && mode === "keyword") {
    const lower = q.toLowerCase();
    assets = assets.filter((a) => {
      const hay = `${a.title} ${a.description} ${a.tags}`.toLowerCase();
      return hay.includes(lower);
    });
  }

  if (q && mode === "semantic") {
    const queryEmb = (await enrichAsset({ filename: q, mimeType: "text/plain" })).embedding;
    assets = assets
      .map((a) => {
        const emb = parseEmbedding(a.embedding);
        const score = emb ? cosineSimilarity(queryEmb, emb) : -1;
        return { asset: a, score };
      })
      .filter((x) => x.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.asset);
  }

  return NextResponse.json({
    assets: assets.map((a) => ({
      ...a,
      url: publicUrlForKey(a.objectKey),
      thumbUrl: publicUrlForKey(a.thumbKey),
    })),
  });
}
