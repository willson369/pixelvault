import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { publicUrlForKey } from "@/lib/cos";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: { asset: true },
  });
  if (!link) {
    return NextResponse.json({ error: "链接无效" }, { status: 404 });
  }
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "链接已过期" }, { status: 410 });
  }

  const url = new URL(req.url);
  const password = url.searchParams.get("password") || "";
  if (link.passwordHash) {
    const ok = password ? await bcrypt.compare(password, link.passwordHash) : false;
    if (!ok) {
      return NextResponse.json({ error: "需要密码", needPassword: true }, { status: 401 });
    }
  }

  const a = link.asset;
  return NextResponse.json({
    asset: {
      id: a.id,
      title: a.title,
      description: a.description,
      tags: a.tags,
      width: a.width,
      height: a.height,
      url: publicUrlForKey(a.objectKey),
      thumbUrl: publicUrlForKey(a.thumbKey),
    },
  });
}
