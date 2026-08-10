"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Asset = {
  title: string;
  description: string;
  tags: string;
  url: string;
  thumbUrl: string;
};

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [needPassword, setNeedPassword] = useState(false);
  const [error, setError] = useState("");

  async function load(password?: string) {
    const qs = password ? `?password=${encodeURIComponent(password)}` : "";
    const res = await fetch(`/api/share/${params.token}${qs}`);
    const data = await res.json();
    if (res.status === 401 && data.needPassword) {
      setNeedPassword(true);
      setError("需要密码");
      return;
    }
    if (!res.ok) {
      setError(data.error || "无法打开");
      return;
    }
    setNeedPassword(false);
    setError("");
    setAsset(data.asset);
  }

  useEffect(() => {
    void load();
  }, [params.token]);

  async function onPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await load(String(fd.get("password") || ""));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
      <div className="mb-6 font-[family-name:var(--font-display)] text-xl text-[var(--accent)]">
        PixelVault Share
      </div>
      {needPassword ? (
        <form onSubmit={onPassword} className="card max-w-sm space-y-3 rounded-2xl p-5">
          <p className="text-sm">此分享需要密码</p>
          <input
            name="password"
            type="password"
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
          />
          <button className="rounded-full bg-[var(--accent)] px-4 py-2 text-white">解锁</button>
        </form>
      ) : null}
      {error && !asset ? <p className="text-[var(--accent-2)]">{error}</p> : null}
      {asset ? (
        <article className="card overflow-hidden rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset.url} alt={asset.title} className="max-h-[70vh] w-full object-contain" />
          <div className="space-y-2 p-5">
            <h1 className="text-2xl">{asset.title}</h1>
            <p className="text-[var(--muted)]">{asset.description}</p>
            <p className="text-sm text-[var(--muted)]">{asset.tags}</p>
          </div>
        </article>
      ) : null}
    </main>
  );
}
