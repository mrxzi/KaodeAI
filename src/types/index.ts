export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  error?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string;
}

export interface AppSettings {
  model: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  streamEnabled: boolean;
}

export interface SendMessagePayload {
  messages: { role: string; content: string }[];
  model: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}
