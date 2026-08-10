import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(64).optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "邮箱已注册" }, { status: 409 });
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name: body.name || email.split("@")[0],
        passwordHash,
      },
      select: { id: true, email: true, name: true },
    });
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: e.flatten() }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "注册失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
