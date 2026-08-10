"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(fd.get("email") || ""),
      password: String(fd.get("password") || ""),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("邮箱或密码错误");
      return;
    }
    router.push("/library");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-8 text-[var(--accent)]">
        ← PixelVault
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-3xl">登录</h1>
      <form onSubmit={onSubmit} className="card mt-6 space-y-4 rounded-2xl p-6">
        <label className="block text-sm">
          邮箱
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          密码
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-[var(--accent-2)]">{error}</p> : null}
        <button
          disabled={loading}
          className="w-full rounded-full bg-[var(--accent)] py-2.5 text-white disabled:opacity-60"
        >
          {loading ? "登录中…" : "登录"}
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        没有账号？ <Link href="/register">注册</Link>
      </p>
    </main>
  );
}
