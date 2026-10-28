import React, { useState } from 'react';
import {
  Hourglass,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  AlertCircle,
  Sparkles,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Clock,
  BookOpen,
} from 'lucide-react';
import { useStudyOS } from '../context/StudyOSContext';
import { storage } from '../services/storage';

export const FocusRoomView: React.FC = () => {
  const {
    timer,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipTimerPhase,
    recordTimerInterruption,
    subjects,
    tasks,
    focusSessions,
  } = useStudyOS();

  const [distractionFree, setDistractionFree] = useState<boolean>(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(timer.linkedSubjectId || subjects[0]?.id || '');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(timer.linkedTaskId || '');
  const [sessionNotes, setSessionNotes] = useState<string>('');

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(
    100,
    Math.round(((timer.totalPlannedSeconds - timer.secondsLeft) / Math.max(1, timer.totalPlannedSeconds)) * 100)
  );

  return (
    <div className={`space-y-6 pb-12 ${distractionFree ? 'fixed inset-0 z-50 bg-slate-950 p-8 flex flex-col justify-center items-center overflow-hidden' : ''}`}>
      {/* Top Banner (hidden in distraction-free) */}
      {!distractionFree && (
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Focus Room
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Timestamp-persisted Pomodoro cycles with uninterrupted elapsed time tracking and task integration.
            </p>
          </div>

          <button
            onClick={() => setDistractionFree(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            <Maximize2 className="h-4 w-4" />
            <span>Distraction-Free Mode</span>
          </button>
        </div>
      )}

      {/* Main Timer Display */}
      <div className="mx-auto max-w-xl text-center space-y-8">
        {/* Presets Bar */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => startTimer(50, 'focus', selectedSubjectId, selectedTaskId)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              timer.totalPlannedSeconds === 3000 && timer.mode === 'focus'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            50m Focus / 10m Break
          </button>
          <button
            onClick={() => startTimer(25, 'focus', selectedSubjectId, selectedTaskId)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              timer.totalPlannedSeconds === 1500 && timer.mode === 'focus'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            25m Focus / 5m Break
          </button>
        </div>

        {/* Circular / Giant Digital Clock */}
        <div className="relative mx-auto flex h-64 w-64 items-center justify-center rounded-full border-4 border-slate-800 bg-slate-900/50 shadow-2xl">
          <svg className="absolute inset-0 h-full w-full -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="120"
              className="stroke-slate-800"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="128"
              cy="128"
              r="120"
              className={timer.mode === 'focus' ? 'stroke-indigo-500' : 'stroke-emerald-500'}
              strokeWidth="6"
              strokeDasharray="754"
              strokeDashoffset={754 - (754 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>

          <div className="relative z-10 flex flex-col items-center">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400">
              {timer.mode === 'focus' ? 'Deep Focus Session' : 'Recovery Break'}
            </span>
            <span className="font-mono text-5xl font-black tracking-tight text-white">
              {formatTimer(timer.secondsLeft)}
            </span>
            <span className="mt-1 text-[11px] font-mono text-indigo-300">
              {timer.isRunning ? (timer.isPaused ? 'Paused' : 'Active') : 'Ready'}
            </span>
          </div>
        </div>

        {/* Controls: Play/Pause, Reset, Skip, Interruption */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={resetTimer}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-slate-400 hover:text-slate-200"
            title="Reset timer"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          {timer.isRunning ? (
            timer.isPaused ? (
              <button
                onClick={resumeTimer}
                className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 hover:bg-indigo-500 active:scale-95"
              >
                <Play className="h-7 w-7 fill-white translate-x-0.5" />
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-600 text-white shadow-xl shadow-amber-600/40 hover:bg-amber-500 active:scale-95"
              >
                <Pause className="h-7 w-7" />
              </button>
            )
          ) : (
            <button
              onClick={() => startTimer(timer.totalPlannedSeconds / 60, timer.mode, selectedSubjectId, selectedTaskId)}
              className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 hover:bg-indigo-500 active:scale-95"
            >
              <Play className="h-7 w-7 fill-white translate-x-0.5" />
            </button>
          )}

          <button
            onClick={skipTimerPhase}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-slate-400 hover:text-slate-200"
            title="Skip phase"
          >
            <SkipForward className="h-5 w-5" />
          </button>

          {timer.isRunning && (
            <button
              onClick={recordTimerInterruption}
              className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
              title="Record an external interruption without pausing"
            >
              +1 Interruption ({timer.interruptions})
            </button>
          )}
        </div>

        {/* Link Subject & Task (hidden in distraction-free mode) */}
        {!distractionFree && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-left">
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Target Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200"
              >
                <option value="">No subject linked</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code}: {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400">Target Workbench Task</label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200"
              >
                <option value="">No task linked</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Exit Distraction-Free Button */}
        {distractionFree && (
          <button
            onClick={() => setDistractionFree(false)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
          >
            <Minimize2 className="h-4 w-4" />
            <span>Exit Distraction-Free Mode</span>
          </button>
        )}
      </div>

      {/* Recent Completed Sessions History (hidden in distraction-free) */}
      {!distractionFree && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Focus Session History</h3>
          <div className="space-y-2">
            {focusSessions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No focus sessions recorded yet. Start your first sprint!
              </div>
            ) : (
              focusSessions.slice(-4).reverse().map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/40 p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <div>
                      <span className="font-semibold text-slate-200">
                        {Math.round(s.actualFocusedSeconds / 60)}m Focus Block
                      </span>
                      <div className="text-[10px] text-slate-500">
                        {new Date(s.startedAt).toLocaleTimeString()} • {s.interruptionsCount} interruptions
                      </div>
                    </div>
                  </div>
                  <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                    +{Math.round(s.actualFocusedSeconds / 60)} XP
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
