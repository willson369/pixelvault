import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "member"]).default("member"),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { id: teamId } = await ctx.params;

  const me = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
  });
  if (!me || me.role !== "owner") {
    return NextResponse.json({ error: "仅 owner 可邀请" }, { status: 403 });
  }

  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!user) {
      return NextResponse.json({ error: "用户不存在，请先注册" }, { status: 404 });
    }
    const member = await prisma.teamMember.upsert({
      where: { userId_teamId: { userId: user.id, teamId } },
      create: { userId: user.id, teamId, role: body.role },
      update: { role: body.role },
    });
    return NextResponse.json({ member });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }
    return NextResponse.json({ error: "邀请失败" }, { status: 500 });
  }
}
