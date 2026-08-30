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

// Helper for local storage key generation
const getLocalKey = (prefix: string, userId: string) => `nestnote_${prefix}_${userId}`;

function getLocalItems<T>(key: string, defaultItems: T[] = []): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultItems;
  } catch {
    return defaultItems;
  }
}

function setLocalItems<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('nestnote_local_sync', { detail: { key } }));
  } catch (err) {
    console.warn('Local storage write notice:', err);
  }
}

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
  // Real-time synchronization of notes with Cloud Firestore
  subscribeNotes(userId: string, onUpdate: (notes: Note[]) => void, onError?: (error: Error) => void) {
    const key = getLocalKey('notes', userId);
    
    // Emit local cache first for zero latency
    const initialLocal = getLocalItems<Note>(key, []);
    if (initialLocal.length > 0) {
      onUpdate(initialLocal);
    }

    let unsubscribeFirestore = () => {};
    try {
      const q = query(
        collection(db, NOTES_COLLECTION),
        where('userId', '==', userId)
      );

      unsubscribeFirestore = onSnapshot(
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
          // Sort client-side
          notes.sort((a, b) => b.updatedAt - a.updatedAt);
          setLocalItems(key, notes);
          onUpdate(notes);
        },
        (error) => {
          console.error('Firestore notes subscription error:', error);
          onUpdate(getLocalItems<Note>(key, []));
          if (onError) onError(error);
        }
      );
    } catch (error: any) {
      console.error('Firestore subscription exception:', error);
      onUpdate(getLocalItems<Note>(key, []));
      if (onError) onError(error);
    }

    return () => unsubscribeFirestore();
  },

  // Save a note to Cloud Firestore + Local Cache
  async saveNote(note: Note, userId: string): Promise<void> {
    const key = getLocalKey('notes', userId);
    const updatedNote: Note = {
      ...note,
      userId,
      updatedAt: Date.now(),
    };

    // Save locally for instant UI response
    const currentLocal = getLocalItems<Note>(key, []);
    const idx = currentLocal.findIndex(n => n.id === note.id);
    if (idx >= 0) {
      currentLocal[idx] = updatedNote;
    } else {
      currentLocal.unshift(updatedNote);
    }
    setLocalItems(key, currentLocal);

    // Save to Cloud Firestore
    try {
      const noteRef = doc(db, NOTES_COLLECTION, note.id);
      const cleanedNote = cleanUndefined(updatedNote);
      await setDoc(noteRef, cleanedNote, { merge: true });
    } catch (err: any) {
      console.error('CRITICAL FIRESTORE SAVE NOTE ERROR:', err?.message || err, err);
      // Re-throw so caller knows if Cloud Firestore rejected the save
      throw err;
    }
  },

  // Create and persist a new note
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

  // Delete a note
  async deleteNote(id: string): Promise<void> {
    const currentUserId = auth.currentUser?.uid || 'guest';
    const key = getLocalKey('notes', currentUserId);

    const currentLocal = getLocalItems<Note>(key, []);
    setLocalItems(key, currentLocal.filter(n => n.id !== id));

    try {
      const noteRef = doc(db, NOTES_COLLECTION, id);
      await deleteDoc(noteRef);
    } catch (err) {
      console.error('Firestore note delete error:', err);
    }
  },

  // Real-time synchronization of workspaces with Cloud Firestore
  subscribeWorkspaces(userId: string, onUpdate: (workspaces: Workspace[]) => void, onError?: (error: Error) => void) {
    const key = getLocalKey('workspaces', userId);
    const defaultWorkspace: Workspace = {
      id: 'default_main',
      name: 'Personal Home',
      icon: '🏡',
      createdAt: Date.now(),
      accentColor: 'indigo',
      userId,
    };

    const initialLocal = getLocalItems<Workspace>(key, [defaultWorkspace]);
    onUpdate(initialLocal);

    let unsubscribeFirestore = () => {};
    try {
      const q = query(
        collection(db, WORKSPACES_COLLECTION),
        where('userId', '==', userId)
      );

      unsubscribeFirestore = onSnapshot(
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
          workspaces.sort((a, b) => a.createdAt - b.createdAt);
          if (workspaces.length > 0) {
            setLocalItems(key, workspaces);
            onUpdate(workspaces);
          } else {
            setLocalItems(key, [defaultWorkspace]);
            onUpdate([defaultWorkspace]);
          }
        },
        (error) => {
          console.error('Firestore workspaces subscription error:', error);
          onUpdate(getLocalItems<Workspace>(key, [defaultWorkspace]));
          if (onError) onError(error);
        }
      );
    } catch (error: any) {
      console.error('Firestore workspaces subscription exception:', error);
      onUpdate(getLocalItems<Workspace>(key, [defaultWorkspace]));
      if (onError) onError(error);
    }

    return () => unsubscribeFirestore();
  },

  // Save a workspace
  async saveWorkspace(workspace: Workspace, userId: string): Promise<void> {
    const key = getLocalKey('workspaces', userId);
    const updated = { ...workspace, userId };

    const currentLocal = getLocalItems<Workspace>(key, []);
    const idx = currentLocal.findIndex(w => w.id === workspace.id);
    if (idx >= 0) {
      currentLocal[idx] = updated;
    } else {
      currentLocal.push(updated);
    }
    setLocalItems(key, currentLocal);

    try {
      const wsRef = doc(db, WORKSPACES_COLLECTION, workspace.id);
      await setDoc(wsRef, cleanUndefined(updated), { merge: true });
    } catch (err) {
      console.error('Firestore workspace save error:', err);
      throw err;
    }
  },

  // Create workspace
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

  // Delete workspace
  async deleteWorkspace(id: string): Promise<void> {
    const currentUserId = auth.currentUser?.uid || 'guest';
    const key = getLocalKey('workspaces', currentUserId);

    const currentLocal = getLocalItems<Workspace>(key, []);
    setLocalItems(key, currentLocal.filter(w => w.id !== id));

    try {
      const wsRef = doc(db, WORKSPACES_COLLECTION, id);
      await deleteDoc(wsRef);
    } catch (err) {
      console.error('Firestore workspace delete error:', err);
    }
  },

  // User Profile
  async saveUserProfile(user: User): Promise<void> {
    const key = getLocalKey('user_profile', user.uid);
    try {
      localStorage.setItem(key, JSON.stringify(user));
    } catch {}

    try {
      const userRef = doc(db, USERS_COLLECTION, user.uid);
      await setDoc(userRef, cleanUndefined(user), { merge: true });
    } catch (err) {
      console.error('Firestore user profile save error:', err);
    }
  },

  async getUserProfile(uid: string): Promise<User | null> {
    const key = getLocalKey('user_profile', uid);
    try {
      const cached = localStorage.getItem(key);
      if (cached) return JSON.parse(cached);
    } catch {}

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
    } catch (err) {
      console.error('Firestore user profile get error:', err);
    }
    return null;
  },

  // Audit Logs
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
    } catch (err) {
      console.warn('Audit log error:', err);
    }
  },

  subscribeAuditLogs(userId: string, onUpdate: (logs: AuditLogEntry[]) => void, onError?: (error: Error) => void) {
    const key = getLocalKey('audit_logs', userId);
    onUpdate(getLocalItems<AuditLogEntry>(key, []));

    let unsubscribeFirestore = () => {};
    try {
      const q = query(
        collection(db, AUDIT_LOGS_COLLECTION),
        where('userId', '==', userId),
        limit(50)
      );

      unsubscribeFirestore = onSnapshot(
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
          logs.sort((a, b) => b.timestamp - a.timestamp);
          if (logs.length > 0) {
            setLocalItems(key, logs);
            onUpdate(logs);
          }
        },
        (error) => {
          console.error('Firestore audit logs subscription error:', error);
          if (onError) onError(error);
        }
      );
    } catch (err: any) {
      console.error('Firestore audit logs exception:', err);
      if (onError) onError(err);
    }

    return () => unsubscribeFirestore();
  },

  // Export User Data
  async exportUserData(userId: string) {
    const userProfile = await this.getUserProfile(userId);
    const notes = getLocalItems<Note>(getLocalKey('notes', userId), []);
    const workspaces = getLocalItems<Workspace>(getLocalKey('workspaces', userId), []);
    const auditLogs = getLocalItems<AuditLogEntry>(getLocalKey('audit_logs', userId), []);

    await this.logSecurityEvent(userId, 'EXPORT_DATA', 'Exported user data archive');

    return {
      exportedAt: new Date().toISOString(),
      userProfile,
      workspaces,
      notes,
      auditLogs,
    };
  },

  // Purge Account Data
  async purgeAccountData(userId: string): Promise<void> {
    localStorage.removeItem(getLocalKey('notes', userId));
    localStorage.removeItem(getLocalKey('workspaces', userId));
    localStorage.removeItem(getLocalKey('user_profile', userId));
    localStorage.removeItem(getLocalKey('audit_logs', userId));

    try {
      const notesQuery = query(collection(db, NOTES_COLLECTION), where('userId', '==', userId));
      const notesSnap = await getDocs(notesQuery);
      for (const d of notesSnap.docs) {
        await deleteDoc(doc(db, NOTES_COLLECTION, d.id));
      }
    } catch (err) {
      console.error('Firestore account purge error:', err);
    }
  }
};
