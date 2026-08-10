# PixelVault

小团队 AI 素材库 MVP。图片存 **腾讯云 COS**，元数据存 MySQL。AI 默认免费 Mock。

## 本地启动

```bash
cp .env.example .env
# 填写 DATABASE_URL / COS_* / AUTH_SECRET
npm install
npx prisma db push
npm run dev
```

打开 http://localhost:3000

## Vercel 部署需要的环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | **必须是公网可访问的 MySQL**（不能用 localhost） |
| `AUTH_SECRET` | 随机长字符串 |
| `AUTH_URL` | 线上域名，如 `https://xxx.vercel.app` |
| `COS_SECRET_ID` / `COS_SECRET_KEY` | 腾讯云密钥 |
| `COS_BUCKET` / `COS_REGION` / `COS_ENDPOINT` / `COS_PUBLIC_BASE_URL` | 桶配置 |

## 技术栈

Next.js 15 · Prisma · MySQL · 腾讯云 COS · Auth.js · Sharp · Mock AI
