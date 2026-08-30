import React, { useState, useEffect } from 'react';
import { Workspace, Note, User as UserType, AuditLogEntry } from '../types';
import { dbService } from '../dbService';
import { auth } from '../firebase';
import { updateEmail } from 'firebase/auth';
import {
  Sliders,
  Plus,
  Trash2,
  Check,
  Palette,
  Layout,
  RefreshCw,
  Sparkles,
  Settings,
  X,
  FileText,
  AlertCircle,
  UserCheck,
  Shield,
  Download,
  Key,
  History,
  ShieldAlert,
  CheckCircle2,
  Lock,
  LogOut,
  Mail,
} from 'lucide-react';

interface SettingsViewProps {
  workspaces: Workspace[];
  notes: Note[];
  user: UserType | null;
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string, icon: string, accentColor: string) => Promise<Workspace>;
  onDeleteWorkspace: (id: string) => Promise<void>;
  onUpdateWorkspace: (ws: Workspace) => Promise<void>;
  onSetViewMode: (mode: any) => void;
  onSignOut: () => Promise<void>;
  onPurgeAccount: () => Promise<void>;
}

const PRESET_EMOJIS = ['💼', '🏡', '🚀', '🎨', '📝', '🌟', '🎯', '🥑', '📚', '⚡', '🎮', '💡', '🥗', '✈️'];
const PRESET_COLORS = [
  { name: 'Indigo', value: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-500' },
  { name: 'Rose', value: 'rose', bg: 'bg-rose-500', text: 'text-rose-500' },
  { name: 'Emerald', value: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-500' },
  { name: 'Amber', value: 'amber', bg: 'bg-amber-500', text: 'text-amber-500' },
];

export default function SettingsView({
  workspaces,
  notes,
  user,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  onUpdateWorkspace,
  onSetViewMode,
  onSignOut,
  onPurgeAccount,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'workspaces' | 'preferences' | 'account'>('workspaces');
  
  // Account & Governance state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [purgeInputText, setPurgeInputText] = useState<string>('');
  const [isPurging, setIsPurging] = useState<boolean>(false);

  // Email Management state
  const [accountEmailInput, setAccountEmailInput] = useState<string>('');
  const [isSavingEmail, setIsSavingEmail] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user?.email) {
      if (!user.email.endsWith('@notionnote.app')) {
        setAccountEmailInput(user.email);
      } else {
        setAccountEmailInput('');
      }
    }
  }, [user]);

  // Check if current user logged in via Google SSO
  const isGoogleUser = auth.currentUser?.providerData?.some(p => p.providerId === 'google.com') ?? false;

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isGoogleUser) return;
    setEmailStatus(null);
    const newEmail = accountEmailInput.trim();
    if (!newEmail || !newEmail.includes('@')) {
      setEmailStatus({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setIsSavingEmail(true);
    try {
      if (auth.currentUser) {
        try {
          await updateEmail(auth.currentUser, newEmail);
        } catch (authErr: any) {
          console.warn('Auth updateEmail note:', authErr?.message);
        }
      }
      await dbService.saveUserProfile({
        uid: user.uid,
        email: newEmail,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: user.createdAt,
        lastLoginAt: Date.now(),
      });
      await dbService.logSecurityEvent(user.uid, 'UPDATE_PROFILE', `Updated account email address to ${newEmail}`);
      setEmailStatus({ type: 'success', text: `Account email address updated to ${newEmail}!` });
    } catch (err: any) {
      setEmailStatus({ type: 'error', text: err?.message || 'Failed to update email address.' });
    } finally {
      setIsSavingEmail(false);
    }
  };

  // Subscribe to real-time audit logs when user is present
  useEffect(() => {
    if (!user) return;
    const unsubscribe = dbService.subscribeAuditLogs(
      user.uid,
      (logs) => setAuditLogs(logs),
      (err) => console.error('Failed to load audit logs:', err)
    );
    return () => unsubscribe();
  }, [user]);

  // Export User Data JSON
  const handleExportData = async () => {
    if (!user) return;
    try {
      setIsExporting(true);
      const dataArchive = await dbService.exportUserData(user.uid);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataArchive, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `user_data_export_${user.uid.slice(0, 8)}_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Data export error:', err);
      setErrorNotification('Failed to generate export archive. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Execute Purge Account Data
  const handleExecutePurge = async () => {
    if (purgeInputText.trim() !== 'DELETE MY DATA') {
      setErrorNotification('Please type "DELETE MY DATA" to confirm account data wipe.');
      return;
    }
    try {
      setIsPurging(true);
      await onPurgeAccount();
      setIsPurgeModalOpen(false);
    } catch (err) {
      console.error('Account purge error:', err);
      setErrorNotification('Failed to purge account data. Please check your connection.');
    } finally {
      setIsPurging(false);
    }
  };
  
  // Create New Workspace State
  const [newWsName, setNewWsName] = useState('');
  const [newWsIcon, setNewWsIcon] = useState('💼');
  const [newWsColor, setNewWsColor] = useState('indigo');
  const [isCreating, setIsCreating] = useState(false);

  // Editing Workspace ID State
  const [editingWsId, setEditingWsId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIcon, setEditingIcon] = useState('💼');

  // Custom Confirmation Dialog States
  const [deleteConfirmationWsId, setDeleteConfirmationWsId] = useState<string | null>(null);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);

  // Preferences State (cached in localStorage)
  const [projectionEnabled, setProjectionEnabled] = useState(() => {
    return localStorage.getItem('pref_projection_enabled') !== 'false';
  });
  const [defaultPriority, setDefaultPriority] = useState(() => {
    return localStorage.getItem('pref_default_priority') || 'Medium';
  });
  const [sidebarTaskCount, setSidebarTaskCount] = useState(() => {
    return localStorage.getItem('pref_sidebar_task_count') !== 'false';
  });

  const handleToggleProjection = () => {
    const nextVal = !projectionEnabled;
    setProjectionEnabled(nextVal);
    localStorage.setItem('pref_projection_enabled', String(nextVal));
    // Dispatch custom event to let other views know
    window.dispatchEvent(new Event('preferences-updated'));
  };

  const handleToggleSidebarCount = () => {
    const nextVal = !sidebarTaskCount;
    setSidebarTaskCount(nextVal);
    localStorage.setItem('pref_sidebar_task_count', String(nextVal));
    window.dispatchEvent(new Event('preferences-updated'));
  };

  const handleChangeDefaultPriority = (priority: string) => {
    setDefaultPriority(priority);
    localStorage.setItem('pref_default_priority', priority);
    window.dispatchEvent(new Event('preferences-updated'));
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    try {
      setIsCreating(true);
      const newWs = await onCreateWorkspace(newWsName.trim(), newWsIcon, newWsColor);
      setNewWsName('');
      onSelectWorkspace(newWs.id);
    } catch (err) {
      console.error('Failed to create workspace:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (ws: Workspace) => {
    setEditingWsId(ws.id);
    setEditingName(ws.name);
    setEditingIcon(ws.icon || '💼');
  };

  const saveEditing = async (ws: Workspace) => {
    if (!editingName.trim()) return;
    const updated: Workspace = {
      ...ws,
      name: editingName.trim(),
      icon: editingIcon,
    };
    await onUpdateWorkspace(updated);
    setEditingWsId(null);
  };

  const promptDeleteWorkspace = (wsId: string) => {
    if (workspaces.length <= 1) {
      setErrorNotification('You must keep at least one workspace.');
      return;
    }
    setDeleteConfirmationWsId(wsId);
  };

  const executeDeleteWorkspace = async (wsId: string) => {
    try {
      const wsNotes = notes.filter(n => {
        if (n.workspaceId) {
          return n.workspaceId === wsId;
        }
        return workspaces[0]?.id === wsId;
      });

      // 1. Delete all associated tasks
      for (const note of wsNotes) {
        await dbService.deleteNote(note.id);
      }
      // 2. Delete workspace itself
      await onDeleteWorkspace(wsId);
      
      // If we deleted the active workspace, switch to another one
      if (activeWorkspaceId === wsId) {
        const remaining = workspaces.filter(w => w.id !== wsId);
        if (remaining.length > 0) {
          onSelectWorkspace(remaining[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to delete workspace:', err);
    } finally {
      setDeleteConfirmationWsId(null);
    }
  };

  return (
    <div id="settings-view" className="flex-1 flex flex-col h-full bg-[#FBFBFA] dark:bg-[#121211] overflow-hidden">
      {/* Title Header */}
      <div className="p-8 border-b border-[#EDECE9] dark:border-[#2C2C2A] bg-white dark:bg-[#161615]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 mb-1">
              <Settings size={18} className="animate-spin-slow" />
              <span className="text-xs font-extrabold uppercase tracking-widest">Configuration Console</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#37352F] dark:text-[#E3E3E2] tracking-tight">
              Workspace Settings
            </h1>
            <p className="text-xs text-[#ACABA9] dark:text-[#888886] mt-1 font-semibold">
              Manage custom workspaces, toggle task planner projections, and customize app configurations.
            </p>
          </div>
          <button
            onClick={() => onSetViewMode('dashboard')}
            className="px-4 py-2 bg-[#F3F2EE] hover:bg-[#EBEAE4] dark:bg-[#252523] dark:hover:bg-[#2C2C2A] text-xs font-bold rounded-xl transition-all cursor-pointer border border-[#EDECE9] dark:border-[#2C2C2A]"
          >
            Go to Home
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-4xl w-full mx-auto space-y-8 scrollbar-thin">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#EDECE9] dark:border-[#2C2C2A] gap-6">
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`pb-3 text-sm font-extrabold cursor-pointer transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'workspaces'
                ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400'
                : 'border-transparent text-[#ACABA9] hover:text-[#37352F] dark:hover:text-[#E3E3E2]'
            }`}
          >
            <Layout size={14} />
            <span>Manage Workspaces ({workspaces.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`pb-3 text-sm font-extrabold cursor-pointer transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'preferences'
                ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400'
                : 'border-transparent text-[#ACABA9] hover:text-[#37352F] dark:hover:text-[#E3E3E2]'
            }`}
          >
            <Sliders size={14} />
            <span>Preferences & Custom Features</span>
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`pb-3 text-sm font-extrabold cursor-pointer transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'account'
                ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400'
                : 'border-transparent text-[#ACABA9] hover:text-[#37352F] dark:hover:text-[#E3E3E2]'
            }`}
          >
            <Shield size={14} />
            <span>Account & Data Rights</span>
          </button>
        </div>

        {activeTab === 'workspaces' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Workspaces Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workspaces.map((ws) => {
                const isEditing = editingWsId === ws.id;
                const isCurrent = activeWorkspaceId === ws.id;
                const wsNotesCount = notes.filter(n => n.workspaceId === ws.id || (!n.workspaceId && workspaces[0]?.id === ws.id)).length;

                return (
                  <div
                    key={ws.id}
                    className={`p-5 rounded-2xl border transition-all relative overflow-hidden bg-white dark:bg-[#1C1C1A] flex flex-col justify-between ${
                      isCurrent
                        ? 'border-indigo-500/30 ring-1 ring-indigo-500/30 shadow-md shadow-indigo-500/5'
                        : 'border-[#EDECE9] dark:border-[#2C2C2A] hover:border-slate-300 dark:hover:border-slate-800'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute top-0 right-0 bg-indigo-500 text-white text-[8px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                        Active Workspace
                      </span>
                    )}

                    <div className="space-y-4">
                      {/* Icon & Details row */}
                      <div className="flex items-start gap-3">
                        {isEditing ? (
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              {/* Inline Emoji Selector */}
                              <div className="flex flex-wrap gap-1 bg-slate-50 dark:bg-[#252523] p-1.5 rounded-lg border border-[#EDECE9] dark:border-[#2C2C2A] max-w-full">
                                {PRESET_EMOJIS.slice(0, 7).map(e => (
                                  <button
                                    key={e}
                                    type="button"
                                    onClick={() => setEditingIcon(e)}
                                    className={`w-6 h-6 rounded flex items-center justify-center text-sm cursor-pointer hover:bg-[#EBEAE4] dark:hover:bg-[#2C2C2A] ${
                                      editingIcon === e ? 'bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-300' : ''
                                    }`}
                                  >
                                    {e}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="w-full text-xs font-bold p-2 bg-slate-50 dark:bg-[#252523] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-[#37352F] dark:text-white"
                              placeholder="Workspace Name"
                              maxLength={25}
                            />
                          </div>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#252523] border border-[#EDECE9] dark:border-[#2C2C2A] flex items-center justify-center text-xl flex-shrink-0">
                              {ws.icon || '💼'}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-extrabold text-[#37352F] dark:text-white text-sm flex items-center gap-1.5 truncate">
                                {ws.name}
                              </h3>
                              <div className="flex items-center gap-2 text-[10px] text-[#ACABA9] mt-0.5 font-bold">
                                <span className="flex items-center gap-0.5">
                                  <FileText size={10} /> {wsNotesCount} Tasks
                                </span>
                                <span>•</span>
                                <span className="capitalize">Theme Accent: {ws.accentColor || 'indigo'}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Accent Color picker inside workspace block */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-[#ACABA9] font-bold">Accent Theme:</span>
                        <div className="flex items-center gap-1.5">
                          {PRESET_COLORS.map((col) => (
                            <button
                              key={col.value}
                              onClick={async () => {
                                const updated: Workspace = { ...ws, accentColor: col.value };
                                await onUpdateWorkspace(updated);
                              }}
                              className={`w-3.5 h-3.5 rounded-full ${col.bg} transition-transform hover:scale-110 cursor-pointer ${
                                (ws.accentColor || 'indigo') === col.value ? 'ring-2 ring-slate-400 ring-offset-1 dark:ring-offset-[#1C1C1A]' : ''
                              }`}
                              title={`${col.name} Accent`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between border-t border-[#EDECE9]/60 dark:border-[#2C2C2A]/60 pt-3 mt-4">
                      {!isCurrent ? (
                        <button
                          onClick={() => onSelectWorkspace(ws.id)}
                          className="text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer"
                        >
                          Switch to Workspace
                        </button>
                      ) : (
                        <span className="text-[10px] font-extrabold text-[#ACABA9] flex items-center gap-1">
                          <Check size={10} className="text-emerald-500" /> Active
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEditing(ws)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingWsId(null)}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#37352F] dark:text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(ws)}
                              className="text-[10px] font-extrabold text-[#ACABA9] hover:text-[#37352F] dark:hover:text-white cursor-pointer"
                            >
                              Edit Details
                            </button>
                            {workspaces.length > 1 && (
                              <button
                                onClick={() => promptDeleteWorkspace(ws.id)}
                                className="text-[10px] font-extrabold text-rose-500 hover:text-rose-600 cursor-pointer flex items-center gap-0.5"
                                title="Delete workspace"
                              >
                                <Trash2 size={10} /> Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Create Workspace Panel */}
            <div className="p-6 bg-[#EDECE9]/30 dark:bg-[#1E1E1C]/40 border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl">
              <h3 className="text-xs font-extrabold text-[#37352F] dark:text-white uppercase tracking-wider mb-1 flex items-center gap-1">
                <Plus size={12} className="text-indigo-500" /> Create Workspace
              </h3>
              <p className="text-[11px] text-[#ACABA9] font-medium mb-4">
                Add an isolated workspace for distinct subjects (e.g., Work, Hobby, Fitness).
              </p>

              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#ACABA9] uppercase">Workspace Icon</label>
                    <div className="flex flex-wrap gap-1.5 bg-white dark:bg-[#1C1C1A] p-2 rounded-xl border border-[#EDECE9] dark:border-[#2C2C2A]">
                      {PRESET_EMOJIS.map(e => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setNewWsIcon(e)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-base cursor-pointer hover:bg-slate-100 dark:hover:bg-[#252523] ${
                            newWsIcon === e ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-400' : ''
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#ACABA9] uppercase">Workspace Name</label>
                      <input
                        type="text"
                        value={newWsName}
                        onChange={(e) => setNewWsName(e.target.value)}
                        placeholder="e.g. Design Lab"
                        maxLength={25}
                        className="w-full text-xs font-bold p-2.5 bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-[#37352F] dark:text-white shadow-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#ACABA9] uppercase block">Workspace Theme Accent</label>
                      <div className="flex items-center gap-2">
                        {PRESET_COLORS.map(col => (
                          <button
                            key={col.value}
                            type="button"
                            onClick={() => setNewWsColor(col.value)}
                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              newWsColor === col.value
                                ? `${col.bg} border-transparent text-white shadow-sm scale-102`
                                : `bg-white dark:bg-[#1C1C1A] border-[#EDECE9] dark:border-[#2C2C2A] text-[#37352F] dark:text-[#E3E3E2] hover:bg-slate-50`
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${col.bg} ${newWsColor === col.value ? 'ring-1 ring-white' : ''}`} />
                            {col.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-[#EDECE9]/40 dark:border-[#2C2C2A]/30">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : (
                      <>
                        <Plus size={14} /> Create Workspace
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : activeTab === 'preferences' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Preferences / Features Config list */}
            <div className="bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl divide-y divide-[#EDECE9]/60 dark:divide-[#2C2C2A]/60">
              
              {/* Feature 1: Calendar Task Projections */}
              <div className="p-6 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-extrabold text-[#37352F] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} className="text-indigo-500" /> Calendar Task Projection
                  </h3>
                  <p className="text-[11px] text-[#ACABA9] font-medium max-w-lg">
                    Automatically project recurring tasks (Daily) onto future calendar slots as reference, marked with a custom visual badge.
                  </p>
                </div>
                <button
                  onClick={handleToggleProjection}
                  className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    projectionEnabled ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      projectionEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>



              {/* Feature 3: Default task priority */}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-extrabold text-[#37352F] dark:text-white uppercase tracking-wider">
                      Default Task Priority
                    </h3>
                    <p className="text-[11px] text-[#ACABA9] font-medium max-w-lg">
                      Configure the default priority level assigned automatically to new tasks upon creation.
                    </p>
                  </div>
                  <div className="flex bg-slate-50 dark:bg-[#252523] p-1 rounded-xl border border-[#EDECE9] dark:border-[#2C2C2A]">
                    {['Low', 'Medium', 'High'].map((p) => (
                      <button
                        key={p}
                        onClick={() => handleChangeDefaultPriority(p)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                          defaultPriority === p
                            ? 'bg-white dark:bg-[#1C1C1A] text-[#37352F] dark:text-white shadow-xs font-extrabold'
                            : 'text-[#ACABA9] hover:text-[#37352F] dark:hover:text-[#E3E3E2]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences config end */}
          </div>
        ) : (
          /* Account & Data Rights Tab */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Authenticated Identity Card */}
            {user && (
              <div className="p-6 bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User Profile'}
                        className="w-14 h-14 rounded-2xl border-2 border-indigo-500/30 object-cover shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-rose-500 text-white flex items-center justify-center text-xl font-black shadow-sm">
                        {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'US'}
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-[#37352F] dark:text-white">
                          {user.displayName || 'Authenticated User'}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Google SSO Active
                        </span>
                      </div>
                      <p className="text-xs text-[#ACABA9] dark:text-[#888886] font-medium">
                        {user.email && user.email.endsWith('@notionnote.app')
                          ? `Username: ${user.displayName || user.email.split('@')[0]}`
                          : user.email}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-bold pt-1">
                        <span>UID: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-mono text-[9px]">{user.uid}</code></span>
                        <span>•</span>
                        <span>Member since: {new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={onSignOut}
                    className="px-4 py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start md:self-center"
                  >
                    <LogOut size={13} /> Sign Out Session
                  </button>
                </div>
              </div>
            )}

            {/* Account Email Management Card */}
            {user && (
              <div className="p-6 bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xs font-extrabold text-[#37352F] dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Mail size={14} className="text-indigo-500" /> Include / Link Email Address
                    </h3>
                    <p className="text-[11px] text-[#ACABA9] font-medium">
                      Add or update an email address associated with your account for notifications and security options.
                    </p>
                  </div>
                </div>

                {isGoogleUser ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2.5">
                    <ShieldAlert size={16} className="text-indigo-500 shrink-0" />
                    <span>
                      Option disabled: Your account is authenticated via <strong>Google Single Sign-On (SSO)</strong>. Email addresses are securely managed through your Google account.
                    </span>
                  </div>
                ) : (
                  <>
                    {emailStatus && (
                      <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                        emailStatus.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-800 dark:text-rose-300'
                      }`}>
                        {emailStatus.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                        <span>{emailStatus.text}</span>
                      </div>
                    )}

                    <form onSubmit={handleUpdateEmail} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                      <div className="relative flex-1">
                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={accountEmailInput}
                          onChange={(e) => setAccountEmailInput(e.target.value)}
                          placeholder="Enter your email address (e.g. name@example.com)"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-[#F9F8F6] dark:bg-[#20201E] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSavingEmail}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSavingEmail ? (
                          <span>Saving...</span>
                        ) : (
                          <>
                            <Check size={14} /> Update Email
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}



            {/* Real-time Security Audit Log Card */}
            <div className="bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xs font-extrabold text-[#37352F] dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <History size={14} className="text-amber-500" /> Security Audit Log
                  </h3>
                  <p className="text-[11px] text-[#ACABA9] font-medium">
                    Real-time immutable security event trail tracking logins, exports, workspace modifications, and data access.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-[#ACABA9] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                  {auditLogs.length} Events Logged
                </span>
              </div>

              <div className="border border-[#EDECE9] dark:border-[#2C2C2A] rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#ACABA9] italic font-medium">
                    No security audit logs recorded yet.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#252523] border-b border-[#EDECE9] dark:border-[#2C2C2A] text-[10px] font-extrabold text-[#ACABA9] uppercase">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Event Action</th>
                        <th className="p-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDECE9]/60 dark:divide-[#2C2C2A]/60">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="p-3 text-[10px] text-slate-400 dark:text-slate-500 font-mono whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 text-xs font-semibold text-[#37352F] dark:text-[#E3E3E2]">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmationWsId && (() => {
        const wsToDelete = workspaces.find(w => w.id === deleteConfirmationWsId);
        const wsToDeleteNotesCount = wsToDelete ? notes.filter(n => {
          if (n.workspaceId) {
            return n.workspaceId === wsToDelete.id;
          }
          return workspaces[0]?.id === wsToDelete.id;
        }).length : 0;

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setDeleteConfirmationWsId(null)}
            />
            <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200 text-left">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500">
                  <Trash2 size={20} />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-sm font-extrabold text-[#37352F] dark:text-white leading-6">
                    Delete Workspace?
                  </h3>
                  <p className="text-xs text-[#ACABA9] dark:text-[#888886] font-medium leading-5">
                    Are you sure you want to delete the workspace <span className="font-extrabold text-slate-700 dark:text-slate-300">"{wsToDelete?.name}"</span>?
                  </p>
                  <p className="text-xs text-rose-500 font-extrabold leading-5 mt-2 bg-rose-50 dark:bg-rose-950/10 p-2.5 rounded-lg border border-rose-500/10">
                    ⚠️ This will permanently delete the workspace and all {wsToDeleteNotesCount} task{wsToDeleteNotesCount !== 1 ? 's' : ''} nested inside it. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-[#EDECE9]/60 dark:border-[#2C2C2A]/60 pt-4">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmationWsId(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeDeleteWorkspace(deleteConfirmationWsId)}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  Delete Workspace
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Custom Error Warning Modal */}
      {errorNotification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setErrorNotification(null)}
          />
          <div className="relative w-full max-w-sm transform overflow-hidden rounded-2xl bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500">
                <AlertCircle size={20} />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-extrabold text-[#37352F] dark:text-white leading-6">
                  System Notification
                </h3>
                <p className="text-xs text-[#ACABA9] dark:text-[#888886] font-medium leading-5">
                  {errorNotification}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end border-t border-[#EDECE9]/60 dark:border-[#2C2C2A]/60 pt-4">
              <button
                type="button"
                onClick={() => setErrorNotification(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Purge Modal */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsPurgeModalOpen(false)}
          />
          <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500">
                <ShieldAlert size={20} />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-sm font-extrabold text-[#37352F] dark:text-white leading-6">
                  Purge All Account Data?
                </h3>
                <p className="text-xs text-[#ACABA9] dark:text-[#888886] font-medium leading-5">
                  This action will permanently delete all <span className="font-extrabold text-rose-500">{workspaces.length} workspaces</span> and <span className="font-extrabold text-rose-500">{notes.length} tasks</span> from Firestore.
                </p>
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-500/20 p-3 rounded-xl space-y-2">
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold uppercase">
                    Double Confirmation Required
                  </p>
                  <p className="text-xs text-[#37352F] dark:text-white font-medium">
                    To proceed, type <code className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded text-rose-500 font-bold">DELETE MY DATA</code> below:
                  </p>
                  <input
                    type="text"
                    value={purgeInputText}
                    onChange={(e) => setPurgeInputText(e.target.value)}
                    placeholder="DELETE MY DATA"
                    className="w-full text-xs font-mono font-bold p-2.5 bg-white dark:bg-[#1C1C1A] border border-rose-300 dark:border-rose-900/60 rounded-xl outline-none text-[#37352F] dark:text-white shadow-xs focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-[#EDECE9]/60 dark:border-[#2C2C2A]/60 pt-4">
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePurge}
                disabled={isPurging || purgeInputText.trim() !== 'DELETE MY DATA'}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isPurging ? 'Purging...' : (
                  <>
                    <Trash2 size={13} /> Confirm Data Wipe
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
