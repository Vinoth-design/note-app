import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Note, Block, Workspace, User, AuditLogEntry } from './types';

const NOTES_COLLECTION = 'notes';
const WORKSPACES_COLLECTION = 'workspaces';
const USERS_COLLECTION = 'users';
const AUDIT_LOGS_COLLECTION = 'auditLogs';

// Helper to create a default blank block
export const createDefaultBlock = (type: Block['type'] = 'text'): Block => ({
  id: Math.random().toString(36).substring(2, 11),
  type,
  content: '',
  properties: type === 'todo' ? { checked: false } : type === 'code' ? { language: 'javascript' } : type === 'callout' ? { emoji: '💡' } : {},
});

// Helper to create a new blank note
export const createBlankNote = (
  title: string = '',
  scheduledDate: string | null = null,
  workspaceId?: string | null,
  description?: string | null
): Note => {
  const id = Math.random().toString(36).substring(2, 11);
  const now = Date.now();
  
  let blocks: Block[] = [];
  if (description && description.trim()) {
    const lines = description.trim().split(/\n+/);
    blocks = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return {
          id: Math.random().toString(36).substring(2, 11),
          type: 'bullet',
          content: trimmed.replace(/^[-*]\s+/, ''),
          properties: {},
        };
      }
      if (trimmed.startsWith('[ ] ') || trimmed.startsWith('TODO: ')) {
        return {
          id: Math.random().toString(36).substring(2, 11),
          type: 'todo',
          content: trimmed.replace(/^(\[ \]|TODO:)\s+/, ''),
          properties: { checked: false },
        };
      }
      return {
        id: Math.random().toString(36).substring(2, 11),
        type: 'text',
        content: trimmed,
        properties: {},
      };
    });
  }

  if (blocks.length === 0) {
    blocks = [createDefaultBlock('text')];
  }

  return {
    id,
    title: title || 'Untitled Task',
    emoji: '📝',
    blocks,
    createdAt: now,
    updatedAt: now,
    scheduledDate: scheduledDate,
    isFavorite: false,
    isArchived: false,
    recurrence: 'None',
    tags: [],
    updates: [],
    workspaceId: workspaceId || undefined,
  };
};

function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          res[key] = cleanUndefined(val);
        }
      }
    }
    return res as T;
  }
  return obj;
}

export const dbService = {
  // Real-time synchronization of all notes for a specific user via Cloud Firestore
  subscribeNotes(userId: string, onUpdate: (notes: Note[]) => void, onError?: (error: Error) => void) {
    const q = query(
      collection(db, NOTES_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const notes: Note[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          notes.push({
            id: docSnap.id,
            title: data.title || '',
            emoji: data.emoji || '📝',
            coverImage: data.coverImage,
            blocks: data.blocks || [],
            createdAt: data.createdAt || Date.now(),
            updatedAt: data.updatedAt || Date.now(),
            scheduledDate: data.scheduledDate || null,
            dueDate: data.dueDate || null,
            recurrence: data.recurrence || 'None',
            remindersEnabled: !!data.remindersEnabled,
            isFavorite: !!data.isFavorite,
            isArchived: !!data.isArchived,
            status: data.status || undefined,
            priority: data.priority || undefined,
            assignee: data.assignee || undefined,
            assets: data.assets || undefined,
            tags: data.tags || [],
            updates: data.updates || [],
            workspaceId: data.workspaceId || undefined,
            userId: data.userId || undefined,
          });
        });
        onUpdate(notes);
      },
      (error) => {
        console.error('Firestore notes subscription error:', error);
        if (onError) onError(error);
      }
    );
  },

  // Save a note to Cloud Firestore
  async saveNote(note: Note, userId: string): Promise<void> {
    const noteRef = doc(db, NOTES_COLLECTION, note.id);
    const updatedNote = {
      ...note,
      userId,
      updatedAt: Date.now(),
    };
    const cleanedNote = cleanUndefined(updatedNote);
    await setDoc(noteRef, cleanedNote, { merge: true });
  },

  // Create and persist a new note to Cloud Firestore
  async createNewNote(
    title: string,
    userId: string,
    scheduledDate: string | null = null,
    workspaceId?: string | null,
    description?: string | null
  ): Promise<Note> {
    const note = createBlankNote(title, scheduledDate, workspaceId, description);
    note.userId = userId;
    await this.saveNote(note, userId);
    return note;
  },

  // Delete a note from Cloud Firestore
  async deleteNote(id: string): Promise<void> {
    const noteRef = doc(db, NOTES_COLLECTION, id);
    await deleteDoc(noteRef);
  },

  // Real-time synchronization of all workspaces for a specific user via Cloud Firestore
  subscribeWorkspaces(userId: string, onUpdate: (workspaces: Workspace[]) => void, onError?: (error: Error) => void) {
    const q = query(
      collection(db, WORKSPACES_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const workspaces: Workspace[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          workspaces.push({
            id: docSnap.id,
            name: data.name || 'Untitled Workspace',
            icon: data.icon || '💼',
            createdAt: data.createdAt || Date.now(),
            accentColor: data.accentColor || 'indigo',
            userId: data.userId || undefined,
          });
        });
        onUpdate(workspaces);
      },
      (error) => {
        console.error('Firestore workspaces subscription error:', error);
        if (onError) onError(error);
      }
    );
  },

  // Save a workspace to Cloud Firestore
  async saveWorkspace(workspace: Workspace, userId: string): Promise<void> {
    const wsRef = doc(db, WORKSPACES_COLLECTION, workspace.id);
    const cleaned = cleanUndefined({ ...workspace, userId });
    await setDoc(wsRef, cleaned, { merge: true });
  },

  // Create and persist a new workspace in Cloud Firestore
  async createNewWorkspace(name: string, userId: string, icon: string = '💼', accentColor: string = 'indigo'): Promise<Workspace> {
    const id = Math.random().toString(36).substring(2, 11);
    const ws: Workspace = {
      id,
      name,
      icon,
      createdAt: Date.now(),
      accentColor,
      userId,
    };
    await this.saveWorkspace(ws, userId);
    return ws;
  },

  // Delete a workspace from Cloud Firestore
  async deleteWorkspace(id: string): Promise<void> {
    const wsRef = doc(db, WORKSPACES_COLLECTION, id);
    await deleteDoc(wsRef);
  },

  // Save or update user profile in Cloud Firestore
  async saveUserProfile(user: User): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const cleaned = cleanUndefined(user);
    await setDoc(userRef, cleaned, { merge: true });
  },

  // Fetch a user profile from Cloud Firestore
  async getUserProfile(uid: string): Promise<User | null> {
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          uid: userSnap.id,
          email: data.email || '',
          displayName: data.displayName || null,
          photoURL: data.photoURL || null,
          createdAt: data.createdAt || Date.now(),
          lastLoginAt: data.lastLoginAt || Date.now(),
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },

  // Log security event in Cloud Firestore
  async logSecurityEvent(userId: string, action: AuditLogEntry['action'], details: string): Promise<void> {
    try {
      const id = Math.random().toString(36).substring(2, 11);
      const logRef = doc(db, AUDIT_LOGS_COLLECTION, id);
      const entry: AuditLogEntry = {
        id,
        userId,
        action,
        details,
        timestamp: Date.now(),
      };
      await setDoc(logRef, entry);
    } catch (error) {
      console.warn('Failed to record audit log:', error);
    }
  },

  // Subscribe real-time audit logs from Cloud Firestore
  subscribeAuditLogs(userId: string, onUpdate: (logs: AuditLogEntry[]) => void, onError?: (error: Error) => void) {
    const q = query(
      collection(db, AUDIT_LOGS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const logs: AuditLogEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          logs.push({
            id: docSnap.id,
            userId: data.userId,
            action: data.action,
            details: data.details,
            timestamp: data.timestamp || Date.now(),
          });
        });
        onUpdate(logs);
      },
      (error) => {
        console.error('Firestore audit logs subscription error:', error);
        if (onError) onError(error);
      }
    );
  },

  // Export User Data from Cloud Firestore
  async exportUserData(userId: string) {
    const userProfile = await this.getUserProfile(userId);

    const wsQuery = query(collection(db, WORKSPACES_COLLECTION), where('userId', '==', userId));
    const wsSnap = await getDocs(wsQuery);
    const workspaces: Workspace[] = [];
    wsSnap.forEach(d => workspaces.push({ id: d.id, ...d.data() } as Workspace));

    const notesQuery = query(collection(db, NOTES_COLLECTION), where('userId', '==', userId));
    const notesSnap = await getDocs(notesQuery);
    const notes: Note[] = [];
    notesSnap.forEach(d => notes.push({ id: d.id, ...d.data() } as Note));

    const logsQuery = query(collection(db, AUDIT_LOGS_COLLECTION), where('userId', '==', userId));
    const logsSnap = await getDocs(logsQuery);
    const auditLogs: AuditLogEntry[] = [];
    logsSnap.forEach(d => auditLogs.push({ id: d.id, ...d.data() } as AuditLogEntry));

    await this.logSecurityEvent(userId, 'EXPORT_DATA', 'Exported full user data archive');

    return {
      exportedAt: new Date().toISOString(),
      userProfile,
      workspaces,
      notes,
      auditLogs,
    };
  },

  // Purge Account Data from Cloud Firestore
  async purgeAccountData(userId: string): Promise<void> {
    const notesQuery = query(collection(db, NOTES_COLLECTION), where('userId', '==', userId));
    const notesSnap = await getDocs(notesQuery);
    for (const docSnap of notesSnap.docs) {
      await deleteDoc(doc(db, NOTES_COLLECTION, docSnap.id));
    }

    const wsQuery = query(collection(db, WORKSPACES_COLLECTION), where('userId', '==', userId));
    const wsSnap = await getDocs(wsQuery);
    for (const docSnap of wsSnap.docs) {
      await deleteDoc(doc(db, WORKSPACES_COLLECTION, docSnap.id));
    }

    const logsQuery = query(collection(db, AUDIT_LOGS_COLLECTION), where('userId', '==', userId));
    const logsSnap = await getDocs(logsQuery);
    for (const docSnap of logsSnap.docs) {
      await deleteDoc(doc(db, AUDIT_LOGS_COLLECTION, docSnap.id));
    }

    await deleteDoc(doc(db, USERS_COLLECTION, userId));
  }
};
