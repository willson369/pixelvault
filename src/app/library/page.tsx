"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Asset = {
  id: string;
  title: string;
  description: string;
  tags: string;
  aiStatus: string;
  thumbUrl: string;
  url: string;
};

type Team = { id: string; name: string; role: string };

export default function LibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"keyword" | "semantic">("keyword");
  const [teamId, setTeamId] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("mode", mode);
    if (teamId) params.set("teamId", teamId);
    const res = await fetch(`/api/assets?${params.toString()}`);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json();
    setAssets(data.assets || []);
  }, [q, mode, teamId]);

  async function loadTeams() {
    const res = await fetch("/api/teams");
    if (!res.ok) return;
    const data = await res.json();
    setTeams(data.teams || []);
  }

  useEffect(() => {
    void load();
    void loadTeams();
  }, [load]);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    if (teamId) fd.set("teamId", teamId);
    const res = await fetch("/api/assets/upload", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error + (data.hint ? `（${data.hint}）` : ""));
      return;
    }
    setMsg("上传成功，AI 打标已排队");
    e.currentTarget.reset();
    setTimeout(() => void load(), 800);
  }

  async function createTeam() {
    const name = window.prompt("团队名称");
    if (!name) return;
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      await loadTeams();
      setMsg("团队已创建");
    }
  }

  async function shareAsset(assetId: string) {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, expiresInHours: 72 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "分享失败");
      return;
    }
    const url = `${window.location.origin}${data.url}`;
    await navigator.clipboard.writeText(url);
    setMsg(`分享链接已复制：${url}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-[family-name:var(--font-display)] text-2xl text-[var(--accent)]">
            PixelVault
          </div>
          <p className="text-sm text-[var(--muted)]">素材库 · COS 存储 · AI 检索</p>
        </div>
        <div className="flex gap-2 text-sm">
          <button className="card rounded-full px-4 py-2" onClick={() => void createTeam()}>
            新建团队
          </button>
          <button
            className="rounded-full bg-[var(--ink)] px-4 py-2 text-white"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            退出
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="card rounded-2xl p-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索标题 / 标签 / 语义"
              className="min-w-[200px] flex-1 rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
            />
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "keyword" | "semantic")}
              className="rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
            >
              <option value="keyword">关键词</option>
              <option value="semantic">语义搜索</option>
            </select>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
            >
              <option value="">个人 + 全部团队</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}（{t.role}）
                </option>
              ))}
            </select>
            <button
              onClick={() => void load()}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-white"
            >
              搜索
            </button>
          </div>
        </div>

        <form onSubmit={onUpload} className="card rounded-2xl p-4">
          <p className="mb-2 text-sm font-medium">上传到腾讯云 COS</p>
          <input name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
          <button
            disabled={loading}
            className="mt-3 w-full rounded-full bg-[var(--ink)] py-2 text-white disabled:opacity-60"
          >
            {loading ? "上传中…" : "上传"}
          </button>
        </form>
      </section>

      {msg ? <p className="mt-4 text-sm text-[var(--accent-2)]">{msg}</p> : null}

      <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {assets.map((a) => (
          <article key={a.id} className="card overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.thumbUrl} alt={a.title} className="aspect-square w-full object-cover" />
            <div className="space-y-1 p-3">
              <h3 className="line-clamp-1 text-sm font-medium">{a.title}</h3>
              <p className="line-clamp-2 text-xs text-[var(--muted)]">
                {a.description || "等待 AI 打标…"}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                AI: {a.aiStatus}
              </p>
              <div className="flex gap-2 pt-1 text-xs">
                <Link href={a.url} target="_blank" className="underline">
                  原图
                </Link>
                <button onClick={() => void shareAsset(a.id)} className="underline">
                  分享
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {!assets.length ? (
        <p className="mt-10 text-center text-[var(--muted)]">暂无素材，先上传一张图试试。</p>
      ) : null}
    </main>
  );
}
