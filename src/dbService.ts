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

// Local storage fallback helpers
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
    console.warn('Local storage write error:', err);
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
  // Real-time synchronization of notes with Firestore + LocalStorage Hybrid Fallback
  subscribeNotes(userId: string, onUpdate: (notes: Note[]) => void, _onError?: (error: Error) => void) {
    const key = getLocalKey('notes', userId);
    
    // Initial emit from local storage immediately so UI renders instantaneously
    const initialLocal = getLocalItems<Note>(key, []);
    onUpdate(initialLocal);

    // Listen for local changes across tabs or local operations
    const handleLocalSync = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.key === key) {
        onUpdate(getLocalItems<Note>(key, []));
      }
    };
    window.addEventListener('nestnote_local_sync', handleLocalSync);

    // Attempt Firestore real-time subscription
    let unsubscribeFirestore = () => {};
    try {
      const q = query(
        collection(db, NOTES_COLLECTION),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
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
          // Merge & update local cache
          setLocalItems(key, notes);
          onUpdate(notes);
        },
        (err) => {
          console.warn('Firestore notes subscription notice (using local storage):', err?.message || err);
          onUpdate(getLocalItems<Note>(key, []));
        }
      );
    } catch (err) {
      console.warn('Firestore subscription fallback:', err);
    }

    return () => {
      window.removeEventListener('nestnote_local_sync', handleLocalSync);
      unsubscribeFirestore();
    };
  },

  // Save a note to LocalStorage + Firestore
  async saveNote(note: Note, userId: string): Promise<void> {
    const key = getLocalKey('notes', userId);
    const updatedNote: Note = {
      ...note,
      userId,
      updatedAt: Date.now(),
    };

    // 1. Save to local storage immediately
    const currentLocal = getLocalItems<Note>(key, []);
    const idx = currentLocal.findIndex(n => n.id === note.id);
    if (idx >= 0) {
      currentLocal[idx] = updatedNote;
    } else {
      currentLocal.unshift(updatedNote);
    }
    setLocalItems(key, currentLocal);

    // 2. Attempt Firestore sync in background
    try {
      const noteRef = doc(db, NOTES_COLLECTION, note.id);
      const cleaned = cleanUndefined(updatedNote);
      await setDoc(noteRef, cleaned, { merge: true });
    } catch (err) {
      console.warn('Firestore background save notice (saved locally):', err);
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
  async deleteNote(id: string, userId?: string): Promise<void> {
    const currentUserId = userId || auth.currentUser?.uid || 'guest';
    const key = getLocalKey('notes', currentUserId);

    // 1. Delete locally
    const currentLocal = getLocalItems<Note>(key, []);
    const filtered = currentLocal.filter(n => n.id !== id);
    setLocalItems(key, filtered);

    // 2. Delete from Firestore
    try {
      const noteRef = doc(db, NOTES_COLLECTION, id);
      await deleteDoc(noteRef);
    } catch (err) {
      console.warn('Firestore delete notice:', err);
    }
  },

  // Real-time synchronization of workspaces with Hybrid Fallback
  subscribeWorkspaces(userId: string, onUpdate: (workspaces: Workspace[]) => void, _onError?: (error: Error) => void) {
    const key = getLocalKey('workspaces', userId);
    const defaultWorkspaces: Workspace[] = [
      { id: 'default_main', name: 'General Notes', icon: '📝', createdAt: Date.now(), accentColor: 'indigo', userId },
      { id: 'default_projects', name: 'Projects', icon: '🚀', createdAt: Date.now() + 1, accentColor: 'emerald', userId },
    ];

    const initialLocal = getLocalItems<Workspace>(key, defaultWorkspaces);
    onUpdate(initialLocal);

    const handleLocalSync = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.key === key) {
        onUpdate(getLocalItems<Workspace>(key, defaultWorkspaces));
      }
    };
    window.addEventListener('nestnote_local_sync', handleLocalSync);

    let unsubscribeFirestore = () => {};
    try {
      const q = query(
        collection(db, WORKSPACES_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'asc')
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
          if (workspaces.length > 0) {
            setLocalItems(key, workspaces);
            onUpdate(workspaces);
          }
        },
        (err) => {
          console.warn('Firestore workspaces subscription notice (using local storage):', err);
          onUpdate(getLocalItems<Workspace>(key, defaultWorkspaces));
        }
      );
    } catch (err) {
      console.warn('Firestore workspace subscription fallback:', err);
    }

    return () => {
      window.removeEventListener('nestnote_local_sync', handleLocalSync);
      unsubscribeFirestore();
    };
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
      console.warn('Firestore workspace save notice:', err);
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
  async deleteWorkspace(id: string, userId?: string): Promise<void> {
    const currentUserId = userId || auth.currentUser?.uid || 'guest';
    const key = getLocalKey('workspaces', currentUserId);

    const currentLocal = getLocalItems<Workspace>(key, []);
    const filtered = currentLocal.filter(w => w.id !== id);
    setLocalItems(key, filtered);

    try {
      const wsRef = doc(db, WORKSPACES_COLLECTION, id);
      await deleteDoc(wsRef);
    } catch (err) {
      console.warn('Firestore delete workspace notice:', err);
    }
  },

  // User Profile Management
  async saveUserProfile(user: User): Promise<void> {
    const key = getLocalKey('user_profile', user.uid);
    try {
      localStorage.setItem(key, JSON.stringify(user));
    } catch (e) {
      console.warn('Local profile save notice:', e);
    }

    try {
      const userRef = doc(db, USERS_COLLECTION, user.uid);
      await setDoc(userRef, cleanUndefined(user), { merge: true });
    } catch (err) {
      console.warn('Firestore profile save notice:', err);
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
        const profile: User = {
          uid: userSnap.id,
          email: data.email || '',
          displayName: data.displayName || null,
          photoURL: data.photoURL || null,
          createdAt: data.createdAt || Date.now(),
          lastLoginAt: data.lastLoginAt || Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(profile));
        return profile;
      }
    } catch (err) {
      console.warn('Firestore profile fetch notice:', err);
    }
    return null;
  },

  // Security Audit Logging
  async logSecurityEvent(userId: string, action: AuditLogEntry['action'], details: string): Promise<void> {
    const id = Math.random().toString(36).substring(2, 11);
    const entry: AuditLogEntry = {
      id,
      userId,
      action,
      details,
      timestamp: Date.now(),
    };

    const key = getLocalKey('audit_logs', userId);
    const currentLocal = getLocalItems<AuditLogEntry>(key, []);
    currentLocal.unshift(entry);
    setLocalItems(key, currentLocal.slice(0, 100));

    try {
      const logRef = doc(db, AUDIT_LOGS_COLLECTION, id);
      await setDoc(logRef, entry);
    } catch (err) {
      console.warn('Firestore audit log notice:', err);
    }
  },

  subscribeAuditLogs(userId: string, onUpdate: (logs: AuditLogEntry[]) => void, _onError?: (error: Error) => void) {
    const key = getLocalKey('audit_logs', userId);
    onUpdate(getLocalItems<AuditLogEntry>(key, []));

    const handleLocalSync = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.key === key) {
        onUpdate(getLocalItems<AuditLogEntry>(key, []));
      }
    };
    window.addEventListener('nestnote_local_sync', handleLocalSync);

    let unsubscribeFirestore = () => {};
    try {
      const q = query(
        collection(db, AUDIT_LOGS_COLLECTION),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
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
          if (logs.length > 0) {
            setLocalItems(key, logs);
            onUpdate(logs);
          }
        },
        (err) => {
          console.warn('Firestore audit logs subscription notice:', err);
          onUpdate(getLocalItems<AuditLogEntry>(key, []));
        }
      );
    } catch (err) {
      console.warn('Firestore audit logs fallback:', err);
    }

    return () => {
      window.removeEventListener('nestnote_local_sync', handleLocalSync);
      unsubscribeFirestore();
    };
  },

  // Export User Archive
  async exportUserData(userId: string) {
    const notes = getLocalItems<Note>(getLocalKey('notes', userId), []);
    const workspaces = getLocalItems<Workspace>(getLocalKey('workspaces', userId), []);
    const auditLogs = getLocalItems<AuditLogEntry>(getLocalKey('audit_logs', userId), []);
    const userProfile = await this.getUserProfile(userId);

    await this.logSecurityEvent(userId, 'EXPORT_DATA', 'Exported full user data archive (JSON)');

    return {
      exportedAt: new Date().toISOString(),
      userProfile,
      workspaces,
      notes,
      auditLogs,
    };
  },

  // Account Purge
  async purgeAccountData(userId: string): Promise<void> {
    localStorage.removeItem(getLocalKey('notes', userId));
    localStorage.removeItem(getLocalKey('workspaces', userId));
    localStorage.removeItem(getLocalKey('user_profile', userId));
    localStorage.removeItem(getLocalKey('audit_logs', userId));
    window.dispatchEvent(new CustomEvent('nestnote_local_sync', { detail: { key: getLocalKey('notes', userId) } }));

    try {
      const notesQuery = query(collection(db, NOTES_COLLECTION), where('userId', '==', userId));
      const notesSnap = await getDocs(notesQuery);
      for (const d of notesSnap.docs) {
        await deleteDoc(doc(db, NOTES_COLLECTION, d.id));
      }
    } catch (err) {
      console.warn('Firestore account purge notice:', err);
    }
  }
};
