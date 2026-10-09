import type { Conversation, AppSettings } from '../types';

const CONVERSATIONS_KEY = 'kaodeai_conversations';
const SETTINGS_KEY      = 'kaodeai_settings';

// ── Model yang confirmed bekerja (definisi di awal agar bisa dipakai loadSettings) ──
export const AVAILABLE_MODELS = [
  { id: 'gemini-flash-latest',      label: 'Gemini Flash Latest',      description: 'Selalu versi terbaru — direkomendasikan ✓' },
  { id: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite Latest', description: 'Paling cepat & hemat' },
  { id: 'gemini-3.7-flash',         label: 'Gemini 3.7 Flash',         description: 'Cepat & andal' },
  { id: 'gemini-3.5-flash',         label: 'Gemini 3.5 Flash',         description: 'Stabil & seimbang' },
];

const VALID_MODEL_IDS = new Set(AVAILABLE_MODELS.map(m => m.id));

export const defaultSettings: AppSettings = {
  model: 'gemini-flash-latest',
  systemPrompt: 'Kamu adalah KaodeAI, asisten AI yang cerdas, ramah, dan membantu. Kamu berbicara dalam Bahasa Indonesia dan Bahasa Inggris sesuai dengan bahasa yang digunakan pengguna. Berikan jawaban yang jelas, akurat, dan bermanfaat.',
  maxTokens: 2048,
  temperature: 0.7,
  streamEnabled: true,
};

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch {
    console.warn('Failed to save conversations to localStorage');
  }
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    console.warn('Failed to save settings');
  }
}

/**
 * Load settings dari localStorage.
 * Otomatis reset model ke default jika model yang tersimpan tidak ada
 * di daftar AVAILABLE_MODELS — user tidak perlu pilih manual lagi.
 */
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };

    const saved  = JSON.parse(raw) as Partial<AppSettings>;
    const merged = { ...defaultSettings, ...saved };

    // ── Auto-fix model tidak valid ────────────────────────────────────────────
    if (!VALID_MODEL_IDS.has(merged.model)) {
      console.info(`[KaodeAI] Model "${merged.model}" tidak tersedia, otomatis ganti ke "${defaultSettings.model}"`);
      merged.model = defaultSettings.model;
      saveSettings(merged); // simpan agar tidak repeat tiap load
    }

    return merged;
  } catch {
    return { ...defaultSettings };
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateTitle(firstMessage: string): string {
  const clean = firstMessage.trim().replace(/\n/g, ' ');
  return clean.length > 50 ? clean.slice(0, 50) + '…' : clean || 'Percakapan Baru';
}

export function groupConversationsByDate(conversations: Conversation[]) {
  const now = Date.now();
  const DAY = 86400000;

  const groups: Record<string, Conversation[]> = {
    today:     [],
    yesterday: [],
    thisWeek:  [],
    older:     [],
  };

  for (const conv of [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const diff = now - conv.updatedAt;
    if      (diff < DAY)       groups.today.push(conv);
    else if (diff < 2 * DAY)   groups.yesterday.push(conv);
    else if (diff < 7 * DAY)   groups.thisWeek.push(conv);
    else                        groups.older.push(conv);
  }

  return groups;
}
