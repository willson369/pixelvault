import { auth } from "@/lib/auth";

export async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Response(JSON.stringify({ error: "未登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session.user.id;
}
