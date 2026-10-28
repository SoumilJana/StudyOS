import {
  SyncDiagnostics,
  SyncMutation,
  SyncStatusState,
  SyncConflictPolicy,
  SyncEntityType,
  SyncOperation,
  RemoteChange,
} from './types';
import { CloudSyncAdapter } from './SyncAdapter';
import { SupabaseSyncAdapter } from './SupabaseSyncAdapter';
import { supabase } from '../supabaseClient';
import { storage } from '../storage';
import { Deadline, Task, Project } from '../../types';

type SyncListener = (diag: SyncDiagnostics) => void;

class SyncManager {
  private adapter: CloudSyncAdapter;
  private queue: SyncMutation[] = [];
  private listeners: Set<SyncListener> = new Set();

  private state: SyncStatusState = 'idle';
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private userId: string | null = null;
  private realtimeActive: boolean = false;
  private autoSyncEnabled: boolean = true;
  private conflictPolicy: SyncConflictPolicy = 'last_write_wins';
  private isReconciling: boolean = false;

  private debounceTimer: any = null;
  private periodicTimer: any = null;
  private realtimeUnsubscribe: (() => void) | null = null;

  constructor() {
    this.adapter = new SupabaseSyncAdapter();
    this.loadQueue();
    this.initNetworkListeners();
    this.initAuthListener();
    this.startPeriodicSync();

    // Hook directly into local storage mutations
    storage.setMutationHook((entityType, entityId, operation, payload) => {
      if (this.isReconciling) return;
      this.enqueueMutation(entityType as any, entityId, operation, payload);
    });
  }

  // ========================================================
  // Outbox Mutation Queue
  // ========================================================
  private loadQueue(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('study_os_sync_queue');
        if (raw) {
          this.queue = JSON.parse(raw);
        }
      }
    } catch {
      this.queue = [];
    }
  }

  private persistQueue(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('study_os_sync_queue', JSON.stringify(this.queue));
      }
    } catch (e) {
      console.warn('[SyncManager] Failed to persist outbox queue:', e);
    }
  }

  /**
   * Enqueue a local mutation into the offline outbox.
   * Operations are coalesced to prevent redundant network traffic.
   */
  public enqueueMutation(
    entityType: SyncEntityType,
    entityId: string,
    operation: SyncOperation,
    payload: any
  ): void {
    const timestamp = Date.now();

    // Coalesce updates for the same entity if already pending in queue
    const existingIdx = this.queue.findIndex(
      (m) => m.entityType === entityType && m.entityId === entityId
    );

    if (existingIdx >= 0) {
      if (operation === 'delete') {
        // If it was created offline and now deleted, simply remove from queue
        if (this.queue[existingIdx].operation === 'create') {
          this.queue.splice(existingIdx, 1);
        } else {
          this.queue[existingIdx].operation = 'delete';
          this.queue[existingIdx].timestamp = timestamp;
        }
      } else {
        // Merge or replace payload
        this.queue[existingIdx].payload = payload;
        this.queue[existingIdx].timestamp = timestamp;
      }
    } else {
      const mutation: SyncMutation = {
        id: `mut-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        entityType,
        entityId,
        operation,
        payload,
        timestamp,
        retryCount: 0,
      };
      this.queue.push(mutation);
    }

    this.persistQueue();
    this.notify();

    // Auto-sync debounce
    if (this.autoSyncEnabled && this.isOnline && this.userId) {
      this.scheduleDebouncedSync(2000);
    }
  }

  // ========================================================
  // Network & Auth Observers
  // ========================================================
  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.state = 'idle';
      this.notify();
      // Reconnected! Flush outbox immediately
      if (this.userId) {
        this.flushOutbox();
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.state = 'offline';
      this.notify();
    });
  }

  private initAuthListener(): void {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user || null;
      this.setUserId(user ? user.id : null);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      this.setUserId(user ? user.id : null);
    });
  }

  private setUserId(newUserId: string | null): void {
    const changed = this.userId !== newUserId;
    this.userId = newUserId;

    if (changed) {
      if (this.userId) {
        // User logged in: connect realtime & pull latest snapshot
        this.connectRealtime();
        this.pullAndReconcile();
      } else {
        // User logged out: tear down realtime
        if (this.realtimeUnsubscribe) {
          this.realtimeUnsubscribe();
          this.realtimeUnsubscribe = null;
          this.realtimeActive = false;
        }
      }
      this.notify();
    }
  }

  private connectRealtime(): void {
    if (!this.userId) return;
    if (this.realtimeUnsubscribe) {
      this.realtimeUnsubscribe();
    }

    try {
      this.realtimeUnsubscribe = this.adapter.subscribeToRealtime(
        this.userId,
        (change) => this.handleRemoteRealtimeChange(change)
      );
      this.realtimeActive = true;
    } catch (err) {
      console.warn('[SyncManager] Realtime subscription failed:', err);
      this.realtimeActive = false;
    }
  }

  private startPeriodicSync(): void {
    if (typeof window === 'undefined') return;
    this.periodicTimer = setInterval(() => {
      if (this.autoSyncEnabled && this.isOnline && this.userId && this.state !== 'syncing') {
        if (this.queue.length > 0) {
          this.flushOutbox();
        } else {
          this.pullAndReconcile();
        }
      }
    }, 45000); // 45 seconds interval
  }

  private scheduleDebouncedSync(delayMs: number): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.flushOutbox();
    }, delayMs);
  }

  // ========================================================
  // Core Synchronization Engine
  // ========================================================

  /**
   * Push all pending outbox mutations to the cloud
   */
  public async flushOutbox(): Promise<{ success: boolean; appliedCount: number }> {
    if (!this.userId) {
      return { success: false, appliedCount: 0 };
    }
    if (!this.isOnline) {
      this.state = 'offline';
      this.notify();
      return { success: false, appliedCount: 0 };
    }
    if (this.queue.length === 0) {
      return { success: true, appliedCount: 0 };
    }

    this.state = 'syncing';
    this.notify();

    try {
      const batch = [...this.queue];
      const result = await this.adapter.pushMutations(batch, this.userId);

      // Remove applied mutations from queue
      const appliedSet = new Set(result.appliedMutationIds);
      this.queue = this.queue.filter((m) => !appliedSet.has(m.id));

      // Handle failures
      result.failedMutations.forEach((f) => {
        const item = this.queue.find((m) => m.id === f.id);
        if (item) item.retryCount += 1;
      });

      this.persistQueue();

      this.lastSyncedAt = new Date().toLocaleTimeString();
      this.state = this.queue.length > 0 ? 'error' : 'synced';
      this.lastError = result.failedMutations.length > 0
        ? `${result.failedMutations.length} mutations failed to sync.`
        : null;

      this.notify();
      return { success: result.failedMutations.length === 0, appliedCount: result.appliedMutationIds.length };
    } catch (err: any) {
      console.error('[SyncManager] Flush outbox error:', err);
      this.state = 'error';
      this.lastError = err.message || 'Sync failed';
      this.notify();
      return { success: false, appliedCount: 0 };
    }
  }

  /**
   * Pull latest cloud snapshot and merge using conflict resolution
   */
  public async pullAndReconcile(): Promise<void> {
    if (!this.userId || !this.isOnline) return;

    this.isReconciling = true;
    try {
      const { entities } = await this.adapter.pullLatestChanges(this.userId);

      // Reconcile Deadlines
      if (entities.deadlines && entities.deadlines.length > 0) {
        entities.deadlines.forEach((cd) => {
          const dl: Deadline = {
            id: cd.id,
            title: cd.title,
            description: cd.description || '',
            category: cd.category,
            dueDate: cd.due_date,
            priority: cd.priority,
            estimatedWorkloadHours: cd.estimated_workload_hours,
            status: cd.status,
            backwardPlan: cd.backward_plan || [],
            createdAt: cd.created_at || new Date().toISOString(),
          };
          // Don't overwrite if client has pending outbox mutation for this id
          const isPending = this.queue.some((m) => m.entityType === 'deadline' && m.entityId === dl.id);
          if (!isPending || this.conflictPolicy === 'server_wins') {
            storage.saveDeadline(dl);
          }
        });
      }

      // Reconcile Tasks
      if (entities.tasks && entities.tasks.length > 0) {
        entities.tasks.forEach((ct) => {
          const t: Task = {
            id: ct.id,
            title: ct.title,
            description: ct.description || '',
            status: ct.status,
            priority: ct.priority,
            dueDate: ct.due_date,
            estimatedMinutes: ct.estimated_minutes,
            actualMinutes: ct.actual_minutes,
            category: ct.category,
            projectId: ct.project_id,
            dependencies: ct.dependencies || [],
            subtasks: ct.subtasks || [],
            createdAt: ct.created_at || new Date().toISOString(),
          };
          const isPending = this.queue.some((m) => m.entityType === 'task' && m.entityId === t.id);
          if (!isPending || this.conflictPolicy === 'server_wins') {
            storage.saveTask(t);
          }
        });
      }

      // Reconcile Projects
      if (entities.projects && entities.projects.length > 0) {
        entities.projects.forEach((cp) => {
          const p: Project = {
            id: cp.id,
            title: cp.title,
            description: cp.description || '',
            status: cp.status,
            priority: cp.priority,
            startDate: cp.start_date,
            targetDate: cp.target_date,
            estimatedHours: cp.estimated_hours,
            actualHoursTracked: cp.actual_hours_tracked,
            milestones: cp.milestones || [],
            tags: cp.tags || [],
            createdAt: cp.created_at || new Date().toISOString(),
          };
          const isPending = this.queue.some((m) => m.entityType === 'project' && m.entityId === p.id);
          if (!isPending || this.conflictPolicy === 'server_wins') {
            storage.saveProject(p);
          }
        });
      }

      this.lastSyncedAt = new Date().toLocaleTimeString();
      if (this.queue.length === 0) {
        this.state = 'synced';
      }
      this.notify();
    } catch (err) {
      console.warn('[SyncManager] Pull and reconcile warning:', err);
    } finally {
      this.isReconciling = false;
    }
  }

  /**
   * Handle real-time WebSocket events from other devices
   */
  private handleRemoteRealtimeChange(change: RemoteChange): void {
    if (!this.userId) return;

    this.isReconciling = true;
    try {

    if (change.table === 'deadlines' && change.newRecord) {
      const cd = change.newRecord;
      const isPending = this.queue.some((m) => m.entityType === 'deadline' && m.entityId === cd.id);
      if (!isPending) {
        storage.saveDeadline({
          id: cd.id,
          title: cd.title,
          description: cd.description || '',
          category: cd.category,
          dueDate: cd.due_date,
          priority: cd.priority,
          estimatedWorkloadHours: cd.estimated_workload_hours,
          status: cd.status,
          backwardPlan: cd.backward_plan || [],
          createdAt: cd.created_at,
        });
      }
    } else if (change.table === 'tasks' && change.newRecord) {
      const ct = change.newRecord;
      const isPending = this.queue.some((m) => m.entityType === 'task' && m.entityId === ct.id);
      if (!isPending) {
        storage.saveTask({
          id: ct.id,
          title: ct.title,
          description: ct.description || '',
          status: ct.status,
          priority: ct.priority,
          dueDate: ct.due_date,
          estimatedMinutes: ct.estimated_minutes,
          actualMinutes: ct.actual_minutes,
          category: ct.category,
          projectId: ct.project_id,
          dependencies: ct.dependencies || [],
          subtasks: ct.subtasks || [],
          createdAt: ct.created_at,
        });
      }
    } else if (change.table === 'gamification_state' && change.newRecord) {
      const g = change.newRecord;
      const cur = storage.getGamification();
      if (g.xp > cur.xp) {
        storage.importDataJSON(JSON.stringify({
          gamification: {
            ...cur,
            xp: g.xp,
            level: g.level,
            rank: g.rank,
            currentStreak: Math.max(cur.currentStreak, g.current_streak),
          }
        }));
      }
    }

    } catch (err) {
      console.warn('[SyncManager] Realtime change error:', err);
    } finally {
      this.isReconciling = false;
    }

    this.lastSyncedAt = new Date().toLocaleTimeString();
    this.notify();
  }

  // ========================================================
  // Diagnostics & Subscription
  // ========================================================
  public getDiagnostics(): SyncDiagnostics {
    return {
      provider: this.adapter.provider,
      state: !this.isOnline ? 'offline' : this.state,
      isOnline: this.isOnline,
      isAuthenticated: !!this.userId,
      userId: this.userId,
      pendingMutationsCount: this.queue.length,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
      realtimeActive: this.realtimeActive,
      autoSyncEnabled: this.autoSyncEnabled,
      conflictPolicy: this.conflictPolicy,
    };
  }

  public getPendingMutations(): SyncMutation[] {
    return [...this.queue];
  }

  public getPendingQueue(): SyncMutation[] {
    return this.getPendingMutations();
  }

  public clearQueue(): void {
    this.queue = [];
    this.persistQueue();
    this.notify();
  }

  public setAutoSync(enabled: boolean): void {
    this.autoSyncEnabled = enabled;
    this.notify();
  }

  public setConflictPolicy(policy: SyncConflictPolicy): void {
    this.conflictPolicy = policy;
    this.notify();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getDiagnostics());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const diag = this.getDiagnostics();
    this.listeners.forEach((cb) => {
      try {
        cb(diag);
      } catch (err) {
        console.error('[SyncManager] Listener error:', err);
      }
    });
  }
}

export const syncManager = new SyncManager();
