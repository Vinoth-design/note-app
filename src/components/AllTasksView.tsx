import React, { useState } from 'react';
import { Note } from '../types';
import { 
  Search, 
  Plus, 
  Calendar, 
  Tag, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Play, 
  PauseCircle,
  AlertCircle, 
  Star, 
  Filter, 
  ArrowUpDown, 
  Inbox,
  Sparkles,
  Bell
} from 'lucide-react';

interface AllTasksViewProps {
  notes: Note[];
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onSetViewMode: (mode: 'editor' | 'calendar' | 'dashboard' | 'all-tasks') => void;
}

export default function AllTasksView({
  notes,
  onSelectNote,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onSetViewMode,
}: AllTasksViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title' | 'priority' | 'dueDate'>('updated');

  const nonArchivedNotes = notes.filter((n) => !n.isArchived);

  // Toggle Favorite
  const handleToggleFavorite = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNote({
      ...note,
      isFavorite: !note.isFavorite,
      updatedAt: Date.now(),
    });
  };

  // Toggle Completion Status
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

  // Filter notes
  const filteredNotes = nonArchivedNotes.filter((note) => {
    const matchesSearch = 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.blocks.some((b) => b.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (note.tags && note.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'Completed' && note.status === 'Completed') ||
      (statusFilter === 'In Progress' && note.status === 'In Progress') ||
      (statusFilter === 'Hold' && note.status === 'Hold') ||
      (statusFilter === 'Not Started' && (note.status === 'Not Started' || !note.status));

    const matchesPriority = 
      priorityFilter === 'all' || 
      note.priority === priorityFilter ||
      (priorityFilter === 'Low' && !note.priority); // Low or undefined

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Sort notes
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (sortBy === 'updated') {
      return b.updatedAt - a.updatedAt;
    }
    if (sortBy === 'created') {
      return b.createdAt - a.createdAt;
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'priority') {
      const priorityWeight = { High: 3, Medium: 2, Low: 1 };
      const weightA = priorityWeight[a.priority || 'Low'];
      const weightB = priorityWeight[b.priority || 'Low'];
      return weightB - weightA;
    }
    if (sortBy === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    return 0;
  });

  // Get status color helper
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
            <CheckCircle2 size={10} /> Completed
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 animate-pulse">
            <Play size={10} className="fill-current" /> In Progress
          </span>
        );
      case 'Hold':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
            <PauseCircle size={10} /> Hold
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800/60">
            <Circle size={10} /> Not Started
          </span>
        );
    }
  };

  // Get priority color badge
  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40">
            <AlertCircle size={10} /> High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-800/60">
            Low
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#FBFBFA] dark:bg-[#121211] overflow-y-auto scrollbar-thin p-4 pt-16 md:p-6 lg:p-8 font-sans select-text">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EDECE9] dark:border-[#2C2C2A] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#E3F2FD] dark:bg-[#1E3A5F]/40 text-[#2383E2] rounded-lg">
                <Sparkles size={16} />
              </span>
              <h1 className="text-xl md:text-2xl font-extrabold text-[#37352F] dark:text-white tracking-tight uppercase">
                All Active Tasks
              </h1>
            </div>
            <p className="text-xs md:text-sm text-[#ACABA9] dark:text-[#888886] font-medium max-w-xl">
              A comprehensive tabular roadmap of all registered workspace tasks, deadlines, and current completion levels.
            </p>
          </div>
          <button
            onClick={onCreateNote}
            className="self-start sm:self-center px-4 py-2.5 bg-[#2383E2] hover:bg-[#1C69B5] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>Create New Task</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#ACABA9] dark:text-[#888886]" size={15} />
            <input
              type="text"
              placeholder="Search tasks, descriptions, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#F7F6F3] dark:bg-[#252523] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-xl outline-none focus:ring-1 focus:ring-[#2383E2] text-[#37352F] dark:text-[#E3E3E2] transition-all"
            />
          </div>

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <Filter size={12} className="text-[#ACABA9]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#F7F6F3] dark:bg-[#252523] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-lg px-2 py-1.5 text-xs font-bold text-[#37352F] dark:text-[#E3E3E2] outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Hold">Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-[#F7F6F3] dark:bg-[#252523] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-lg px-2 py-1.5 text-xs font-bold text-[#37352F] dark:text-[#E3E3E2] outline-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>

            {/* Sorting */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown size={12} className="text-[#ACABA9]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#F7F6F3] dark:bg-[#252523] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-lg px-2 py-1.5 text-xs font-bold text-[#37352F] dark:text-[#E3E3E2] outline-none cursor-pointer"
              >
                <option value="updated">Recently Updated</option>
                <option value="created">Date Created</option>
                <option value="title">Alphabetical (A-Z)</option>
                <option value="priority">Priority (High-Low)</option>
                <option value="dueDate">Due Date</option>
              </select>
            </div>

          </div>

        </div>

        {/* Tasks List / Table Container */}
        {sortedNotes.length === 0 ? (
          <div className="bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-16 text-center shadow-xs">
            <Inbox size={40} className="mx-auto mb-3 text-[#ACABA9]/40" />
            <h3 className="text-sm font-bold text-[#37352F] dark:text-[#E3E3E2] mb-1">No tasks match your filters</h3>
            <p className="text-xs text-[#ACABA9] dark:text-[#888886] max-w-md mx-auto">
              Try adjusting your search queries, sorting preferences, or create a brand new task directly.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            
            {/* Desktop Table Header - hidden on mobile */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-[#F7F6F3] dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-[#ACABA9] dark:text-[#888886]">
              <div className="col-span-1 flex justify-center">Done</div>
              <div 
                onClick={() => setSortBy('title')}
                className="col-span-5 flex items-center gap-1 cursor-pointer hover:text-[#37352F] dark:hover:text-white transition-colors"
                title="Sort by Title"
              >
                <span>Task Details</span>
                {sortBy === 'title' && <ArrowUpDown size={10} className="text-[#2383E2]" />}
              </div>
              <div 
                onClick={() => setSortBy('updated')}
                className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-[#37352F] dark:hover:text-white transition-colors"
                title="Sort by Status"
              >
                <span>Status</span>
                {sortBy === 'updated' && <ArrowUpDown size={10} className="text-[#2383E2]" />}
              </div>
              <div 
                onClick={() => setSortBy('priority')}
                className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-[#37352F] dark:hover:text-white transition-colors"
                title="Sort by Priority"
              >
                <span>Priority</span>
                {sortBy === 'priority' && <ArrowUpDown size={10} className="text-[#2383E2]" />}
              </div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* List of Tasks */}
            <div className="space-y-2.5">
              {sortedNotes.map((note) => {
                const isCompleted = note.status === 'Completed';
                
                return (
                  <div
                    key={note.id}
                    onClick={() => onSelectNote(note.id)}
                    className="group bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] hover:border-[#2383E2]/50 dark:hover:border-[#2383E2]/50 rounded-2xl p-4 md:px-6 md:py-3.5 shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center"
                  >
                    
                    {/* Done / Checkbox column */}
                    <div className="col-span-1 flex items-center justify-start md:justify-center">
                      <button
                        onClick={(e) => handleToggleComplete(note, e)}
                        className={`p-1 rounded-full cursor-pointer transition-colors ${
                          isCompleted 
                            ? 'text-emerald-500 hover:text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' 
                            : 'text-[#ACABA9] hover:text-[#37352F] dark:hover:text-white bg-[#F7F6F3] dark:bg-[#252523]'
                        }`}
                        title={isCompleted ? "Mark in-progress" : "Mark completed"}
                      >
                        {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                    </div>

                    {/* Task Title & Details */}
                    <div className="col-span-1 md:col-span-5 flex items-start gap-3 min-w-0">
                      <span className="text-xl flex-shrink-0 mt-0.5">{note.emoji || '📝'}</span>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-extrabold truncate text-[#37352F] dark:text-white ${
                            isCompleted ? 'line-through opacity-55' : ''
                          }`}>
                            {note.title || 'Untitled task'}
                          </h4>
                          {note.isFavorite && (
                            <Star size={11} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                          )}
                        </div>

                        {/* Description excerpt */}
                        <p className="text-xs text-[#ACABA9] dark:text-[#888886] truncate max-w-sm">
                          {note.blocks.find(b => b.content.trim())?.content || 'No description added yet.'}
                        </p>

                        {/* Extra info (Scheduled, Due Date, Reminders, tags) */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#ACABA9] dark:text-[#888886] font-semibold pt-1">
                          {note.scheduledDate && (
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              Scheduled: {note.scheduledDate}
                            </span>
                          )}
                          {note.dueDate && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded">
                              <Clock size={10} className="text-amber-500 animate-pulse" />
                              Due: {note.dueDate}
                            </span>
                          )}
                          {note.remindersEnabled && (
                            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded">
                              <Bell size={10} className="text-rose-500" />
                              Daily Reminder
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            Updated {new Date(note.updatedAt).toLocaleDateString()}
                          </span>
                          
                          {/* Tags display */}
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Tag size={9} />
                              <div className="flex gap-1">
                                {note.tags.slice(0, 2).map((t) => (
                                  <span key={t} className="px-1.5 py-0.2 bg-[#EDECE9]/60 dark:bg-[#2C2C2A] text-[9px] rounded font-medium">
                                    {t}
                                  </span>
                                ))}
                                {note.tags.length > 2 && (
                                  <span className="text-[9px] font-extrabold text-[#2383E2]">
                                    +{note.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Column */}
                    <div className="col-span-1 md:col-span-2 flex items-center">
                      <div className="md:hidden text-[10px] text-[#ACABA9] font-extrabold uppercase mr-2">Status:</div>
                      {getStatusBadge(note.status)}
                    </div>

                    {/* Priority Column */}
                    <div className="col-span-1 md:col-span-2 flex items-center">
                      <div className="md:hidden text-[10px] text-[#ACABA9] font-extrabold uppercase mr-2">Priority:</div>
                      <button 
                        onClick={(e) => handleCyclePriority(note, e)}
                        className="cursor-pointer text-left hover:brightness-105 active:scale-95 transition-all"
                        title="Click to toggle priority"
                      >
                        {getPriorityBadge(note.priority)}
                      </button>
                    </div>

                    {/* Actions Column */}
                    <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-1.5">
                      <button
                        onClick={(e) => handleToggleFavorite(note, e)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          note.isFavorite 
                            ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-500 hover:text-amber-600' 
                            : 'text-[#ACABA9] hover:text-[#37352F] dark:hover:text-white hover:bg-[#F7F6F3] dark:hover:bg-[#252523]'
                        }`}
                        title={note.isFavorite ? "Unfavorite" : "Favorite"}
                      >
                        <Star size={13} className={note.isFavorite ? "fill-amber-500" : ""} />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(note.id);
                        }}
                        className="p-1.5 text-[#ACABA9] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
