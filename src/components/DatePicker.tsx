import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  Check
} from 'lucide-react';

export interface DatePickerProps {
  value: string | null | undefined; // Format: 'YYYY-MM-DD'
  onChange: (date: string | null) => void;
  label?: string;
  iconType?: 'calendar' | 'clock' | 'none';
  iconColor?: string;
  placeholder?: string;
  variant?: 'toolbar' | 'field' | 'compact';
  className?: string;
  align?: 'left' | 'right';
  minDate?: string;
  maxDate?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Helper to format Date to YYYY-MM-DD
export const formatYMD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse YYYY-MM-DD into a local Date
export const parseYMD = (dateString: string): Date | null => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function DatePicker({
  value,
  onChange,
  label,
  iconType = 'calendar',
  iconColor,
  placeholder = 'Pick date',
  variant = 'toolbar',
  className = '',
  align = 'left',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse initial view date
  const parsedValue = value ? parseYMD(value) : null;
  const initialDate = parsedValue || new Date();

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-11
  const [typedInput, setTypedInput] = useState<string>(value || '');
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Keep view synchronized with external value changes
  useEffect(() => {
    if (value && parseYMD(value)) {
      const d = parseYMD(value)!;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setTypedInput(value);
    } else {
      setTypedInput('');
    }
  }, [value]);

  // Position calculation with automatic viewport boundary detection
  const calculatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 288;
    const popoverHeight = 350;

    // Check space below vs above
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + 6;
    if (spaceBelow < popoverHeight && spaceAbove >= popoverHeight) {
      // Flip upwards if not enough room below
      top = rect.top - popoverHeight - 6;
    } else if (spaceBelow < popoverHeight && spaceAbove < popoverHeight) {
      // If neither has full room, center or clamp within screen
      top = Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - popoverHeight - 12));
    }

    let left = align === 'right' ? rect.right - popoverWidth : rect.left;
    // Boundary clamp left & right
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    setCoords({ top, left });
  };

  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      const handleReposition = () => calculatePosition();
      window.addEventListener('resize', handleReposition);
      window.addEventListener('scroll', handleReposition, true);
      return () => {
        window.removeEventListener('resize', handleReposition);
        window.removeEventListener('scroll', handleReposition, true);
      };
    }
  }, [isOpen, align]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const ymd = formatYMD(d);
    onChange(ymd);
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange(null);
    setIsOpen(false);
  };

  const handleQuickPreset = (preset: 'today' | 'tomorrow' | 'next_week' | 'in_2_weeks') => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (preset === 'today') {
      // today
    } else if (preset === 'tomorrow') {
      target.setDate(target.getDate() + 1);
    } else if (preset === 'next_week') {
      target.setDate(target.getDate() + 7);
    } else if (preset === 'in_2_weeks') {
      target.setDate(target.getDate() + 14);
    }

    const ymd = formatYMD(target);
    onChange(ymd);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setIsOpen(false);
  };

  const handleManualApply = () => {
    const trimmed = typedInput.trim();
    if (!trimmed) {
      handleClear();
      return;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = parseYMD(trimmed);
      if (d && !isNaN(d.getTime())) {
        onChange(trimmed);
        setIsOpen(false);
        return;
      }
    }
  };

  // Generate calendar grid matrix
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const todayYMD = formatYMD(new Date());

  const getDisplayLabel = () => {
    if (!value) return placeholder;
    const today = new Date();
    const todayStr = formatYMD(today);
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const tomorrowStr = formatYMD(tomorrow);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const yesterdayStr = formatYMD(yesterday);

    if (value === todayStr) return 'Today';
    if (value === tomorrowStr) return 'Tomorrow';
    if (value === yesterdayStr) return 'Yesterday';
    return value;
  };

  // Render Icon
  const renderIcon = () => {
    if (iconType === 'clock') {
      return <Clock size={13} className={iconColor || 'text-amber-500'} />;
    }
    if (iconType === 'calendar') {
      return <CalendarIcon size={13} className={iconColor || 'text-[#2383E2]'} />;
    }
    return null;
  };

  // Year options for dropdown
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 20 }, (_, i) => currentYear - 5 + i);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      {variant === 'toolbar' && (
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none ${
            value
              ? 'bg-white dark:bg-[#20201E] border-[#EDECE9] dark:border-[#2C2C2A] text-[#37352F] dark:text-[#E3E3E2] shadow-2xs hover:border-[#2383E2] dark:hover:border-[#2383E2]'
              : 'bg-[#F7F6F3] dark:bg-[#252523] border-[#EDECE9] dark:border-[#2C2C2A] text-[#ACABA9] hover:text-[#37352F] dark:hover:text-[#E3E3E2]'
          } ${isOpen ? 'ring-2 ring-[#2383E2]/30 border-[#2383E2]' : ''}`}
        >
          {renderIcon()}
          {label && (
            <span className="text-xs font-semibold text-[#ACABA9] dark:text-[#888886]">
              {label}
            </span>
          )}
          <span className="text-xs font-semibold">
            {getDisplayLabel()}
          </span>

          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-0.5 p-0.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[#ACABA9] hover:text-rose-600 transition-colors"
              title="Clear date"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {variant === 'field' && (
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white dark:bg-[#20201E] border rounded-xl cursor-pointer transition-all ${
            isOpen ? 'border-[#2383E2] ring-1 ring-[#2383E2]' : 'border-[#EDECE9] dark:border-[#2C2C2A] hover:border-[#ACABA9] dark:hover:border-[#3E3E3C]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {renderIcon()}
            {label && (
              <span className="text-xs font-semibold text-[#ACABA9] dark:text-[#888886]">
                {label}
              </span>
            )}
            <span className={`text-xs font-semibold truncate ${value ? 'text-[#37352F] dark:text-[#E3E3E2]' : 'text-[#ACABA9] dark:text-[#666664]'}`}>
              {getDisplayLabel()}
            </span>
          </div>

          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[#ACABA9] hover:text-rose-600 transition-colors"
              title="Clear date"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {variant === 'compact' && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            value
              ? 'bg-[#E3F2FD] dark:bg-[#1E3A5F]/40 border-blue-200 dark:border-blue-900/40 text-[#2383E2]'
              : 'bg-[#F7F6F3] dark:bg-[#252523] border-[#EDECE9] dark:border-[#2C2C2A] text-[#ACABA9] hover:text-[#37352F] dark:hover:text-[#E3E3E2]'
          } ${isOpen ? 'ring-2 ring-[#2383E2]/30' : ''}`}
        >
          {renderIcon()}
          <span>{value || placeholder}</span>
          {value && (
            <span
              onClick={handleClear}
              className="hover:text-rose-600 transition-colors"
            >
              <X size={11} />
            </span>
          )}
        </button>
      )}

      {/* Popover Dropdown Calendar via Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 99999,
          }}
          className="w-72 bg-white dark:bg-[#1E1E1C] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl shadow-2xl p-3.5 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick Presets Row */}
          <div className="flex items-center gap-1 pb-3 mb-3 border-b border-[#EDECE9] dark:border-[#2C2C2A] overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => handleQuickPreset('today')}
              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-[#F7F6F3] dark:bg-[#252523] hover:bg-[#2383E2] hover:text-white text-[#37352F] dark:text-[#E3E3E2] transition-colors whitespace-nowrap cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset('tomorrow')}
              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-[#F7F6F3] dark:bg-[#252523] hover:bg-[#2383E2] hover:text-white text-[#37352F] dark:text-[#E3E3E2] transition-colors whitespace-nowrap cursor-pointer"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset('next_week')}
              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-[#F7F6F3] dark:bg-[#252523] hover:bg-[#2383E2] hover:text-white text-[#37352F] dark:text-[#E3E3E2] transition-colors whitespace-nowrap cursor-pointer"
            >
              +7 Days
            </button>
            {value && (
              <button
                type="button"
                onClick={() => handleClear()}
                className="px-2 py-1 text-[11px] font-bold rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors whitespace-nowrap ml-auto cursor-pointer flex items-center gap-1"
                title="Clear date"
              >
                <RotateCcw size={10} />
                Clear
              </button>
            )}
          </div>

          {/* Month / Year Navigator */}
          <div className="flex items-center justify-between gap-1 mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-[#F7F6F3] dark:hover:bg-[#2C2C2A] text-[#787774] dark:text-[#9B9A97] transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1 text-xs font-bold text-[#37352F] dark:text-[#E3E3E2]">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-transparent font-bold cursor-pointer outline-none hover:text-[#2383E2] focus:ring-0 p-0 text-xs"
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index} className="bg-white dark:bg-[#1E1E1C] text-[#37352F] dark:text-white">
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-transparent font-bold cursor-pointer outline-none hover:text-[#2383E2] focus:ring-0 p-0 text-xs"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-[#1E1E1C] text-[#37352F] dark:text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-[#F7F6F3] dark:hover:bg-[#2C2C2A] text-[#787774] dark:text-[#9B9A97] transition-colors cursor-pointer"
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} className="text-[10px] font-extrabold text-[#ACABA9] dark:text-[#888886]">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Previous month filler days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayIndex + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="h-7 flex items-center justify-center text-[11px] text-[#D3D2CE] dark:text-[#4A4A46] select-none"
                >
                  {dayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = value === dateStr;
              const isToday = todayYMD === dateStr;

              return (
                <button
                  type="button"
                  key={`curr-${dayNum}`}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-7 w-7 mx-auto rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#2383E2] text-white font-bold shadow-xs scale-105'
                      : isToday && !isSelected
                      ? 'bg-[#E3F2FD] dark:bg-[#1E3A5F]/50 text-[#2383E2] dark:text-blue-300 font-black ring-1 ring-[#2383E2]'
                      : 'text-[#37352F] dark:text-[#E3E3E2] hover:bg-[#F7F6F3] dark:hover:bg-[#2A2A28]'
                  }`}
                >
                  {dayNum}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#2383E2]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Manual Input Footer */}
          <div className="mt-3 pt-2.5 border-t border-[#EDECE9] dark:border-[#2C2C2A] flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleManualApply();
              }}
              placeholder="YYYY-MM-DD"
              className="flex-1 px-2 py-1 text-xs bg-[#F7F6F3] dark:bg-[#252523] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-lg outline-none text-[#37352F] dark:text-[#E3E3E2] font-semibold"
            />
            <button
              type="button"
              onClick={handleManualApply}
              className="px-2.5 py-1 text-xs font-bold bg-[#2383E2] text-white rounded-lg hover:bg-[#1C69B5] transition-colors cursor-pointer flex items-center gap-1"
            >
              <Check size={12} />
              Set
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
