import React, { useState } from 'react';
import { Note, ViewMode, User as UserType } from '../types';
import { 
  Sparkles, 
  Plus, 
  Calendar, 
  Star, 
  FileText, 
  Clock, 
  Tag, 
  ArrowRight, 
  CheckCircle, 
  CheckCircle2,
  Circle,
  AlertTriangle,
  User,
  Inbox,
  Trash2,
  Bell,
  Pencil,
  Check,
  X
} from 'lucide-react';

interface DashboardViewProps {
  notes: Note[];
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onSetViewMode: (mode: ViewMode) => void;
  onUpdateNote: (note: Note) => void;
  user?: UserType | null;
  onUpdateUser?: (updatedUser: UserType) => void;
}

export default function DashboardView({
  notes,
  onSelectNote,
  onCreateNote,
  onSetViewMode,
  onUpdateNote,
  user,
  onUpdateUser
}: DashboardViewProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Dynamic Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFirstName = () => {
    if (!user) return '';
    const fullName = user.displayName || (user.email ? user.email.split('@')[0] : '');
    if (!fullName) return '';
    const rawFirst = fullName.trim().split(/[\s._-]+/)[0];
    if (!rawFirst) return '';
    return rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);
  };

  const greeting = getGreeting();
  const firstName = getFirstName();

  const handleStartEditName = () => {
    setNameInput(user?.displayName || firstName || '');
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (user && onUpdateUser) {
      onUpdateUser({
        ...user,
        displayName: trimmed,
      });
    }
    setIsEditingName(false);
  };

  // Filters
  const nonArchivedNotes = notes.filter(n => !n.isArchived);

  // Opened tasks (primary status NOT 'Completed')
  const openedTasks = nonArchivedNotes.filter(n => n.status !== 'Completed');
  const openedTasksCount = openedTasks.length;
  
  // Opened tasks short list (up to 4 items)
  const openedTasksShortList = [...openedTasks]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 4);

  // Toggle completion status
  const handleToggleComplete = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentStatus = note.status || 'Not Started';
    const newStatus = currentStatus === 'Completed' ? 'In Progress' : 'Completed';
    onUpdateNote({
      ...note,
      status: newStatus,
      updatedAt: Date.now(),
    });
  };

  // Quick Priority cycle
  const handleCyclePriority = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    const priorities: ('Low' | 'Medium' | 'High')[] = ['Low', 'Medium', 'High'];
    const currentPriority = note.priority || 'Low';
    const nextIndex = (priorities.indexOf(currentPriority) + 1) % priorities.length;
    onUpdateNote({
      ...note,
      priority: priorities[nextIndex],
      updatedAt: Date.now(),
    });
  };

  // Status breakdown
  const totalNotes = nonArchivedNotes.length;
  const completedNotes = nonArchivedNotes.filter(n => n.status === 'Completed').length;
  const inProgressNotes = nonArchivedNotes.filter(n => n.status === 'In Progress').length;
  const notStartedNotes = nonArchivedNotes.filter(n => n.status === 'Not Started' || !n.status).length;

  // High priority notes
  const highPriorityNotes = nonArchivedNotes.filter(n => n.priority === 'High');

  // All tags with counts
  const tagCounts: { [tag: string]: number } = {};
  nonArchivedNotes.forEach(n => {
    (n.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const allTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const handleCardClick = (id: string) => {
    onSelectNote(id);
    onSetViewMode('editor');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#FBFBFA] dark:bg-[#121211] overflow-y-auto scrollbar-thin p-4 pt-16 md:p-6 lg:p-8 font-sans select-text">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-3xl">👋</span>
              {isEditingName ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-[24px] leading-[31px] font-extrabold text-[#37352F] dark:text-white tracking-tight flex items-center gap-1.5">
                    <span>{greeting},</span>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') setIsEditingName(false);
                      }}
                      autoFocus
                      placeholder="Your name"
                      className="bg-transparent border-b-2 border-[#2383E2] outline-none px-1 text-[24px] leading-[31px] font-extrabold text-[#37352F] dark:text-white max-w-[160px] md:max-w-[240px]"
                    />
                  </h1>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleSaveName}
                      title="Save name"
                      className="p-1.5 bg-[#2383E2] hover:bg-[#1C69B5] text-white rounded-lg transition-all cursor-pointer shadow-sm"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      title="Cancel"
                      className="p-1.5 bg-[#EDECE9] dark:bg-[#2C2C2A] text-[#37352F] dark:text-white hover:bg-rose-500 hover:text-white rounded-lg transition-all cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/name">
                  <h1 className="text-[24px] leading-[31px] font-extrabold text-[#37352F] dark:text-white tracking-tight">
                    {greeting}{firstName ? `, ${firstName}` : ''}
                  </h1>
                  <button
                    onClick={handleStartEditName}
                    title="Edit your name"
                    className="p-1.5 opacity-60 group-hover/name:opacity-100 hover:opacity-100 text-[#ACABA9] hover:text-[#2383E2] rounded-lg transition-all cursor-pointer hover:bg-[#F0F0EE] dark:hover:bg-[#20201E]"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs md:text-sm text-[#ACABA9] dark:text-[#888886] font-medium max-w-xl leading-relaxed">
              Stay organized with your notes, tasks, and projects wherever you work.
            </p>
          </div>
          <button
            onClick={onCreateNote}
            className="self-start md:self-center px-4 py-2.5 bg-[#2383E2] hover:bg-[#1C69B5] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>Create New Task</span>
          </button>
        </div>

        {/* METRICS BENTO GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Tasks */}
          <div className="bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#ACABA9] dark:text-[#888886]">
                Total Tasks
              </span>
              <div className="p-1.5 bg-[#E3F2FD] dark:bg-[#1E3A5F]/40 text-[#2383E2] rounded-lg">
                <FileText size={14} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#37352F] dark:text-white">{totalNotes}</span>
              <span className="text-[10px] text-[#ACABA9] dark:text-[#888886] font-bold block mt-1">
                Active in workspace
              </span>
            </div>
          </div>

          {/* Card 2: Opened Tasks */}
          <div className="bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#ACABA9] dark:text-[#888886]">
                Opened Tasks
              </span>
              <div className="p-1.5 bg-[#FFF9C4] dark:bg-[#FEF9C3]/10 text-amber-600 rounded-lg">
                <Inbox size={14} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#37352F] dark:text-white">
                {openedTasksCount}
              </span>
              <span className="text-[10px] text-[#ACABA9] dark:text-[#888886] font-bold block mt-1">
                Pending completion
              </span>
            </div>
          </div>

          {/* Card 3: High Priority */}
          <div className="bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#ACABA9] dark:text-[#888886]">
                High Priority
              </span>
              <div className="p-1.5 bg-[#FFE2DD] dark:bg-rose-950/40 text-[#EB5757] rounded-lg animate-pulse">
                <AlertTriangle size={14} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#37352F] dark:text-white">
                {highPriorityNotes.length}
              </span>
              <span className="text-[10px] text-[#ACABA9] dark:text-[#888886] font-bold block mt-1">
                Urgent attention items
              </span>
            </div>
          </div>

          {/* Card 4: Progress Tracker */}
          <div className="bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#ACABA9] dark:text-[#888886]">
                Completion Rate
              </span>
              <div className="p-1.5 bg-[#E8F5E9] dark:bg-[#1B5E20]/40 text-[#2E7D32] rounded-lg">
                <CheckCircle size={14} />
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-[#37352F] dark:text-[#E3E3E2]">
                <span>Completed: {completedNotes}</span>
                <span>{totalNotes > 0 ? Math.round((completedNotes / totalNotes) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-150 dark:bg-[#2C2C2A] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#2E7D32] h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalNotes > 0 ? (completedNotes / totalNotes) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[9px] text-[#ACABA9] dark:text-[#888886] font-semibold block">
                {inProgressNotes} in progress • {notStartedNotes} backlogged
              </span>
            </div>
          </div>
        </div>

        {/* ACTIVE & OPENED TASKS & SPRINT AGENDA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Opened Tasks (col-span-8) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#ACABA9] dark:text-[#888886] uppercase tracking-wider flex items-center gap-2">
                <Clock size={14} className="text-[#2383E2]" />
                Opened Tasks & Sprints
              </h2>
              <button 
                onClick={() => onSetViewMode('all-tasks')}
                className="text-xs font-bold text-[#2383E2] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {openedTasksShortList.length === 0 ? (
              <div className="bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-12 text-center text-sm text-[#ACABA9] dark:text-[#888886] font-semibold italic">
                <Inbox size={32} className="mx-auto mb-2 text-[#ACABA9]/40" />
                No opened tasks. You are completely caught up! 🎉
              </div>
            ) : (
              <div className="space-y-2.5">
                {openedTasksShortList.map((note) => {
                  const isCompleted = note.status === 'Completed';
                  const description = note.blocks.find(b => b.content.trim())?.content || 'No description added yet.';
                  
                  return (
                    <div
                      key={note.id}
                      onClick={() => handleCardClick(note.id)}
                      className="group bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] hover:border-[#2383E2]/50 dark:hover:border-[#2383E2]/50 rounded-2xl p-4 shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Left contents */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 w-full">
                        {/* Checkbox button */}
                        <button
                          onClick={(e) => handleToggleComplete(note, e)}
                          className="p-1 rounded-full text-[#ACABA9] hover:text-[#37352F] dark:hover:text-white bg-[#F7F6F3] dark:bg-[#252523] transition-colors flex-shrink-0 cursor-pointer"
                          title="Mark completed"
                        >
                          <Circle size={16} />
                        </button>

                        <span className="text-xl flex-shrink-0">{note.emoji || '📝'}</span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-[#37352F] dark:text-white truncate group-hover:text-[#2383E2] dark:group-hover:text-[#42A5F5] transition-colors">
                              {note.title || 'Untitled task'}
                            </h4>
                            {note.isFavorite && (
                              <Star size={10} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-xs text-[#ACABA9] dark:text-[#888886] truncate max-w-md mt-0.5">
                            {description}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[9px] font-extrabold">
                            {note.dueDate && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                                <Clock size={8} /> Due: {note.dueDate}
                              </span>
                            )}
                            {note.remindersEnabled && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                                <Bell size={8} /> Daily Reminder
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right contents */}
                      <div className="flex items-center justify-between sm:justify-start gap-2.5 flex-shrink-0 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-[#EDECE9]/60 dark:border-[#2C2C2A]/60 sm:border-t-0">
                        {/* Priority Badge */}
                        <button
                          onClick={(e) => handleCyclePriority(note, e)}
                          className="cursor-pointer hover:brightness-105 active:scale-95 transition-all text-left"
                          title="Click to cycle priority"
                        >
                          {note.priority === 'High' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40">
                              High
                            </span>
                          ) : note.priority === 'Medium' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40">
                              Medium
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-800/60">
                              Low
                            </span>
                          )}
                        </button>

                        {/* Status Badge */}
                        {note.status === 'In Progress' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 animate-pulse">
                            In Progress
                          </span>
                        ) : note.status === 'Hold' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
                            Hold
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-800/60">
                            Not Started
                          </span>
                        )}

                        {/* Updated date (Hidden on small mobile screens) */}
                        <span className="hidden sm:inline text-[10px] text-[#ACABA9] dark:text-[#888886] font-semibold">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Widgets / Tags (col-span-4) */}
          <div className="lg:col-span-4 space-y-6">

            {/* Tag Cloud */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-[#ACABA9] dark:text-[#888886] uppercase tracking-wider flex items-center gap-2">
                <Tag size={14} className="text-[#2383E2]" />
                Top Tags
              </h2>

              <div className="bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-4 shadow-sm">
                {allTags.length === 0 ? (
                  <div className="text-xs text-[#ACABA9] italic text-center py-4">No tags created yet. Add tags inside the task properties editor.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map(([tag, count]) => (
                      <button
                        key={tag}
                        onClick={() => {
                          onSetViewMode('editor');
                        }}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#E3F2FD] dark:bg-[#1E3A5F]/40 text-[#2383E2] dark:text-[#42A5F5] border border-[#D0E7FF] dark:border-[#1E3A5F]/40 hover:scale-105 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>#{tag}</span>
                        <span className="opacity-65">({count})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
