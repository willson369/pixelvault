import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  assetId: z.string().min(1),
  password: z.string().min(4).max(64).optional(),
  expiresInHours: z.number().int().positive().max(24 * 30).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());
    const asset = await prisma.asset.findUnique({ where: { id: body.assetId } });
    if (!asset || asset.userId !== session.user.id) {
      // also allow team members
      if (!asset) {
        return NextResponse.json({ error: "素材不存在" }, { status: 404 });
      }
      if (asset.teamId) {
        const member = await prisma.teamMember.findUnique({
          where: {
            userId_teamId: { userId: session.user.id, teamId: asset.teamId },
          },
        });
        if (!member) {
          return NextResponse.json({ error: "无权分享" }, { status: 403 });
        }
      } else if (asset.userId !== session.user.id) {
        return NextResponse.json({ error: "无权分享" }, { status: 403 });
      }
    }

    const token = randomBytes(16).toString("hex");
    const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : null;
    const expiresAt = body.expiresInHours
      ? new Date(Date.now() + body.expiresInHours * 3600 * 1000)
      : null;

    const link = await prisma.shareLink.create({
      data: {
        token,
        assetId: asset!.id,
        createdById: session.user.id,
        passwordHash,
        expiresAt,
      },
    });

    return NextResponse.json({
      share: link,
      url: `/s/${link.token}`,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }
    return NextResponse.json({ error: "创建分享失败" }, { status: 500 });
  }
}
