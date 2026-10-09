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
  if (msg.includes('404') || msg.includes('not found') || msg.includes('no longer available'))
    return 'Model tidak tersedia. Coba model lain di Pengaturan.';
  return msg || 'Gagal mendapatkan respons dari AI.';
}

export default async function handler(req, res) {
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

  try {
    const geminiModel = genAI.getGenerativeModel({
      model,
      systemInstruction: sysInstr,
      generationConfig: { maxOutputTokens: maxTok, temperature: temp },
    });

    const history = buildHistory(messages);
    const lastMsg = history.pop();
    if (!lastMsg || lastMsg.role !== 'user')
      return res.status(400).json({ error: 'Pesan terakhir harus dari user.' });

    const chat    = geminiModel.startChat({ history });
    const result  = await chat.sendMessage(lastMsg.parts[0].text);
    const content = result.response.text();

    return res.status(200).json({ content });
  } catch (e) {
    console.error('[chat]', e?.message);
    return res.status(502).json({ error: mapError(e) });
  }
}
