import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { motion } from 'framer-motion';
import { Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import type { Message } from '../types';
import { useState } from 'react';
import toast from 'react-hot-toast';
import 'highlight.js/styles/github-dark.css';

interface ChatMessageProps {
  message: Message;
  isLast: boolean;
  onRegenerate?: () => void;
}

/* ── Copy button ────────────────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Disalin!', { className: 'toast-base', duration: 1500 });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`btn-msg-action${copied ? ' copied' : ''}`}
      title="Salin"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Disalin' : 'Salin'}
    </button>
  );
}

/* ── Code block ─────────────────────────────────────────────────────── */
function CodeBlock({
  children,
  className: langClass,
}: {
  children: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const lang = (langClass ?? '').replace('language-', '') || 'text';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <span className="code-block-lang">{lang}</span>
        <button
          onClick={handleCopy}
          className={`btn-copy-code${copied ? ' copied' : ''}`}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Disalin' : 'Salin kode'}
        </button>
      </div>
      <pre className="!m-0 !rounded-none !border-0">
        <code className={langClass}>{children}</code>
      </pre>
    </div>
  );
}

/* ── Typing indicator ───────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="typing-dots">
      <div className="typing-dot" />
      <div className="typing-dot" />
      <div className="typing-dot" />
    </div>
  );
}

/* ── Chat Message ───────────────────────────────────────────────────── */
export default function ChatMessage({ message, isLast, onRegenerate }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;
  const isEmpty = !message.content.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`msg-row ${isUser ? 'user' : 'assistant'}`}
    >
      {/* Avatar (AI) */}
      {!isUser && (
        <div className="msg-avatar ai">K</div>
      )}

      <div className={`msg-body ${isUser ? 'user' : 'assistant'}`}>
        {/* Bubble */}
        <div
          className={`msg-bubble ${isUser ? 'user' : 'assistant'}${message.error ? ' error' : ''}`}
        >
          {message.error && (
            <div className="msg-error-banner">
              <AlertCircle size={13} />
              <span>Terjadi kesalahan</span>
            </div>
          )}

          {isUser ? (
            <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
              {message.content}
            </p>
          ) : (
            <>
              {isStreaming && isEmpty ? (
                <TypingIndicator />
              ) : (
                <div className="prose">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      code({
                        inline,
                        className,
                        children,
                        ...props
                      }: {
                        inline?: boolean;
                        className?: string;
                        children?: React.ReactNode;
                      } & React.HTMLAttributes<HTMLElement>) {
                        const content = String(children ?? '').replace(/\n$/, '');
                        if (!inline && (className || content.includes('\n'))) {
                          return <CodeBlock className={className}>{content}</CodeBlock>;
                        }
                        return <code className={className} {...props}>{children}</code>;
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                  {isStreaming && (
                    <span className="stream-cursor" />
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        {!isStreaming && !isUser && message.content && (
          <div className="msg-actions">
            <CopyButton text={message.content} />
            {isLast && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="btn-msg-action"
                title="Buat ulang jawaban"
              >
                <RefreshCw size={11} />
                Buat ulang
              </button>
            )}
          </div>
        )}
      </div>

      {/* Avatar (User) */}
      {isUser && (
        <div className="msg-avatar user">U</div>
      )}
    </motion.div>
  );
}
