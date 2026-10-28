import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncManager } from './SyncManager';
import { toValidUuid } from './SupabaseSyncAdapter';
import { storage } from '../storage';

describe('Multi-Device Cloud Sync Architecture', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    syncManager.clearQueue();
  });

  describe('SupabaseSyncAdapter UUID Normalization', () => {
    it('preserves existing valid RFC4122 v4 UUIDs', () => {
      const valid = 'c854b09b-e0e9-44b5-89cf-d38574a5c07b';
      expect(toValidUuid(valid)).toBe(valid);
    });

    it('deterministically formats arbitrary string IDs into valid v4 UUIDs', () => {
      const arbitraryId = 'task-1710000000-abc';
      const uuid1 = toValidUuid(arbitraryId);
      const uuid2 = toValidUuid(arbitraryId);

      expect(uuid1).toBe(uuid2);
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('Outbox Mutation Queue and Coalescing', () => {
    it('enqueues a mutation when storage methods are called', () => {
      const deadline = {
        id: 'dl-test-1',
        title: 'Buffer Overflow Exploitation Midterm',
        description: 'Exam on buffer overflows and shellcode',
        category: 'exam' as const,
        dueDate: '2026-11-15',
        priority: 'urgent' as const,
        estimatedWorkloadHours: 12,
        status: 'pending' as const,
        backwardPlan: [],
        createdAt: new Date().toISOString(),
      };

      storage.saveDeadline(deadline);

      const queue = syncManager.getPendingQueue();
      expect(queue.length).toBeGreaterThanOrEqual(1);

      const item = queue.find((m) => m.entityId === 'dl-test-1');
      expect(item).toBeDefined();
      expect(item?.entityType).toBe('deadline');
      expect(item?.payload.title).toBe('Buffer Overflow Exploitation Midterm');
    });

    it('coalesces rapid successive mutations on the same entity to prevent redundant network traffic', () => {
      const task = {
        id: 'task-coalesce-1',
        title: 'Draft Nmap Scan Script',
        description: 'Initial draft',
        status: 'todo' as const,
        priority: 'high' as const,
        estimatedMinutes: 60,
        actualMinutes: 0,
        category: 'coding' as const,
        dependencies: [],
        subtasks: [],
        createdAt: new Date().toISOString(),
      };

      // 1st mutation: Create
      storage.saveTask(task);
      const queueAfterCreate = syncManager.getPendingQueue();
      const countAfterCreate = queueAfterCreate.filter((m) => m.entityId === 'task-coalesce-1').length;
      expect(countAfterCreate).toBe(1);

      // 2nd mutation: Update
      storage.saveTask({ ...task, title: 'Draft Nmap Scan Script (Updated with NSE scripts)' });
      const queueAfterUpdate = syncManager.getPendingQueue();
      const itemsForTask = queueAfterUpdate.filter((m) => m.entityId === 'task-coalesce-1');

      // Still only 1 mutation queued, but with updated payload
      expect(itemsForTask.length).toBe(1);
      expect(itemsForTask[0].payload.title).toBe('Draft Nmap Scan Script (Updated with NSE scripts)');
    });

    it('removes pending creates if deleted while still offline in queue', () => {
      const deadline = {
        id: 'dl-temp-delete',
        title: 'Temporary Study Session',
        description: 'Temporary planning item',
        category: 'project_milestone' as const,
        dueDate: '2026-10-31',
        priority: 'low' as const,
        estimatedWorkloadHours: 2,
        status: 'pending' as const,
        backwardPlan: [],
        createdAt: new Date().toISOString(),
      };

      storage.saveDeadline(deadline);
      expect(syncManager.getPendingQueue().some((m) => m.entityId === 'dl-temp-delete')).toBe(true);

      storage.deleteDeadline('dl-temp-delete');
      expect(syncManager.getPendingQueue().some((m) => m.entityId === 'dl-temp-delete')).toBe(false);
    });
  });

  describe('Conflict Resolution Policies and Diagnostic Controls', () => {
    it('allows switching conflict resolution policies', () => {
      syncManager.setConflictPolicy('server_wins');
      expect(syncManager.getDiagnostics().conflictPolicy).toBe('server_wins');

      syncManager.setConflictPolicy('client_wins');
      expect(syncManager.getDiagnostics().conflictPolicy).toBe('client_wins');

      syncManager.setConflictPolicy('last_write_wins');
      expect(syncManager.getDiagnostics().conflictPolicy).toBe('last_write_wins');
    });

    it('allows toggling automatic background sync', () => {
      syncManager.setAutoSync(false);
      expect(syncManager.getDiagnostics().autoSyncEnabled).toBe(false);

      syncManager.setAutoSync(true);
      expect(syncManager.getDiagnostics().autoSyncEnabled).toBe(true);
    });

    it('clears outbox queue on request', () => {
      storage.saveTask({
        id: 'task-clear-test',
        title: 'Task to clear',
        description: 'Test task',
        status: 'todo',
        priority: 'medium',
        estimatedMinutes: 30,
        actualMinutes: 0,
        category: 'academic',
        dependencies: [],
        subtasks: [],
        createdAt: new Date().toISOString(),
      });

      expect(syncManager.getPendingQueue().length).toBeGreaterThan(0);
      syncManager.clearQueue();
      expect(syncManager.getPendingQueue().length).toBe(0);
    });
  });
});
