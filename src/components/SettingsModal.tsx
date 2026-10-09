import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, RotateCcw, Cpu, MessageSquare, Sliders } from 'lucide-react';
import type { AppSettings } from '../types';
import { defaultSettings, AVAILABLE_MODELS } from '../lib/storage';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

type Tab = 'model' | 'prompt' | 'advanced';

export default function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<Tab>('model');

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => { onSave(local); onClose(); };
  const handleReset = () => { setLocal({ ...defaultSettings }); };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'model',    label: 'Model AI',  icon: <Cpu size={13} /> },
    { id: 'prompt',   label: 'Instruksi', icon: <MessageSquare size={13} /> },
    { id: 'advanced', label: 'Lanjutan',  icon: <Sliders size={13} /> },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-backdrop"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="modal-panel"
        >
          {/* ── Header ── */}
          <div className="modal-header">
            <h2 className="modal-title">Pengaturan</h2>
            <button className="icon-btn" onClick={onClose} title="Tutup">
              <X size={16} />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="modal-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`modal-tab${activeTab === tab.id ? ' active' : ''}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Body ── */}
          <div className="modal-body">

            {/* Model Tab */}
            {activeTab === 'model' && (
              <div className="modal-section">
                <label className="form-label">Pilih Model</label>
                {AVAILABLE_MODELS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => update('model', model.id)}
                    className={`model-card${local.model === model.id ? ' active' : ''}`}
                  >
                    <div>
                      <p className="model-card-name">{model.label}</p>
                      <p className="model-card-desc">{model.description}</p>
                    </div>
                    <div className={`radio-dot${local.model === model.id ? ' active' : ''}`} />
                  </button>
                ))}
              </div>
            )}

            {/* Prompt Tab */}
            {activeTab === 'prompt' && (
              <div className="modal-section">
                <label className="form-label">Instruksi Sistem (Custom Prompt)</label>
                <textarea
                  value={local.systemPrompt}
                  onChange={e => update('systemPrompt', e.target.value)}
                  placeholder="Deskripsikan bagaimana AI harus berperilaku..."
                  rows={8}
                  className="modal-textarea"
                />
                <p className="form-hint">
                  Instruksi ini dikirim ke AI di awal setiap percakapan sebagai konteks perilaku.
                </p>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="modal-section">
                {/* Temperature */}
                <div>
                  <div className="range-row">
                    <label className="form-label" style={{ marginBottom: 0 }}>Temperatur</label>
                    <span className="range-value">{local.temperature.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={0} max={2} step={0.1}
                    value={local.temperature}
                    onChange={e => update('temperature', parseFloat(e.target.value))}
                    className="range-input"
                  />
                  <div className="range-labels">
                    <span>Lebih fokus (0)</span>
                    <span>Lebih kreatif (2)</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div>
                  <div className="range-row">
                    <label className="form-label" style={{ marginBottom: 0 }}>Maks Token Respons</label>
                    <span className="range-value">{local.maxTokens}</span>
                  </div>
                  <input
                    type="range"
                    min={256} max={4096} step={256}
                    value={local.maxTokens}
                    onChange={e => update('maxTokens', parseInt(e.target.value))}
                    className="range-input"
                  />
                  <div className="range-labels">
                    <span>256</span>
                    <span>4096</span>
                  </div>
                </div>

                {/* Streaming toggle */}
                <div className="toggle-row">
                  <div>
                    <p className="toggle-info-title">Streaming Respons</p>
                    <p className="toggle-info-desc">Tampilkan teks secara bertahap saat dihasilkan</p>
                  </div>
                  <button
                    onClick={() => update('streamEnabled', !local.streamEnabled)}
                    className={`toggle-btn${local.streamEnabled ? ' on' : ' off'}`}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="modal-footer">
            <button className="btn-reset" onClick={handleReset}>
              <RotateCcw size={13} />
              Reset default
            </button>
            <div className="modal-footer-actions">
              <button className="btn-cancel" onClick={onClose}>Batal</button>
              <button className="btn-save" onClick={handleSave}>
                <Save size={13} />
                Simpan
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
