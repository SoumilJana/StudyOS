import React, { useState } from 'react';
import {
  CalendarCheck2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  CalendarDays,
} from 'lucide-react';
import { useStudyOS } from '../context/StudyOSContext';
import { storage } from '../services/storage';
import { RevisionEvent } from '../types';

export const RevisionCalendarView: React.FC = () => {
  const { revisions, subjects } = useStudyOS();

  const [viewMode, setViewMode] = useState<'agenda' | 'day' | 'week' | 'month'>('agenda');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [postponeModalEvent, setPostponeModalEvent] = useState<RevisionEvent | null>(null);
  const [postponeDate, setPostponeDate] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredRevisions = revisions.filter((rev) => {
    if (selectedSubjectFilter !== 'all' && rev.subjectId !== selectedSubjectFilter) {
      return false;
    }
    return true;
  });

  const dueToday = filteredRevisions.filter((r) => r.scheduledDate === todayStr && r.status === 'pending');
  const upcoming = filteredRevisions.filter((r) => r.scheduledDate > todayStr && r.status === 'pending');
  const completed = filteredRevisions.filter((r) => r.status === 'completed');

  const handleComplete = (id: string) => {
    storage.completeRevision(id);
  };

  const handlePostpone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postponeModalEvent || !postponeDate) return;
    storage.postponeRevision(postponeModalEvent.id, postponeDate);
    setPostponeModalEvent(null);
  };

  const getSourceBadge = (source: RevisionEvent['source']) => {
    switch (source) {
      case 'mistake_notebook':
        return { label: 'Mistake Drill', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      case 'spaced_repetition':
        return { label: 'SRS Recall', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'decay_interval':
        return { label: 'Decay Threshold', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' };
      case 'exam_countdown':
        return { label: 'Exam Urgency', color: 'bg-red-500/20 text-red-300 border-red-500/30' };
      default:
        return { label: 'Scheduled', color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Smart Revision Calendar
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Explainable, decay-aware revision queue integrating Spaced Repetition, Arena mistakes, and exam countdowns.
          </p>
        </div>

        {/* View mode switcher */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
            {(['agenda', 'day', 'week', 'month'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                  viewMode === mode
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs text-slate-400">Subject:</span>
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200"
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}: {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Estimated Today Workload:{' '}
          <span className="font-mono font-bold text-indigo-300">
            {dueToday.reduce((sum, r) => sum + r.estimatedMinutes, 0)} minutes
          </span>
        </div>
      </div>

      {/* Agenda & Queue View */}
      <div className="space-y-6">
        {/* Section 1: Due Today */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Clock className="h-4 w-4" />
            <span>Due Today ({dueToday.length})</span>
          </div>

          {dueToday.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 text-center text-xs text-slate-500">
              No revisions overdue or due today. Memory curves are in optimal state!
            </div>
          ) : (
            dueToday.map((rev) => {
              const badge = getSourceBadge(rev.source);
              return (
                <div
                  key={rev.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs font-mono text-slate-400">~{rev.estimatedMinutes}m duration</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{rev.title}</h3>
                    <p className="text-xs text-slate-300">{rev.reason}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setPostponeModalEvent(rev);
                        setPostponeDate(todayStr);
                      }}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                    >
                      Postpone
                    </button>
                    <button
                      onClick={() => handleComplete(rev.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                    >
                      <Check className="h-4 w-4" />
                      <span>Complete (+50 XP)</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Section 2: Upcoming Scheduled Revisions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <CalendarDays className="h-4 w-4" />
            <span>Upcoming Queue ({upcoming.length})</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {upcoming.map((rev) => {
              const badge = getSourceBadge(rev.source);
              return (
                <div
                  key={rev.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{rev.scheduledDate}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200">{rev.title}</h4>
                  <p className="text-[11px] text-slate-400">{rev.reason}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Completed History */}
        {completed.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Completed Revisions ({completed.length})</span>
            </div>

            <div className="space-y-2 opacity-70">
              {completed.map((rev) => (
                <div
                  key={rev.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400"
                >
                  <span className="line-through">{rev.title}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Mastery updated</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Postpone Recalculation Modal */}
      {postponeModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Postpone Revision</h3>
            <p className="mt-1 text-xs text-slate-400">
              Select a new target date. The decay curve will recalculate without discarding past study history.
            </p>

            <form onSubmit={handlePostpone} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">New Revision Date</label>
                <input
                  type="date"
                  required
                  value={postponeDate}
                  onChange={(e) => setPostponeDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPostponeModalEvent(null)}
                  className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
