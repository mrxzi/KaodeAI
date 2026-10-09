# KaodeAI — Modern AI Chat Website

ChatGPT-inspired AI chatbot dengan dark mode, streaming response, riwayat percakapan persisten, dan backend aman.

## Fitur

- Dark mode penuh — tema hitam premium, font Inter
- Chat real-time dengan streaming SSE dari OpenAI API
- Markdown rendering — tabel, list, kode dengan syntax highlighting
- Riwayat percakapan tersimpan di browser (localStorage)
- Pencarian percakapan, rename, hapus dengan konfirmasi
- Pengaturan — pilih model, custom system prompt, temperature, max tokens
- Stop generation — batalkan respons AI kapan saja
- Regenerate — buat ulang jawaban terakhir
- Salin jawaban dan kode dengan satu klik
- Responsif — sidebar drawer di mobile
- API key aman — hanya di server, tidak pernah ke client
- Rate limiting — 60 request/menit per IP
- Error handling — pesan ramah untuk semua error OpenAI

## Cara Menjalankan

### 1. Prasyarat

- Node.js 18+
- Akun OpenAI dengan API key aktif

### 2. Install

```bash
npm install
```

### 3. Konfigurasi API Key

Buka file `.env` dan isi API key Anda:

```env
OPENAI_API_KEY=sk-proj-...isi_key_anda...
OPENAI_MODEL=gpt-4o-mini
PORT=3001
ALLOWED_ORIGIN=http://localhost:5173
```

JANGAN commit file `.env` ke Git.

### 4. Jalankan Backend (Terminal 1)

```bash
npm run dev:server
```

Server berjalan di: http://localhost:3001

### 5. Jalankan Frontend (Terminal 2)

```bash
npm run dev
```

Frontend berjalan di: http://localhost:5173

## Struktur Proyek

```
kaodeai/
├── server/
│   └── index.js          # Express backend
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── ChatArea.tsx
│   │   ├── ChatMessage.tsx
│   │   └── SettingsModal.tsx
│   ├── hooks/
│   │   └── useChat.ts
│   ├── lib/
│   │   ├── api.ts
│   │   └── storage.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env
├── .env.example
└── vite.config.ts
```

## Keamanan

- API key hanya ada di server
- Rate limiting aktif: 60 req/menit per IP
- Validasi payload di backend
- Context window dibatasi 40 pesan terakhir

## Model yang Didukung

- gpt-4.1-mini — Sangat cepat
- gpt-4o-mini — Seimbang
- gpt-4o — Terbaik
- gpt-4-turbo — Canggih

## Deployment

1. Set environment variables di platform (Railway, Render, Fly.io)
2. Build: npm run build
3. Start server: node server/index.js
