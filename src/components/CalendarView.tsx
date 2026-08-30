import React, { useState, useRef, useEffect } from 'react';
import { Note } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  Bell,
  Search,
  RefreshCw,
  ListFilter,
  X,
  CheckCircle2,
  Activity,
  User,
  Circle,
  Play,
  PauseCircle,
  CalendarRange,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarViewProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onCreateScheduledNote: (date: string) => void;
}

const COLOR_PALETTES = [
  {
    classes: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-100 dark:border-sky-900/30 hover:bg-sky-100 dark:hover:bg-sky-950/55'
  },
  {
    classes: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-950/55'
  },
  {
    classes: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/55'
  },
  {
    classes: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-950/55'
  },
  {
    classes: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/55'
  },
  {
    classes: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-950/55'
  },
  {
    classes: 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-950/55'
  },
  {
    classes: 'bg-fuchsia-50 dark:bg-fuchsia-950/30 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-100 dark:border-fuchsia-900/30 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-950/55'
  },
  {
    classes: 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-100 dark:border-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-950/55'
  },
  {
    classes: 'bg-lime-50 dark:bg-lime-950/30 text-lime-700 dark:text-lime-300 border-lime-100 dark:border-lime-900/30 hover:bg-lime-100 dark:hover:bg-lime-950/55'
  },
  {
    classes: 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-950/55'
  },
  {
    classes: 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-100 dark:border-violet-900/30 hover:bg-violet-100 dark:hover:bg-violet-950/55'
  },
  {
    classes: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-950/55'
  },
  {
    classes: 'bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 border-pink-100 dark:border-pink-900/30 hover:bg-pink-100 dark:hover:bg-pink-950/55'
  },
  {
    classes: 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-100 dark:border-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/55'
  },
  {
    classes: 'bg-slate-50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-900/55'
  },
  {
    classes: 'bg-zinc-50 dark:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300 border-zinc-100 dark:border-zinc-800/30 hover:bg-zinc-100 dark:hover:bg-zinc-900/55'
  },
  {
    classes: 'bg-neutral-50 dark:bg-neutral-900/30 text-neutral-700 dark:text-neutral-300 border-neutral-100 dark:border-neutral-800/30 hover:bg-neutral-100 dark:hover:bg-neutral-900/55'
  },
  {
    classes: 'bg-stone-50 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300 border-stone-100 dark:border-stone-800/30 hover:bg-stone-100 dark:hover:bg-stone-900/55'
  },
  {
    classes: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-950/55'
  }
];

const getNoteColorClasses = (noteId: string, dayIndex: number) => {
  let hash = 5381;
  for (let i = 0; i < noteId.length; i++) {
    hash = ((hash << 5) + hash) + noteId.charCodeAt(i);
  }
  const index = (Math.abs(hash) + dayIndex) % COLOR_PALETTES.length;
  return COLOR_PALETTES[index].classes;
};

export default function CalendarView({
  notes,
  onSelectNote,
  onUpdateNote,
  onCreateScheduledNote,
}: CalendarViewProps) {
  // Helper to get system local today date string YYYY-MM-DD
  const getActualTodayString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayVal = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayVal}`;
  };

  // Month and Date default to today
  const [currentDate, setCurrentDate] = useState(() => new Date()); 
  const [projectionEnabled, setProjectionEnabled] = useState<boolean>(() => {
    return localStorage.getItem('pref_projection_enabled') !== 'false';
  });

  useEffect(() => {
    const handlePrefUpdate = () => {
      const enabled = localStorage.getItem('pref_projection_enabled') !== 'false';
      setProjectionEnabled(enabled);
    };
    window.addEventListener('preferences-updated', handlePrefUpdate);
    return () => window.removeEventListener('preferences-updated', handlePrefUpdate);
  }, []);

  const handleToggleProjection = () => {
    const nextVal = !projectionEnabled;
    setProjectionEnabled(nextVal);
    localStorage.setItem('pref_projection_enabled', String(nextVal));
    window.dispatchEvent(new Event('preferences-updated'));
  };

  // Mobile specific selected date & search states (Redesign for mobile calendar)
  const [selectedMobileDate, setSelectedMobileDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayVal = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayVal}`;
  });
  const [mobileTab, setMobileTab] = useState<'agenda' | 'day'>('agenda');
  const [mobileSearchOpen, setMobileSearchOpen] = useState<boolean>(false);
  const [mobileSearchTerm, setMobileSearchTerm] = useState<string>('');
  const [isCalendarExpanded, setIsCalendarExpanded] = useState<boolean>(false);

  // Status Overview Modal state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [statusModalFilter, setStatusModalFilter] = useState<string>('all');
  const [statusModalSearch, setStatusModalSearch] = useState<string>('');
  const [completedPreset, setCompletedPreset] = useState<'all' | 'last_15' | 'last_30'>('all');

  const toYMDString = (dateInput: number | string | undefined | null): string => {
    if (!dateInput) return '';
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayVal = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayVal}`;
  };

  const isTaskInCompletedPreset = (n: Note, preset: 'all' | 'last_15' | 'last_30'): boolean => {
    if (preset === 'all') return true;
    const taskYMD = toYMDString(n.scheduledDate || n.dueDate || n.updatedAt);
    if (!taskYMD) return true;

    const today = new Date();
    const pastDate = new Date(today);
    if (preset === 'last_15') {
      pastDate.setDate(today.getDate() - 15);
    } else if (preset === 'last_30') {
      pastDate.setDate(today.getDate() - 30);
    }

    const y = pastDate.getFullYear();
    const m = String(pastDate.getMonth() + 1).padStart(2, '0');
    const dayVal = String(pastDate.getDate()).padStart(2, '0');
    const minYMD = `${y}-${m}-${dayVal}`;

    return taskYMD >= minYMD;
  };

  const formatLastUpdated = (timestamp: number) => {
    if (!timestamp) return 'No record';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCalendarExpanded && scrollContainerRef.current) {
      const selectedBtn = scrollContainerRef.current.querySelector('[data-selected="true"]');
      if (selectedBtn) {
        selectedBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedMobileDate, isCalendarExpanded]);

  // Helper to parse date string YYYY-MM-DD safely in local timezone
  const getSafeLocalDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date();
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  };

  // Helper to get 0-indexed month from YYYY-MM-DD string timezone-safely
  const getMonthFromDateStr = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return 0;
    return parseInt(parts[1], 10) - 1;
  };

  const isToday = (dateString: string) => {
    return dateString === getActualTodayString();
  };

  const isTomorrow = (dateString: string) => {
    const todayStr = getActualTodayString();
    const parts = todayStr.split('-');
    if (parts.length !== 3) return false;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayVal = String(d.getDate()).padStart(2, '0');
    return dateString === `${y}-${m}-${dayVal}`;
  };

  const handlePrevWeek = () => {
    const date = getSafeLocalDate(selectedMobileDate);
    date.setDate(date.getDate() - 7);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setSelectedMobileDate(`${y}-${m}-${d}`);
  };

  const handleNextWeek = () => {
    const date = getSafeLocalDate(selectedMobileDate);
    date.setDate(date.getDate() + 7);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setSelectedMobileDate(`${y}-${m}-${d}`);
  };

  // Get 7 days of the week for the selected date
  const getDaysInWeekOfDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return [];
    const yearNum = parseInt(parts[0], 10);
    const monthNum = parseInt(parts[1], 10) - 1;
    const dayNumVal = parseInt(parts[2], 10);
    const date = new Date(yearNum, monthNum, dayNumVal);
    const dayOfWeek = date.getDay(); // 0 is Sun, 6 is Sat
    const days = [];
    
    // Sunday of this week
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - dayOfWeek);
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayVal = String(d.getDate()).padStart(2, '0');
      days.push({
        dateString: `${y}-${m}-${dayVal}`,
        dayNum: d.getDate(),
        dayNameShort: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i],
        dayNameLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i],
        monthNameShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]
      });
    }
    return days;
  };

  // Helper to determine if a date belongs to the active selected month
  const isSelectedMonth = (dateString: string) => {
    const dateParts = dateString.split('-');
    const selectedParts = selectedMobileDate.split('-');
    if (dateParts.length !== 3 || selectedParts.length !== 3) return false;
    return dateParts[1] === selectedParts[1] && dateParts[0] === selectedParts[0];
  };

  const isFirstDayOfMonth = (dateString: string) => {
    const parts = dateString.split('-');
    return parts.length === 3 && parts[2] === '01';
  };

  const getShortMonthName = (dateString: string) => {
    const parts = dateString.split('-');
    if (parts.length !== 3) return '';
    const monthIdx = parseInt(parts[1], 10) - 1;
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIdx] || '';
  };

  // Helper to generate a full monthly grid timezone-safely based on selected date's month
  const getMobileDaysInMonthGrid = () => {
    const parts = selectedMobileDate.split('-');
    if (parts.length !== 3) return [];
    const yearNum = parseInt(parts[0], 10);
    const monthNum = parseInt(parts[1], 10) - 1;

    const firstDayIndex = new Date(yearNum, monthNum, 1).getDay();
    const totalDays = new Date(yearNum, monthNum + 1, 0).getDate();
    const prevMonthTotalDays = new Date(yearNum, monthNum, 0).getDate();

    const grid = [];

    // Previous Month Trailing Days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevMonth = monthNum === 0 ? 12 : monthNum;
      const prevYear = monthNum === 0 ? yearNum - 1 : yearNum;
      const dayVal = prevMonthTotalDays - i;
      grid.push({
        dayNum: dayVal,
        dateString: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayVal).padStart(2, '0')}`,
      });
    }

    // Active Month Days
    for (let i = 1; i <= totalDays; i++) {
      grid.push({
        dayNum: i,
        dateString: `${yearNum}-${String(monthNum + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      });
    }

    // Next Month Leading Days to make a full 42 cells (6 rows)
    const remainingCells = 42 - grid.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonth = monthNum === 11 ? 1 : monthNum + 2;
      const nextYear = monthNum === 11 ? yearNum + 1 : yearNum;
      grid.push({
        dayNum: i,
        dateString: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      });
    }

    return grid;
  };

  // Helper to generate days around selected date for horizontal scroll in closed week view
  const getCollapsedWeekDays = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return [];
    const yearNum = parseInt(parts[0], 10);
    const monthNum = parseInt(parts[1], 10) - 1;
    const dayNumVal = parseInt(parts[2], 10);
    const date = new Date(yearNum, monthNum, dayNumVal);
    
    const days = [];
    // Generate 21 days: 10 days before, selected day, and 10 days after
    for (let i = -10; i <= 10; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayVal = String(d.getDate()).padStart(2, '0');
      days.push({
        dateString: `${y}-${m}-${dayVal}`,
        dayNum: d.getDate(),
        dayNameShort: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()],
        dayNameLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()],
        monthNameShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]
      });
    }
    return days;
  };

  // Helper to get 7 days starting from selected date so Agenda starts precisely from it
  const getDaysFromSelectedDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return [];
    const yearNum = parseInt(parts[0], 10);
    const monthNum = parseInt(parts[1], 10) - 1;
    const dayNumVal = parseInt(parts[2], 10);
    const date = new Date(yearNum, monthNum, dayNumVal);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayVal = String(d.getDate()).padStart(2, '0');
      days.push({
        dateString: `${y}-${m}-${dayVal}`,
        dayNum: d.getDate(),
        dayNameShort: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()],
        dayNameLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()],
        monthNameShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]
      });
    }
    return days;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to generate dates in grid for active month
  const getDaysInMonthGrid = () => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const grid = [];

    // Previous Month Trailing Days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      grid.push({
        day: prevMonthTotalDays - i,
        isCurrentMonth: false,
        dateString: `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(prevMonthTotalDays - i).padStart(2, '0')}`,
      });
    }

    // Active Month Days
    for (let i = 1; i <= totalDays; i++) {
      grid.push({
        day: i,
        isCurrentMonth: true,
        dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      });
    }

    // Next Month Leading Days to make a full 6 rows (42 cells)
    const remainingCells = 42 - grid.length;
    for (let i = 1; i <= remainingCells; i++) {
      grid.push({
        day: i,
        isCurrentMonth: false,
        dateString: `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      });
    }

    return grid;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Helper to determine if a task belongs to a specific calendar date
  const isTaskOnDate = (note: Note, dateString: string) => {
    // 1. Standard multi-day span: if both scheduledDate and dueDate are set, show on all dates in between!
    // This only applies to standard non-recurring tasks.
    if (note.scheduledDate && note.dueDate && (!note.recurrence || note.recurrence === 'None')) {
      if (dateString >= note.scheduledDate && dateString <= note.dueDate) {
        return true;
      }
      return false;
    }

    // 2. Standard non-recurring behavior (or if projection is disabled)
    if (!projectionEnabled || !note.recurrence || note.recurrence === 'None') {
      if (note.scheduledDate === dateString) return true;
      if (note.dueDate === dateString) return true;
      
      // Fallback to created date ONLY if neither scheduled nor due is set
      if (!note.scheduledDate && !note.dueDate) {
        const d = new Date(note.createdAt);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dayStr}` === dateString;
      }
      
      return false;
    }

    // 3. Recurring task behavior:
    // Determine start date
    let startStr = note.scheduledDate;
    if (!startStr) {
      const d = new Date(note.createdAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      startStr = `${y}-${m}-${dayStr}`;
    }

    // Recurring task cannot start before its start date
    if (dateString < startStr) return false;

    // Repeat tasks should ONLY show until current date (today)
    const todayStr = getActualTodayString();
    if (dateString > todayStr) return false;

    // Recurring task stops repeating after its due date
    if (note.dueDate && dateString > note.dueDate) return false;

    // Evaluate recurrence pattern
    const targetDate = getSafeLocalDate(dateString);
    const startDate = getSafeLocalDate(startStr);

    if (note.recurrence === 'Daily') {
      return true;
    }

    if (note.recurrence === 'Weekly') {
      return targetDate.getDay() === startDate.getDay();
    }

    if (note.recurrence === 'Monthly') {
      return targetDate.getDate() === startDate.getDate();
    }

    return false;
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/plain', noteId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnDay = (e: React.DragEvent, dateString: string) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData('text/plain');
    if (!noteId) return;

    const targetNote = notes.find((n) => n.id === noteId);
    if (targetNote) {
      onUpdateNote({
        ...targetNote,
        scheduledDate: dateString,
        updatedAt: Date.now(),
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FBFBFA] dark:bg-[#121211] font-sans h-full">
      {/* DESKTOP CALENDAR VIEW */}
      <div className="hidden sm:flex flex-1 flex-col md:flex-row overflow-hidden bg-[#FBFBFA] dark:bg-[#121211] font-sans h-full">
        {/* Calendar Grid Section */}
        <div className="flex-1 flex flex-col p-4 pt-16 md:p-6 lg:p-8 overflow-y-auto scrollbar-thin">
          
          {/* Calendar Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#37352F] dark:text-white tracking-tight">
                {monthNames[month]} {year}
              </h2>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsStatusModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-white dark:bg-[#1A1A18] text-[#37352F] dark:text-white border border-[#EDECE9] dark:border-[#2C2C2A] shadow-xs hover:border-[#2383E2] hover:text-[#2383E2] dark:hover:border-[#2383E2] dark:hover:text-[#42A5F5] transition-all cursor-pointer"
                title="View List of Tasks Grouped by Status"
              >
                <ListFilter size={14} className="text-[#2383E2]" />
                <span>Status</span>
                <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-full text-slate-600 dark:text-slate-300">
                  {notes.filter((n) => !n.isArchived && n.status !== 'Completed').length}
                </span>
              </button>

              <button
                onClick={handleToggleProjection}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-xs transition-all cursor-pointer ${
                  projectionEnabled
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30'
                    : 'bg-white dark:bg-[#1A1A18] text-[#ACABA9] dark:text-[#888886] border-[#EDECE9] dark:border-[#2C2C2A]'
                }`}
                title="Toggle Dynamic Calendar Projection of Recurring Tasks"
              >
                <Sparkles size={11} className={projectionEnabled ? 'animate-pulse' : ''} />
                <span>Projection: {projectionEnabled ? 'ON' : 'OFF'}</span>
              </button>

              <div className="flex items-center gap-1.5 bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] p-1.5 rounded-xl shadow-sm self-start">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-[#F7F6F3] dark:hover:bg-[#252523] text-[#37352F] dark:text-[#E3E3E2] rounded-lg cursor-pointer transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft size={15} />
                </button>
              <button
                onClick={handleToday}
                className="px-3 py-1 text-xs font-bold hover:bg-[#F7F6F3] dark:hover:bg-[#252523] text-[#37352F] dark:text-[#E3E3E2] rounded-lg cursor-pointer transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-[#F7F6F3] dark:hover:bg-[#252523] text-[#37352F] dark:text-[#E3E3E2] rounded-lg cursor-pointer transition-colors"
                title="Next Month"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

          {/* Days of week Headers */}
          <div className="grid grid-cols-7 gap-1.5 text-center mb-2 font-bold text-[10px] text-[#ACABA9] uppercase tracking-wider">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Grid */}
          <div 
            className="grid grid-cols-7 gap-1.5 w-full"
            style={{ gridAutoRows: 'minmax(120px, auto)' }}
          >
            {getDaysInMonthGrid().map(({ day, isCurrentMonth, dateString }) => {
              const dayNotes = notes.filter((n) => !n.isArchived && n.status !== 'Completed' && isTaskOnDate(n, dateString));
              const isCurrToday = isToday(dateString);

              return (
                <div
                  key={dateString}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnDay(e, dateString)}
                  className={`min-h-[120px] rounded-2xl p-2.5 flex flex-col gap-1.5 transition-all group shadow-sm ${
                    isCurrToday
                      ? 'bg-blue-50/50 dark:bg-[#1B2A4A]/80 border-2 border-[#2383E2] dark:border-[#42A5F5] ring-2 ring-[#2383E2]/30 dark:ring-[#42A5F5]/30'
                      : 'bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] hover:border-[#2383E2] dark:hover:border-[#2383E2]'
                  } ${
                    isCurrentMonth ? '' : 'opacity-40'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isCurrToday
                          ? 'w-6 h-6 rounded-full bg-[#2383E2] dark:bg-[#2383E2] text-white font-black text-xs flex items-center justify-center shadow-xs'
                          : isCurrentMonth
                          ? 'text-[#37352F] dark:text-[#E3E3E2]'
                          : 'text-[#ACABA9] dark:text-[#888886]'
                      }`}
                    >
                      {day}
                    </span>
                    <button
                      onClick={() => onCreateScheduledNote(dateString)}
                      className="p-0.5 hover:bg-[#F7F6F3] dark:hover:bg-[#252523] text-[#ACABA9] hover:text-[#2383E2] rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title={`Create task for ${dateString}`}
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Day Notes List */}
                  <div className="flex-1 space-y-1.5">
                    {dayNotes.map((note, index) => {
                      const isProjected = note.recurrence && note.recurrence !== 'None' && note.scheduledDate !== dateString;
                      return (
                        <div
                          key={note.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, note.id)}
                          onClick={() => onSelectNote(note)}
                          className={`group/note text-[11px] font-bold p-1.5 rounded-xl transition-all cursor-grab active:cursor-grabbing flex items-center gap-1.5 border shadow-xs ${getNoteColorClasses(note.id, index)}`}
                          title={`${note.title || 'Untitled task'}${isProjected ? ` (${note.recurrence} Projection)` : ''}`}
                        >
                          <span className="flex-shrink-0">{note.emoji || '📝'}</span>
                          <span className="truncate flex-1 font-semibold">{note.title || 'Untitled'}</span>
                          {note.recurrence && note.recurrence !== 'None' && (
                            <RefreshCw size={10} className={`shrink-0 opacity-70 ${isProjected ? 'text-indigo-500 animate-spin-slow' : 'text-slate-400'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MOBILE CALENDAR VIEW (Redesigned as attached image) */}
      <div className="flex sm:hidden flex-1 flex-col bg-white dark:bg-[#151514] overflow-hidden relative h-full">
        {/* Header Section */}
        <div className="flex items-center justify-between px-5 pt-12 pb-3 border-b border-slate-100 dark:border-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            {/* Dynamic Month Header */}
            <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
              {monthNames[getMonthFromDateStr(selectedMobileDate)]}
            </h1>
            
            {/* Week Navigation Controls */}
            <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-[#252523]/50 border border-slate-100 dark:border-slate-800/40 p-0.5 rounded-lg ml-1">
              <button
                onClick={handlePrevWeek}
                className="p-1 hover:bg-slate-100 dark:hover:bg-[#151514] text-slate-500 dark:text-slate-400 rounded transition-colors cursor-pointer"
                title="Previous Week"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() => {
                  const todayStr = getActualTodayString();
                  setSelectedMobileDate(todayStr);
                }}
                className="px-2 py-0.5 text-[9px] font-bold hover:bg-slate-100 dark:hover:bg-[#151514] text-slate-600 dark:text-slate-300 rounded transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={handleNextWeek}
                className="p-1 hover:bg-slate-100 dark:hover:bg-[#151514] text-slate-500 dark:text-slate-400 rounded transition-colors cursor-pointer"
                title="Next Week"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Quick Search trigger, Status modal & Projection toggle */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="px-2.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 bg-slate-100 dark:bg-[#252523] text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-800 transition-colors cursor-pointer mr-0.5"
              title="View Status Overview"
            >
              <ListFilter size={13} className="text-[#5B6AD0]" />
              <span>Status</span>
            </button>

            <button
              onClick={handleToggleProjection}
              className={`p-2 rounded-full transition-all cursor-pointer ${
                projectionEnabled
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
              title={`Toggle Dynamic Projection: ${projectionEnabled ? 'ON' : 'OFF'}`}
            >
              <Sparkles size={18} className={projectionEnabled ? 'animate-pulse' : ''} />
            </button>

            {mobileSearchOpen ? (
              <div className="relative flex items-center bg-slate-100 dark:bg-[#252523] px-3 py-1 rounded-full">
                <input
                  type="text"
                  placeholder="Filter events..."
                  value={mobileSearchTerm}
                  onChange={(e) => setMobileSearchTerm(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-28 text-slate-800 dark:text-white focus:ring-0 p-0"
                />
                <button 
                  onClick={() => {
                    setMobileSearchOpen(false);
                    setMobileSearchTerm('');
                  }}
                  className="text-xs text-slate-400 dark:text-slate-500 font-bold ml-1 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setMobileSearchOpen(true)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-[#252523] text-slate-700 dark:text-slate-200 rounded-full transition-colors cursor-pointer"
                title="Search events"
              >
                <Search size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection Row (Agenda / Day) */}
        <div className="flex items-center gap-2 px-5 py-3 shrink-0">
          <button
            onClick={() => setMobileTab('agenda')}
            className={`px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer ${
              mobileTab === 'agenda'
                ? 'bg-[#5B6AD0]/15 text-[#5B6AD0] dark:bg-[#5B6AD0]/30 dark:text-[#8E9DF5]'
                : 'bg-[#F7F6F3] dark:bg-[#252523] text-slate-500 dark:text-[#ACABA9]'
            }`}
          >
            Agenda
          </button>
          <button
            onClick={() => setMobileTab('day')}
            className={`px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all border cursor-pointer ${
              mobileTab === 'day'
                ? 'bg-[#5B6AD0]/15 text-[#5B6AD0] border-[#5B6AD0]/30 dark:bg-[#5B6AD0]/30 dark:text-[#8E9DF5] dark:border-[#5B6AD0]/40'
                : 'border-[#EDECE9] dark:border-[#2C2C2A] text-slate-500 dark:text-[#ACABA9]'
            }`}
          >
            Day
          </button>
        </div>

        {/* Collapsible/Draggable Calendar Grid */}
        <div className="px-5 pb-1 shrink-0 border-b border-slate-100 dark:border-slate-800/40">
          {/* Weekday S M T W T F S row (only shown when expanded) */}
          {isCalendarExpanded && (
            <div className="grid grid-cols-7 text-center gap-0 mb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayChar, idx) => (
                <div key={`header-${idx}`} className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase pb-1">
                  {dayChar}
                </div>
              ))}
            </div>
          )}

          {/* Animating days grid or scroll view */}
          <motion.div
            layout
            ref={scrollContainerRef}
            className={isCalendarExpanded 
              ? "grid grid-cols-7 gap-0 w-full overflow-hidden rounded-xl border border-slate-100/70 dark:border-slate-800/30"
              : "flex flex-row overflow-x-auto gap-2 w-full overflow-y-hidden rounded-xl border border-slate-100/70 dark:border-slate-800/30 bg-white dark:bg-[#1E1E1C] px-2 py-2.5 scrollbar-none snap-x"
            }
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          >
            <AnimatePresence mode="popLayout">
              {(isCalendarExpanded ? getMobileDaysInMonthGrid() : getCollapsedWeekDays(selectedMobileDate)).map((day) => {
                const isSelected = day.dateString === selectedMobileDate;
                const isCurrToday = isToday(day.dateString);
                const isSelMonth = isSelectedMonth(day.dateString);
                const hasEvents = notes.some((n) => !n.isArchived && isTaskOnDate(n, day.dateString));

                // Previous month dates are colored differently from the active month
                const cellBg = isCalendarExpanded
                  ? (isCurrToday ? 'bg-indigo-50/60 dark:bg-[#232642] ring-1 ring-[#5B6AD0]' : isSelMonth ? 'bg-white dark:bg-[#1E1E1C]' : 'bg-[#F2F2F2] dark:bg-[#202022]')
                  : (isSelected ? 'bg-[#5B6AD0]/10 rounded-2xl border border-[#5B6AD0]/25' : isCurrToday ? 'bg-indigo-50/50 dark:bg-[#232642]/50 rounded-2xl' : 'bg-transparent');

                return (
                  <button
                    key={`daybtn-${day.dateString}`}
                    data-selected={isSelected}
                    onClick={() => setSelectedMobileDate(day.dateString)}
                    className={`flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isCalendarExpanded
                        ? 'py-2.5 flex-1 relative'
                        : 'py-2 px-1 flex-shrink-0 w-12 h-16 relative snap-center'
                    } ${cellBg}`}
                  >
                    <div className="flex flex-col items-center justify-center relative">
                      {/* If collapsed week view, display the weekday initials */}
                      {!isCalendarExpanded && (
                        <span className={`text-[10px] font-extrabold uppercase leading-none mb-1.5 ${
                          isSelected 
                            ? 'text-[#5B6AD0] dark:text-[#8E9DF5]' 
                            : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          {day.dayNameShort}
                        </span>
                      )}

                      <span className={`w-9 h-9 flex flex-col items-center justify-center text-sm font-bold rounded-full transition-all relative ${
                        isSelected
                          ? 'bg-[#5B6AD0] text-white shadow-md font-extrabold scale-105'
                          : isCurrToday
                            ? 'bg-[#E8ECFB] text-[#5B6AD0] dark:bg-[#5B6AD0]/25 dark:text-[#8E9DF5] font-extrabold'
                            : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-[#252523]/50'
                      }`}>
                        {/* Month indicator on day 1 (e.g. Jul 1) */}
                        {isCalendarExpanded && isFirstDayOfMonth(day.dateString) && (
                          <span className={`text-[8px] font-extrabold uppercase leading-none mb-0.5 ${isSelected ? 'text-white/85' : 'text-[#5B6AD0] dark:text-[#8E9DF5]'}`}>
                            {getShortMonthName(day.dateString)}
                          </span>
                        )}
                        <span className={(isCalendarExpanded && isFirstDayOfMonth(day.dateString)) ? 'text-[11px] font-bold leading-none' : 'text-sm'}>
                          {day.dayNum}
                        </span>
                      </span>
                      {/* Small event indicator dot */}
                      <span className={`w-1 h-1 rounded-full mt-1.5 transition-all ${
                        hasEvents
                          ? isSelected 
                            ? 'bg-[#5B6AD0]' 
                            : 'bg-[#5B6AD0]/65 dark:bg-[#8E9DF5]/85'
                          : 'bg-transparent'
                      }`} />
                    </div>
                  </button>
                );
              })}
            </AnimatePresence>
          </motion.div>
          
          {/* Bottom sheet pull handle / pill indicator (drag or click to toggle) */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.1 }}
            onDragEnd={(e, info) => {
              if (info.offset.y < -15) {
                setIsCalendarExpanded(false);
              } else if (info.offset.y > 15) {
                setIsCalendarExpanded(true);
              }
            }}
            onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
            className="py-3.5 cursor-row-resize shrink-0 active:scale-95 transition-transform flex justify-center items-center group/handle"
            title={isCalendarExpanded ? "Drag up or click to collapse to Week View" : "Drag down or click to expand to Month View"}
          >
            <div className="w-12 h-1.5 bg-[#D1D1D6] hover:bg-slate-400 dark:bg-[#48484A] dark:hover:bg-slate-500 rounded-full transition-colors" />
          </motion.div>
        </div>

        {/* Agenda Events Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-24 space-y-6 scrollbar-thin">
          {mobileTab === 'agenda' ? (
            getDaysFromSelectedDate(selectedMobileDate).map((day) => {
              let dayNotes = notes.filter((n) => !n.isArchived && isTaskOnDate(n, day.dateString));
              
              // Apply search filter if search is active
              if (mobileSearchTerm.trim() !== '') {
                const term = mobileSearchTerm.toLowerCase();
                dayNotes = dayNotes.filter((n) => 
                  n.title.toLowerCase().includes(term) ||
                  (n.status && n.status.toLowerCase().includes(term))
                );
              }

              return (
                <div key={`agenda-day-${day.dateString}`} className="space-y-3">
                  {/* Day title matching "22 Jun Monday" style */}
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-lg font-extrabold text-slate-800 dark:text-white tracking-tight">
                      {day.dayNum} {day.monthNameShort}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {isToday(day.dateString) ? 'Today' : isTomorrow(day.dateString) ? 'Tomorrow' : day.dayNameLong}
                    </span>
                  </div>

                  {/* Day Events */}
                  {dayNotes.length === 0 ? (
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 pl-1 py-1">No events</p>
                  ) : (
                    <div className="space-y-1">
                      {dayNotes.map((note) => (
                        <div
                          key={`mobile-note-${note.id}`}
                          onClick={() => onSelectNote(note)}
                          className="flex items-stretch py-3.5 px-2 hover:bg-[#F7F6F3]/50 dark:hover:bg-[#252523]/40 rounded-2xl transition-all cursor-pointer active:scale-[0.99] group"
                        >
                          {/* Beautiful solid purple bar */}
                          <div className="w-[3.5px] bg-[#5B6AD0] self-stretch rounded-full mr-3.5 ml-1 shrink-0" />

                          {/* Title and details block */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate max-w-full group-hover:text-[#5B6AD0] transition-colors">
                                {note.emoji && <span className="mr-1">{note.emoji}</span>}
                                {note.title || 'Untitled Task'}
                              </span>
                              {note.recurrence && note.recurrence !== 'None' && (
                                <span 
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                                    note.scheduledDate !== day.dateString
                                      ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                  }`}
                                  title={`${note.recurrence} Recurring Task`}
                                >
                                  <RefreshCw size={9} className={note.scheduledDate !== day.dateString ? "animate-spin-slow" : ""} />
                                  {note.recurrence}{note.scheduledDate !== day.dateString ? " (Projected)" : ""}
                                </span>
                              )}
                            </div>
                            {note.status && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  note.status === 'Completed' ? 'bg-[#1D3227] text-[#4ADE80]' :
                                  note.status === 'In Progress' ? 'bg-[#1E293B] text-[#38BDF8]' :
                                  'bg-slate-100 text-slate-500 dark:bg-slate-800'
                                }`}>
                                  {note.status}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            /* Single Selected Day View */
            <div className="space-y-4">
              <div className="text-slate-800 dark:text-white flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-sm font-bold">Selected Date Detail</span>
                <span className="text-xs font-bold text-[#5B6AD0]">
                  {getSafeLocalDate(selectedMobileDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Tasks list */}
              {notes.filter((n) => !n.isArchived && isTaskOnDate(n, selectedMobileDate)).length === 0 ? (
                <div className="text-center py-12 bg-slate-50/50 dark:bg-[#1E1E1C]/40 rounded-3xl p-6">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500">No events scheduled for this day</p>
                  <button
                    onClick={() => onCreateScheduledNote(selectedMobileDate)}
                    className="mt-3.5 px-4 py-2 bg-[#5B6AD0] text-white text-xs font-bold rounded-xl shadow-xs hover:scale-[1.01] transition-transform"
                  >
                    Schedule a Task
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {notes
                    .filter((n) => !n.isArchived && isTaskOnDate(n, selectedMobileDate))
                    .map((note) => (
                      <div
                        key={`day-view-note-${note.id}`}
                        onClick={() => onSelectNote(note)}
                        className="bg-slate-50 dark:bg-[#1E1E1C] border border-[#EDECE9]/40 dark:border-slate-850 p-4 rounded-2xl cursor-pointer hover:border-[#5B6AD0]/30 transition-all active:scale-[0.99] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl shrink-0">{note.emoji || '📝'}</span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-extrabold text-slate-800 dark:text-white truncate max-w-[180px]">
                                {note.title || 'Untitled Task'}
                              </h4>
                              {note.recurrence && note.recurrence !== 'None' && (
                                <span className="text-indigo-500 text-[10px] flex items-center gap-0.5 font-bold animate-pulse" title={`${note.recurrence} Recurrence`}>
                                  <RefreshCw size={8} className="animate-spin-slow" />
                                  {note.recurrence}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                              Status: {note.status || 'Not Started'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Today Button */}
        <button
          onClick={() => {
            const todayStr = getActualTodayString();
            setSelectedMobileDate(todayStr);
          }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1E1E1C] hover:bg-slate-50 dark:hover:bg-[#252523] border border-slate-200/60 dark:border-slate-800/80 px-4 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 text-xs font-bold text-[#5B6AD0] dark:text-[#8E9DF5] cursor-pointer z-20 active:scale-95"
        >
          <span className="text-sm font-semibold">↓</span>
          <span>Today</span>
        </button>

        {/* Floating Action Button '+' at the bottom-right */}
        <button
          onClick={() => onCreateScheduledNote(selectedMobileDate)}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-[#5B6AD0] hover:bg-[#4C5BB3] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer z-20"
          title="Add task for selected day"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>

      {/* STATUS OVERVIEW POPUP MODAL */}
      <AnimatePresence>
        {isStatusModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStatusModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
            >
              {/* Modal Header */}
              <div className="p-5 md:p-6 border-b border-[#EDECE9] dark:border-[#2C2C2A] flex items-center justify-between gap-4 bg-[#FAF9F5]/80 dark:bg-[#181816]/80 shrink-0">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <ListFilter size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-extrabold text-[#37352F] dark:text-white tracking-tight flex items-center gap-2">
                        Task Status Overview
                      </h2>
                      <p className="text-xs text-[#ACABA9] font-medium hidden sm:block">
                        Tasks grouped by workflow status with their latest activity and update history
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsStatusModalOpen(false)}
                  className="p-2 text-[#ACABA9] hover:text-[#37352F] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#252523] rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Filters Bar */}
              <div className="p-4 bg-white dark:bg-[#1C1C1A] border-b border-[#EDECE9] dark:border-[#2C2C2A] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                {/* Status Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none py-0.5">
                  {[
                    { key: 'all', label: 'All Tasks', count: notes.filter((n) => !n.isArchived).length },
                    { key: 'In Progress', label: 'In Progress', count: notes.filter((n) => !n.isArchived && n.status === 'In Progress').length },
                    { key: 'Not Started', label: 'Not Started', count: notes.filter((n) => !n.isArchived && (!n.status || n.status === 'Not Started')).length },
                    { key: 'Hold', label: 'Hold', count: notes.filter((n) => !n.isArchived && n.status === 'Hold').length },
                    {
                      key: 'Completed',
                      label: 'Completed',
                      count: notes.filter((n) => !n.isArchived && n.status === 'Completed' && isTaskInCompletedPreset(n, completedPreset)).length,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setStatusModalFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        statusModalFilter === tab.key
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-[#252523] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2F2F2C]'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
                          statusModalFilter === tab.key
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search Box in Modal */}
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ACABA9]" />
                  <input
                    type="text"
                    placeholder="Search task or update..."
                    value={statusModalSearch}
                    onChange={(e) => setStatusModalSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#252523] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-xl text-xs text-[#37352F] dark:text-white placeholder-[#ACABA9] focus:outline-none focus:border-indigo-500"
                  />
                  {statusModalSearch && (
                    <button
                      onClick={() => setStatusModalSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#ACABA9] hover:text-[#37352F] dark:hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Date Presets Filter for Completed View */}
              {statusModalFilter === 'Completed' && (
                <div className="px-5 py-2.5 bg-[#F9F8F6] dark:bg-[#20201E] border-b border-[#EDECE9] dark:border-[#2C2C2A] flex items-center gap-3 shrink-0 animate-in fade-in duration-200">
                  <span className="font-extrabold text-[#37352F] dark:text-white flex items-center gap-1.5 text-xs mr-1">
                    <CalendarRange size={15} className="text-emerald-500" />
                    Completed Timeframe:
                  </span>

                  <div className="flex items-center gap-1 bg-white dark:bg-[#181816] p-1 rounded-xl border border-[#EDECE9] dark:border-[#2C2C2A]">
                    <button
                      type="button"
                      onClick={() => setCompletedPreset('all')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        completedPreset === 'all'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#252523]'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompletedPreset('last_15')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        completedPreset === 'last_15'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#252523]'
                      }`}
                    >
                      Last 15 days
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompletedPreset('last_30')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        completedPreset === 'last_30'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#252523]'
                      }`}
                    >
                      Last 30 days
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Content Area (Grouped List) */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
                {['In Progress', 'Not Started', 'Hold', 'Completed']
                  .filter((st) => statusModalFilter === 'all' || statusModalFilter === st)
                  .map((statusGroup) => {
                    let groupTasks = notes.filter((n) => {
                      if (n.isArchived) return false;
                      const taskStatus = n.status || 'Not Started';
                      return taskStatus === statusGroup;
                    });

                    if (statusGroup === 'Completed') {
                      groupTasks = groupTasks.filter((n) => isTaskInCompletedPreset(n, completedPreset));
                    }

                    if (statusModalSearch.trim() !== '') {
                      const searchLower = statusModalSearch.toLowerCase();
                      groupTasks = groupTasks.filter((n) => {
                        const titleMatch = n.title?.toLowerCase().includes(searchLower);
                        const assigneeMatch = n.assignee?.toLowerCase().includes(searchLower);
                        const updatesMatch = n.updates?.some(
                          (u) => u.note?.toLowerCase().includes(searchLower) || u.updateFrom?.toLowerCase().includes(searchLower)
                        );
                        return titleMatch || assigneeMatch || updatesMatch;
                      });
                    }

                    const statusMeta = {
                      'In Progress': {
                        label: 'In Progress',
                        bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
                        dot: 'bg-sky-500',
                        icon: Play
                      },
                      'Not Started': {
                        label: 'Not Started',
                        bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                        dot: 'bg-amber-500',
                        icon: Clock
                      },
                      'Hold': {
                        label: 'Hold',
                        bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
                        dot: 'bg-purple-500',
                        icon: PauseCircle
                      },
                      'Completed': {
                        label: 'Completed',
                        bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                        dot: 'bg-emerald-500',
                        icon: CheckCircle2
                      }
                    }[statusGroup] || {
                      label: statusGroup,
                      bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
                      dot: 'bg-slate-500',
                      icon: Circle
                    };

                    const IconComp = statusMeta.icon;

                    return (
                      <div key={statusGroup} className="space-y-3">
                        {/* Status Group Banner */}
                        <div className="flex items-center justify-between pb-2 border-b border-[#EDECE9] dark:border-[#2C2C2A]">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${statusMeta.dot}`} />
                            <IconComp size={15} className="text-[#37352F] dark:text-white" />
                            <h3 className="text-sm font-extrabold text-[#37352F] dark:text-white tracking-tight">
                              {statusMeta.label}
                            </h3>
                            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${statusMeta.bg}`}>
                              {groupTasks.length} {groupTasks.length === 1 ? 'task' : 'tasks'}
                            </span>
                          </div>
                        </div>

                        {/* Task Cards List */}
                        {groupTasks.length === 0 ? (
                          <div className="p-4 text-center bg-slate-50/50 dark:bg-[#222220]/40 rounded-2xl border border-dashed border-[#EDECE9] dark:border-[#2C2C2A]">
                            <p className="text-xs font-semibold text-[#ACABA9]">
                              No tasks found in {statusMeta.label}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {groupTasks.map((note) => {
                              const latestUpdate = note.updates && note.updates.length > 0 
                                ? note.updates[note.updates.length - 1] 
                                : null;

                              return (
                                <div
                                  key={`status-card-${note.id}`}
                                  onClick={() => {
                                    onSelectNote(note);
                                    setIsStatusModalOpen(false);
                                  }}
                                  className="p-4 bg-white dark:bg-[#222220] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl shadow-xs hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 group/card"
                                >
                                  {/* Card Top Row: Emoji, Title & Priority */}
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-lg shrink-0">{note.emoji || '📝'}</span>
                                        <h4 className="text-xs font-extrabold text-[#37352F] dark:text-white group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors truncate">
                                          {note.title || 'Untitled Task'}
                                        </h4>
                                      </div>
                                      {note.priority && (
                                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                                          note.priority === 'High' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
                                          note.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                                          'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                                        }`}>
                                          {note.priority}
                                        </span>
                                      )}
                                    </div>

                                    {/* Dates & Assignee Info */}
                                    <div className="flex items-center gap-2 flex-wrap text-[10px] font-semibold text-[#ACABA9]">
                                      {(note.scheduledDate || note.dueDate) && (
                                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A1A18] px-2 py-0.5 rounded-md">
                                          <CalendarIcon size={11} className="text-indigo-500" />
                                          <span>{note.scheduledDate || note.dueDate}</span>
                                        </span>
                                      )}
                                      {note.assignee && (
                                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A1A18] px-2 py-0.5 rounded-md">
                                          <User size={11} className="text-emerald-500" />
                                          <span>{note.assignee}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Card Bottom Box: Last Updates Section */}
                                  <div className="p-3 bg-slate-50 dark:bg-[#181816] border border-[#EDECE9]/80 dark:border-[#2C2C2A] rounded-xl space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px] font-extrabold text-[#37352F] dark:text-white uppercase tracking-wider">
                                      <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                                        <Activity size={11} />
                                        <span>Last Update</span>
                                      </span>
                                      <span className="text-[9px] font-medium text-[#ACABA9] lowercase">
                                        {formatLastUpdated(note.updatedAt)}
                                      </span>
                                    </div>

                                    {latestUpdate ? (
                                      <div className="space-y-1">
                                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed italic">
                                          "{latestUpdate.note}"
                                        </p>
                                        <div className="flex items-center justify-between text-[9px] text-[#ACABA9] font-semibold pt-0.5">
                                          <span>Update #{latestUpdate.number} by {latestUpdate.updateFrom || 'Team'}</span>
                                          <span>{latestUpdate.date}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-[#ACABA9] font-medium italic">
                                        No status update logs logged yet. Last saved on {formatLastUpdated(note.updatedAt)}.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-[#FAF9F5]/80 dark:bg-[#181816]/80 border-t border-[#EDECE9] dark:border-[#2C2C2A] flex items-center justify-between text-xs text-[#ACABA9] shrink-0">
                <span className="font-medium">
                  Showing {notes.filter((n) => !n.isArchived).length} total workspace tasks
                </span>
                <button
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-[#252523] dark:hover:bg-[#2F2F2C] text-slate-800 dark:text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

