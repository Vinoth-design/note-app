export type BlockType =
  | 'text'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'todo'
  | 'quote'
  | 'code'
  | 'image'
  | 'callout';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  properties?: {
    checked?: boolean;
    language?: string;
    caption?: string;
    emoji?: string; // used for callouts
  };
}

export interface TaskUpdate {
  id: string;
  number: number;
  date: string;
  updateFrom: string;
  status: string;
  note: string;
  details?: string;
  isExpanded?: boolean;
}

export interface Note {
  id: string;
  title: string;
  emoji: string; // Notion-style icon
  coverImage?: string; // URL or preset
  blocks: Block[];
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  scheduledDate?: string | null; // YYYY-MM-DD
  dueDate?: string | null; // YYYY-MM-DD (deadline)
  recurrence?: 'None' | 'Daily' | 'Weekly' | 'Monthly'; // recurrence pattern
  remindersEnabled?: boolean; // daily reminder when open
  isFavorite?: boolean;
  isArchived?: boolean;
  status?: 'Not Started' | 'In Progress' | 'Hold' | 'Completed';
  priority?: 'Low' | 'Medium' | 'High';
  assignee?: string;
  assets?: { name: string; size: string; type: string }[];
  tags?: string[];
  updates?: TaskUpdate[];
  workspaceId?: string; // ID of the workspace this task belongs to
  userId?: string; // Owner ID for multi-user isolation
}

export interface Workspace {
  id: string;
  name: string;
  icon?: string; // Emoji
  createdAt: number;
  accentColor?: string; // Custom accent color (indigo, rose, emerald, amber)
  userId?: string; // Owner ID for multi-user isolation
}

export interface User {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  createdAt: number;
  lastLoginAt: number;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: 'LOGIN' | 'CREATE_WORKSPACE' | 'DELETE_WORKSPACE' | 'UPDATE_PROFILE' | 'EXPORT_DATA' | 'PURGE_ACCOUNT' | 'ARCHIVE_TASK' | 'RESTORE_TASK' | 'CREATE_TASK' | 'DELETE_TASK';
  details: string;
  timestamp: number;
}

export type ViewMode = 'editor' | 'calendar' | 'dashboard' | 'all-tasks' | 'test-bench' | 'settings';
