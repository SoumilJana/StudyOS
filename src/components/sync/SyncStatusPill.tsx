import React, { useState } from 'react';
import {
  Cloud,
  RefreshCw,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ArrowUpRight,
  Database,
  Radio,
} from 'lucide-react';
import { useSyncStatus } from '../../services/sync/useSyncStatus';
import { useNavigate } from 'react-router-dom';

export const SyncStatusPill: React.FC = () => {
  const navigate = useNavigate();
  const { diagnostics, pendingQueue, syncNow, forcePull, clearQueue } = useSyncStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [manualSyncing, setManualSyncing] = useState(false);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setManualSyncing(true);
    await syncNow();
    setManualSyncing(false);
  };

  const handleForcePull = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setManualSyncing(true);
    await forcePull();
    setManualSyncing(false);
  };

  const isSyncing = diagnostics.state === 'syncing' || manualSyncing;

  // Determine display styling
  let badgeColor = 'border-slate-800 bg-slate-900/60 text-slate-400';
  let icon = <Cloud className="h-3.5 w-3.5 text-slate-400" />;
  let label = 'Offline Local';

  if (!diagnostics.isOnline) {
    badgeColor = 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    icon = <WifiOff className="h-3.5 w-3.5 text-amber-400" />;
    label = 'Offline Mode';
  } else if (!diagnostics.isAuthenticated) {
    badgeColor = 'border-slate-800 bg-slate-900/60 text-slate-400';
    icon = <Cloud className="h-3.5 w-3.5 text-slate-500" />;
    label = 'Local Only';
  } else if (isSyncing) {
    badgeColor = 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300';
    icon = <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin" />;
    label = diagnostics.pendingMutationsCount > 0 ? `Syncing (${diagnostics.pendingMutationsCount})` : 'Syncing...';
  } else if (diagnostics.state === 'error') {
    badgeColor = 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    icon = <AlertCircle className="h-3.5 w-3.5 text-rose-400" />;
    label = 'Sync Error';
  } else if (diagnostics.pendingMutationsCount > 0) {
    badgeColor = 'border-amber-500/40 bg-amber-500/10 text-amber-300';
    icon = <Cloud className="h-3.5 w-3.5 text-amber-400" />;
    label = `${diagnostics.pendingMutationsCount} Pending`;
  } else {
    badgeColor = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    icon = <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    label = 'Cloud Synced';
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all hover:opacity-90 ${badgeColor}`}
        title="Multi-Device Cloud Synchronization Status"
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        {diagnostics.realtimeActive && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
        <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl z-50 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">Multi-Device Cloud Sync</span>
              </div>
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                {diagnostics.provider.toUpperCase()}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Connection:</span>
                <span className={diagnostics.isOnline ? 'text-emerald-400' : 'text-amber-400'}>
                  {diagnostics.isOnline ? '● Online' : '○ Offline'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Auth Status:</span>
                <span>{diagnostics.isAuthenticated ? 'Signed In (RLS Active)' : 'Guest (Offline-First)'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Realtime WebSocket:</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Radio className={`h-3 w-3 ${diagnostics.realtimeActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                  {diagnostics.realtimeActive ? 'Live Active' : 'Idle'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Pending Outbox:</span>
                <span className="font-mono text-amber-300">{pendingQueue.length} changes</span>
              </div>

              {diagnostics.lastSyncedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last Synced:</span>
                  <span className="font-mono text-slate-300">{diagnostics.lastSyncedAt}</span>
                </div>
              )}

              {diagnostics.lastError && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2 text-[11px] text-rose-300 space-y-1.5">
                  <div>{diagnostics.lastError}</div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearQueue();
                    }}
                    className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-200 hover:bg-rose-500/30"
                  >
                    Dismiss & Reset Outbox
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                disabled={isSyncing || !diagnostics.isAuthenticated}
                onClick={handleManualSync}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Outbox'}</span>
              </button>

              <button
                type="button"
                disabled={isSyncing || !diagnostics.isAuthenticated}
                onClick={handleForcePull}
                className="flex items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                title="Pull remote changes from other devices"
              >
                <span>Pull Cloud</span>
              </button>
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/settings');
              }}
              className="w-full flex items-center justify-center gap-1 text-[11px] text-indigo-400 hover:underline pt-1"
            >
              <span>Manage conflict resolution & diagnostics in Settings</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
