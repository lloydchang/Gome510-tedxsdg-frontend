// src/app/api/generateIdeas/route.ts
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
interface IdeaResult { summary: string; idea: string; ideaTitle: string; }
/**
 * Helper: write a JSON response to the cache folder.
 */
async function writeCache(key: string, data: unknown) {
  const cacheDir = path.resolve(process.cwd(), '.cache', 'ideas');
  await fs.mkdir(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, `${key}.json`);
  await fs.writeFile(cachePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Helper: read a cached JSON response if it exists.
 */
async function readCache(key: string) {
  const cachePath = path.resolve(process.cwd(), '.cache', 'ideas', `${key}.json`);
  try {
    const raw = await fs.readFile(cachePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Build the JSON shape the front‑end expects.
 */
function buildPlaceholder(): { summary: string; idea: string; ideaTitle: string } {
  return {
    summary:
      'A concise proposal to fight poverty through a universal basic income pilot aligned with SDG 1.',
    idea:
      'Create a community‑driven universal basic income program that provides a monthly cash grant to low‑income households, measured against SDG 1 outcomes.',
    ideaTitle: 'Universal Basic Income Pilot for SDG 1',
  };
}

/**
 * Provider 1 – Google AI Studio (Gemini). Uses the Gemini‑Pro model.
 */
async function callGoogle(transcript: string, sdg: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      { role: 'user', parts: [{ text: `Transcript:\n${transcript}\nSDG: ${sdg}` }] },
    ],
    generationConfig: { temperature: 0.2 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Google API error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Google response missing content');
  return JSON.parse(content.trim());
}

/**
 * Provider 2 – OpenRouter (Gemma).
 */
async function callOpenRouter(transcript: string, sdg: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');

  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const payload = {
    model: 'google/gemma-3-27b-it:free', // updated to a valid model
    messages: [
      {
        role: 'system',
        content:
          'You are a concise JSON generator. Return ONLY JSON with keys: summary, idea, ideaTitle.',
      },
      { role: 'user', content: `Transcript:\n${transcript}\nSDG: ${sdg}` },
    ],
    temperature: 0.2,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter response missing content');
  return JSON.parse(content.trim());
}

/**
 * Provider 3 – Cloudflare Workers AI (fallback). Uses the same payload format as OpenRouter.
 */
async function callCloudflare(transcript: string, sdg: string) {
  const apiKey = process.env.CLOUDFLARE_API_KEY;
  if (!apiKey) throw new Error('Missing CLOUDFLARE_API_KEY');

  const url = 'https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/ai/run/@cf/meta/llama-2-7b-chat-fp16'; // replace <ACCOUNT_ID>
  const payload = {
    messages: [
      {
        role: 'system',
        content:
          'You are a concise JSON generator. Return ONLY JSON with keys: summary, idea, ideaTitle.',
      },
      { role: 'user', content: `Transcript:\n${transcript}\nSDG: ${sdg}` },
    ],
    temperature: 0.2,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Cloudflare error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const content = data.result?.response?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Cloudflare response missing content');
  return JSON.parse(content.trim());
}

export async function POST(req: Request) {
  const { transcript, sdg } = await req.json();

  const cacheKey = Buffer.from(transcript).toString('base64').replace(/[/+=]/g, '').slice(0, 32);
  const cached = await readCache(cacheKey);
  if (cached) return NextResponse.json(cached);

  // Build providers list based on available credentials
  const providers: Array<(transcript: string, sdg: string) => Promise<IdeaResult>> = [];
  if (process.env.GEMINI_API_KEY) providers.push(callGoogle);
  if (process.env.OPENROUTER_API_KEY) providers.push(callOpenRouter);
  if (process.env.CLOUDFLARE_API_KEY) providers.push(callCloudflare);

  let result: IdeaResult | null = null;
  for (const provider of providers) {
    try {
      result = await provider(transcript, sdg);
      break;
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.warn('Provider failed:', e.message);
      } else {
        console.warn('Provider failed:', e);
      }
    }
  }

  if (!result) result = buildPlaceholder();
  await writeCache(cacheKey, result);
  return NextResponse.json(result);
}
