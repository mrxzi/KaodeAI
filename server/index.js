import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '50kb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan. Coba lagi dalam semenit.' },
});
app.use('/api/', limiter);

// ── Gemini client ────────────────────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('[ERROR] GEMINI_API_KEY tidak ditemukan di .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// Model yang terkonfirmasi tersedia di API key ini
const ALLOWED_MODELS = new Set([
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
]);

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

// ── Helpers ─────────────────────────────────────────────────────────────────
function getModel(requested) {
  if (!requested || !ALLOWED_MODELS.has(requested)) {
    console.warn(`[WARN] Model "${requested}" tidak dikenal, fallback ke ${DEFAULT_MODEL}`);
    return DEFAULT_MODEL;
  }
  return requested;
}

function validatePayload(body) {
  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0)
    return 'Field "messages" harus berupa array yang tidak kosong.';
  if (messages.length > 100)
    return 'Terlalu banyak pesan dalam percakapan.';
  for (const msg of messages) {
    if (!['user', 'assistant', 'system'].includes(msg.role))
      return `Role tidak valid: ${msg.role}`;
    if (typeof msg.content !== 'string' || msg.content.length > 32000)
      return 'Konten pesan tidak valid atau terlalu panjang.';
  }
  return null;
}

/**
 * Convert messages to Gemini history format.
 * - Filter out system messages (handled by systemInstruction)
 * - Map 'assistant' → 'model'
 * - Merge consecutive same-role turns (Gemini requirement)
 */
function buildGeminiHistory(messages) {
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
    return 'Kuota API Gemini habis. Coba lagi nanti.';
  if (msg.includes('SAFETY'))
    return 'Permintaan diblokir filter keamanan.';
  if (msg.includes('503') || msg.includes('UNAVAILABLE'))
    return 'Server Gemini tidak tersedia. Coba lagi.';
  if (msg.includes('404') || msg.includes('not found'))
    return `Model tidak tersedia di API ini. Coba model lain di Pengaturan.`;
  return msg || 'Gagal mendapatkan respons dari AI.';
}

// ── Routes ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', model: DEFAULT_MODEL, timestamp: new Date().toISOString() });
});

// ── Streaming ────────────────────────────────────────────────────────────────
app.post('/api/chat/stream', async (req, res) => {
  const err = validatePayload(req.body);
  if (err) return res.status(400).json({ error: err });

  const model     = getModel(req.body.model);
  const messages  = req.body.messages;
  const maxTokens = Math.min(Number(req.body.maxTokens) || 2048, 8192);
  const temperature = Math.min(Math.max(Number(req.body.temperature) || 0.7, 0), 2);
  const systemInstruction = req.body.systemPrompt?.trim() ||
    'Kamu adalah KaodeAI, asisten AI cerdas. Jawab dengan bahasa yang sama dengan user.';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sse = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  try {
    const geminiModel = genAI.getGenerativeModel({
      model,
      systemInstruction,
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    });

    const history = buildGeminiHistory(messages);
    const lastMsg = history.pop();

    if (!lastMsg || lastMsg.role !== 'user') {
      sse({ error: 'Pesan terakhir harus dari user.' });
      return res.end();
    }

    console.log(`[Stream] model=${model} history=${history.length} prompt="${lastMsg.parts[0].text.slice(0,60)}"`);

    const chat = geminiModel.startChat({ history });
    const result = await chat.sendMessageStream(lastMsg.parts[0].text);

    let total = 0;
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        total += text.length;
        sse({ choices: [{ delta: { content: text }, finish_reason: null }] });
      }
    }

    console.log(`[Stream] done, chars=${total}`);
    res.write('data: [DONE]\n\n');
  } catch (e) {
    console.error('[Stream Error]', e?.message ?? e);
    sse({ error: mapError(e) });
  } finally {
    res.end();
  }
});

// ── Non-streaming ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const err = validatePayload(req.body);
  if (err) return res.status(400).json({ error: err });

  const model     = getModel(req.body.model);
  const messages  = req.body.messages;
  const maxTokens = Math.min(Number(req.body.maxTokens) || 2048, 8192);
  const temperature = Math.min(Math.max(Number(req.body.temperature) || 0.7, 0), 2);
  const systemInstruction = req.body.systemPrompt?.trim() ||
    'Kamu adalah KaodeAI, asisten AI cerdas. Jawab dengan bahasa yang sama dengan user.';

  try {
    const geminiModel = genAI.getGenerativeModel({
      model,
      systemInstruction,
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    });

    const history = buildGeminiHistory(messages);
    const lastMsg = history.pop();

    if (!lastMsg || lastMsg.role !== 'user')
      return res.status(400).json({ error: 'Pesan terakhir harus dari user.' });

    const chat = geminiModel.startChat({ history });
    const result = await chat.sendMessage(lastMsg.parts[0].text);
    const content = result.response.text();

    console.log(`[Chat] model=${model} chars=${content.length}`);
    res.json({ content });
  } catch (e) {
    console.error('[Chat Error]', e?.message ?? e);
    res.status(502).json({ error: mapError(e) });
  }
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ KaodeAI server berjalan di http://localhost:${PORT}`);
  console.log(`   Provider : Google Gemini`);
  console.log(`   Model    : ${DEFAULT_MODEL}`);
});
