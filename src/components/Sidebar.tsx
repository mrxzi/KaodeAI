import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Search, Trash2, Pencil, Check, X,
  ChevronDown, Settings, MessageSquare, PanelLeftClose
} from 'lucide-react';
import type { Conversation } from '../types';
import { groupConversationsByDate } from '../lib/storage';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onOpenSettings: () => void;
  onToggle: () => void;
}

/* ── Action Button ──────────────────────────────────────────────────── */
function ActionBtn({
  onClick, danger = false, title, children,
}: {
  onClick: () => void;
  danger?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`action-btn${danger ? ' danger' : ''}`}
    >
      {children}
    </button>
  );
}

/* ── Single conversation item ───────────────────────────────────────── */
interface ConvItemProps {
  conv: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

function ConvItem({ conv, isActive, onSelect, onDelete, onRename }: ConvItemProps) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(conv.title);
  const [hover, setHover] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commitRename = () => {
    const v = editVal.trim();
    if (v) onRename(v);
    setEditing(false);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setConfirmDel(false); }}
      onClick={!editing ? onSelect : undefined}
      className={`conv-item${isActive ? ' active' : ''}`}
    >
      <MessageSquare size={13} className="conv-item-icon" />

      {editing ? (
        <input
          ref={inputRef}
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') setEditing(false);
          }}
          onBlur={commitRename}
          onClick={e => e.stopPropagation()}
          className="conv-item-input"
        />
      ) : (
        <span className="conv-item-title">{conv.title}</span>
      )}

      {hover && !editing && (
        <div className="conv-item-actions" onClick={e => e.stopPropagation()}>
          {confirmDel ? (
            <>
              <ActionBtn onClick={onDelete} danger title="Konfirmasi hapus">
                <Check size={12} />
              </ActionBtn>
              <ActionBtn onClick={() => setConfirmDel(false)} title="Batal">
                <X size={12} />
              </ActionBtn>
            </>
          ) : (
            <>
              <ActionBtn
                onClick={() => { setEditVal(conv.title); setEditing(true); }}
                title="Rename"
              >
                <Pencil size={12} />
              </ActionBtn>
              <ActionBtn onClick={() => setConfirmDel(true)} danger title="Hapus">
                <Trash2 size={12} />
              </ActionBtn>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Collapsible group ──────────────────────────────────────────────── */
function Group({
  label, items, activeId, onSelect, onDelete, onRename,
}: {
  label: string;
  items: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, t: string) => void;
}) {
  const [open, setOpen] = useState(true);
  if (!items.length) return null;

  return (
    <div className="conv-group">
      <button className="conv-group-label" onClick={() => setOpen(o => !o)}>
        <ChevronDown
          size={10}
          className={`conv-group-chevron ${open ? 'open' : 'closed'}`}
        />
        {label}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            {items.map(c => (
              <ConvItem
                key={c.id}
                conv={c}
                isActive={c.id === activeId}
                onSelect={() => onSelect(c.id)}
                onDelete={() => onDelete(c.id)}
                onRename={t => onRename(c.id, t)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Sidebar ───────────────────────────────────────────────────── */
export default function Sidebar({
  conversations, activeId, onSelect, onNew, onDelete, onRename, onOpenSettings, onToggle,
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const groups = groupConversationsByDate(conversations);

  const filtered = search.trim()
    ? conversations
        .filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <span>K</span>
          </div>
          <span className="sidebar-brand-name">KaodeAI</span>
        </div>
        <button className="icon-btn" onClick={onToggle} title="Tutup sidebar">
          <PanelLeftClose size={15} />
        </button>
      </div>

      {/* ── New Chat ── */}
      <div className="sidebar-actions">
        <button className="btn-new-chat" onClick={onNew}>
          <Plus size={14} />
          Chat Baru
        </button>
      </div>

      {/* ── Search ── */}
      <div className="sidebar-search-wrap">
        <div className="sidebar-search">
          <Search size={12} className="sidebar-search-icon" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari percakapan..."
          />
          {search && (
            <button className="btn-clear-search" onClick={() => setSearch('')}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Conversation list ── */}
      <div className="sidebar-list">
        {conversations.length === 0 ? (
          <div className="sidebar-empty">
            <MessageSquare size={20} className="sidebar-empty-icon" />
            <span className="sidebar-empty-text">Belum ada percakapan</span>
          </div>
        ) : filtered ? (
          filtered.length === 0
            ? (
              <p style={{ color: '#444', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
                Tidak ditemukan
              </p>
            )
            : filtered.map(c => (
              <ConvItem
                key={c.id}
                conv={c}
                isActive={c.id === activeId}
                onSelect={() => onSelect(c.id)}
                onDelete={() => onDelete(c.id)}
                onRename={t => onRename(c.id, t)}
              />
            ))
        ) : (
          <>
            <Group label="Hari ini"   items={groups.today}     activeId={activeId} onSelect={onSelect} onDelete={onDelete} onRename={onRename} />
            <Group label="Kemarin"    items={groups.yesterday} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onRename={onRename} />
            <Group label="Minggu ini" items={groups.thisWeek}  activeId={activeId} onSelect={onSelect} onDelete={onDelete} onRename={onRename} />
            <Group label="Lebih lama" items={groups.older}     activeId={activeId} onSelect={onSelect} onDelete={onDelete} onRename={onRename} />
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <button className="btn-settings" onClick={onOpenSettings}>
          <Settings size={14} />
          Pengaturan
        </button>
      </div>
    </div>
  );
}
