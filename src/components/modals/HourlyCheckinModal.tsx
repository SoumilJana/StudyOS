import React, { useState } from 'react';
import { Clock, X, Check, Moon } from 'lucide-react';
import { useStudyOS } from '../../context/StudyOSContext';
import { TimeCategory } from '../../types';

export const HourlyCheckinModal: React.FC = () => {
  const { showHourlyPrompt, submitHourlyCheckin, snoozeHourlyCheckin } = useStudyOS();
  const [selectedCategory, setSelectedCategory] = useState<TimeCategory>('studying');
  const [note, setNote] = useState('');

  if (!showHourlyPrompt) return null;

  const categories: { key: TimeCategory; label: string; icon: string; color: string }[] = [
    { key: 'studying', label: 'Deep Study', icon: '📖', color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' },
    { key: 'revision', label: 'Revision', icon: '🔄', color: 'border-violet-500/40 bg-violet-500/10 text-violet-300' },
    { key: 'practice_questions', label: 'Practice & Arena', icon: '⚔️', color: 'border-blue-500/40 bg-blue-500/10 text-blue-300' },
    { key: 'coding_projects', label: 'Coding & Projects', icon: '💻', color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' },
    { key: 'college', label: 'College / Lecture', icon: '🏛️', color: 'border-teal-500/40 bg-teal-500/10 text-teal-300' },
    { key: 'work', label: 'Work / Employment', icon: '💼', color: 'border-slate-500/40 bg-slate-500/10 text-slate-300' },
    { key: 'exercise', label: 'Exercise & Fitness', icon: '🏃', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
    { key: 'meals_personal', label: 'Meals & Self-Care', icon: '🥗', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
    { key: 'intentional_leisure', label: 'Mindful Leisure', icon: '☕', color: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
    { key: 'social_media_distraction', label: 'Social / Distraction', icon: '📱', color: 'border-red-500/40 bg-red-500/10 text-red-300' },
    { key: 'gaming', label: 'Gaming', icon: '🎮', color: 'border-purple-500/40 bg-purple-500/10 text-purple-300' },
    { key: 'other', label: 'Other', icon: '✨', color: 'border-slate-700 bg-slate-800 text-slate-300' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitHourlyCheckin(selectedCategory, note);
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/90 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Hourly Time Intelligence Check-in</h3>
              <p className="text-[11px] text-slate-400">What did you spend the last hour doing?</p>
            </div>
          </div>
          <button
            onClick={snoozeHourlyCheckin}
            className="rounded p-1 text-slate-500 hover:text-slate-300"
            title="Snooze"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  type="button"
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs font-medium transition-all ${
                    isSelected
                      ? `${cat.color} ring-2 ring-indigo-500/50 shadow-md`
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400">
              Optional notes or accomplishments:
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Worked through Raft safety proof section 5.4"
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={snoozeHourlyCheckin}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Snooze (15m)</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 active:scale-95"
            >
              <Check className="h-4 w-4" />
              <span>Log Hour (+15 XP)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
