import React, { useEffect, useRef, useState } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  CheckSquare,
  Quote,
  Code,
  AlertCircle,
  Image,
  Type,
} from 'lucide-react';
import { BlockType } from '../types';

interface CommandItem {
  type: BlockType;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
}

const COMMANDS: CommandItem[] = [
  { type: 'text', label: 'Text', description: 'Start writing with plain text', icon: Type },
  { type: 'h1', label: 'Heading 1', description: 'Large section heading', icon: Heading1 },
  { type: 'h2', label: 'Heading 2', description: 'Medium section heading', icon: Heading2 },
  { type: 'h3', label: 'Heading 3', description: 'Small section heading', icon: Heading3 },
  { type: 'bullet', label: 'Bullet list', description: 'Create a simple bulleted list', icon: List },
  { type: 'todo', label: 'To-do list', description: 'Track tasks with a to-do list', icon: CheckSquare },
  { type: 'quote', label: 'Quote', description: 'Capture a quote block', icon: Quote },
  { type: 'code', label: 'Code', description: 'Write a code snippet', icon: Code },
  { type: 'callout', label: 'Callout', description: 'Make writing stand out with emoji', icon: AlertCircle },
  { type: 'image', label: 'Image', description: 'Embed an image with a URL', icon: Image },
];

interface CommandMenuProps {
  onSelect: (type: BlockType) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
}

export default function CommandMenu({ onSelect, onClose, anchorRect }: CommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Close menu if clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  // Handle keyboard navigation in menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % COMMANDS.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + COMMANDS.length) % COMMANDS.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(COMMANDS[selectedIndex].type);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedIndex, onSelect, onClose]);

  if (!anchorRect) return null;

  // Position the menu below the anchor element
  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${anchorRect.bottom + window.scrollY + 4}px`,
    left: `${anchorRect.left + window.scrollX}px`,
  };

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      id="slash-command-menu"
      className="w-72 max-h-80 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 py-2 scrollbar-thin"
    >
      <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        Basic blocks
      </div>
      {COMMANDS.map((cmd, idx) => {
        const Icon = cmd.icon;
        const isSelected = idx === selectedIndex;
        return (
          <button
            key={cmd.type}
            onClick={() => onSelect(cmd.type)}
            className={`w-full flex items-center px-3 py-2 text-left transition-colors cursor-pointer ${
              isSelected
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <div
              className={`p-1.5 rounded-md mr-3 ${
                isSelected
                  ? 'bg-white dark:bg-slate-700 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800'
              }`}
            >
              <Icon size={16} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium leading-none mb-0.5">{cmd.label}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500 truncate">
                {cmd.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
