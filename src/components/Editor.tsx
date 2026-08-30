import React, { useState, useRef, useEffect } from 'react';
import { Note, Block, BlockType } from '../types';
import EditorBlock from './EditorBlock';
import EmojiPicker from './EmojiPicker';
import CommandMenu from './CommandMenu';
import DatePicker from './DatePicker';
import {
  Calendar,
  Star,
  Trash,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User,
  Upload,
  X,
  Tag,
  Bell,
  BellOff,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Scissors,
  Trash2,
  CopyPlus,
} from 'lucide-react';

interface EditorProps {
  note: Note | null;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  isSaving?: boolean;
}



export default function Editor({ note, onUpdateNote, onDeleteNote, isSaving }: EditorProps) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [summarizingIds, setSummarizingIds] = useState<Record<string, boolean>>({});

  // Multi-block selection states
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [selectionAnchorIndex, setSelectionAnchorIndex] = useState<number | null>(null);
  const [isMouseDownSelecting, setIsMouseDownSelecting] = useState<boolean>(false);

  // Slash command menu state
  const [slashMenu, setSlashMenu] = useState<{
    blockId: string;
    rect: DOMRect;
  } | null>(null);

  // Mini Calendar current view date
  const [miniCalendarDate, setMiniCalendarDate] = useState(new Date(2026, 6, 1)); // Default July 2026

  // Asset dropzone state
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  // Reset multi-selection when active note changes
  useEffect(() => {
    setSelectedBlockIds([]);
    setSelectionAnchorIndex(null);
    setIsMouseDownSelecting(false);
    if (note && (!note.title || note.title === 'Untitled Task')) {
      setTimeout(() => {
        titleRef.current?.focus();
        titleRef.current?.select();
      }, 100);
    }
  }, [note?.id]);

  // Window mouseup listener for multi-block drag selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsMouseDownSelecting(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Synchronize mini calendar with note scheduled date when note loads
  useEffect(() => {
    if (note?.scheduledDate) {
      const [y, m] = note.scheduledDate.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setMiniCalendarDate(new Date(y, m - 1, 1));
      }
    }
  }, [note?.id]);

  // Batch actions on multi-selected blocks
  const handleBatchCopy = async () => {
    if (!note || selectedBlockIds.length === 0) return;
    const selectedBlocks = note.blocks.filter((b) => selectedBlockIds.includes(b.id));
    const combinedText = selectedBlocks.map((b) => b.content).join('\n');
    try {
      await navigator.clipboard.writeText(combinedText);
    } catch (err) {
      console.warn('Batch copy failed:', err);
    }
  };

  const handleBatchDelete = () => {
    if (!note || selectedBlockIds.length === 0) return;
    let updatedBlocks = note.blocks.filter((b) => !selectedBlockIds.includes(b.id));
    if (updatedBlocks.length === 0) {
      updatedBlocks = [
        {
          id: Math.random().toString(36).substring(2, 11),
          type: 'text',
          content: '',
          properties: {},
        },
      ];
    }
    onUpdateNote({
      ...note,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });
    setSelectedBlockIds([]);
    setSelectionAnchorIndex(null);
  };

  const handleBatchCut = async () => {
    await handleBatchCopy();
    handleBatchDelete();
  };

  const handleBatchDuplicate = () => {
    if (!note || selectedBlockIds.length === 0) return;
    const selectedBlocks = note.blocks.filter((b) => selectedBlockIds.includes(b.id));
    if (selectedBlocks.length === 0) return;

    const indices = selectedBlocks
      .map((b) => note.blocks.findIndex((item) => item.id === b.id))
      .filter((i) => i !== -1);
    const maxIndex = Math.max(...indices);

    const duplicatedBlocks: Block[] = selectedBlocks.map((b) => ({
      id: Math.random().toString(36).substring(2, 11),
      type: b.type,
      content: b.content,
      properties: b.properties ? { ...b.properties } : {},
    }));

    const updatedBlocks = [...note.blocks];
    updatedBlocks.splice(maxIndex + 1, 0, ...duplicatedBlocks);

    onUpdateNote({
      ...note,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });

    setSelectedBlockIds(duplicatedBlocks.map((b) => b.id));
  };

  // Block mouse selection handlers
  const handleBlockMouseDown = (index: number, e: React.MouseEvent) => {
    if (!note) return;
    const clickedBlock = note.blocks[index];

    // Shift + Click selects contiguous range from anchor/focused block
    if (e.shiftKey) {
      e.preventDefault();
      const anchor =
        selectionAnchorIndex !== null
          ? selectionAnchorIndex
          : focusedBlockId
          ? note.blocks.findIndex((b) => b.id === focusedBlockId)
          : 0;
      const safeAnchor = anchor === -1 ? 0 : anchor;
      const start = Math.min(safeAnchor, index);
      const end = Math.max(safeAnchor, index);
      const rangeIds = note.blocks.slice(start, end + 1).map((b) => b.id);
      setSelectedBlockIds(rangeIds);
      return;
    }

    // Ctrl/Cmd + Click toggles item selection
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (selectedBlockIds.includes(clickedBlock.id)) {
        setSelectedBlockIds(selectedBlockIds.filter((id) => id !== clickedBlock.id));
      } else {
        setSelectedBlockIds([...selectedBlockIds, clickedBlock.id]);
      }
      setSelectionAnchorIndex(index);
      return;
    }

    // Standard mouse click sets selection anchor
    setSelectionAnchorIndex(index);
    setIsMouseDownSelecting(true);
  };

  const handleBlockMouseEnter = (index: number) => {
    if (!note || !isMouseDownSelecting || selectionAnchorIndex === null) return;
    const start = Math.min(selectionAnchorIndex, index);
    const end = Math.max(selectionAnchorIndex, index);
    const rangeIds = note.blocks.slice(start, end + 1).map((b) => b.id);
    setSelectedBlockIds(rangeIds);
  };

  // Global keydown shortcuts for multi-block selection
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (selectedBlockIds.length <= 1) return;

      if (e.key === 'Escape') {
        setSelectedBlockIds([]);
        return;
      }

      // If user isn't actively highlighting inner text in a normal input/textarea
      const activeEl = document.activeElement;
      const isInnerInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !isInnerInput) {
        e.preventDefault();
        handleBatchCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x' && !isInnerInput) {
        e.preventDefault();
        handleBatchCut();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isInnerInput) {
        e.preventDefault();
        handleBatchDelete();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedBlockIds, note]);

  // Sync title update
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!note) return;
    onUpdateNote({
      ...note,
      title: e.target.value,
      updatedAt: Date.now(),
    });
  };

  // Sync date update (can be string or null)
  const handleDateChange = (dateString: string | null) => {
    if (!note) return;
    onUpdateNote({
      ...note,
      scheduledDate: dateString || null,
      updatedAt: Date.now(),
    });
  };

  const handleDueDateChange = (dateString: string | null) => {
    if (!note) return;
    onUpdateNote({
      ...note,
      dueDate: dateString || null,
      updatedAt: Date.now(),
    });
  };

  const handleRemindersToggle = () => {
    if (!note) return;
    onUpdateNote({
      ...note,
      remindersEnabled: !note.remindersEnabled,
      updatedAt: Date.now(),
    });
  };

  const handleRecurrenceToggle = () => {
    if (!note) return;
    const recurrencePatterns: ('None' | 'Daily' | 'Weekly' | 'Monthly')[] = ['None', 'Daily'];
    const currentIdx = recurrencePatterns.indexOf(note.recurrence || 'None');
    const safeIdx = currentIdx === -1 ? 0 : currentIdx;
    const nextRecurrence = recurrencePatterns[(safeIdx + 1) % recurrencePatterns.length];

    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${dayStr}`;

    const updatedScheduledDate = (nextRecurrence !== 'None' && !note.scheduledDate) ? todayStr : note.scheduledDate;

    onUpdateNote({
      ...note,
      recurrence: nextRecurrence,
      scheduledDate: updatedScheduledDate,
      remindersEnabled: true,
      updatedAt: Date.now(),
    });
  };

  const toggleFavorite = () => {
    if (!note) return;
    onUpdateNote({
      ...note,
      isFavorite: !note.isFavorite,
      updatedAt: Date.now(),
    });
  };



  // BLOCK MANIPULATIONS
  const updateBlock = (blockId: string, content: string, properties?: Block['properties']) => {
    if (!note) return;
    const updatedBlocks = note.blocks.map((b) =>
      b.id === blockId ? { ...b, content, properties } : b
    );
    onUpdateNote({
      ...note,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });
  };

  const changeBlockType = (blockId: string, type: BlockType) => {
    if (!note) return;
    const updatedBlocks = note.blocks.map((b) =>
      b.id === blockId ? { ...b, type } : b
    );
    onUpdateNote({
      ...note,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });
  };

  const addBlockBelow = (currentBlockId: string, type: BlockType = 'text') => {
    if (!note) return;
    const currentIndex = note.blocks.findIndex((b) => b.id === currentBlockId);
    const newBlock: Block = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      content: '',
      properties: type === 'todo' ? { checked: false } : {},
    };

    const updatedBlocks = [...note.blocks];
    updatedBlocks.splice(currentIndex + 1, 0, newBlock);

    onUpdateNote({
      ...note,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });

    // Auto-focus the newly created block
    setTimeout(() => {
      setFocusedBlockId(newBlock.id);
    }, 50);
  };

  const deleteBlock = (blockId: string) => {
    if (!note) return;
    // Don't delete the last block, convert it back to text instead
    if (note.blocks.length === 1) {
      onUpdateNote({
        ...note,
        blocks: [{ id: blockId, type: 'text', content: '' }],
        updatedAt: Date.now(),
      });
      return;
    }

    const currentIndex = note.blocks.findIndex((b) => b.id === blockId);
    const updatedBlocks = note.blocks.filter((b) => b.id !== blockId);

    onUpdateNote({
      ...note,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });

    // Focus previous block or next block
    const focusIndex = currentIndex > 0 ? currentIndex - 1 : 0;
    setTimeout(() => {
      setFocusedBlockId(note.blocks[focusIndex]?.id || null);
    }, 50);
  };

  const duplicateBlock = (blockId: string) => {
    if (!note) return;
    const currentIndex = note.blocks.findIndex((b) => b.id === blockId);
    if (currentIndex === -1) return;
    const sourceBlock = note.blocks[currentIndex];
    const newBlock: Block = {
      id: Math.random().toString(36).substring(2, 11),
      type: sourceBlock.type,
      content: sourceBlock.content,
      properties: sourceBlock.properties ? { ...sourceBlock.properties } : {},
    };
    const updatedBlocks = [...note.blocks];
    updatedBlocks.splice(currentIndex + 1, 0, newBlock);

    onUpdateNote({
      ...note,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });

    setTimeout(() => {
      setFocusedBlockId(newBlock.id);
    }, 50);
  };

  const handlePasteMultiLine = (currentBlockId: string, text: string) => {
    if (!note) return;
    const currentIndex = note.blocks.findIndex((b) => b.id === currentBlockId);
    if (currentIndex === -1) return;

    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    const currentBlock = note.blocks[currentIndex];
    const updatedBlocks = [...note.blocks];

    // First line sets or appends to current block content
    updatedBlocks[currentIndex] = {
      ...currentBlock,
      content: currentBlock.content ? `${currentBlock.content}\n${lines[0]}` : lines[0],
    };

    // Remaining lines become new text blocks
    const newBlocks: Block[] = lines.slice(1).map((line) => ({
      id: Math.random().toString(36).substring(2, 11),
      type: 'text' as BlockType,
      content: line,
      properties: {},
    }));

    updatedBlocks.splice(currentIndex + 1, 0, ...newBlocks);

    onUpdateNote({
      ...note,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });
  };

  // Keyboard navigation & operations
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, block: Block, index: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // If code block or quote block, Shift-Enter creates new line, Enter creates new block
      addBlockBelow(block.id);
    } else if (e.key === 'Backspace' && block.content === '') {
      e.preventDefault();
      // If block type is not text, convert to text first
      if (block.type !== 'text') {
        changeBlockType(block.id, 'text');
      } else {
        // Delete block entirely if empty
        deleteBlock(block.id);
      }
    } else if (e.key === 'ArrowUp') {
      const cursorPosition = e.currentTarget.selectionStart;
      // Focus previous block if cursor at start
      if (cursorPosition === 0 && index > 0) {
        e.preventDefault();
        setFocusedBlockId(note.blocks[index - 1].id);
      }
    } else if (e.key === 'ArrowDown') {
      const cursorPosition = e.currentTarget.selectionStart;
      const contentLen = e.currentTarget.value.length;
      // Focus next block if cursor at end
      if (cursorPosition === contentLen && index < note.blocks.length - 1) {
        e.preventDefault();
        setFocusedBlockId(note.blocks[index + 1].id);
      }
    }
  };

  // Slash Command trigger
  const handleTriggerSlash = (blockId: string, rect: DOMRect | null) => {
    if (rect) {
      setSlashMenu({ blockId, rect });
    } else {
      setSlashMenu(null);
    }
  };

  const handleSelectSlashCommand = (type: BlockType) => {
    if (!slashMenu || !note) return;
    const targetBlock = note.blocks.find((b) => b.id === slashMenu.blockId);
    if (!targetBlock) return;

    // Remove the trailing slash "/" from block content
    let content = targetBlock.content;
    if (content.endsWith('/')) {
      content = content.slice(0, -1);
    }

    // Convert block
    const updatedBlocks = note.blocks.map((b) =>
      b.id === slashMenu.blockId ? { ...b, type, content } : b
    );

    onUpdateNote({
      ...note,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });

    setSlashMenu(null);
  };

  // HTML5 Drag and Drop for block reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || !note) return;

    const updatedBlocks = [...note.blocks];
    const [removed] = updatedBlocks.splice(draggedIndex, 1);
    updatedBlocks.splice(index, 0, removed);

    onUpdateNote({
      ...note,
      blocks: updatedBlocks,
      updatedAt: Date.now(),
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // PROPERTY SELECTION HANDLERS
  const cycleStatus = () => {
    if (!note) return;
    const statuses: ('Not Started' | 'In Progress' | 'Hold' | 'Completed')[] = ['Not Started', 'In Progress', 'Hold', 'Completed'];
    const currentIdx = statuses.indexOf(note.status || 'Not Started');
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];
    
    // Bidirectional propagation:
    // 1. If changed to 'Completed': Set all existing updates to 'Completed' so they are in sync.
    // 2. If changed to 'Not Started': Set all existing updates to 'Not Started' so they are in sync.
    // 3. If changed to 'In Progress' or 'Hold': Sync latest update if all were completed.
    let updatedUpdates = note.updates ? [...note.updates] : [];
    if (nextStatus === 'Completed' && updatedUpdates.length > 0) {
      updatedUpdates = updatedUpdates.map(u => ({ ...u, status: 'Completed' }));
    } else if (nextStatus === 'Not Started' && updatedUpdates.length > 0) {
      updatedUpdates = updatedUpdates.map(u => ({ ...u, status: 'Not Started' }));
    } else if ((nextStatus === 'In Progress' || nextStatus === 'Hold') && updatedUpdates.length > 0) {
      const hasAnyNonCompleted = updatedUpdates.some(u => u.status !== 'Completed');
      if (!hasAnyNonCompleted) {
        updatedUpdates = updatedUpdates.map((u, idx) => 
          idx === updatedUpdates.length - 1 ? { ...u, status: nextStatus } : u
        );
      }
    }

    onUpdateNote({
      ...note,
      status: nextStatus,
      updates: updatedUpdates,
      updatedAt: Date.now(),
    });
  };

  const cyclePriority = () => {
    if (!note) return;
    const priorities: ('Low' | 'Medium' | 'High')[] = ['Low', 'Medium', 'High'];
    const currentIdx = priorities.indexOf(note.priority || 'Low');
    const nextPriority = priorities[(currentIdx + 1) % priorities.length];
    onUpdateNote({
      ...note,
      priority: nextPriority,
      updatedAt: Date.now(),
    });
  };

  const handleAssigneeChange = (val: string) => {
    if (!note) return;
    onUpdateNote({
      ...note,
      assignee: val,
      updatedAt: Date.now(),
    });
  };

  // TASK UPDATES TIMELINE HANDLERS
  const handleAddUpdate = () => {
    if (!note) return;
    const currentUpdates = note.updates || [];
    const nextNumber = currentUpdates.length + 1;
    const todayStr = new Date().toISOString().split('T')[0];
    
    const newUpdate = {
      id: Math.random().toString(36).substring(2, 11),
      number: nextNumber,
      date: todayStr,
      updateFrom: note.assignee || 'Me',
      status: 'In Progress',
      note: '',
      details: '',
      isExpanded: true,
    };
    
    const updatedUpdates = [...currentUpdates, newUpdate];
    
    // Propagation: adding a new active update should make the main task 'In Progress'
    let nextNoteStatus = note.status;
    const hasAnyNonCompleted = updatedUpdates.some(u => u.status !== 'Completed');
    if (hasAnyNonCompleted) {
      nextNoteStatus = 'In Progress';
    } else if (updatedUpdates.length > 0) {
      nextNoteStatus = 'Completed';
    }

    onUpdateNote({
      ...note,
      status: nextNoteStatus,
      updates: updatedUpdates,
      updatedAt: Date.now(),
    });
  };

  const handleDeleteUpdate = (updateId: string) => {
    if (!note || !note.updates) return;
    const updatedUpdates = note.updates
      .filter((u) => u.id !== updateId)
      .map((u, idx) => ({ ...u, number: idx + 1 })); // Recalculate sequence numbers
    
    // Recalculate main task status
    let nextNoteStatus = note.status;
    if (updatedUpdates.length > 0) {
      const hasAnyNonCompleted = updatedUpdates.some(u => u.status !== 'Completed');
      if (hasAnyNonCompleted) {
        nextNoteStatus = 'In Progress';
      } else {
        nextNoteStatus = 'Completed';
      }
    }

    onUpdateNote({
      ...note,
      status: nextNoteStatus,
      updates: updatedUpdates,
      updatedAt: Date.now(),
    });
  };

  const handleUpdateField = (updateId: string, field: string, value: any) => {
    if (!note || !note.updates) return;
    const updatedUpdates = note.updates.map((u) =>
      u.id === updateId ? { ...u, [field]: value } : u
    );

    let nextNoteStatus = note.status;

    if (field === 'status') {
      // Propagation logic:
      // If ANY update's status is not 'Completed', propagate 'In Progress' to main task status
      // If ALL updates are 'Completed', propagate 'Completed' to main task status
      const hasAnyNonCompleted = updatedUpdates.some(u => u.status !== 'Completed');
      if (hasAnyNonCompleted) {
        nextNoteStatus = 'In Progress';
      } else if (updatedUpdates.length > 0) {
        nextNoteStatus = 'Completed';
      }
    }

    onUpdateNote({
      ...note,
      status: nextNoteStatus,
      updates: updatedUpdates,
      updatedAt: Date.now(),
    });
  };

  const handleSummarizeDescription = async (updateId: string, descriptionText: string) => {
    if (!descriptionText || !descriptionText.trim()) return;
    
    setSummarizingIds(prev => ({ ...prev, [updateId]: true }));
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: descriptionText }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to summarize description');
      }
      
      const data = await response.json();
      if (data.summary) {
        handleUpdateField(updateId, 'note', data.summary);
      }
    } catch (error) {
      console.error('Error during AI summarization:', error);
    } finally {
      setSummarizingIds(prev => ({ ...prev, [updateId]: false }));
    }
  };

  const handleToggleExpandUpdate = (updateId: string) => {
    if (!note || !note.updates) return;
    const updatedUpdates = note.updates.map((u) =>
      u.id === updateId ? { ...u, isExpanded: !u.isExpanded } : u
    );
    onUpdateNote({
      ...note,
      updates: updatedUpdates,
      updatedAt: Date.now(),
    });
  };

  // FILE UPLOAD HANDLERS
  const processUploadedFiles = (fileList: FileList) => {
    if (!note) return;
    const currentAssets = note.assets || [];
    const newAssets = Array.from(fileList).map((file) => {
      const sizeInKb = file.size / 1024;
      const sizeStr = sizeInKb > 1024 
        ? `${(sizeInKb / 1024).toFixed(1)} MB` 
        : `${sizeInKb.toFixed(0)} KB`;
      return {
        name: file.name,
        size: sizeStr,
        type: file.type || 'Unknown'
      };
    });

    onUpdateNote({
      ...note,
      assets: [...currentAssets, ...newAssets],
      updatedAt: Date.now(),
    });
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverDropzone(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(e.target.files);
    }
  };

  const handleRemoveAsset = (idxToRemove: number) => {
    if (!note || !note.assets) return;
    onUpdateNote({
      ...note,
      assets: note.assets.filter((_, idx) => idx !== idxToRemove),
      updatedAt: Date.now(),
    });
  };

  // MINI CALENDAR HELPERS
  const handleMiniCalendarPrev = () => {
    setMiniCalendarDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() - 1, 1));
  };

  const handleMiniCalendarNext = () => {
    setMiniCalendarDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() + 1, 1));
  };

  const getMiniCalendarGrid = () => {
    const y = miniCalendarDate.getFullYear();
    const m = miniCalendarDate.getMonth();
    const firstDayIdx = new Date(y, m, 1).getDay();
    const totalDays = new Date(y, m + 1, 0).getDate();

    const grid = [];
    for (let i = 0; i < firstDayIdx; i++) {
      grid.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      grid.push(i);
    }
    return grid;
  };

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 bg-[#FBFBFA] dark:bg-[#121211] text-center font-sans">
        <div className="p-4 bg-[#E3F2FD] dark:bg-[#1E3A5F]/40 rounded-2xl text-[#2383E2] mb-4 animate-bounce">
          <Sparkles size={36} />
        </div>
        <h3 className="text-xl font-bold text-[#37352F] dark:text-[#E3E3E2] mb-1.5">No Active Task</h3>
        <p className="text-[#ACABA9] dark:text-[#888886] max-w-sm text-sm leading-relaxed">
          Select an existing task from the sidebar or build a brand-new workspace to start recording notes in a bento layout.
        </p>
      </div>
    );
  }

  const miniCalYear = miniCalendarDate.getFullYear();
  const miniCalMonth = miniCalendarDate.getMonth();
  const miniCalMonthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const displayAssets = note.assets && note.assets.length > 0 
    ? note.assets 
    : [
        { name: 'Metrics_Q4.csv', size: '14 KB', type: 'text/csv' },
        { name: 'Hero_Spec.pdf', size: '2.4 MB', type: 'application/pdf' }
      ];

  return (
    <div className="flex-1 flex flex-col bg-[#FBFBFA] dark:bg-[#121211] overflow-y-auto scrollbar-thin select-text p-4 pt-16 md:p-6 lg:p-8 font-sans">
      
      {/* Layout container */}
      <div className="w-full max-w-5xl mx-auto items-start">
        
        {/* MAIN BLOCK: Markdown Block Editor */}
        <div className="w-full bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl shadow-sm flex flex-col relative transition-all min-h-[600px] overflow-hidden">
          
          {/* Editor Contents Wrapper */}
          <div className="w-full px-6 md:px-10 pb-16 relative pt-8 md:pt-10">
            
            {/* Page Icon Emoji */}
            <div className="mb-4">
              <EmojiPicker
                currentEmoji={note.emoji}
                onSelect={(emoji) =>
                  onUpdateNote({ ...note, emoji, updatedAt: Date.now() })
                }
              />
            </div>

            {/* Note Toolbar (Archive, Favorite, Calendar Scheduling) */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#EDECE9] dark:border-[#2C2C2A]/70 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFavorite}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
                    note.isFavorite
                      ? 'bg-[#FEF9C3] dark:bg-[#FEF9C3]/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30'
                      : 'text-[#ACABA9] hover:text-[#37352F] dark:hover:text-[#E3E3E2]'
                  }`}
                  title={note.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                >
                  <Star size={13} className={note.isFavorite ? 'fill-amber-500 text-amber-500' : ''} />
                  <span>Favorite</span>
                </button>

                <button
                  onClick={() => onDeleteNote(note.id)}
                  className="px-2.5 py-1.5 rounded-lg text-[#ACABA9] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                  title="Delete task"
                >
                  <Trash size={13} />
                  <span>Delete</span>
                </button>

                <div className="h-4 w-[1px] bg-[#EDECE9] dark:bg-[#2C2C2A]/75 mx-1" />

                {isSaving ? (
                  <span className="text-xs text-[#ACABA9] dark:text-[#888886] flex items-center gap-1.5 font-semibold select-none animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    Saving...
                  </span>
                ) : (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold select-none">
                    <Check size={13} className="text-emerald-500 dark:text-emerald-400" />
                    Saved
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Direct date scheduler */}
                <DatePicker
                  label="Scheduled:"
                  value={note.scheduledDate}
                  onChange={handleDateChange}
                  iconType="calendar"
                  iconColor="text-[#2383E2]"
                  placeholder="Set date"
                  variant="toolbar"
                />

                {/* Due date scheduler */}
                <DatePicker
                  label="Due Date:"
                  value={note.dueDate}
                  onChange={handleDueDateChange}
                  iconType="clock"
                  iconColor="text-amber-500"
                  placeholder="Set deadline"
                  variant="toolbar"
                />

                {/* Recurrence Repeat Selector */}
                <button
                  onClick={handleRecurrenceToggle}
                  className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold border ${
                    note.recurrence && note.recurrence !== 'None'
                      ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30'
                      : 'bg-[#F7F6F3] dark:bg-[#252523] text-[#ACABA9] dark:text-[#888886] border-[#EDECE9] dark:border-[#2C2C2A] hover:bg-[#EBEAE4] dark:hover:bg-[#2C2C2A]'
                  }`}
                  title="Toggle Task Repeat Recurrence"
                >
                  <RefreshCw size={13} className={note.recurrence && note.recurrence !== 'None' ? "animate-spin" : ""} />
                  <span>Repeat: {note.recurrence || 'None'}</span>
                </button>
              </div>
            </div>

            {/* Note Title Input */}
            <div className="mb-6">
              <input
                ref={titleRef}
                type="text"
                value={note.title}
                onChange={handleTitleChange}
                placeholder="Task Title"
                className="w-full text-3xl md:text-4xl font-extrabold tracking-tight bg-transparent border-none outline-none text-[#37352F] dark:text-white placeholder-[#EDECE9] dark:placeholder-[#2C2C2A] focus:ring-0 leading-tight p-0"
              />
            </div>

            {/* Note Properties Panel */}
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F7F6F3] dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A]">
              {/* STATUS FIELD */}
              <div className="flex flex-col gap-1.5 justify-center">
                <span className="text-[10px] font-bold text-[#ACABA9] dark:text-[#888886] uppercase tracking-wider">Status</span>
                <button
                  onClick={cycleStatus}
                  className={`self-start px-2.5 py-1 rounded-full font-bold text-xs transition-all hover:scale-105 cursor-pointer shadow-sm ${
                    note.status === 'Completed'
                      ? 'bg-[#EBFFEF] text-[#1F7A33] border border-[#C5F2D0]/60'
                      : note.status === 'In Progress'
                      ? 'bg-[#FDECC8] text-[#D9730D] border border-[#FADCB9]/60'
                      : note.status === 'Hold'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-300/60'
                      : 'bg-gray-100 text-gray-600 dark:bg-[#2C2C2A] dark:text-gray-400'
                  }`}
                >
                  {note.status || 'Not Started'}
                </button>
              </div>

              {/* PRIORITY FIELD */}
              <div className="flex flex-col gap-1.5 justify-center">
                <span className="text-[10px] font-bold text-[#ACABA9] dark:text-[#888886] uppercase tracking-wider">Priority</span>
                <button
                  onClick={cyclePriority}
                  className={`self-start px-2.5 py-1 rounded-full font-bold text-xs transition-all hover:scale-105 cursor-pointer shadow-sm ${
                    note.priority === 'High'
                      ? 'bg-[#FFE2DD] text-[#EB5757] border border-[#FFAEA4]/60'
                      : note.priority === 'Medium'
                      ? 'bg-[#E3F2FD] text-[#2383E2] border border-[#B3E5FC]/60'
                      : 'bg-gray-100 text-gray-600 dark:bg-[#2C2C2A] dark:text-gray-400'
                  }`}
                >
                  {note.priority || 'Low'}
                </button>
              </div>

              {/* ASSIGNEE FIELD */}
              <div className="flex flex-col gap-1 justify-center">
                <span className="text-[10px] font-bold text-[#ACABA9] dark:text-[#888886] uppercase tracking-wider">Assignee</span>
                <div className="flex items-center gap-1">
                  <User size={12} className="text-[#ACABA9]" />
                  <input
                    type="text"
                    value={note.assignee || ''}
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                    placeholder="add assignee..."
                    className="bg-transparent border-b border-transparent hover:border-[#ACABA9]/40 focus:border-[#2383E2] outline-none font-medium text-[#37352F] dark:text-[#E3E3E2] placeholder-[#ACABA9]/50 w-full text-xs p-0 focus:ring-0"
                  />
                </div>
              </div>

              {/* TAGS FIELD */}
              <div className="flex flex-col gap-1 justify-center">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-[#ACABA9] dark:text-[#888886] uppercase tracking-wider flex items-center gap-1">
                    <Tag size={10} className="text-[#ACABA9]" /> Tags
                  </span>
                  <input
                    type="text"
                    placeholder="Add tag..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget;
                        const val = input.value.trim().toLowerCase().replace(/#/g, '');
                        if (val) {
                          const currentTags = note.tags || [];
                          if (!currentTags.includes(val)) {
                            onUpdateNote({
                              ...note,
                              tags: [...currentTags, val],
                              updatedAt: Date.now(),
                            });
                          }
                          input.value = '';
                        }
                      }
                    }}
                    className="bg-transparent border-b border-transparent hover:border-[#ACABA9]/40 focus:border-[#2383E2] outline-none text-right font-medium text-[#37352F] dark:text-[#E3E3E2] placeholder-[#ACABA9]/50 w-16 text-[10px] p-0 focus:ring-0"
                  />
                </div>
                
                {note.tags && note.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1 max-h-12 overflow-y-auto scrollbar-none">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#E3F2FD] dark:bg-[#1E3A5F]/45 text-[#2383E2] dark:text-[#42A5F5] border border-[#D0E7FF]/60 dark:border-[#1E3A5F]/60"
                      >
                        #{tag}
                        <button
                          onClick={() => {
                            onUpdateNote({
                              ...note,
                              tags: note.tags?.filter((t) => t !== tag) || [],
                              updatedAt: Date.now(),
                            });
                          }}
                          className="hover:text-rose-500 font-bold transition-colors cursor-pointer text-[9px] ml-0.5"
                          title="Remove tag"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-left text-[10px] text-[#ACABA9]/60 italic font-medium">No tags</div>
                )}
              </div>
            </div>

            {/* Task notes section header */}
            <div className="mb-4 flex items-center gap-1.5 border-b border-[#EDECE9]/60 dark:border-[#2C2C2A]/60 pb-1.5">
              <span className="text-[10px] font-extrabold text-[#ACABA9] uppercase tracking-wider">
                Notes, Description & Subtasks
              </span>
            </div>

            {/* Blocks Area */}
            <div id="editor-blocks-container" className="flex flex-col gap-1 min-h-fit h-auto">
              {note.blocks.map((block, idx) => (
                <EditorBlock
                  key={block.id}
                  block={block}
                  index={idx}
                  focusedBlockId={focusedBlockId}
                  isSelected={selectedBlockIds.includes(block.id)}
                  selectedCount={selectedBlockIds.length}
                  onFocus={() => setFocusedBlockId(block.id)}
                  onBlur={() => {}}
                  onChange={(content, properties) => updateBlock(block.id, content, properties)}
                  onTypeChange={(type) => changeBlockType(block.id, type)}
                  onKeyDown={(e) => handleKeyDown(e, block, idx)}
                  onAddBlock={() => addBlockBelow(block.id)}
                  onDeleteBlock={() => deleteBlock(block.id)}
                  onDuplicateBlock={() => duplicateBlock(block.id)}
                  onPasteMultiLine={(text) => handlePasteMultiLine(block.id, text)}
                  onMouseDownBlock={(e) => handleBlockMouseDown(idx, e)}
                  onMouseEnterBlock={() => handleBlockMouseEnter(idx)}
                  onBatchCopy={handleBatchCopy}
                  onBatchCut={handleBatchCut}
                  onBatchDelete={handleBatchDelete}
                  onBatchDuplicate={handleBatchDuplicate}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDrop={() => handleDrop(idx)}
                  isDragOver={dragOverIndex === idx}
                  onTriggerSlash={(rect) => handleTriggerSlash(block.id, rect)}
                />
              ))}
            </div>

            {/* Floating Command menu overlay */}
            {slashMenu && (
              <CommandMenu
                anchorRect={slashMenu.rect}
                onSelect={handleSelectSlashCommand}
                onClose={() => setSlashMenu(null)}
              />
            )}

            {/* TASK UPDATES WORKSPACE */}
            <div className="mb-8 mt-12 border-t border-[#EDECE9]/60 dark:border-[#2C2C2A]/60 pt-8">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2383E2]" />
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#37352F] dark:text-[#E3E3E2]">
                    Updates Timeline
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#ACABA9] dark:text-[#888886]">
                  {(note.updates || []).length} logged update{(note.updates || []).length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Updates List */}
              <div className="space-y-5">
                {(note.updates || []).map((update) => (
                  update.isExpanded === false ? (
                    <div key={update.id}>
                      {/* DESKTOP/LAPTOP VIEW (Matches attached image layout exactly) */}
                      <div
                        className="hidden sm:block bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-6 transition-all hover:border-[#ACABA9]/50 cursor-pointer select-none"
                        onClick={() => handleToggleExpandUpdate(update.id)}
                      >
                        {/* Row 1: Left-aligned details, Right-aligned action buttons */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-14 text-xs">
                            {/* Update Label */}
                            <div className="text-base font-bold text-[#37352F] dark:text-[#E3E3E2] select-none tracking-wide">
                              Update : {update.number}
                            </div>

                            {/* Date Label */}
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#ACABA9] dark:text-[#888886]">Date:</span>
                              <span className="font-bold text-[#37352F] dark:text-[#E3E3E2]">{update.date || 'No Date'}</span>
                            </div>

                            {/* Update From Label */}
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#ACABA9] dark:text-[#888886]">Update from :</span>
                              <span className="font-bold text-[#37352F] dark:text-[#E3E3E2]">{update.updateFrom || 'N/A'}</span>
                            </div>
                          </div>

                          {/* Actions: delete and expand circle button */}
                          <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteUpdate(update.id)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[#ACABA9] hover:text-rose-600 rounded-lg transition-colors cursor-pointer text-xs"
                              title="Delete update"
                            >
                              <Trash size={13} />
                            </button>
                            <button
                              onClick={() => handleToggleExpandUpdate(update.id)}
                              className="w-8 h-8 rounded-full bg-transparent border border-[#EDECE9]/80 dark:border-[#2C2C2A]/80 hover:bg-[#F7F6F3] dark:hover:bg-[#252523] text-[#37352F] dark:text-[#E3E3E2] flex items-center justify-center transition-all cursor-pointer"
                              title="Expand update"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Status & Note */}
                        <div className="mt-5 flex items-center gap-14 text-xs">
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-semibold text-[#ACABA9] dark:text-[#888886]">Status:</span>
                            <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                              update.status === 'Completed' ? 'bg-[#1D3227] text-[#4ADE80] border-[#22543D]' :
                              update.status === 'In Progress' ? 'bg-[#1E293B] text-[#38BDF8] border-[#334155]' :
                              update.status === 'Blocked' ? 'bg-[#451A1A] text-[#FCA5A5] border-[#7F1D1D]' :
                              update.status === 'On Hold' ? 'bg-[#3B2C1A] text-[#FDE047] border-[#78350F]' :
                              'bg-transparent text-[#ACABA9] dark:text-[#888886] border-[#EDECE9] dark:border-[#2C2C2A]'
                            }`}>
                              {update.status}
                            </span>
                          </div>

                          <div className="flex-1 flex items-center gap-2">
                            <span className="font-semibold text-[#ACABA9] dark:text-[#888886] shrink-0">Note:</span>
                            <span className="font-bold text-[#37352F] dark:text-[#E3E3E2]">{update.note || 'No notes summary'}</span>
                          </div>
                        </div>
                      </div>

                      {/* MOBILE/TABLET VIEW (Highly-polished responsive layout) */}
                      <div
                        className="block sm:hidden bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-4 transition-all space-y-3.5 shadow-xs hover:shadow-md hover:border-[#2383E2]/30 cursor-pointer select-none group"
                        onClick={() => handleToggleExpandUpdate(update.id)}
                      >
                        {/* Clean Header: Update label left, actions right */}
                        <div className="flex items-center justify-between gap-4 border-b border-[#EDECE9]/30 dark:border-[#2C2C2A]/30 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2383E2]" />
                            <span className="text-xs font-extrabold text-[#37352F] dark:text-[#E3E3E2] tracking-wider uppercase">
                              Update {update.number}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteUpdate(update.id)}
                              className="p-1.5 text-[#ACABA9] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer text-xs"
                              title="Delete update"
                            >
                              <Trash size={13} />
                            </button>
                            <button
                              onClick={() => handleToggleExpandUpdate(update.id)}
                              className="w-7 h-7 rounded-full bg-transparent border border-[#EDECE9]/80 dark:border-[#2C2C2A]/80 hover:bg-[#F7F6F3] dark:hover:bg-[#252523] text-[#37352F] dark:text-[#E3E3E2] flex items-center justify-center transition-all cursor-pointer"
                              title="Expand update"
                            >
                              <ChevronDown size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] font-bold text-[#ACABA9] uppercase tracking-wider">Date</span>
                            <span className="font-bold text-[#37352F] dark:text-[#E3E3E2] truncate">
                              {update.date || 'No Date'}
                            </span>
                          </div>

                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] font-bold text-[#ACABA9] uppercase tracking-wider">Updated By</span>
                            <span className="font-bold text-[#37352F] dark:text-[#E3E3E2] truncate">
                              {update.updateFrom || 'N/A'}
                            </span>
                          </div>

                          <div className="col-span-2 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-[#ACABA9] uppercase tracking-wider">Status</span>
                            <span className={`inline-flex self-start px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                              update.status === 'Completed' ? 'bg-[#1D3227] text-[#4ADE80] border-[#22543D]' :
                              update.status === 'In Progress' ? 'bg-[#1E293B] text-[#38BDF8] border-[#334155]' :
                              update.status === 'Blocked' ? 'bg-[#451A1A] text-[#FCA5A5] border-[#7F1D1D]' :
                              update.status === 'On Hold' ? 'bg-[#3B2C1A] text-[#FDE047] border-[#78350F]' :
                              'bg-[#F7F6F3] dark:bg-[#252523] text-[#ACABA9] dark:text-[#888886] border-[#EDECE9] dark:border-[#2C2C2A]'
                            }`}>
                              {update.status}
                            </span>
                          </div>
                        </div>

                        {/* Summary Note Block */}
                        <div className="border-t border-[#EDECE9]/40 dark:border-[#2C2C2A]/40 pt-3 flex flex-col gap-1 text-xs">
                          <span className="text-[10px] font-bold text-[#ACABA9] uppercase tracking-wider">Note Summary</span>
                          <p className="font-medium text-[#37352F] dark:text-[#E3E3E2] leading-relaxed break-words">
                            {update.note || 'No summary notes logged.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={update.id}>
                      {/* DESKTOP/LAPTOP EDIT VIEW (Matches attached image layout exactly) */}
                      <div className="hidden sm:block bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-6 transition-all shadow-none">
                        {/* Header Row: Update label, Date input, Update from input, and actions */}
                        <div className="flex items-center justify-between gap-4 border-b border-[#EDECE9]/30 dark:border-[#2C2C2A]/30 pb-3">
                          <div className="flex items-center gap-10">
                            {/* Update Badge */}
                            <div className="text-base font-bold text-[#37352F] dark:text-[#E3E3E2] select-none tracking-wide">
                              Update : {update.number}
                            </div>

                            {/* Date Picker */}
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-[#ACABA9] dark:text-[#888886]">Date:</span>
                              <DatePicker
                                value={update.date}
                                onChange={(d) => handleUpdateField(update.id, 'date', d || '')}
                                variant="compact"
                                placeholder="Pick date"
                              />
                            </div>

                            {/* Update From Input */}
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-[#ACABA9] dark:text-[#888886]">Update from :</span>
                              <input
                                type="text"
                                value={update.updateFrom}
                                onChange={(e) => handleUpdateField(update.id, 'updateFrom', e.target.value)}
                                placeholder="name..."
                                className="bg-transparent border-b border-transparent hover:border-[#ACABA9]/40 focus:border-[#2383E2] outline-none font-bold text-[#37352F] dark:text-[#E3E3E2] placeholder-[#ACABA9]/40 p-0 w-28 text-xs focus:ring-0"
                              />
                            </div>
                          </div>

                          {/* Action buttons (Delete & Collapse) */}
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => handleDeleteUpdate(update.id)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[#ACABA9] hover:text-rose-600 rounded-lg transition-colors cursor-pointer text-xs"
                              title="Delete update"
                            >
                              <Trash size={13} />
                            </button>
                            <button
                              onClick={() => handleToggleExpandUpdate(update.id)}
                              className="w-8 h-8 rounded-full bg-transparent border border-[#EDECE9]/80 dark:border-[#2C2C2A]/80 hover:bg-[#F7F6F3] dark:hover:bg-[#252523] text-[#37352F] dark:text-[#E3E3E2] flex items-center justify-center transition-all cursor-pointer"
                              title="Collapse update"
                            >
                              <ChevronDown
                                size={14}
                                className="transform rotate-180 transition-transform duration-200"
                              />
                            </button>
                          </div>
                        </div>

                        {/* Status & Note Block (Flat transparent bordered container as in screenshot) */}
                        <div className="mt-4 bg-transparent border border-[#EDECE9]/80 dark:border-[#2C2C2A]/80 rounded-xl p-4">
                          <div className="flex items-center gap-10 text-xs">
                            {/* Status Select */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-semibold text-[#ACABA9] dark:text-[#888886]">Status:</span>
                              <select
                                value={update.status}
                                onChange={(e) => handleUpdateField(update.id, 'status', e.target.value)}
                                className="bg-white dark:bg-[#1E1E1C] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-lg px-2.5 py-1 font-bold text-[#37352F] dark:text-[#E3E3E2] focus:ring-1 focus:ring-[#2383E2] focus:outline-none cursor-pointer"
                              >
                                <option value="Not Started">Not Started</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="On Hold">On Hold</option>
                                <option value="Blocked">Blocked</option>
                              </select>
                            </div>

                            {/* Note Summary */}
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-[#ACABA9] dark:text-[#888886] shrink-0">Note:</span>
                              <div className="flex-1 flex items-center gap-1.5 min-w-0 relative group/note">
                                <input
                                  type="text"
                                  value={update.note}
                                  onChange={(e) => handleUpdateField(update.id, 'note', e.target.value)}
                                  placeholder="Brief update note..."
                                  className="flex-1 bg-transparent border-b border-transparent hover:border-[#ACABA9]/40 focus:border-[#2383E2] outline-none font-bold text-[#37352F] dark:text-[#E3E3E2] placeholder-[#ACABA9]/50 p-0 text-xs focus:ring-0 pr-8"
                                />
                                {update.details && update.details.trim().length > 3 && (
                                  <button
                                    onClick={() => handleSummarizeDescription(update.id, update.details)}
                                    disabled={summarizingIds[update.id]}
                                    className="absolute right-1 text-[#2383E2] hover:text-[#2383E2]/80 disabled:text-[#ACABA9] transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#252523] flex items-center justify-center cursor-pointer"
                                    title="Summarize description with Gemini AI"
                                  >
                                    {summarizingIds[update.id] ? (
                                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent text-[#2383E2] rounded-full animate-spin" />
                                    ) : (
                                      <Sparkles size={13} className="text-[#2383E2] animate-pulse" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Details (Expanded View, vertical bar style) */}
                        <div className="mt-4 border-l-2 border-[#EDECE9] dark:border-[#2C2C2A] pl-4 py-1">
                          <textarea
                            value={update.details || ''}
                            onChange={(e) => handleUpdateField(update.id, 'details', e.target.value)}
                            placeholder="Improve functionality in calendar view."
                            rows={3}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs text-[#37352F] dark:text-[#E3E3E2] placeholder-[#ACABA9]/50 leading-relaxed font-bold outline-none resize-none"
                          />
                        </div>
                      </div>

                      {/* MOBILE/TABLET EDIT VIEW (Highly-polished responsive layout) */}
                      <div
                        className="block sm:hidden bg-white dark:bg-[#1C1C1A] border border-[#EDECE9]/85 dark:border-[#2C2C2A] rounded-2xl p-4 transition-all space-y-4 shadow-sm"
                      >
                        {/* Clean Header: Update label left, actions right */}
                        <div className="flex items-center justify-between gap-4 border-b border-[#EDECE9]/30 dark:border-[#2C2C2A]/30 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-xs font-extrabold text-[#37352F] dark:text-[#E3E3E2] tracking-wider uppercase">
                              Editing Update {update.number}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDeleteUpdate(update.id)}
                              className="p-1.5 text-[#ACABA9] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer text-xs"
                              title="Delete update"
                            >
                              <Trash size={13} />
                            </button>
                            <button
                              onClick={() => handleToggleExpandUpdate(update.id)}
                              className="w-7 h-7 rounded-full bg-transparent border border-[#EDECE9]/80 dark:border-[#2C2C2A]/80 hover:bg-[#F7F6F3] dark:hover:bg-[#252523] text-[#37352F] dark:text-[#E3E3E2] flex items-center justify-center transition-all cursor-pointer"
                              title="Collapse update"
                            >
                              <ChevronDown
                                size={13}
                                className="transform rotate-180 transition-transform duration-200"
                              />
                            </button>
                          </div>
                        </div>

                        {/* Inputs Grid: Redesigned into structured bento fields */}
                        <div className="grid grid-cols-1 gap-3.5">
                          {/* Date Field Block */}
                          <div className="flex flex-col gap-1 bg-[#F7F6F3] dark:bg-[#20201E] px-3 py-2 rounded-xl border border-[#EDECE9] dark:border-[#2C2C2A]">
                            <span className="text-[9px] font-extrabold text-[#ACABA9] uppercase tracking-wider">Date</span>
                            <DatePicker
                              value={update.date}
                              onChange={(d) => handleUpdateField(update.id, 'date', d || '')}
                              variant="compact"
                              placeholder="Pick date"
                            />
                          </div>

                          {/* Author Field Block */}
                          <div className="flex flex-col gap-1 bg-[#F7F6F3] dark:bg-[#20201E] px-3 py-2 rounded-xl border border-[#EDECE9] dark:border-[#2C2C2A]">
                            <span className="text-[9px] font-extrabold text-[#ACABA9] uppercase tracking-wider">Update From</span>
                            <input
                              type="text"
                              value={update.updateFrom}
                              onChange={(e) => handleUpdateField(update.id, 'updateFrom', e.target.value)}
                              placeholder="Assignee name..."
                              className="bg-transparent border-none outline-none font-bold text-[#37352F] dark:text-[#E3E3E2] placeholder-[#ACABA9]/40 p-0 w-full text-xs focus:ring-0"
                            />
                          </div>

                          {/* Status Select Block */}
                          <div className="flex flex-col gap-1 bg-[#F7F6F3] dark:bg-[#20201E] px-3 py-1.5 rounded-xl border border-[#EDECE9] dark:border-[#2C2C2A]">
                            <span className="text-[9px] font-extrabold text-[#ACABA9] uppercase tracking-wider">Status</span>
                            <select
                              value={update.status}
                              onChange={(e) => handleUpdateField(update.id, 'status', e.target.value)}
                              className="bg-transparent border-none outline-none font-bold text-[#37352F] dark:text-[#E3E3E2] p-0 w-full text-xs focus:ring-0 cursor-pointer"
                            >
                              <option value="Not Started" className="bg-white dark:bg-[#20201E]">Not Started</option>
                              <option value="In Progress" className="bg-white dark:bg-[#20201E]">In Progress</option>
                              <option value="Completed" className="bg-white dark:bg-[#20201E]">Completed</option>
                              <option value="On Hold" className="bg-white dark:bg-[#20201E]">On Hold</option>
                              <option value="Blocked" className="bg-white dark:bg-[#20201E]">Blocked</option>
                            </select>
                          </div>
                        </div>

                        {/* Summary Text Input Block */}
                        <div className="flex flex-col gap-1 bg-[#F7F6F3] dark:bg-[#20201E] px-3 py-2 rounded-xl border border-[#EDECE9] dark:border-[#2C2C2A] relative">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-extrabold text-[#ACABA9] uppercase tracking-wider">Note Summary</span>
                            {update.details && update.details.trim().length > 3 && (
                              <button
                                onClick={() => handleSummarizeDescription(update.id, update.details)}
                                disabled={summarizingIds[update.id]}
                                className="text-[#2383E2] hover:text-[#2383E2]/80 disabled:text-[#ACABA9] transition-all flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                                title="Summarize with AI"
                              >
                                {summarizingIds[update.id] ? (
                                  <>
                                    <span className="w-2.5 h-2.5 border border-current border-t-transparent text-[#2383E2] rounded-full animate-spin" />
                                    <span>Summarizing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={10} className="text-[#2383E2] animate-pulse" />
                                    <span>AI Summarize</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={update.note}
                            onChange={(e) => handleUpdateField(update.id, 'note', e.target.value)}
                            placeholder="Brief summary of what's updated..."
                            className="bg-transparent border-none outline-none font-medium text-[#37352F] dark:text-[#E3E3E2] placeholder-[#ACABA9]/50 p-0 w-full text-xs focus:ring-0"
                          />
                        </div>

                        {/* Details Text Area Block */}
                        <div className="flex flex-col gap-1 bg-[#F7F6F3] dark:bg-[#20201E] px-3 py-2.5 rounded-xl border border-[#EDECE9] dark:border-[#2C2C2A] border-l-4 border-l-[#2383E2]">
                          <span className="text-[9px] font-extrabold text-[#ACABA9] uppercase tracking-wider">Detailed Description</span>
                          <textarea
                            value={update.details || ''}
                            onChange={(e) => handleUpdateField(update.id, 'details', e.target.value)}
                            placeholder="Enter bullet points, blockers, or details here..."
                            rows={3}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs text-[#37352F] dark:text-[#E3E3E2] placeholder-[#ACABA9]/50 leading-relaxed font-normal outline-none resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  )
                ))}

                {/* Empty State */}
                {(note.updates || []).length === 0 && (
                  <div className="flex justify-center py-4">
                    <button
                      onClick={handleAddUpdate}
                      className="px-5 py-2.5 bg-[#2383E2] text-white hover:bg-[#1a6fc2] rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      + Start an update log
                    </button>
                  </div>
                )}
              </div>

              {/* Add Updates Button */}
              {(note.updates || []).length > 0 && (
                <div className="mt-5 flex justify-center">
                  <button
                    onClick={handleAddUpdate}
                    className="px-6 py-2.5 bg-[#37352F] dark:bg-[#252523] hover:bg-black dark:hover:bg-black/40 text-white rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-transparent dark:border-[#2C2C2A]"
                  >
                    <span>+ Add updates</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
