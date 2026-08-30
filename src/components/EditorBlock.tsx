import React, { useEffect, useRef, useState } from 'react';
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  CheckSquare,
  AlertCircle,
  Code,
  Image as ImageIcon,
  CopyPlus,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  Quote,
  MessageSquare,
  Check,
} from 'lucide-react';
import { Block, BlockType } from '../types';

interface EditorBlockProps {
  key?: React.Key;
  block: Block;
  index: number;
  focusedBlockId: string | null;
  isSelected?: boolean;
  selectedCount?: number;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (content: string, properties?: any) => void;
  onTypeChange: (type: BlockType) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onAddBlock: () => void;
  onDeleteBlock: () => void;
  onDuplicateBlock?: () => void;
  onPasteMultiLine?: (text: string) => void;
  onMouseDownBlock?: (e: React.MouseEvent) => void;
  onMouseEnterBlock?: () => void;
  onBatchCopy?: () => void;
  onBatchCut?: () => void;
  onBatchDelete?: () => void;
  onBatchDuplicate?: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver: boolean;
  onTriggerSlash: (rect: DOMRect | null) => void;
}

export default function EditorBlock({
  block,
  index,
  focusedBlockId,
  isSelected = false,
  selectedCount = 0,
  onFocus,
  onBlur,
  onChange,
  onTypeChange,
  onKeyDown,
  onAddBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onPasteMultiLine,
  onMouseDownBlock,
  onMouseEnterBlock,
  onBatchCopy,
  onBatchCut,
  onBatchDelete,
  onBatchDuplicate,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragOver,
  onTriggerSlash,
}: EditorBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const isFocused = focusedBlockId === block.id;

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [block.content, block.type]);

  // Focus block if it should be focused
  useEffect(() => {
    if (isFocused && textareaRef.current) {
      if (document.activeElement !== textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [isFocused]);

  // Close custom context menu on outside click
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
    };
    if (contextMenu) {
      window.addEventListener('click', handleGlobalClick);
      return () => window.removeEventListener('click', handleGlobalClick);
    }
  }, [contextMenu]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;

    // Check for markdown block conversions on the fly
    if (val === '# ') {
      onTypeChange('h1');
      onChange('');
      return;
    }
    if (val === '## ') {
      onTypeChange('h2');
      onChange('');
      return;
    }
    if (val === '### ') {
      onTypeChange('h3');
      onChange('');
      return;
    }
    if (val === '* ' || val === '- ') {
      onTypeChange('bullet');
      onChange('');
      return;
    }
    if (val === '[] ' || val === '- [ ] ') {
      onTypeChange('todo');
      onChange('');
      return;
    }
    if (val === '> ') {
      onTypeChange('quote');
      onChange('');
      return;
    }
    if (val === '```') {
      onTypeChange('code');
      onChange('');
      return;
    }
    if (val === '/callout') {
      onTypeChange('callout');
      onChange('');
      return;
    }

    onChange(val, block.properties);

    // If typing ends with "/", trigger the slash command menu
    if (val.endsWith('/')) {
      const rect = textareaRef.current?.getBoundingClientRect();
      if (rect) {
        onTriggerSlash(rect);
      }
    } else {
      onTriggerSlash(null);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text/plain');
    if (pastedText && pastedText.includes('\n') && onPasteMultiLine) {
      e.preventDefault();
      onPasteMultiLine(pastedText);
    }
  };

  const handleCheckboxToggle = () => {
    onChange(block.content, {
      ...block.properties,
      checked: !block.properties?.checked,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value, block.properties);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // Shift + Right click opens native browser context menu
    if (e.shiftKey) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Context menu actions
  const handleCopyText = async () => {
    const textarea = textareaRef.current;
    let selectedText = '';
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      selectedText = start !== end ? textarea.value.substring(start, end) : textarea.value;
    } else {
      selectedText = block.content;
    }
    if (selectedText) {
      try {
        await navigator.clipboard.writeText(selectedText);
      } catch (err) {
        console.warn('Clipboard write error:', err);
      }
    }
    setContextMenu(null);
  };

  const handleCutText = async () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const selectedText = start !== end ? val.substring(start, end) : val;
      if (selectedText) {
        try {
          await navigator.clipboard.writeText(selectedText);
        } catch (err) {
          console.warn('Clipboard write error:', err);
        }
        if (start !== end) {
          const newVal = val.substring(0, start) + val.substring(end);
          onChange(newVal, block.properties);
        } else {
          onChange('', block.properties);
        }
      }
    }
    setContextMenu(null);
  };

  const handlePasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (text.includes('\n') && onPasteMultiLine) {
          onPasteMultiLine(text);
        } else {
          const textarea = textareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const val = textarea.value;
            const newVal = val.substring(0, start) + text + val.substring(end);
            onChange(newVal, block.properties);
          } else {
            onChange(block.content + text, block.properties);
          }
        }
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
    setContextMenu(null);
  };

  const handleSelectAllText = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
    setContextMenu(null);
  };

  const handleClearText = () => {
    onChange('', block.properties);
    setContextMenu(null);
  };

  // Base styling for blocks
  const getBlockStyles = (): string => {
    switch (block.type) {
      case 'h1':
        return 'text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-4 mb-1';
      case 'h2':
        return 'text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mt-3 mb-1';
      case 'h3':
        return 'text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 mt-2 mb-1';
      case 'quote':
        return 'border-l-4 border-indigo-400 dark:border-indigo-600 pl-4 italic text-slate-600 dark:text-slate-300 py-1 my-1 text-base';
      case 'code':
        return 'font-mono text-xs bg-slate-100 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 w-full my-1';
      case 'callout':
        return 'flex items-start gap-3 bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100/60 dark:border-indigo-900/40 rounded-xl p-3.5 my-1';
      case 'bullet':
        return 'pl-1 flex items-start gap-2.5';
      default:
        return 'text-slate-800 dark:text-slate-200 text-sm md:text-base leading-relaxed';
    }
  };

  return (
    <div
      ref={blockRef}
      onMouseEnter={() => {
        setIsHovered(true);
        if (onMouseEnterBlock) onMouseEnterBlock();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowOptions(false);
      }}
      onMouseDown={(e) => {
        if (onMouseDownBlock) onMouseDownBlock(e);
      }}
      onContextMenu={handleContextMenu}
      className={`group relative flex items-start gap-2 py-1 px-2 rounded-xl transition-all duration-150 ${
        isDragOver ? 'border-t-2 border-indigo-500 bg-indigo-50/20' : ''
      } ${
        isSelected
          ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700/60 ring-1 ring-indigo-400/30'
          : isFocused
          ? 'bg-slate-50/60 dark:bg-slate-900/20'
          : 'hover:bg-slate-50/40 dark:hover:bg-slate-900/10'
      }`}
    >
      {/* Block controls sidebar (Hover State) */}
      <div
        id={`block-controls-${block.id}`}
        className={`absolute -left-12 top-1 flex items-center gap-0.5 transition-opacity duration-200 z-10 ${
          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={onAddBlock}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition-colors"
          title="Add block below"
        >
          <Plus size={16} />
        </button>
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={() => setShowOptions(!showOptions)}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing transition-colors relative"
          title="Drag to reorder / Click for options"
        >
          <GripVertical size={16} />

          {/* Quick Block Action Options */}
          {showOptions && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
              <div
                id={`block-actions-${block.id}`}
                className="absolute left-6 top-0 bg-white dark:bg-[#1A1A18] border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-1.5 z-50 w-48 flex flex-col gap-0.5"
              >
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2.5 py-1">
                  Actions
                </div>
                {onDuplicateBlock && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateBlock();
                      setShowOptions(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-left w-full cursor-pointer font-medium"
                  >
                    <CopyPlus size={13} className="text-indigo-500" />
                    Duplicate block
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteBlock();
                    setShowOptions(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md text-left w-full cursor-pointer font-medium"
                >
                  <Trash2 size={13} />
                  Delete block
                </button>
                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2.5 py-1">
                  Turn into
                </div>
                {(['text', 'h1', 'h2', 'h3', 'bullet', 'todo', 'quote', 'code', 'callout'] as BlockType[]).map((t) => (
                  <button
                    key={t}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTypeChange(t);
                      setShowOptions(false);
                    }}
                    className={`px-2.5 py-1 text-left text-xs capitalize rounded-md transition-colors flex items-center justify-between ${
                      block.type === t
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{t === 'text' ? 'Text' : t === 'bullet' ? 'Bullet list' : t === 'todo' ? 'To-do list' : t}</span>
                    {block.type === t && <Check size={12} />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actual Block Content */}
      <div className={`flex-1 w-full ${getBlockStyles()}`}>
        {block.type === 'todo' && (
          <div className="flex items-start gap-2.5 w-full pt-0.5">
            <input
              type="checkbox"
              checked={!!block.properties?.checked}
              onChange={handleCheckboxToggle}
              className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 cursor-pointer shrink-0"
            />
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={block.content}
                onChange={handleTextChange}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
                onPaste={handlePaste}
                placeholder="To-do list item"
                className={`w-full bg-transparent border-0 outline-none p-0 resize-none overflow-hidden placeholder-slate-300 dark:placeholder-slate-700 text-slate-800 dark:text-slate-200 ${
                  block.properties?.checked ? 'line-through text-slate-400 dark:text-slate-500' : ''
                }`}
                rows={1}
              />
            </div>
          </div>
        )}

        {block.type === 'bullet' && (
          <div className="flex items-start gap-2.5 w-full">
            <span className="text-slate-400 select-none pt-0.5 shrink-0">•</span>
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={block.content}
                onChange={handleTextChange}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
                onPaste={handlePaste}
                placeholder="List item"
                className="w-full bg-transparent border-0 outline-none p-0 resize-none overflow-hidden placeholder-slate-300 dark:placeholder-slate-700 text-slate-800 dark:text-slate-200"
                rows={1}
              />
            </div>
          </div>
        )}

        {block.type === 'callout' && (
          <div className="flex items-start gap-3 w-full">
            <span className="text-xl pt-0.5 select-none shrink-0">{block.properties?.emoji || '💡'}</span>
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={block.content}
                onChange={handleTextChange}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
                onPaste={handlePaste}
                placeholder="Callout info..."
                className="w-full bg-transparent border-0 outline-none p-0 resize-none overflow-hidden placeholder-slate-400 dark:placeholder-slate-600 text-slate-800 dark:text-slate-100"
                rows={1}
              />
            </div>
          </div>
        )}

        {block.type === 'image' && (
          <div className="w-full my-2">
            <div className="bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-full text-indigo-500">
                  <ImageIcon size={20} />
                </div>
                <input
                  type="text"
                  value={block.content}
                  onChange={handleImageChange}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="Paste image URL..."
                  className="w-full max-w-md px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none shadow-xs text-slate-800 dark:text-slate-200"
                />
                {block.content && (
                  <img
                    src={block.content}
                    alt={block.properties?.caption || 'Embedded asset'}
                    className="mt-2 max-h-60 rounded-lg object-contain shadow-xs border border-slate-200 dark:border-slate-800"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800';
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Standard text blocks: text, h1, h2, h3, quote, code */}
        {block.type !== 'todo' && block.type !== 'bullet' && block.type !== 'callout' && block.type !== 'image' && (
          <div className="w-full">
            <textarea
              ref={textareaRef}
              value={block.content}
              onChange={handleTextChange}
              onKeyDown={onKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
              onPaste={handlePaste}
              placeholder={
                block.type === 'h1'
                  ? 'Heading 1'
                  : block.type === 'h2'
                  ? 'Heading 2'
                  : block.type === 'h3'
                  ? 'Heading 3'
                  : block.type === 'quote'
                  ? 'Quote'
                  : block.type === 'code'
                  ? '// Enter code here...'
                  : "Type '/' for commands, or write text..."
              }
              className={`w-full bg-transparent border-0 outline-none p-0 resize-none overflow-hidden placeholder-slate-300 dark:placeholder-slate-700 text-slate-800 dark:text-slate-100 ${
                block.type === 'code' ? 'font-mono text-xs leading-relaxed text-rose-600 dark:text-rose-400' : ''
              }`}
              rows={1}
            />
          </div>
        )}
      </div>

      {/* Floating Custom Right-Click Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-[#1A1A18] border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-1.5 z-50 min-w-[220px] animate-in fade-in zoom-in-95 duration-100 select-none"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {isSelected && selectedCount > 1 ? (
            <>
              <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
                <span>Multi-Block Selection</span>
                <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[9px] font-mono">
                  {selectedCount} blocks
                </span>
              </div>

              {onBatchCopy && (
                <button
                  onClick={() => {
                    onBatchCopy();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer font-medium"
                >
                  <div className="flex items-center gap-2">
                    <Copy size={14} className="text-indigo-500" />
                    <span>Copy ({selectedCount} blocks)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
                </button>
              )}

              {onBatchCut && (
                <button
                  onClick={() => {
                    onBatchCut();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer font-medium"
                >
                  <div className="flex items-center gap-2">
                    <Scissors size={14} className="text-amber-500" />
                    <span>Cut ({selectedCount} blocks)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+X</span>
                </button>
              )}

              {onBatchDuplicate && (
                <button
                  onClick={() => {
                    onBatchDuplicate();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer font-medium"
                >
                  <CopyPlus size={14} className="text-purple-500" />
                  <span>Duplicate ({selectedCount} blocks)</span>
                </button>
              )}

              {onBatchDelete && (
                <button
                  onClick={() => {
                    onBatchDelete();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-left cursor-pointer font-bold"
                >
                  <Trash2 size={14} className="text-rose-500" />
                  <span>Delete ({selectedCount} blocks)</span>
                </button>
              )}
            </>
          ) : (
            <>
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 py-1 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                Block & Text Options
              </div>

              <button
                onClick={handleCopyText}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer font-medium"
              >
                <div className="flex items-center gap-2">
                  <Copy size={14} className="text-indigo-500" />
                  <span>Copy</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
              </button>

              <button
                onClick={handleCutText}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer font-medium"
              >
                <div className="flex items-center gap-2">
                  <Scissors size={14} className="text-amber-500" />
                  <span>Cut</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+X</span>
              </button>

              <button
                onClick={handlePasteText}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer font-medium"
              >
                <div className="flex items-center gap-2">
                  <Clipboard size={14} className="text-emerald-500" />
                  <span>Paste</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+V</span>
              </button>

              <button
                onClick={handleSelectAllText}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer font-medium"
              >
                <div className="flex items-center gap-2">
                  <Type size={14} className="text-blue-500" />
                  <span>Select All Text</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+A</span>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

              {onDuplicateBlock && (
                <button
                  onClick={() => {
                    onDuplicateBlock();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer font-medium"
                >
                  <CopyPlus size={14} className="text-purple-500" />
                  <span>Duplicate Block</span>
                </button>
              )}

              <button
                onClick={handleClearText}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer font-medium"
              >
                <Trash2 size={14} className="text-slate-400" />
                <span>Clear Text Content</span>
              </button>

              <button
                onClick={() => {
                  onDeleteBlock();
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-left cursor-pointer font-bold"
              >
                <Trash2 size={14} className="text-rose-500" />
                <span>Delete Entire Block</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
