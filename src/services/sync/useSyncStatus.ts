import { useState, useEffect } from 'react';
import { syncManager } from './SyncManager';
import { SyncDiagnostics, SyncConflictPolicy, SyncMutation } from './types';
import { cloudSync } from '../cloudSync';

export function useSyncStatus() {
  const [diagnostics, setDiagnostics] = useState<SyncDiagnostics>(syncManager.getDiagnostics());
  const [pendingQueue, setPendingQueue] = useState<SyncMutation[]>(syncManager.getPendingMutations());

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((diag) => {
      setDiagnostics(diag);
      setPendingQueue(syncManager.getPendingMutations());
    });
    return unsubscribe;
  }, []);

  const syncNow = async () => {
    return await syncManager.flushOutbox();
  };

  const forcePush = async () => {
    if (!diagnostics.userId) return { success: false, message: 'Not authenticated' };
    return await cloudSync.syncToCloud(diagnostics.userId);
  };

  const forcePull = async () => {
    if (!diagnostics.userId) return { success: false, message: 'Not authenticated' };
    return await cloudSync.restoreFromCloud(diagnostics.userId);
  };

  const setAutoSync = (enabled: boolean) => {
    syncManager.setAutoSync(enabled);
  };

  const setConflictPolicy = (policy: SyncConflictPolicy) => {
    syncManager.setConflictPolicy(policy);
  };

  const clearQueue = () => {
    syncManager.clearQueue();
  };

  return {
    diagnostics,
    pendingQueue,
    syncNow,
    forcePush,
    forcePull,
    setAutoSync,
    setConflictPolicy,
    clearQueue,
  };
}
