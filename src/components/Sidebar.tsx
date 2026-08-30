import React, { useState, useEffect } from 'react';
import { Note, ViewMode, Workspace, User } from '../types';
import {
  Plus,
  BookOpen,
  Calendar,
  Star,
  Search,
  Trash2,
  FileText,
  Palette,
  Heart,
  Clock,
  Tag,
  X,
  Home,
  Sliders,
} from 'lucide-react';

interface SidebarProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  viewMode: ViewMode;
  onSetViewMode: (mode: ViewMode) => void;
  accentColor: string;
  onSetAccentColor: (color: string) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string, icon: string, accentColor: string) => Promise<Workspace>;
  user: User | null;
  onLogOut: () => Promise<void>;
}

const ACCENT_PRESETS = [
  { name: 'Indigo', value: 'indigo', class: 'bg-indigo-500' },
  { name: 'Rose', value: 'rose', class: 'bg-rose-500' },
  { name: 'Emerald', value: 'emerald', class: 'bg-emerald-500' },
  { name: 'Amber', value: 'amber', class: 'bg-amber-500' },
];

export default function Sidebar({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  viewMode,
  onSetViewMode,
  accentColor,
  onSetAccentColor,
  isMobileOpen = false,
  onMobileClose = () => {},
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  user,
  onLogOut,
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [inlineWsName, setInlineWsName] = useState('');
  const [sidebarTaskCount, setSidebarTaskCount] = useState(() => {
    return localStorage.getItem('pref_sidebar_task_count') !== 'false';
  });

  useEffect(() => {
    if (!isWorkspaceDropdownOpen) {
      setIsCreatingInline(false);
      setInlineWsName('');
    }
  }, [isWorkspaceDropdownOpen]);

  useEffect(() => {
    const handlePrefUpdate = () => {
      const enabled = localStorage.getItem('pref_sidebar_task_count') !== 'false';
      setSidebarTaskCount(enabled);
    };
    window.addEventListener('preferences-updated', handlePrefUpdate);
    return () => window.removeEventListener('preferences-updated', handlePrefUpdate);
  }, []);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;

  // Extract all unique tags across all non-archived notes
  const allTags = Array.from(
    new Set(
      notes
        .filter((n) => !n.isArchived)
        .flatMap((n) => n.tags || [])
        .filter(Boolean)
    )
  ).sort();

  // Filter notes based on search term and selected tag
  const filteredNotes = notes.filter((n) => {
    if (n.isArchived) return false;

    // Filter by selected tag if active
    if (selectedTag && (!n.tags || !n.tags.includes(selectedTag))) {
      return false;
    }

    const term = searchTerm.toLowerCase();
    const titleMatch = n.title.toLowerCase().includes(term);
    const contentMatch = n.blocks.some((b) => b.content.toLowerCase().includes(term));
    const tagMatch = n.tags ? n.tags.some((t) => t.toLowerCase().includes(term)) : false;
    return titleMatch || contentMatch || tagMatch;
  });

  const favoriteNotes = filteredNotes.filter((n) => n.isFavorite);
  const otherNotes = filteredNotes.filter((n) => !n.isFavorite);

  // Last 5 edited notes for Recents (matching current filters)
  const recentNotes = [...filteredNotes]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  // Helper to color class based on active accent
  const getAccentTextClass = (active: boolean) => {
    if (!active) return 'text-[#37352F]/70 dark:text-[#E3E3E2]/70 hover:bg-[#EBEAE4] dark:hover:bg-[#2C2C2A]';
    switch (accentColor) {
      case 'rose':
        return 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-semibold';
      case 'emerald':
        return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-semibold';
      case 'amber':
        return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-semibold';
      default:
        return 'bg-[#E3F2FD] dark:bg-[#1E3A5F]/45 text-[#2383E2] dark:text-[#42A5F5] font-semibold';
    }
  };

  const getAccentBgClass = () => {
    switch (accentColor) {
      case 'rose':
        return 'bg-rose-600 hover:bg-rose-700 text-white';
      case 'emerald':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'amber':
        return 'bg-amber-600 hover:bg-amber-700 text-white';
      default:
        return 'bg-[#2383E2] hover:bg-[#1B6FC2] text-white';
    }
  };

  return (
    <>
      {/* Mobile Sidebar backdrop */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden cursor-pointer"
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 md:relative md:flex flex-col w-60 border-r border-[#EDECE9] dark:border-[#2C2C2A] h-full bg-[#F7F6F3] dark:bg-[#1A1A18] overflow-hidden select-none font-sans transition-transform duration-300 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Workspace Header with Dropdown */}
        <div className="p-4 border-b border-[#EDECE9] dark:border-[#2C2C2A] flex items-center justify-between relative">
          <div 
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="flex items-center gap-2.5 cursor-pointer hover:bg-[#EBEAE4] dark:hover:bg-[#2C2C2A] p-1.5 rounded-xl transition-all select-none max-w-[170px]"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base bg-white dark:bg-[#252523] border border-[#EDECE9] dark:border-[#2C2C2A] transition-colors shadow-sm flex-shrink-0`}>
              {activeWorkspace?.icon || '💼'}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-[#37352F] dark:text-[#E3E3E2] leading-tight flex items-center gap-1">
                <span className="truncate">{activeWorkspace?.name || 'Workspace'}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">▼</span>
              </h1>
              <span className="text-[9px] text-[#ACABA9] dark:text-[#888886] font-bold truncate block" title="Switch workspace">
                Click to switch
              </span>
            </div>
          </div>

          {/* Close button for mobile screen widths */}
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-[#ACABA9] hover:text-[#37352F] dark:hover:text-[#E3E3E2] hover:bg-[#EBEAE4] dark:hover:bg-[#2C2C2A] md:hidden cursor-pointer"
            title="Close Sidebar"
          >
            <X size={15} />
          </button>

          {/* Dropdown Menu */}
          {isWorkspaceDropdownOpen && (
            <>
              {/* Overlay backdrop to close */}
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setIsWorkspaceDropdownOpen(false)} 
              />
              
              <div className="absolute left-4 top-14 w-52 bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 border-b border-[#EDECE9]/60 dark:border-[#2C2C2A]/60 bg-slate-50 dark:bg-[#1A1A18] flex items-center justify-between">
                  <span className="text-[9px] font-extrabold text-[#ACABA9] uppercase tracking-wider">
                    My Workspaces
                  </span>
                  <button
                    onClick={() => {
                      setIsWorkspaceDropdownOpen(false);
                      onSetViewMode('settings');
                    }}
                    className="text-[9px] font-extrabold text-[#2383E2] hover:underline"
                  >
                    Manage
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        onSelectWorkspace(ws.id);
                        setIsWorkspaceDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#252523] text-left transition-colors cursor-pointer ${
                        ws.id === activeWorkspaceId 
                          ? 'bg-[#E3F2FD] dark:bg-[#1E3A5F]/35 text-[#2383E2] dark:text-[#42A5F5] font-bold' 
                          : 'text-[#37352F] dark:text-[#E3E3E2]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-sm flex-shrink-0">{ws.icon || '💼'}</span>
                        <span className="truncate">{ws.name}</span>
                      </div>
                      {ws.id === activeWorkspaceId && (
                        <span className="text-[#2383E2] text-[10px] font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="border-t border-[#EDECE9]/60 dark:border-[#2C2C2A]/60 mt-1 pt-1.5 px-3 pb-1">
                  {isCreatingInline ? (
                    <div className="space-y-2 py-1 animate-in fade-in duration-150">
                      <input
                        type="text"
                        value={inlineWsName}
                        onChange={(e) => setInlineWsName(e.target.value)}
                        placeholder="Workspace name..."
                        maxLength={25}
                        className="w-full text-xs font-bold p-1.5 bg-slate-50 dark:bg-[#252523] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 text-[#37352F] dark:text-white"
                        autoFocus
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (inlineWsName.trim()) {
                              const icons = ['💼', '🏡', '🚀', '🎨', '📝', '🌟', '🎯', '🥑', '📚'];
                              const randomIcon = icons[Math.floor(Math.random() * icons.length)];
                              const colors = ['indigo', 'rose', 'emerald', 'amber'];
                              const randomColor = colors[Math.floor(Math.random() * colors.length)];
                              const newWs = await onCreateWorkspace(inlineWsName.trim(), randomIcon, randomColor);
                              setInlineWsName('');
                              setIsCreatingInline(false);
                              onSelectWorkspace(newWs.id);
                              setIsWorkspaceDropdownOpen(false);
                            }
                          } else if (e.key === 'Escape') {
                            setIsCreatingInline(false);
                            setInlineWsName('');
                          }
                        }}
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingInline(false);
                            setInlineWsName('');
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (inlineWsName.trim()) {
                              const icons = ['💼', '🏡', '🚀', '🎨', '📝', '🌟', '🎯', '🥑', '📚'];
                              const randomIcon = icons[Math.floor(Math.random() * icons.length)];
                              const colors = ['indigo', 'rose', 'emerald', 'amber'];
                              const randomColor = colors[Math.floor(Math.random() * colors.length)];
                              const newWs = await onCreateWorkspace(inlineWsName.trim(), randomIcon, randomColor);
                              setInlineWsName('');
                              setIsCreatingInline(false);
                              onSelectWorkspace(newWs.id);
                              setIsWorkspaceDropdownOpen(false);
                            }
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded cursor-pointer transition-colors"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsCreatingInline(true);
                      }}
                      className="w-full flex items-center gap-2 py-1 text-xs font-bold text-[#2383E2] hover:bg-slate-50 dark:hover:bg-[#252523] text-left transition-colors cursor-pointer rounded-lg px-2 -mx-2"
                    >
                      <Plus size={12} />
                      <span>Create Workspace</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

      {/* Quick Search */}
      <div className="px-3 pt-3 pb-2 flex flex-col gap-1.5">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-2.5 text-[#ACABA9]" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#252523] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-lg outline-none focus:ring-1 focus:ring-[#2383E2] text-[#37352F] dark:text-[#E3E3E2] shadow-sm transition-all"
          />
        </div>

        {selectedTag && (
          <div className="flex items-center justify-between px-2 py-0.5 bg-[#E3F2FD] dark:bg-[#1E3A5F]/40 border border-[#D0E7FF] dark:border-[#2C4A73]/40 rounded-md">
            <span className="text-[10px] font-bold text-[#2383E2] dark:text-[#42A5F5] flex items-center gap-1">
              <Tag size={10} /> #{selectedTag}
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className="p-0.5 hover:bg-[#D0E7FF] dark:hover:bg-[#1E3A5F] rounded text-[#2383E2] dark:text-[#42A5F5] transition-colors cursor-pointer"
              title="Clear tag filter"
            >
              <X size={10} />
            </button>
          </div>
        )}
      </div>

      {/* Main Navigation Views */}
      <div className="px-2 py-1 flex flex-col gap-0.5">
        <button
          onClick={() => onSetViewMode('dashboard')}
          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${getAccentTextClass(
            viewMode === 'dashboard'
          )}`}
        >
          <Home size={14} />
          <span>Home</span>
        </button>

        <button
          onClick={() => onSetViewMode('all-tasks')}
          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${getAccentTextClass(
            viewMode === 'all-tasks'
          )}`}
        >
          <FileText size={14} />
          <span>All Tasks {sidebarTaskCount ? `(${notes.length})` : ''}</span>
        </button>

        <button
          onClick={() => onSetViewMode('calendar')}
          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${getAccentTextClass(
            viewMode === 'calendar'
          )}`}
        >
          <Calendar size={14} />
          <span>Calendar View</span>
        </button>

        <button
          onClick={() => onSetViewMode('settings')}
          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${getAccentTextClass(
            viewMode === 'settings'
          )}`}
        >
          <Sliders size={14} />
          <span>Settings</span>
        </button>
      </div>

      <div className="border-t border-[#EDECE9] dark:border-[#2C2C2A]/60 my-2" />

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 scrollbar-thin">
        {/* Tags Section */}
        {allTags.length > 0 && (
          <div>
            <div className="px-3 py-1 text-[10px] font-bold text-[#ACABA9] dark:text-[#888886] uppercase tracking-wider flex items-center gap-1.5">
              <Tag size={10} className="text-[#2383E2]" />
              Tags Filter
            </div>
            <div className="mt-1.5 px-3 flex flex-wrap gap-1">
              {allTags.map((tag) => {
                const isActive = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(isActive ? null : tag)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#E3F2FD] dark:bg-[#1E3A5F]/60 text-[#2383E2] dark:text-[#42A5F5] border-[#D0E7FF] dark:border-[#1E3A5F]'
                        : 'bg-white dark:bg-[#252523] text-[#37352F]/70 dark:text-[#E3E3E2]/70 border-[#EDECE9] dark:border-[#2C2C2A] hover:bg-[#EBEAE4] dark:hover:bg-[#2C2C2A]'
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Favorites Section */}
        {favoriteNotes.length > 0 && (
          <div>
            <div className="px-3 py-1 text-[10px] font-bold text-[#ACABA9] dark:text-[#888886] uppercase tracking-wider flex items-center gap-1.5">
              <Star size={10} className="text-amber-500 fill-amber-500" />
              Favorites
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              {favoriteNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => {
                    onSetViewMode('editor');
                    onSelectNote(note.id);
                  }}
                  className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                    selectedNoteId === note.id && viewMode === 'editor'
                      ? 'bg-[#EBEAE4] dark:bg-[#2C2C2A] text-[#37352F] dark:text-[#E3E3E2] font-semibold shadow-xs'
                      : 'text-[#37352F]/80 dark:text-[#E3E3E2]/80 hover:bg-[#EBEAE4]/60 dark:hover:bg-[#2C2C2A]/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-1 flex-1">
                    <span className="flex-shrink-0 text-sm">{note.emoji || '📝'}</span>
                    <div className="flex flex-col truncate min-w-0">
                      <span className="truncate">{note.title || 'Untitled Task'}</span>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5 max-w-full overflow-hidden">
                          {note.tags.map((t) => (
                            <span key={t} className="text-[8px] font-bold text-[#2383E2] dark:text-[#42A5F5] bg-[#E3F2FD] dark:bg-[#1E3A5F]/40 px-1 py-0.2 rounded-full truncate">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 rounded text-slate-400 dark:text-slate-500 transition-all cursor-pointer"
                    title="Delete task"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Tasks Section */}
        {recentNotes.length > 0 && (
          <div>
            <div className="px-3 py-1 text-[10px] font-bold text-[#ACABA9] dark:text-[#888886] uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={10} className="text-[#2383E2]" />
              Recent Tasks
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => {
                    onSetViewMode('editor');
                    onSelectNote(note.id);
                  }}
                  className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                    selectedNoteId === note.id && viewMode === 'editor'
                      ? 'bg-[#EBEAE4] dark:bg-[#2C2C2A] text-[#37352F] dark:text-[#E3E3E2] font-semibold shadow-xs'
                      : 'text-[#37352F]/80 dark:text-[#E3E3E2]/80 hover:bg-[#EBEAE4]/60 dark:hover:bg-[#2C2C2A]/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-1 flex-1">
                    <span className="flex-shrink-0 text-sm">{note.emoji || '📝'}</span>
                    <span className="truncate">{note.title || 'Untitled Task'}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 rounded text-slate-400 dark:text-slate-500 transition-all cursor-pointer"
                    title="Delete task"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Page button */}
      <div className="p-3">
        <button
          onClick={() => {
            onSetViewMode('editor');
            onCreateNote();
          }}
          className={`w-full py-2 px-4 rounded-xl text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all ${getAccentBgClass()}`}
        >
          <Plus size={14} />
          Add a task
        </button>
      </div>

      {/* Footer / User Profile section */}
      {user && (
        <div className="p-3 bg-[#EBEAE4]/30 dark:bg-[#1E1E1C]/60 border-t border-[#EDECE9] dark:border-[#2C2C2A]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 pr-1">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-6 h-6 rounded-full border border-[#EDECE9] dark:border-[#2C2C2A] flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center font-bold text-[10px] uppercase flex-shrink-0">
                  {user.displayName ? user.displayName.slice(0, 2) : user.email.slice(0, 2)}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-extrabold text-[#37352F] dark:text-white truncate">
                  {user.displayName || 'Active Session'}
                </span>
                <span className="text-[9px] text-[#ACABA9] dark:text-[#888886] truncate">
                  {user.email}
                </span>
              </div>
            </div>
            <button
              onClick={onLogOut}
              className="text-[9px] font-bold text-rose-500 hover:text-rose-600 px-2 py-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md transition-colors flex-shrink-0 cursor-pointer"
              title="Sign out of your session"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  </>
  );
}
