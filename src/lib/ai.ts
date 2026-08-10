export type AiEnrichment = {
  title: string;
  description: string;
  tags: string[];
  embedding: number[];
};

function mockEmbedding(text: string, dims = 64): number[] {
  const vec = new Array(dims).fill(0);
  for (let i = 0; i < text.length; i++) {
    const idx = text.charCodeAt(i) % dims;
    vec[idx] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

function mockEnrich(filename: string): AiEnrichment {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "untitled";
  const tags = ["素材", "图片", base.split(/\s+/)[0] || "未命名"].filter(Boolean);
  const description = `自动生成描述：${base}（免费 Mock AI）`;
  const title = base.slice(0, 80);
  const embedding = mockEmbedding(`${title} ${description} ${tags.join(" ")}`);
  return { title, description, tags, embedding };
}

export async function enrichAsset(input: {
  filename: string;
  mimeType: string;
}): Promise<AiEnrichment> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return mockEnrich(input.filename);
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const embModel = process.env.OPENAI_EMBEDDING_MODEL || "";

  const prompt = `根据文件名与类型，为素材库生成 JSON：{"title":"...","description":"...","tags":["..."]}。文件名=${input.filename}，类型=${input.mimeType}。用中文，tags 3-6 个。`;

  const chatRes = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "你是素材库标签助手，只输出 JSON。" },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!chatRes.ok) {
    return mockEnrich(input.filename);
  }

  const chatJson = (await chatRes.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  let title = input.filename;
  let description = "";
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(chatJson.choices?.[0]?.message?.content || "{}") as {
      title?: string;
      description?: string;
      tags?: string[];
    };
    title = parsed.title || title;
    description = parsed.description || "";
    tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [];
  } catch {
    return mockEnrich(input.filename);
  }

  let embedding = mockEmbedding(`${title} ${description} ${tags.join(" ")}`);
  if (embModel) {
    const embRes = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: embModel,
        input: `${title}\n${description}\n${tags.join(",")}`,
      }),
    });
    if (embRes.ok) {
      const embJson = (await embRes.json()) as { data?: { embedding?: number[] }[] };
      if (embJson.data?.[0]?.embedding) {
        embedding = embJson.data[0].embedding;
      }
    }
  }

  return { title, description, tags, embedding };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

export function parseEmbedding(raw: string | null | undefined): number[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw) as number[];
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}
