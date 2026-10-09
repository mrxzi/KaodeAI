import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Square, PanelLeft } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import type { Conversation } from '../types';
import ChatMessage from './ChatMessage';

interface ChatAreaProps {
  conversation: Conversation | null;
  isLoading: boolean;
  sidebarOpen: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onRegenerate: () => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
}

const PROMPTS = [
  { icon: '🍰', text: 'Cara membuat cake' },
  { icon: '🍛', text: 'Cara membuat nasi goreng' },
  //{ icon: '🐍', text: 'Bantu saya menulis kode Python untuk analisis data.' },
  //{ icon: '📈', text: 'Analisis ide bisnis saya dan berikan saran strategis.' },
];

function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="empty-state">
      {/* Logo + greeting */}
      <div className="empty-hero">
        <div className="empty-logo">
          <span>K</span>
        </div>
        <div>
          <h1 className="empty-title">Ada yang bisa saya bantu Karin?</h1>
          <p className="empty-subtitle">
          </p>
        </div>
      </div>

      {/* Prompt grid */}
      <div className="prompt-grid">
        {PROMPTS.map((p, i) => (
          <button
            key={i}
            className="prompt-card"
            onClick={() => onPick(p.text)}
          >
            <span className="prompt-card-icon">{p.icon}</span>
            <span className="prompt-card-text">{p.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatArea({
  conversation, isLoading, sidebarOpen,
  onSend, onStop, onRegenerate, onToggleSidebar,
}: ChatAreaProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastMsgCount = useRef(0);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const msgs = conversation?.messages ?? [];
    if (msgs.length !== lastMsgCount.current) {
      lastMsgCount.current = msgs.length;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Scroll when streaming content changes
  useEffect(() => {
    const last = conversation?.messages.at(-1);
    if (last?.isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation?.messages.at(-1)?.content]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  }, [input]);

  const submit = useCallback(() => {
    const t = input.trim();
    if (!t || isLoading) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    onSend(t);
  }, [input, isLoading, onSend]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const hasMessages = (conversation?.messages.length ?? 0) > 0;
  const msgs = conversation?.messages ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Topbar ── */}
      <div className="topbar">
        {!sidebarOpen && (
          <button
            className="icon-btn"
            onClick={onToggleSidebar}
            title="Buka sidebar"
          >
            <PanelLeft size={17} />
          </button>
        )}
        <span className="topbar-title">
          {conversation?.title ?? 'KaodeAI'}
        </span>
      </div>

      {/* ── Messages ── */}
      <div className="chat-scroll" style={{ flex: 1 }}>
        {!hasMessages ? (
          <EmptyState onPick={(t) => { setInput(t); textareaRef.current?.focus(); }} />
        ) : (
          <div className="messages-container">
            <AnimatePresence initial={false}>
              {msgs.map((msg, i) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isLast={i === msgs.length - 1}
                  onRegenerate={
                    i === msgs.length - 1 && msg.role === 'assistant'
                      ? onRegenerate : undefined
                  }
                />
              ))}
            </AnimatePresence>
            <div ref={bottomRef} style={{ height: 20 }} />
          </div>
        )}
      </div>

      {/* ── Input Area ── */}
      <div className="input-area">
        <div className="input-inner">
          <div className="input-box">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Tanyakan Sesuatu"
              rows={1}
              className="input-textarea"
            />

            {isLoading ? (
              <button
                onClick={onStop}
                title="Hentikan"
                className="btn-send stop"
              >
                <Square size={13} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!input.trim()}
                title="Kirim"
                className={`btn-send ${input.trim() ? 'active' : 'inactive'}`}
              >
                <Send size={14} />
              </button>
            )}
          </div>

          <p className="input-disclaimer">

          </p>
        </div>
      </div>
    </div>
  );
}
