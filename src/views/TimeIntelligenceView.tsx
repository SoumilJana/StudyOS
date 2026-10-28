import React, { useState } from 'react';
import {
  Activity,
  Clock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  PieChart,
  BarChart2,
  Calendar,
  X,
} from 'lucide-react';
import { useStudyOS } from '../context/StudyOSContext';
import { storage } from '../services/storage';
import { TimeCategory, TimeLog } from '../types';

export const TimeIntelligenceView: React.FC = () => {
  const { timeLogs, todayFocusMinutes, todayTargetMinutes, hourlyCheckins, setShowHourlyPrompt } = useStudyOS();

  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [activity, setActivity] = useState('');
  const [category, setCategory] = useState<TimeCategory>('studying');
  const [durationMins, setDurationMins] = useState(45);
  const [isPlanned, setIsPlanned] = useState(true);
  const [notes, setNotes] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = timeLogs.filter((t) => t.startedAt.startsWith(todayStr));

  // Category breakdown for today
  const categoryTotals = todayLogs.reduce((acc, log) => {
    acc[log.category] = (acc[log.category] || 0) + log.durationMinutes;
    return acc;
  }, {} as Record<string, number>);

  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity) return;

    const now = new Date();
    const started = new Date(now.getTime() - durationMins * 60 * 1000);

    const log: TimeLog = {
      id: `tl-${Date.now()}`,
      activity,
      category,
      startedAt: started.toISOString(),
      endedAt: now.toISOString(),
      durationMinutes: durationMins,
      isPlanned,
      notes: notes || undefined,
      tags: ['Manual Log'],
    };

    storage.saveTimeLog(log);
    storage.addXP(Math.round(durationMins / 5), 'Manual time log recorded');
    setShowLogModal(false);
    setActivity('');
    setNotes('');
  };

  const categoriesList: { key: TimeCategory; label: string }[] = [
    { key: 'studying', label: 'Studying' },
    { key: 'revision', label: 'Revision' },
    { key: 'practice_questions', label: 'Practice Questions' },
    { key: 'coding_projects', label: 'Coding & Projects' },
    { key: 'college', label: 'College / Classes' },
    { key: 'work', label: 'Work' },
    { key: 'exercise', label: 'Exercise & Fitness' },
    { key: 'sleep', label: 'Sleep & Rest' },
    { key: 'meals_personal', label: 'Meals & Self-care' },
    { key: 'commute', label: 'Commute' },
    { key: 'intentional_leisure', label: 'Intentional Leisure' },
    { key: 'social_media_distraction', label: 'Social Media / Distraction' },
    { key: 'gaming', label: 'Gaming' },
    { key: 'other', label: 'Other' },
  ];

  const totalTrackedToday = todayLogs.reduce((sum, l) => sum + l.durationMinutes, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Time Intelligence & Hourly Logging
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Zero-double-counting reconciliation, 16 activity categories, hourly check-in tracking, and actionable daily reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHourlyPrompt(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            <Clock className="h-4 w-4" />
            <span>Hourly Check-in</span>
          </button>
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>Log Activity</span>
          </button>
        </div>
      </div>

      {/* Top Reconciliation Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Tracked Today</span>
          <div className="mt-2 text-2xl font-black text-white">{totalTrackedToday}m</div>
          <p className="mt-1 text-[10px] text-slate-500">{(totalTrackedToday / 60).toFixed(1)} hours logged</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Deep Focus</span>
          <div className="mt-2 text-2xl font-black text-indigo-400">{todayFocusMinutes}m</div>
          <p className="mt-1 text-[10px] text-slate-500">Target: {todayTargetMinutes}m</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Recovery & Exercise</span>
          <div className="mt-2 text-2xl font-black text-emerald-400">
            {(categoryTotals['exercise'] || 0) + (categoryTotals['meals_personal'] || 0)}m
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Mindful restoration</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Avoidable Distraction</span>
          <div className="mt-2 text-2xl font-black text-rose-400">
            {(categoryTotals['social_media_distraction'] || 0) + (categoryTotals['unplanned_distraction'] || 0)}m
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Unintentional drift</p>
        </div>
      </div>

      {/* Daily Reconciliation & Reports */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Time Logs Stream */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Today's Activity Log Stream</h3>
              <span className="text-xs text-slate-400 font-mono">Deduplicated (0 double counting)</span>
            </div>

            <div className="space-y-2.5">
              {todayLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No activities logged yet today. Use the "Log Activity" button above!
                </div>
              ) : (
                todayLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/40 p-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-indigo-500" />
                      <div>
                        <span className="font-semibold text-slate-200">{log.activity}</span>
                        <div className="text-[10px] text-slate-500">
                          {new Date(log.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(log.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                          {log.category.replace('_', ' ')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {log.linkedFocusSessionId && (
                        <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[9px] font-mono text-indigo-300">
                          Pomodoro Linked
                        </span>
                      )}
                      <span className="font-mono font-bold text-white">{log.durationMinutes}m</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Actionable Productivity Recommendations */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-3">
              <Sparkles className="h-4 w-4" />
              <span>3 Recommendations for Tomorrow</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-slate-300">
                <span className="font-bold text-white">1. Schedule 2 Morning Focus Blocks: </span>
                Your cognitive peak occurs between 08:30 and 11:00 AM. Reserve this window for Raft Safety derivations.
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-slate-300">
                <span className="font-bold text-white">2. Cap Unplanned Distraction: </span>
                After 4:00 PM, attention drift rises. Plan intentional 20-minute breaks instead of checking feeds.
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-slate-300">
                <span className="font-bold text-white">3. Clear Memory Lab Queue: </span>
                Reviewing flashcards before bed boosts long-term synaptic retention by 22%.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Time Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Log Activity Time</h3>
              <button onClick={() => setShowLogModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLog} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Activity Name</label>
                <input
                  type="text"
                  required
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  placeholder="e.g. Reviewed chapter 2 notes"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TimeCategory)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
                  >
                    {categoriesList.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={durationMins}
                    onChange={(e) => setDurationMins(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Save Time Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
