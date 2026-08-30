import React, { useState } from 'react';

const EMOJI_LIST = [
  '📝', '💡', '🚀', '📅', '🎯', '🎨', '✍️', '📂', '🏠', '💻',
  '🧠', '⭐️', '🍀', '🔥', '🌈', '🔒', '🎵', '🍿', '🍔', '✈️',
  '❤️', '🎉', '🌟', '🛠️', '📖', '📌', '🔮', '💭', '🔋', '🏆',
  '🗺️', '🌿', '🌊', '☀️', '🌙', '☕', '💼', '🛒', '🚲', '👾'
];

interface EmojiPickerProps {
  currentEmoji: string;
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ currentEmoji, onSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        id="emoji-picker-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="text-4xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        title="Change icon"
      >
        {currentEmoji}
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close picker */}
          <div
            id="emoji-picker-backdrop"
            className="fixed inset-0 z-50"
            onClick={() => setIsOpen(false)}
          />
          <div
            id="emoji-picker-popover"
            className="absolute left-0 mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 w-64"
          >
            <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
              Popular Icons
            </h4>
            <div className="grid grid-cols-5 gap-1 max-h-48 overflow-y-auto pr-1">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSelect(emoji);
                    setIsOpen(false);
                  }}
                  className={`text-2xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all duration-150 cursor-pointer hover:scale-110 ${
                    currentEmoji === emoji ? 'bg-slate-100 dark:bg-slate-800' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
