import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/library");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--accent)]">
          PixelVault
        </div>
        <div className="flex gap-3 text-sm">
          <Link className="rounded-full px-4 py-2 hover:bg-white/50" href="/login">
            登录
          </Link>
          <Link
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-white"
            href="/register"
          >
            注册
          </Link>
        </div>
      </header>

      <section className="mt-24 grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div>
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
            Team AI Asset Library
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-[1.05] md:text-6xl">
            PixelVault
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--muted)]">
            小团队素材入库、AI 自动打标与语义搜索。文件直存腾讯云 COS，不落本地盘。
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/register"
              className="rounded-full bg-[var(--ink)] px-6 py-3 text-white"
            >
              开始使用
            </Link>
            <Link href="/login" className="card rounded-full px-6 py-3">
              已有账号
            </Link>
          </div>
        </div>
        <div className="card rounded-3xl p-6 shadow-sm">
          <ul className="space-y-3 text-sm text-[var(--muted)]">
            <li>· 上传 jpg / png / webp 到腾讯云 COS</li>
            <li>· Mock / OpenAI 自动标题、标签、向量</li>
            <li>· 关键词 + 语义搜索</li>
            <li>· 团队空间 owner/member + 分享链接</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
