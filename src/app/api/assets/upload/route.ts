import { NextResponse } from "next/server";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isCosConfigured, uploadToCos } from "@/lib/cos";
import { processNextAiJobs } from "@/lib/ai-worker";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (!isCosConfigured()) {
    return NextResponse.json(
      {
        error: "腾讯云 COS 仍为占位配置",
        hint: "请在 .env 填写 COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_PUBLIC_BASE_URL 后重试",
      },
      { status: 503 },
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少 file" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "仅支持 jpg/png/webp" }, { status: 400 });
    }
    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "文件不能超过 12MB" }, { status: 400 });
    }

    const teamIdRaw = form.get("teamId");
    const teamId = typeof teamIdRaw === "string" && teamIdRaw ? teamIdRaw : null;
    if (teamId) {
      const member = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: session.user.id, teamId } },
      });
      if (!member) {
        return NextResponse.json({ error: "无权上传到该团队" }, { status: 403 });
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = sharp(buffer);
    const meta = await image.metadata();
    const thumb = await image
      .clone()
      .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const id = randomUUID();
    const ext =
      file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const objectKey = `assets/${session.user.id}/${id}/original.${ext}`;
    const thumbKey = `assets/${session.user.id}/${id}/thumb.webp`;

    const [url, thumbUrl] = await Promise.all([
      uploadToCos({ key: objectKey, body: buffer, contentType: file.type }),
      uploadToCos({ key: thumbKey, body: thumb, contentType: "image/webp" }),
    ]);

    const asset = await prisma.asset.create({
      data: {
        title: file.name,
        description: "",
        objectKey,
        thumbKey,
        mimeType: file.type,
        size: file.size,
        width: meta.width ?? null,
        height: meta.height ?? null,
        tags: "",
        aiStatus: "pending",
        userId: session.user.id,
        teamId,
      },
    });

    await prisma.aiJob.create({
      data: { assetId: asset.id, status: "queued" },
    });

    // fire-and-forget style for MVP
    void processNextAiJobs(2);

    return NextResponse.json({
      asset: {
        ...asset,
        url,
        thumbUrl,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "上传失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
