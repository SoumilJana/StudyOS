export type SyncProvider = 'supabase' | 'firebase' | 'local_only';

export type SyncStatusState =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error'
  | 'conflict';

export type SyncConflictPolicy = 'last_write_wins' | 'server_wins' | 'client_wins';

export type SyncEntityType =
  | 'subject'
  | 'deadline'
  | 'project'
  | 'task'
  | 'deck'
  | 'flashcard'
  | 'question'
  | 'mistake'
  | 'revision'
  | 'timeLog'
  | 'focusSession'
  | 'gamification'
  | 'settings';

export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncMutation {
  id: string; // unique mutation UUID
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload: any;
  timestamp: number; // local epoch ms
  retryCount: number;
}

export interface SyncDiagnostics {
  provider: SyncProvider;
  state: SyncStatusState;
  isOnline: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  pendingMutationsCount: number;
  lastSyncedAt: string | null; // ISO or formatted
  lastError: string | null;
  realtimeActive: boolean;
  autoSyncEnabled: boolean;
  conflictPolicy: SyncConflictPolicy;
}

export interface RemoteChange {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  newRecord?: any;
  oldRecord?: any;
  timestamp: string;
}
