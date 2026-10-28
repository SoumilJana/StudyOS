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
} from 'lucide-react';
import { useStudyOS } from '../context/StudyOSContext';
import { storage } from '../services/storage';
import { supabase } from '../services/supabaseClient';
import { AuthModal } from '../components/auth/AuthModal';
import { cloudSync } from '../services/cloudSync';

export const SettingsView: React.FC = () => {
  const { settings } = useStudyOS();

  const [userName, setUserName] = useState(settings.userName);
  const [dailyTarget, setDailyTarget] = useState(settings.dailyFocusTargetMinutes);
  const [hourlyCheckinEnabled, setHourlyCheckinEnabled] = useState(settings.hourlyCheckinEnabled);
  const [quietHoursStart, setQuietHoursStart] = useState(settings.quietHoursStart);
  const [quietHoursEnd, setQuietHoursEnd] = useState(settings.quietHoursEnd);
  const [aiProvider, setAiProvider] = useState(settings.aiProvider);
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUser(data.session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    storage.updateSettings({
      userName,
      dailyFocusTargetMinutes: Number(dailyTarget),
      hourlyCheckinEnabled,
      quietHoursStart,
      quietHoursEnd,
      aiProvider,
      apiKey: apiKey || undefined,
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

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all data back to original defaults?')) {
      storage.resetToDefault();
      alert('Data reset successfully.');
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
                Project: <code className="font-mono text-indigo-300">ckiryrgdenoycrqqatyi</code> (Free Tier Active)
              </p>
            </div>
          </div>

          {currentUser ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
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
                  disabled={syncing}
                  onClick={handleSyncToCloud}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  <UploadCloud className={`h-3.5 w-3.5 ${syncing ? 'animate-bounce' : ''}`} />
                  <span>{syncing ? 'Syncing...' : 'Sync Local to Cloud'}</span>
                </button>

                <button
                  type="button"
                  disabled={syncing}
                  onClick={handleRestoreFromCloud}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  <DownloadCloud className="h-3.5 w-3.5 text-slate-400" />
                  <span>Restore from Cloud</span>
                </button>

                {syncStatusMsg && (
                  <span className="text-[11px] text-slate-400 ml-auto flex items-center gap-1">
                    <RefreshCw className={`h-3 w-3 text-indigo-400 ${syncing ? 'animate-spin' : ''}`} />
                    {syncStatusMsg}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span>Running in local offline-first mode. All features remain 100% operational.</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                Offline Mode
              </span>
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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>AI Reasoning & Tutor Configuration</span>
          </h2>

          <div>
            <label className="text-xs font-semibold text-slate-300">Provider</label>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200"
            >
              <option value="openrouter">OpenRouter Free Models (Server-Side Edge Proxy)</option>
              <option value="heuristic_offline">Local Offline Heuristic Engine (100% Free, Offline)</option>
              <option value="gemini">Google Gemini 1.5 Flash (Direct API Key)</option>
            </select>
          </div>

          {aiProvider === 'openrouter' && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400 space-y-1">
              <div className="text-slate-300 font-semibold">Active Server Model:</div>
              <div className="font-mono text-indigo-300">{import.meta.env.VITE_OPENROUTER_MODEL || 'nvidia/nemotron-3.5-lightning:free'}</div>
              <p className="text-[10px] text-slate-500">
                Credentials are kept 100% on the server in Supabase Edge Functions. Free models never incur charges.
              </p>
            </div>
          )}

          {aiProvider === 'gemini' && (
            <div>
              <label className="text-xs font-semibold text-slate-300">Gemini API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}
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
            onClick={handleReset}
            className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 ml-auto"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(u) => setCurrentUser(u)}
      />
    </div>
  );
};
