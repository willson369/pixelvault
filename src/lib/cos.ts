import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.startsWith("YOUR_")) {
    throw new Error(`缺少有效配置 ${name}，请在 .env 填写腾讯云 COS 真实值（当前为占位）`);
  }
  return v;
}

export function isCosConfigured(): boolean {
  const id = process.env.COS_SECRET_ID ?? "";
  const key = process.env.COS_SECRET_KEY ?? "";
  const bucket = process.env.COS_BUCKET ?? "";
  return Boolean(id && key && bucket && !id.startsWith("YOUR_") && !key.startsWith("YOUR_") && !bucket.startsWith("your-"));
}

export function getCosClient() {
  const region = process.env.COS_REGION || "ap-guangzhou";
  const endpoint = process.env.COS_ENDPOINT || `https://cos.${region}.myqcloud.com`;
  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: required("COS_SECRET_ID"),
      secretAccessKey: required("COS_SECRET_KEY"),
    },
    forcePathStyle: false,
  });
}

export function getCosBucket() {
  return required("COS_BUCKET");
}

export function publicUrlForKey(objectKey: string): string {
  const base = process.env.COS_PUBLIC_BASE_URL;
  if (!base || base.includes("your-bucket")) {
    const bucket = process.env.COS_BUCKET || "bucket";
    const region = process.env.COS_REGION || "ap-guangzhou";
    return `https://${bucket}.cos.${region}.myqcloud.com/${objectKey}`;
  }
  return `${base.replace(/\/$/, "")}/${objectKey}`;
}

export async function uploadToCos(params: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  const client = getCosClient();
  const bucket = getCosBucket();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );
  return publicUrlForKey(params.key);
}

export async function deleteFromCos(key: string) {
  if (!isCosConfigured()) return;
  const client = getCosClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getCosBucket(),
      Key: key,
    }),
  );
}

export async function pingCos(): Promise<{ ok: boolean; message: string }> {
  if (!isCosConfigured()) {
    return { ok: false, message: "COS 仍为占位配置，请填写 .env 中的 COS_*" };
  }
  try {
    const client = getCosClient();
    await client.send(new HeadBucketCommand({ Bucket: getCosBucket() }));
    return { ok: true, message: "COS 连通正常" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "COS 探测失败" };
  }
}
