// OpenRouter client — one key, every model. Used by the autonomous agents to
// turn product data into marketing/sales copy. Text-only: the agents' "hands"
// (DB access, scheduling, sending) live in our own code, not the model.

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Default to a free, capable instruct model. Override with OPENROUTER_MODEL.
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';

export interface GenerateOptions {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function generateText(opts: GenerateOptions): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.APP_URL || 'https://ai-pokupki.vercel.app',
      'X-Title': 'AI-Pokupki Agents',
    },
    body: JSON.stringify({
      model: opts.model || DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? 500,
      temperature: opts.temperature ?? 0.8,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`);
  }

  const data: any = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenRouter returned no content');
  return String(text).trim();
}
