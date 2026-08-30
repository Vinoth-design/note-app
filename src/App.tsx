import React, { useState, useEffect } from 'react';
import { Note, ViewMode, Workspace, User } from './types';
import { dbService } from './dbService';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import AuthView from './components/AuthView';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import CalendarView from './components/CalendarView';
import DashboardView from './components/DashboardView';
import CreateTaskModal from './components/CreateTaskModal';
import AllTasksView from './components/AllTasksView';
import TestBenchView from './components/TestBenchView';
import SettingsView from './components/SettingsView';
import { Sun, Moon, Sparkles, AlertCircle, Menu, Bell, BellOff, Clock, Check } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [accentColor, setAccentColor] = useState<string>('indigo');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // default to dark for gorgeous look!
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Multi-workspace states
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    return localStorage.getItem('activeWorkspaceId');
  });
  const [isWorkspacesLoading, setIsWorkspacesLoading] = useState<boolean>(true);
  
  // Modal state for creating task
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [pendingScheduledDate, setPendingScheduledDate] = useState<string | null>(null);
  const [isRemindersOpen, setIsRemindersOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Auth state monitoring
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userProfile: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        };
        try {
          // Fetch existing user to keep correct createdAt
          const existingProfile = await dbService.getUserProfile(firebaseUser.uid);
          if (existingProfile) {
            userProfile.createdAt = existingProfile.createdAt;
          }
          await dbService.saveUserProfile(userProfile);
          await dbService.logSecurityEvent(userProfile.uid, 'LOGIN', 'Authenticated session via Google SSO');
        } catch (err) {
          console.error('Failed to sync user profile:', err);
        }
        setUser(userProfile);
      } else {
        setUser(null);
        setNotes([]);
        setWorkspaces([]);
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to notes in real-time
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    const unsubscribe = dbService.subscribeNotes(
      user.uid,
      (syncedNotes) => {
        setNotes(syncedNotes);
        setIsLoading(false);

        // If there are notes and none is selected, auto-select the first one
        if (syncedNotes.length > 0 && !selectedNoteId) {
          // Find first non-archived note
          const firstNote = syncedNotes.find((n) => !n.isArchived);
          if (firstNote) {
            setSelectedNoteId(firstNote.id);
          }
        }
      },
      (err) => {
        console.error('Subscription error:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, selectedNoteId]);

  // Subscribe to workspaces in real-time
  useEffect(() => {
    if (!user) return;

    setIsWorkspacesLoading(true);
    const unsubscribe = dbService.subscribeWorkspaces(
      user.uid,
      async (syncedWorkspaces) => {
        setWorkspaces(syncedWorkspaces);
        setIsWorkspacesLoading(false);

        if (syncedWorkspaces.length === 0) {
          try {
            const defaultWs = await dbService.createNewWorkspace('Personal Home', user.uid, '🏡', 'indigo');
            setActiveWorkspaceId(defaultWs.id);
          } catch (err) {
            console.error('Failed to create default workspace:', err);
          }
        } else {
          if (!activeWorkspaceId || !syncedWorkspaces.some(w => w.id === activeWorkspaceId)) {
            setActiveWorkspaceId(syncedWorkspaces[0].id);
          }
        }
      },
      (err) => {
        console.error('Workspaces subscription error:', err);
        setIsWorkspacesLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user, activeWorkspaceId]);

  // Save activeWorkspaceId to localStorage when changed
  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem('activeWorkspaceId', activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;

  // Sync workspace accent color with UI theme
  useEffect(() => {
    if (activeWorkspace?.accentColor) {
      setAccentColor(activeWorkspace.accentColor);
    }
  }, [activeWorkspace]);

  const handleSetAccentColor = async (color: string) => {
    setAccentColor(color);
    if (activeWorkspace && user) {
      const updatedWs = {
        ...activeWorkspace,
        accentColor: color,
      };
      await dbService.saveWorkspace(updatedWs, user.uid);
    }
  };

  // Filter notes belonging to the current active workspace
  const workspaceNotes = notes.filter((n) => {
    if (n.workspaceId) {
      return n.workspaceId === activeWorkspaceId;
    }
    // Backward compatibility: pre-existing notes belong to the default workspace
    const firstWorkspaceId = workspaces[0]?.id;
    return activeWorkspaceId === firstWorkspaceId;
  });

  // Open the Create Task Modal with optional scheduled date
  const triggerCreateTask = (scheduledDate: string | null = null) => {
    setPendingScheduledDate(scheduledDate);
    setIsCreateModalOpen(true);
  };

  // Perform actual creation once the user provides a task name
  const handleConfirmCreateTask = async (
    title: string,
    scheduledDate?: string | null,
    description?: string | null
  ) => {
    if (!user) return;
    try {
      const targetDate = scheduledDate !== undefined ? scheduledDate : pendingScheduledDate;
      const newNote = await dbService.createNewNote(
        title,
        user.uid,
        targetDate,
        activeWorkspaceId,
        description
      );
      setSelectedNoteId(newNote.id);
      setViewMode('editor');
      setPendingScheduledDate(null);
    } catch (e) {
      console.error('Failed to create task:', e);
    }
  };

  // Update an existing note
  const handleUpdateNote = async (updatedNote: Note) => {
    if (!user) return;
    try {
      const existingNote = notes.find(n => n.id === updatedNote.id);
      const noteToSave = { ...updatedNote };

      if (existingNote) {
        // 1. If main status changed (e.g. from Dashboard or All Tasks view checkboxes)
        if (existingNote.status !== updatedNote.status) {
          let updatedUpdates = updatedNote.updates ? [...updatedNote.updates] : [];
          if (updatedNote.status === 'Completed' && updatedUpdates.length > 0) {
            updatedUpdates = updatedUpdates.map(u => ({ ...u, status: 'Completed' }));
          } else if (updatedNote.status === 'Not Started' && updatedUpdates.length > 0) {
            updatedUpdates = updatedUpdates.map(u => ({ ...u, status: 'Not Started' }));
          } else if (updatedNote.status === 'In Progress' && updatedUpdates.length > 0) {
            const hasAnyNonCompleted = updatedUpdates.some(u => u.status !== 'Completed');
            if (!hasAnyNonCompleted) {
              updatedUpdates = updatedUpdates.map((u, idx) => 
                idx === updatedUpdates.length - 1 ? { ...u, status: 'In Progress' } : u
              );
            }
          }
          noteToSave.updates = updatedUpdates;
        }
        // 2. If updates list changed but status didn't, synchronize parent status
        else {
          const oldUpdatesJson = JSON.stringify(existingNote.updates || []);
          const newUpdatesJson = JSON.stringify(updatedNote.updates || []);
          if (oldUpdatesJson !== newUpdatesJson && updatedNote.updates && updatedNote.updates.length > 0) {
            const hasAnyNonCompleted = updatedNote.updates.some(u => u.status !== 'Completed');
            if (hasAnyNonCompleted) {
              noteToSave.status = 'In Progress';
            } else {
              noteToSave.status = 'Completed';
            }
          }
        }
      }

      // Optimistic local update
      setNotes((prev) =>
        prev.map((n) => (n.id === noteToSave.id ? noteToSave : n))
      );
      setIsSaving(true);
      await dbService.saveNote(noteToSave, user.uid);
    } catch (e) {
      console.error('Failed to update note:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete an existing note
  const handleDeleteNote = async (id: string) => {
    try {
      // Optimistic local update
      setNotes((prev) => prev.filter((n) => n.id !== id));

      await dbService.deleteNote(id);

      // If the deleted note was selected, select another one
      if (selectedNoteId === id) {
        const remaining = notes.filter((n) => n.id !== id && !n.isArchived);
        if (remaining.length > 0) {
          setSelectedNoteId(remaining[0].id);
        } else {
          setSelectedNoteId(null);
        }
      }
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  const activeReminders = workspaceNotes.filter((n) => !n.isArchived && n.status !== 'Completed' && n.remindersEnabled);

  const handleSelectReminder = (id: string) => {
    setSelectedNoteId(id);
    setViewMode('editor');
    setIsRemindersOpen(false);
  };

  const handleToggleReminderDirectly = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = {
      ...note,
      remindersEnabled: false,
      updatedAt: Date.now()
    };
    await handleUpdateNote(updated);
  };

  const activeNote = notes.find((n) => n.id === selectedNoteId) || null;

  // Handle user profile updates (e.g. display name)
  const handleUpdateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    if (updatedUser.uid) {
      try {
        await dbService.saveUserProfile(updatedUser);
      } catch (err) {
        console.error('Failed to update user profile:', err);
      }
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    localStorage.removeItem('nestnote_demo_user');
    if (user) {
      await dbService.logSecurityEvent(user.uid, 'LOGIN', 'Signed out session');
    }
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase sign out error:', e);
    }
    setUser(null);
  };

  // Handle Purge Account Data
  const handlePurgeAccountData = async () => {
    if (!user) return;
    const uid = user.uid;
    localStorage.removeItem('nestnote_demo_user');
    try {
      await dbService.purgeAccountData(uid);
      await signOut(auth);
    } catch (e) {
      console.warn('Purge data error:', e);
    }
    setUser(null);
  };

  // Render loading state while validating auth session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#FBFBFA] dark:bg-[#121211] text-[#37352F] dark:text-[#E3E3E2]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-2" />
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">
            Authenticating session...
          </p>
        </div>
      </div>
    );
  }

  // Render login/signup view if user is unauthenticated
  if (!user) {
    return <AuthView auth={auth} authNotice={authNotice} setAuthNotice={setAuthNotice} />;
  }

  // Render main app workspace
  return (
    <div id="app-root-container" className="flex h-screen w-screen overflow-hidden bg-[#FBFBFA] dark:bg-[#121211] text-[#37352F] dark:text-[#E3E3E2] transition-colors duration-200 font-sans">
      {/* Sidebar navigation */}
      <Sidebar
        notes={workspaceNotes}
        selectedNoteId={selectedNoteId}
        onSelectNote={(id) => {
          setSelectedNoteId(id);
          setIsSidebarOpen(false); // auto-close on select in mobile drawer
        }}
        onCreateNote={() => {
          triggerCreateTask();
          setIsSidebarOpen(false); // auto-close on create in mobile drawer
        }}
        onDeleteNote={handleDeleteNote}
        viewMode={viewMode}
        onSetViewMode={(mode) => {
          setViewMode(mode);
          setIsSidebarOpen(false); // auto-close on view change in mobile drawer
        }}
        accentColor={accentColor}
        onSetAccentColor={handleSetAccentColor}
        isMobileOpen={isSidebarOpen}
        onMobileClose={() => setIsSidebarOpen(false)}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={setActiveWorkspaceId}
        onCreateWorkspace={async (name, icon, accent) => {
          return await dbService.createNewWorkspace(name, user.uid, icon, accent);
        }}
        user={user}
        onLogOut={async () => {
          await signOut(auth);
        }}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Floating Dark Mode Switcher & Workspace Actions */}
        <div className="absolute right-6 top-3 z-50 flex items-center gap-2">
          {/* Daily Reminders Notification Popover */}
          <div className="relative">
            <button
              onClick={() => setIsRemindersOpen(!isRemindersOpen)}
              className={`p-1.5 rounded-lg bg-white hover:bg-[#EBEAE4] dark:bg-[#1A1A18] dark:hover:bg-[#2C2C2A] text-[#ACABA9] hover:text-[#37352F] dark:hover:text-[#E3E3E2] shadow-sm border border-[#EDECE9] dark:border-[#2C2C2A] cursor-pointer transition-all flex items-center justify-center relative ${
                isRemindersOpen ? 'text-[#2383E2] border-[#2383E2]/40 dark:border-[#2383E2]/40' : ''
              }`}
              title="Daily Reminders"
            >
              <Bell size={15} className={activeReminders.length > 0 ? 'text-rose-500' : ''} />
              {activeReminders.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-white dark:ring-[#121211]">
                  {activeReminders.length}
                </span>
              )}
            </button>

            {/* Reminders Popover Dropdown */}
            {isRemindersOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsRemindersOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-[#EDECE9]/60 dark:border-[#2C2C2A]/60 pb-2 mb-3">
                    <span className="text-xs font-extrabold text-[#37352F] dark:text-white flex items-center gap-1.5">
                      <Clock size={13} className="text-rose-500" />
                      <span>Today's Reminders</span>
                    </span>
                    <span className="text-[10px] font-bold text-[#ACABA9] dark:text-[#888886]">
                      {activeReminders.length} Active
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {activeReminders.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#ACABA9] dark:text-slate-600 font-medium italic">
                        All clear! No reminders set.
                      </div>
                    ) : (
                      activeReminders.map((note) => (
                        <div
                          key={note.id}
                          onClick={() => handleSelectReminder(note.id)}
                          className="p-2 rounded-xl border border-slate-50 dark:border-slate-800/40 hover:border-slate-200/60 dark:hover:border-slate-700/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 cursor-pointer transition-all flex items-start justify-between gap-2 group text-left"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-sm mt-0.5">{note.emoji}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#37352F] dark:text-white truncate">
                                {note.title || 'Untitled Task'}
                              </p>
                              {note.scheduledDate && (
                                <p className="text-[9px] font-semibold text-rose-500 flex items-center gap-0.5 mt-0.5">
                                  <span>📅 {note.scheduledDate}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleToggleReminderDirectly(note, e)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Dismiss reminder"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 rounded-lg bg-white hover:bg-[#EBEAE4] dark:bg-[#1A1A18] dark:hover:bg-[#2C2C2A] text-[#ACABA9] hover:text-[#37352F] dark:hover:text-[#E3E3E2] shadow-sm border border-[#EDECE9] dark:border-[#2C2C2A] cursor-pointer transition-all flex items-center justify-center"
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        {/* Mobile Hamburger Header Menu */}
        <div className="absolute left-6 top-3 z-30 md:hidden flex items-center">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 rounded-lg bg-white hover:bg-[#EBEAE4] dark:bg-[#1A1A18] dark:hover:bg-[#2C2C2A] text-[#ACABA9] hover:text-[#37352F] dark:hover:text-[#E3E3E2] shadow-sm border border-[#EDECE9] dark:border-[#2C2C2A] cursor-pointer transition-all flex items-center justify-center"
            title="Open Sidebar"
          >
            <Menu size={15} />
          </button>
        </div>

        {isLoading ? (
          /* Loading Skeleton Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-2" />
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">
                Syncing workspace...
              </p>
            </div>
          </div>
        ) : (
          /* Workspace Views Switcher */
          <div className="flex-1 flex overflow-hidden">
            {viewMode === 'dashboard' ? (
              <DashboardView
                notes={workspaceNotes}
                onSelectNote={setSelectedNoteId}
                onCreateNote={() => triggerCreateTask()}
                onSetViewMode={setViewMode}
                onUpdateNote={handleUpdateNote}
                user={user}
                onUpdateUser={handleUpdateUser}
              />
            ) : viewMode === 'all-tasks' ? (
              <AllTasksView
                notes={workspaceNotes}
                onSelectNote={(id) => {
                  setSelectedNoteId(id);
                  setViewMode('editor');
                }}
                onCreateNote={() => triggerCreateTask()}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onSetViewMode={setViewMode}
              />
            ) : viewMode === 'editor' ? (
              <Editor
                note={activeNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                isSaving={isSaving}
              />
            ) : viewMode === 'test-bench' ? (
              <TestBenchView />
            ) : viewMode === 'settings' ? (
              <SettingsView
                workspaces={workspaces}
                notes={notes}
                user={user}
                activeWorkspaceId={activeWorkspaceId}
                onSelectWorkspace={setActiveWorkspaceId}
                onCreateWorkspace={async (name, icon, accentColor) => {
                  const ws = await dbService.createNewWorkspace(name, user.uid, icon, accentColor);
                  await dbService.logSecurityEvent(user.uid, 'CREATE_WORKSPACE', `Created workspace: "${ws.name}"`);
                  return ws;
                }}
                onDeleteWorkspace={async (id) => {
                  await dbService.deleteWorkspace(id);
                  await dbService.logSecurityEvent(user.uid, 'DELETE_WORKSPACE', `Deleted workspace ID: ${id}`);
                }}
                onUpdateWorkspace={async (ws) => {
                  await dbService.saveWorkspace(ws, user.uid);
                }}
                onSetViewMode={setViewMode}
                onSignOut={handleSignOut}
                onPurgeAccount={handlePurgeAccountData}
              />
            ) : (
              <CalendarView
                notes={workspaceNotes}
                onSelectNote={(note) => {
                  setSelectedNoteId(note.id);
                  setViewMode('editor');
                }}
                onUpdateNote={handleUpdateNote}
                onCreateScheduledNote={(date) => triggerCreateTask(date)}
              />
            )}
          </div>
        )}
      </div>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleConfirmCreateTask}
        initialScheduledDate={pendingScheduledDate}
      />
    </div>
  );
}
