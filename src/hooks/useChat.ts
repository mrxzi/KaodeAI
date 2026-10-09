import { useState, useCallback, useRef } from 'react';
import type { Conversation, Message, AppSettings } from '../types';
import { sendMessageStream, sendMessage, ApiError } from '../lib/api';
import { generateId, generateTitle, saveConversations } from '../lib/storage';
import toast from 'react-hot-toast';

export function useChat(
  conversations: Conversation[],
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>,
  settings: AppSettings
) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find(c => c.id === activeId) ?? null;

  const createConversation = useCallback((): string => {
    const id = generateId();
    const newConv: Conversation = {
      id,
      title: 'Percakapan Baru',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: settings.model,
    };
    setConversations(prev => {
      const updated = [newConv, ...prev];
      saveConversations(updated);
      return updated;
    });
    setActiveId(id);
    return id;
  }, [settings.model, setConversations]);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      saveConversations(updated);
      return updated;
    });
    setActiveId(prev => (prev === id ? null : prev));
  }, [setConversations]);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, title } : c);
      saveConversations(updated);
      return updated;
    });
  }, [setConversations]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    // Mark streaming message as done
    setConversations(prev => {
      const updated = prev.map(c => ({
        ...c,
        messages: c.messages.map(m => m.isStreaming ? { ...m, isStreaming: false } : m),
      }));
      saveConversations(updated);
      return updated;
    });
  }, [setConversations]);

  const regenerateLastResponse = useCallback(async (convId: string) => {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;

    // Remove last assistant message
    const messagesWithoutLast = conv.messages.filter(
      (m, i) => !(i === conv.messages.length - 1 && m.role === 'assistant')
    );

    if (messagesWithoutLast.length === 0) return;

    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === convId ? { ...c, messages: messagesWithoutLast, updatedAt: Date.now() } : c
      );
      saveConversations(updated);
      return updated;
    });

    await sendAIRequest(convId, messagesWithoutLast);
  }, [conversations, settings]); // eslint-disable-line

  const sendAIRequest = useCallback(async (
    convId: string,
    messages: Message[]
  ) => {
    setIsLoading(true);
    const assistantMsgId = generateId();

    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: Date.now() }
          : c
      );
      saveConversations(updated);
      return updated;
    });

    const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));
    const payload = {
      messages: apiMessages,
      model: settings.model,
      systemPrompt: settings.systemPrompt,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      stream: settings.streamEnabled,
    };

    try {
      if (settings.streamEnabled) {
        abortRef.current = new AbortController();
        let fullContent = '';

        await sendMessageStream(
          payload,
          (chunk) => {
            fullContent += chunk;
            setConversations(prev => {
              const updated = prev.map(c =>
                c.id === convId
                  ? {
                      ...c,
                      messages: c.messages.map(m =>
                        m.id === assistantMsgId
                          ? { ...m, content: fullContent }
                          : m
                      ),
                    }
                  : c
              );
              return updated;
            });
          },
          abortRef.current.signal
        );

        setConversations(prev => {
          const updated = prev.map(c =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === assistantMsgId ? { ...m, isStreaming: false, content: fullContent } : m
                  ),
                  updatedAt: Date.now(),
                }
              : c
          );
          saveConversations(updated);
          return updated;
        });
      } else {
        const content = await sendMessage(payload);
        setConversations(prev => {
          const updated = prev.map(c =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === assistantMsgId
                      ? { ...m, content, isStreaming: false }
                      : m
                  ),
                  updatedAt: Date.now(),
                }
              : c
          );
          saveConversations(updated);
          return updated;
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setConversations(prev => {
          const updated = prev.map(c =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === assistantMsgId ? { ...m, isStreaming: false } : m
                  ),
                }
              : c
          );
          saveConversations(updated);
          return updated;
        });
        return;
      }

      const errMsg = err instanceof ApiError
        ? err.message
        : 'Terjadi kesalahan. Silakan coba lagi.';

      toast.error(errMsg, { className: 'toast-custom' });

      setConversations(prev => {
        const updated = prev.map(c =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, content: errMsg, isStreaming: false, error: true }
                    : m
                ),
                updatedAt: Date.now(),
              }
            : c
        );
        saveConversations(updated);
        return updated;
      });
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [settings, setConversations]);

  const sendUserMessage = useCallback(async (text: string, convId?: string) => {
    const targetId = convId ?? activeId ?? createConversation();

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    // ── Bangun currentMessages SEKARANG (synchronous) ────────────────────────
    // Jangan ambil dari dalam setConversations callback — itu async/deferred,
    // sendAIRequest akan dipanggil sebelum callback jalan → array kosong!
    const existingConv = conversations.find(c => c.id === targetId);
    const currentMessages: Message[] = [...(existingConv?.messages ?? []), userMsg];

    // Update state conversation dengan pesan user baru
    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id !== targetId) return c;
        const newMessages = [...c.messages, userMsg];
        const title = c.messages.length === 0 ? generateTitle(text) : c.title;
        return { ...c, messages: newMessages, title, updatedAt: Date.now() };
      });
      saveConversations(updated);
      return updated;
    });

    setActiveId(targetId);
    await sendAIRequest(targetId, currentMessages);
  }, [activeId, conversations, createConversation, sendAIRequest, setConversations]);

  return {
    activeId,
    setActiveId,
    activeConversation,
    isLoading,
    createConversation,
    deleteConversation,
    renameConversation,
    sendUserMessage,
    stopGeneration,
    regenerateLastResponse,
  };
}
