import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const memberships = await prisma.teamMember.findMany({
    where: { userId: session.user.id },
    include: { team: true },
    orderBy: { team: { createdAt: "desc" } },
  });
  return NextResponse.json({
    teams: memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      role: m.role,
      createdAt: m.team.createdAt,
    })),
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(64),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const body = createSchema.parse(await req.json());
    const team = await prisma.team.create({
      data: {
        name: body.name,
        members: {
          create: { userId: session.user.id, role: "owner" },
        },
      },
    });
    return NextResponse.json({ team });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
