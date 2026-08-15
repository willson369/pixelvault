# PixelVault

小团队 AI 素材库 MVP。图片存腾讯云 COS，元数据存 PostgreSQL，AI 默认免费 Mock。

## 本地启动

```bash
cp .env.example .env
# 填写 DATABASE_URL / COS_* / AUTH_SECRET
npm install
npx prisma db push
npm run dev
```

## GitHub

https://github.com/willson369/pixelvault

## Vercel 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | 公网 PostgreSQL（勿用 localhost） |
| `AUTH_SECRET` | 随机长字符串 |
| `AUTH_URL` | 线上域名，如 `https://xxx.vercel.app` |
| `COS_*` | 腾讯云 COS 配置 |

技术栈：Next.js 15 · Prisma · PostgreSQL · 腾讯云 COS · Auth.js
