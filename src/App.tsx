import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import SettingsModal from './components/SettingsModal';
import { useChat } from './hooks/useChat';
import type { Conversation, AppSettings } from './types';
import { loadConversations, loadSettings, saveSettings } from './lib/storage';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // On mobile, close sidebar by default
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    if (mq.matches) setSidebarOpen(false);
  }, []);

  const {
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
  } = useChat(conversations, setConversations, settings);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleNewChat = () => {
    const id = createConversation();
    setActiveId(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleSelectConv = (id: string) => {
    setActiveId(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleRegenerate = () => {
    if (activeId) regenerateLastResponse(activeId);
  };

  return (
    <div className="app-shell">
      <Toaster
        position="top-center"
        toastOptions={{ className: 'toast-base', duration: 3000 }}
      />

      {/* Mobile Overlay — CSS hides this on desktop */}
      {sidebarOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar${sidebarOpen ? '' : ' closed'}`}>
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelectConv}
          onNew={handleNewChat}
          onDelete={deleteConversation}
          onRename={renameConversation}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggle={() => setSidebarOpen(o => !o)}
        />
      </div>

      {/* Main chat area */}
      <div className="main-content">
        <ChatArea
          conversation={activeConversation}
          isLoading={isLoading}
          sidebarOpen={sidebarOpen}
          onSend={(text) => sendUserMessage(text, activeId ?? undefined)}
          onStop={stopGeneration}
          onRegenerate={handleRegenerate}
          onNewChat={handleNewChat}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
        />
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {settingsOpen && (
          <SettingsModal
            key="settings"
            settings={settings}
            onSave={handleSaveSettings}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
