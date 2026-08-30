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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
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
  // Real-time synchronization of all notes for a specific user
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
        snapshot.forEach((doc) => {
          const data = doc.data();
          notes.push({
            id: doc.id,
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
        const errInfo = handleFirestoreError(error, OperationType.GET, NOTES_COLLECTION);
        if (onError) onError(new Error(JSON.stringify(errInfo)));
      }
    );
  },

  // Save a note to Firestore
  async saveNote(note: Note, userId: string): Promise<void> {
    const noteRef = doc(db, NOTES_COLLECTION, note.id);
    const updatedNote = {
      ...note,
      userId,
      updatedAt: Date.now(),
    };
    const cleanedNote = cleanUndefined(updatedNote);
    try {
      await setDoc(noteRef, cleanedNote, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${NOTES_COLLECTION}/${note.id}`);
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

  // Delete a note from Firestore
  async deleteNote(id: string): Promise<void> {
    try {
      const noteRef = doc(db, NOTES_COLLECTION, id);
      await deleteDoc(noteRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${NOTES_COLLECTION}/${id}`);
    }
  },

  // Real-time synchronization of all workspaces for a specific user
  subscribeWorkspaces(userId: string, onUpdate: (workspaces: Workspace[]) => void, onError?: (error: Error) => void) {
    const q = query(
      collection(db, 'workspaces'),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const workspaces: Workspace[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          workspaces.push({
            id: doc.id,
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
        const errInfo = handleFirestoreError(error, OperationType.GET, 'workspaces');
        if (onError) onError(new Error(JSON.stringify(errInfo)));
      }
    );
  },

  // Save a workspace
  async saveWorkspace(workspace: Workspace, userId: string): Promise<void> {
    const wsRef = doc(db, 'workspaces', workspace.id);
    const cleaned = cleanUndefined({ ...workspace, userId });
    try {
      await setDoc(wsRef, cleaned, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `workspaces/${workspace.id}`);
    }
  },

  // Create and persist a new workspace
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

  // Delete a workspace
  async deleteWorkspace(id: string): Promise<void> {
    try {
      const wsRef = doc(db, 'workspaces', id);
      await deleteDoc(wsRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workspaces/${id}`);
    }
  },

  // Save or update user profile
  async saveUserProfile(user: User): Promise<void> {
    const userRef = doc(db, 'users', user.uid);
    const cleaned = cleanUndefined(user);
    try {
      await setDoc(userRef, cleaned, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  },

  // Fetch a user profile
  async getUserProfile(uid: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', uid);
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
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      return null;
    }
  },

  // Log security / governance event
  async logSecurityEvent(userId: string, action: AuditLogEntry['action'], details: string): Promise<void> {
    try {
      const id = Math.random().toString(36).substring(2, 11);
      const logRef = doc(db, 'auditLogs', id);
      const entry: AuditLogEntry = {
        id,
        userId,
        action,
        details,
        timestamp: Date.now(),
      };
      await setDoc(logRef, entry);
    } catch (error) {
      console.warn('Failed to record security audit log:', error);
    }
  },

  // Subscribe real-time audit logs for a user
  subscribeAuditLogs(userId: string, onUpdate: (logs: AuditLogEntry[]) => void, onError?: (error: Error) => void) {
    const q = query(
      collection(db, 'auditLogs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const logs: AuditLogEntry[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          logs.push({
            id: doc.id,
            userId: data.userId,
            action: data.action,
            details: data.details,
            timestamp: data.timestamp || Date.now(),
          });
        });
        onUpdate(logs);
      },
      (error) => {
        const errInfo = handleFirestoreError(error, OperationType.GET, 'auditLogs');
        if (onError) onError(new Error(JSON.stringify(errInfo)));
      }
    );
  },

  // Full User Data Export (JSON export compliance)
  async exportUserData(userId: string) {
    try {
      // 1. Fetch user profile
      const userProfile = await this.getUserProfile(userId);

      // 2. Fetch all workspaces
      const wsQuery = query(collection(db, 'workspaces'), where('userId', '==', userId));
      const wsSnap = await getDocs(wsQuery);
      const workspaces: Workspace[] = [];
      wsSnap.forEach(d => workspaces.push({ id: d.id, ...d.data() } as Workspace));

      // 3. Fetch all notes
      const notesQuery = query(collection(db, NOTES_COLLECTION), where('userId', '==', userId));
      const notesSnap = await getDocs(notesQuery);
      const notes: Note[] = [];
      notesSnap.forEach(d => notes.push({ id: d.id, ...d.data() } as Note));

      // 4. Fetch audit logs
      const logsQuery = query(collection(db, 'auditLogs'), where('userId', '==', userId));
      const logsSnap = await getDocs(logsQuery);
      const auditLogs: AuditLogEntry[] = [];
      logsSnap.forEach(d => auditLogs.push({ id: d.id, ...d.data() } as AuditLogEntry));

      await this.logSecurityEvent(userId, 'EXPORT_DATA', 'Exported full user data archive (JSON)');

      return {
        exportedAt: new Date().toISOString(),
        userProfile,
        workspaces,
        notes,
        auditLogs,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'user_data_export');
      throw error;
    }
  },

  // Complete User Account Data Purge
  async purgeAccountData(userId: string): Promise<void> {
    try {
      // 1. Delete all notes
      const notesQuery = query(collection(db, NOTES_COLLECTION), where('userId', '==', userId));
      const notesSnap = await getDocs(notesQuery);
      for (const docSnap of notesSnap.docs) {
        await deleteDoc(doc(db, NOTES_COLLECTION, docSnap.id));
      }

      // 2. Delete all workspaces
      const wsQuery = query(collection(db, 'workspaces'), where('userId', '==', userId));
      const wsSnap = await getDocs(wsQuery);
      for (const docSnap of wsSnap.docs) {
        await deleteDoc(doc(db, 'workspaces', docSnap.id));
      }

      // 3. Delete all audit logs
      const logsQuery = query(collection(db, 'auditLogs'), where('userId', '==', userId));
      const logsSnap = await getDocs(logsQuery);
      for (const docSnap of logsSnap.docs) {
        await deleteDoc(doc(db, 'auditLogs', docSnap.id));
      }

      // 4. Delete user profile document
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}_purge`);
      throw error;
    }
  }
};
