import type { SendMessagePayload } from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function sendMessageStream(
  payload: SendMessagePayload,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let errMsg = 'Gagal terhubung ke server AI.';
    try {
      const err = await response.json();
      errMsg = err.error || errMsg;
    } catch { /* empty */ }
    throw new ApiError(errMsg, response.status);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new ApiError('Tidak dapat membaca stream.', 500);

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const text = parsed.choices?.[0]?.delta?.content ?? '';
        if (text) onChunk(text);
      } catch { /* skip malformed */ }
    }
  }
}

export async function sendMessage(payload: SendMessagePayload): Promise<string> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errMsg = 'Gagal terhubung ke server AI.';
    try {
      const err = await response.json();
      errMsg = err.error || errMsg;
    } catch { /* empty */ }
    throw new ApiError(errMsg, response.status);
  }

  const data = await response.json();
  return data.content ?? '';
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
