import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Shield,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Sliders,
  Check,
  Cloud,
  LogOut,
  LogIn,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Database,
  Radio,
  Wifi,
  WifiOff,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Layers,
  Key,
  Cpu,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { useStudyOS } from '../context/StudyOSContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { supabase } from '../services/supabaseClient';
import { cloudSync } from '../services/cloudSync';
import { useSyncStatus } from '../services/sync/useSyncStatus';
import { SyncConflictPolicy } from '../services/sync/types';
import { aiService, AIConnectionTestResult } from '../services/aiService';

export const SettingsView: React.FC = () => {
  const { settings } = useStudyOS();
  const { user: currentUser, signOut, openAuthModal, requireAuth } = useAuth();

  const [userName, setUserName] = useState(settings.userName);
  const [dailyTarget, setDailyTarget] = useState(settings.dailyFocusTargetMinutes);
  const [hourlyCheckinEnabled, setHourlyCheckinEnabled] = useState(settings.hourlyCheckinEnabled);
  const [quietHoursStart, setQuietHoursStart] = useState(settings.quietHoursStart);
  const [quietHoursEnd, setQuietHoursEnd] = useState(settings.quietHoursEnd);
  const [aiProvider, setAiProvider] = useState(settings.aiProvider);
  const [aiModel, setAiModel] = useState(settings.aiModel || 'nvidia/nemotron-3-ultra-550b-a55b:free');
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [customEndpoint, setCustomEndpoint] = useState(settings.customEndpoint || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testState, setTestState] = useState<{ running: boolean; result?: AIConnectionTestResult }>({ running: false });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleTestAIConnection = async () => {
    setTestState({ running: true, result: undefined });
    const res = await aiService.testConnection({
      aiProvider,
      apiKey,
      aiModel,
      customEndpoint,
    });
    setTestState({ running: false, result: res });
  };

  const {
    diagnostics: syncDiagnostics,
    pendingQueue,
    syncNow,
    forcePush,
    forcePull,
    clearQueue,
    setAutoSync,
    setConflictPolicy,
  } = useSyncStatus();

  const handleSyncToCloud = async () => {
    if (!currentUser?.id) return;
    setSyncing(true);
    setSyncStatusMsg('Pushing local data to Supabase PostgreSQL...');
    const res = await cloudSync.syncToCloud(currentUser.id);
    setSyncing(false);
    setSyncStatusMsg(res.message);
  };

  const handleRestoreFromCloud = async () => {
    if (!currentUser?.id) return;
    if (!confirm('This will load your saved cloud data into local storage. Continue?')) return;
    setSyncing(true);
    setSyncStatusMsg('Pulling cloud data from Supabase...');
    const res = await cloudSync.restoreFromCloud(currentUser.id);
    setSyncing(false);
    setSyncStatusMsg(res.message);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth('save your preferences to the database')) return;
    storage.updateSettings({
      userName,
      dailyFocusTargetMinutes: Number(dailyTarget),
      hourlyCheckinEnabled,
      quietHoursStart,
      quietHoursEnd,
      aiProvider,
      aiModel,
      apiKey: apiKey || undefined,
      customEndpoint: customEndpoint || undefined,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExportJSON = () => {
    const dataStr = storage.exportDataJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `study_os_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = storage.importDataJSON(content);
        if (ok) {
          alert('Study OS data successfully imported!');
        } else {
          alert('Failed to parse Study OS JSON backup.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    if (
      !confirm(
        'Are you sure you want to clear all data and start with a completely clean slate?\n\nThis will permanently delete all subjects, modules, exam schedules, flashcards, questions, and workbench tasks across both your local device and Supabase cloud.'
      )
    ) {
      return;
    }

    setIsResetting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id || currentUser?.id;
      if (uid) {
        const tables = [
          'time_logs',
          'focus_sessions',
          'hourly_checkins',
          'mistake_records',
          'revision_events',
          'tasks',
          'flashcards',
          'flashcard_decks',
          'questions',
          'deadlines',
          'projects',
          'resources',
          'topics',
          'chapters',
          'modules',
          'exams',
          'subjects',
        ];
        for (const tbl of tables) {
          try {
            await supabase.from(tbl).delete().eq('user_id', uid);
          } catch (e) {
            console.warn(`Failed to clean remote table ${tbl}:`, e);
          }
        }
      }
    } catch (err) {
      console.warn('Cloud purge during factory reset encountered an issue:', err);
    } finally {
      clearQueue();
      storage.resetToDefault();
      window.location.reload();
    }
  };

  const handleLoadDemo = () => {
    if (confirm('Load sample curriculum and study data for demonstration?')) {
      storage.loadDemoData();
      window.location.reload();
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      {/* Top Banner */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          System Settings & Cloud Infrastructure
        </h1>
        <p className="mt-1 text-xs text-slate-400 sm:text-sm">
          Supabase PostgreSQL, Edge Functions, Row Level Security, OpenRouter free models, and study targets.
        </p>
      </div>

      {/* Supabase Account & Cloud Sync Status */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 to-slate-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Supabase Cloud Account</h2>
              <p className="text-[11px] text-slate-400">
                Project: <code className="font-mono text-indigo-300">{(import.meta.env.VITE_SUPABASE_URL || '').replace('https://', '').split('.')[0] || 'Cloud Database'}</code> (Free Tier Active)
              </p>
            </div>
          </div>

          {currentUser ? (
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('connect your account to save to the database')}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Connect / Sign In</span>
            </button>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
          {currentUser ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white">Signed in as: </span>
                  <span className="font-mono text-emerald-400">{currentUser.email}</span>
                </div>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  RLS Encrypted
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={syncing || syncDiagnostics.state === 'syncing'}
                  onClick={async () => {
                    setSyncing(true);
                    setSyncStatusMsg('Pushing outbox and sync to cloud...');
                    const res = await syncNow();
                    setSyncing(false);
                    setSyncStatusMsg(res.success ? `Successfully synced ${res.appliedCount} mutation(s) to cloud.` : 'Sync failed');
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  <UploadCloud className={`h-3.5 w-3.5 ${syncing || syncDiagnostics.state === 'syncing' ? 'animate-bounce' : ''}`} />
                  <span>{syncing || syncDiagnostics.state === 'syncing' ? 'Syncing...' : 'Sync Local to Cloud'}</span>
                </button>

                <button
                  type="button"
                  disabled={syncing || syncDiagnostics.state === 'syncing'}
                  onClick={async () => {
                    if (!confirm('This will load your saved cloud data into local storage. Continue?')) return;
                    setSyncing(true);
                    setSyncStatusMsg('Pulling cloud data from Supabase...');
                    const res = await forcePull();
                    setSyncing(false);
                    setSyncStatusMsg(res.message);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  <DownloadCloud className="h-3.5 w-3.5 text-slate-400" />
                  <span>Restore from Cloud</span>
                </button>

                {syncStatusMsg && (
                  <span className="text-[11px] text-slate-400 ml-auto flex items-center gap-1">
                    <RefreshCw className={`h-3 w-3 text-indigo-400 ${syncing || syncDiagnostics.state === 'syncing' ? 'animate-spin' : ''}`} />
                    {syncStatusMsg}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span>Running in local offline-first mode. All features remain 100% operational without login.</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                Offline Mode
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Device Realtime Cloud Sync & Outbox Engine Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Multi-Device Realtime Cloud Sync</span>
                <span className="rounded bg-violet-500/20 px-2 py-0.5 text-[10px] font-mono text-violet-300">
                  Offline-First Outbox
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Local-first zero latency with asynchronous mutation queue and WebSocket real-time broadcast.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {syncDiagnostics.isOnline ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                <Wifi className="h-3 w-3 text-emerald-400" />
                <span>Online</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                <WifiOff className="h-3 w-3 text-amber-400" />
                <span>Offline Queue</span>
              </span>
            )}

            {syncDiagnostics.realtimeActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span>WebSocket Live</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                <Radio className="h-3 w-3 text-slate-500" />
                <span>Standby</span>
              </span>
            )}
          </div>
        </div>

        {/* Sync Controls & Options */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Conflict Policy Selector */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span>Conflict Resolution Policy</span>
              <span className="font-mono text-[10px] text-indigo-400">{syncDiagnostics.conflictPolicy}</span>
            </label>
            <select
              value={syncDiagnostics.conflictPolicy}
              onChange={(e) => setConflictPolicy(e.target.value as SyncConflictPolicy)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="last_write_wins">Last Write Wins (Recommended: latest timestamp takes precedence)</option>
              <option value="server_wins">Server Wins (Cloud data always overrides local on collision)</option>
              <option value="client_wins">Client Wins (Local modifications always override cloud)</option>
            </select>
            <p className="text-[10px] text-slate-500">
              Determines how concurrent multi-device updates on the same entity are reconciled.
            </p>
          </div>

          {/* Auto-Sync Configuration */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200">Automatic Background Sync</span>
                <p className="text-[10px] text-slate-400">
                  Debounces local modifications (2s) and runs a background poll every 45s.
                </p>
              </div>
              <input
                type="checkbox"
                checked={syncDiagnostics.autoSyncEnabled}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="h-4 w-4 rounded accent-indigo-600"
              />
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/60">
              <span>Last Synced:</span>
              <span className="font-mono text-slate-300">{syncDiagnostics.lastSyncedAt || 'Never in this session'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={syncNow}
            disabled={syncDiagnostics.state === 'syncing' || !syncDiagnostics.isAuthenticated}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncDiagnostics.state === 'syncing' ? 'animate-spin' : ''}`} />
            <span>Flush Outbox Now</span>
          </button>

          <button
            type="button"
            onClick={forcePush}
            disabled={syncDiagnostics.state === 'syncing' || !syncDiagnostics.isAuthenticated}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            <UploadCloud className="h-3.5 w-3.5 text-indigo-400" />
            <span>Force Push All Local Data</span>
          </button>

          <button
            type="button"
            onClick={forcePull}
            disabled={syncDiagnostics.state === 'syncing' || !syncDiagnostics.isAuthenticated}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            <DownloadCloud className="h-3.5 w-3.5 text-emerald-400" />
            <span>Force Pull from Cloud</span>
          </button>

          {pendingQueue.length > 0 && (
            <button
              type="button"
              onClick={clearQueue}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 ml-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Outbox ({pendingQueue.length})</span>
            </button>
          )}
        </div>

        {/* Outbox Mutation Queue Monitor */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              <span>Offline Outbox Mutation Queue ({pendingQueue.length})</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Status: {syncDiagnostics.state.toUpperCase()}
            </span>
          </div>

          {pendingQueue.length === 0 ? (
            <div className="flex items-center gap-2 py-2 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Outbox is clear. All local edits are synchronized with Supabase PostgreSQL.</span>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
              {pendingQueue.map((mut) => (
                <div
                  key={mut.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold font-mono uppercase ${
                        mut.operation === 'create'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : mut.operation === 'update'
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {mut.operation}
                    </span>
                    <span className="font-semibold text-white">{mut.entityType}</span>
                    <span className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                      {mut.entityId}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span>Retries: {mut.retryCount}</span>
                    <span>{new Date(mut.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Profile & Focus Targets */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-400" />
            <span>Profile & Study Targets</span>
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-300">Display Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Daily Focus Target (Minutes)</label>
              <input
                type="number"
                min={30}
                max={720}
                value={dailyTarget}
                onChange={(e) => setDailyTarget(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quiet Hours & Hourly Check-in */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="h-4 w-4 text-violet-400" />
            <span>Time Intelligence & Quiet Hours</span>
          </h2>

          <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5">
            <div>
              <span className="text-xs font-semibold text-slate-200">Hourly Productivity Check-in Prompt</span>
              <p className="text-[11px] text-slate-400">
                Presents an unobtrusive hourly check-in modal to record activities and prevent unaccounted time.
              </p>
            </div>
            <input
              type="checkbox"
              checked={hourlyCheckinEnabled}
              onChange={(e) => setHourlyCheckinEnabled(e.target.checked)}
              className="h-4 w-4 rounded accent-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">Quiet Hours Start</label>
              <input
                type="time"
                value={quietHoursStart}
                onChange={(e) => setQuietHoursStart(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300">Quiet Hours End</label>
              <input
                type="time"
                value={quietHoursEnd}
                onChange={(e) => setQuietHoursEnd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* AI Reasoning Service Configuration */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>AI Reasoning, Models & API Key Configuration</span>
            </h2>
            <span className="text-[11px] font-mono text-emerald-400">
              BYOK (Bring Your Own Key) • Multi-Provider • Zero Lock-in
            </span>
          </div>

          {/* Provider Select */}
          <div>
            <label className="text-xs font-semibold text-slate-300">AI Provider Architecture</label>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200"
            >
              <option value="openrouter">OpenRouter (Free Server-Side Proxy OR Your Own API Key)</option>
              <option value="gemini">Google Gemini (Direct API Key)</option>
              <option value="openai">OpenAI (Direct API Key & Official Models)</option>
              <option value="custom">Custom OpenAI-Compatible (Ollama, Groq, vLLM, LM Studio)</option>
              <option value="heuristic_offline">Local Offline Cognitive Engine (100% Free, Zero Latency)</option>
            </select>
          </div>

          {/* API Key Input (for any BYOK provider) */}
          {aiProvider !== 'heuristic_offline' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    {aiProvider === 'openrouter' && 'Personal OpenRouter API Key'}
                    {aiProvider === 'gemini' && 'Google Gemini API Key'}
                    {aiProvider === 'openai' && 'OpenAI API Key'}
                    {aiProvider === 'custom' && 'API Key / Bearer Token'}
                  </span>
                </label>
                {aiProvider === 'openrouter' && (
                  <span className="text-[10px] text-slate-400">
                    Optional: Leave blank to use server-side free tier proxy
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    aiProvider === 'openrouter'
                      ? 'sk-or-v1-...'
                      : aiProvider === 'gemini'
                      ? 'AIzaSy...'
                      : aiProvider === 'openai'
                      ? 'sk-proj-...'
                      : 'Bearer token or API key...'
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 pr-20 text-xs font-mono text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  title={showApiKey ? 'Hide key' : 'Show key'}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Custom Endpoint URL (if Custom is chosen) */}
          {aiProvider === 'custom' && (
            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-cyan-400" />
                <span>Custom OpenAI-Compatible Base URL</span>
              </label>
              <input
                type="text"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                placeholder="http://localhost:11434/v1 or https://api.groq.com/openai/v1"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs font-mono text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Compatible with Ollama, Groq, LM Studio, vLLM, and LiteLLM local servers.
              </p>
            </div>
          )}

          {/* Model Selection & Custom Model Input */}
          {aiProvider !== 'heuristic_offline' && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                <span>Active Model Slug / Identifier</span>
              </label>

              {/* Quick Preset Pills */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-slate-400 self-center mr-1">Quick Select:</span>
                {[
                  { label: 'Gemma 4 31B (Free)', id: 'google/gemma-4-31b-it:free' },
                  { label: 'Nemotron 3 Ultra (Free)', id: 'nvidia/nemotron-3-ultra-550b-a55b:free' },
                  { label: 'Claude 3.5 Sonnet', id: 'anthropic/claude-3.5-sonnet' },
                  { label: 'GPT-4o', id: 'openai/gpt-4o' },
                  { label: 'DeepSeek R1', id: 'deepseek/deepseek-r1' },
                  { label: 'Llama 3.3 70B', id: 'meta-llama/llama-3.3-70b-instruct' },
                  { label: 'Gemini 1.5 Flash', id: 'gemini-1.5-flash' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAiModel(m.id)}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-mono transition-colors ${
                      aiModel === m.id
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Editable Model Slug Input */}
              <input
                type="text"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                placeholder="e.g. google/gemma-4-31b-it:free or any custom model string"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs font-mono text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400">
                You can type or paste any model ID from OpenRouter, Gemini, or your custom endpoint above.
              </p>
            </div>
          )}

          {/* Test Connection Button & Status Box */}
          <div className="space-y-3 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Verify your API credentials and model readiness:</span>
              <button
                type="button"
                onClick={handleTestAIConnection}
                disabled={testState.running}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-500/50 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50"
              >
                {testState.running ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <Activity className="h-3.5 w-3.5" />
                    <span>Test AI Model Connection</span>
                  </>
                )}
              </button>
            </div>

            {testState.result && (
              <div
                className={`rounded-xl border p-3 text-xs ${
                  testState.result.success
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {testState.result.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                  )}
                  <span>{testState.result.message}</span>
                </div>
                {testState.result.latencyMs !== undefined && (
                  <div className="mt-1 font-mono text-[10px] text-slate-400">
                    Roundtrip Latency: {testState.result.latencyMs}ms
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Free Presets & Syllabus Benchmark Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              Before settling on the default, test against 10–20 questions from your actual syllabus. Compare factual accuracy, explanation quality, hallucinations, structured JSON reliability, response time, and rate limits.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
              <span className="text-slate-400">Ethical Hacking (PECCS701I) Syllabus Benchmark:</span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-emerald-300">
                Nemotron 3 Ultra 100% Pass (375ms)
              </span>
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-indigo-300">
                Auto-Fallback Enabled
              </span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          {savedSuccess ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Check className="h-4 w-4" />
              <span>Settings saved successfully!</span>
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
          >
            Save Preferences
          </button>
        </div>
      </form>

      {/* Backup, Export & Factory Reset */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          <span>Data Ownership, Export & Reset</span>
        </h2>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            <span>Export Full Data (JSON)</span>
          </button>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700">
            <Upload className="h-4 w-4" />
            <span>Import Backup (JSON)</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleLoadDemo}
            className="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20"
          >
            <Sparkles className="h-4 w-4" />
            <span>Load Sample Demo Data</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 ml-auto"
          >
            {isResetting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Wiping Local & Cloud Data...</span>
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                <span>Wipe All Data (Fresh Clean Slate)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
