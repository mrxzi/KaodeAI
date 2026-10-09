import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const ALLOWED_MODELS = new Set([
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
]);

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

function getModel(requested) {
  if (!requested || !ALLOWED_MODELS.has(requested)) return DEFAULT_MODEL;
  return requested;
}

function buildHistory(messages) {
  const filtered = messages.filter(m => m.role !== 'system');
  const history = [];
  for (const msg of filtered) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const last = history[history.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += '\n' + msg.content;
    } else {
      history.push({ role, parts: [{ text: msg.content }] });
    }
  }
  return history;
}

function mapError(err) {
  const msg = err?.message ?? String(err);
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid'))
    return 'API key Gemini tidak valid.';
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota'))
    return 'Kuota API habis. Coba lagi nanti.';
  if (msg.includes('SAFETY'))
    return 'Permintaan diblokir filter keamanan.';
  if (msg.includes('404') || msg.includes('not found') || msg.includes('no longer available'))
    return 'Model tidak tersedia. Coba model lain di Pengaturan.';
  return msg || 'Gagal mendapatkan respons dari AI.';
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, model: requestedModel, maxTokens, temperature, systemPrompt } = req.body;

  if (!Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ error: 'messages harus berupa array.' });

  const model    = getModel(requestedModel);
  const maxTok   = Math.min(Number(maxTokens) || 2048, 8192);
  const temp     = Math.min(Math.max(Number(temperature) || 0.7, 0), 2);
  const sysInstr = systemPrompt?.trim() || 'Kamu adalah KaodeAI, asisten AI cerdas. Jawab dengan bahasa yang sama dengan user.';

  // ── SSE streaming ──────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sse = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  try {
    const geminiModel = genAI.getGenerativeModel({
      model,
      systemInstruction: sysInstr,
      generationConfig: { maxOutputTokens: maxTok, temperature: temp },
    });

    const history = buildHistory(messages);
    const lastMsg = history.pop();
    if (!lastMsg || lastMsg.role !== 'user') {
      sse({ error: 'Pesan terakhir harus dari user.' });
      return res.end();
    }

    const chat   = geminiModel.startChat({ history });
    const result = await chat.sendMessageStream(lastMsg.parts[0].text);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) sse({ choices: [{ delta: { content: text }, finish_reason: null }] });
    }

    res.write('data: [DONE]\n\n');
  } catch (e) {
    console.error('[stream]', e?.message);
    sse({ error: mapError(e) });
  } finally {
    res.end();
  }
}
