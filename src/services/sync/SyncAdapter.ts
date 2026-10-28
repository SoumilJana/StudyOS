import { SyncMutation, SyncProvider, RemoteChange } from './types';

export interface PushResult {
  appliedMutationIds: string[];
  failedMutations: { id: string; error: string }[];
}

export interface PullResult {
  entities: Record<string, any[]>;
  timestamp: number;
}

/**
 * Universal Cloud Sync Adapter Interface.
 * Allows pluggable sync backends (Supabase PostgreSQL, Firebase Firestore, etc.)
 * without leaking provider-specific code into the core application.
 */
export interface CloudSyncAdapter {
  readonly provider: SyncProvider;

  /** Initialize adapter with user identity */
  initialize(userId: string): Promise<void>;

  /** Clean up channels and resources */
  destroy(): void;

  /** Push a batch of pending local mutations to cloud */
  pushMutations(mutations: SyncMutation[], userId: string): Promise<PushResult>;

  /** Pull latest cloud records */
  pullLatestChanges(userId: string, sinceTimestamp?: number): Promise<PullResult>;

  /** Subscribe to remote multi-device updates via WebSockets */
  subscribeToRealtime(
    userId: string,
    onRemoteChange: (change: RemoteChange) => void
  ): () => void;
}
