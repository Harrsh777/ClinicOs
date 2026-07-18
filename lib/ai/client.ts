import { logAIUsage, type AIFeature } from "@/lib/ai/usage-logger";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export interface AIChatParams {
  clinicId: string;
  feature: AIFeature;
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface AIChatResult {
  content: string;
  tokensUsed: number;
  provider: "gemini" | "groq";
}

const AI_REQUEST_TIMEOUT_MS = 8_000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
  });
}

async function geminiChatCompletion(params: AIChatParams): Promise<AIChatResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const url = `${GEMINI_BASE}/models/${model}:generateContent`;

  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: params.userPrompt }] }],
        generationConfig: {
          maxOutputTokens: params.maxTokens ?? 1024,
          temperature: 0.6,
          ...(params.jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { totalTokenCount?: number };
    };

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!content) return null;

    const tokensUsed = data.usageMetadata?.totalTokenCount ?? 0;
    await logAIUsage(params.clinicId, params.feature, tokensUsed, {
      ...params.metadata,
      provider: "gemini",
      model,
    });

    return { content, tokensUsed, provider: "gemini" };
  } catch {
    return null;
  }
}

async function callGroqApi(params: AIChatParams): Promise<AIChatResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetchWithTimeout(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
        max_tokens: params.maxTokens ?? 1024,
        temperature: 0.6,
        ...(params.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    const tokensUsed = data.usage?.total_tokens ?? 0;
    await logAIUsage(params.clinicId, params.feature, tokensUsed, {
      ...params.metadata,
      provider: "groq",
    });

    return { content, tokensUsed, provider: "groq" };
  } catch {
    return null;
  }
}

/** Gemini first (if GEMINI_API_KEY set), then Groq fallback. */
export async function aiChatCompletion(params: AIChatParams): Promise<AIChatResult | null> {
  const gemini = await geminiChatCompletion(params);
  if (gemini) return gemini;
  return callGroqApi(params);
}

export function parseAIJson<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

/** @deprecated Use aiChatCompletion */
export const groqChatCompletion = aiChatCompletion;
/** @deprecated Use parseAIJson */
export const parseGroqJson = parseAIJson;

export type GroqChatParams = AIChatParams;
export type GroqChatResult = AIChatResult;
