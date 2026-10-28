import React, { useState, useEffect } from 'react';
import {
  ClockAlert,
  Calendar,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertCircle,
  Timer,
  ChevronRight,
  ArrowRight,
  X,
  Check,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { useStudyOS } from '../context/StudyOSContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { aiService } from '../services/aiService';
import { Deadline, DeadlineCategory, PriorityLevel } from '../types';

export const DeadlinePlannerView: React.FC = () => {
  const { deadlines, subjects } = useStudyOS();
  const { requireAuth } = useAuth();

  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(deadlines[0] || null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [recalculateFeedback, setRecalculateFeedback] = useState<string | null>(null);

  // New Deadline Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newCategory, setNewCategory] = useState<DeadlineCategory>('exam');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('high');
  const [newHours, setNewHours] = useState(20);
  const [newSubjectId, setNewSubjectId] = useState<string>(subjects[0]?.id || '');

  // Keep selected deadline in sync when deadlines change (deduplication, additions, or removals)
  useEffect(() => {
    if (deadlines.length > 0) {
      if (!selectedDeadline || !deadlines.some((d) => d.id === selectedDeadline.id)) {
        setSelectedDeadline(deadlines[0]);
      } else {
        const matching = deadlines.find((d) => d.id === selectedDeadline.id);
        if (matching) setSelectedDeadline(matching);
      }
    } else {
      setSelectedDeadline(null);
    }
  }, [deadlines]);

  // Live countdown timer for selected deadline
  useEffect(() => {
    if (!selectedDeadline) return;

    const updateCountdown = () => {
      const diff = new Date(selectedDeadline.dueDate).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [selectedDeadline]);

  const handleGenerateBackwardPlan = async () => {
    if (!requireAuth('recalculate and save schedules to the database')) return;
    if (!selectedDeadline) return;
    setIsRecalculating(true);
    setRecalculateFeedback(null);

    // Provide smooth tactical feedback
    await new Promise((resolve) => setTimeout(resolve, 350));

    const linkedSubject = subjects.find(
      (s) => s.id === selectedDeadline.linkedSubjectId || s.name.toLowerCase() === selectedDeadline.title.replace(/examination|exam/gi, '').trim().toLowerCase()
    );
    const moduleNames = linkedSubject?.modules.map((m) => m.title) || [];
    const weakTopicIds = storage
      .getMistakes()
      .map((m) => m.topicId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    const plan = aiService.generateBackwardPlan(
      selectedDeadline.title,
      selectedDeadline.dueDate,
      selectedDeadline.estimatedWorkloadHours,
      weakTopicIds,
      moduleNames
    );

    // Keep completed flags if already completed
    const updatedPlan = plan.map((step, idx) => {
      const prevStep = selectedDeadline.backwardPlan?.[idx];
      return {
        ...step,
        completed: prevStep ? prevStep.completed : false,
      };
    });

    const updated: Deadline = {
      ...selectedDeadline,
      backwardPlan: updatedPlan,
    };

    storage.saveDeadline(updated);
    setSelectedDeadline(updated);
    setIsRecalculating(false);

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRecalculateFeedback(
      `✓ Schedule remade at ${timestamp}: ${updatedPlan.length} milestones dynamically calculated for remaining days.`
    );

    setTimeout(() => {
      setRecalculateFeedback(null);
    }, 7000);
  };

  const handleDeleteDeadline = (id: string) => {
    if (!requireAuth('delete deadlines from the database')) return;
    storage.deleteDeadline(id);
  };

  const handleTogglePlanStep = (index: number) => {
    if (!requireAuth('update milestone progress in the database')) return;
    if (!selectedDeadline) return;
    const current = selectedDeadline.backwardPlan[index];
    storage.updateBackwardPlanStep(selectedDeadline.id, index, !current.completed);
    selectedDeadline.backwardPlan[index].completed = !current.completed;
    setSelectedDeadline({ ...selectedDeadline });
  };

  const handleCreateDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth('add exams and deadlines to the database')) return;
    if (!newTitle || !newDueDate) return;

    const backwardPlan = aiService.generateBackwardPlan(newTitle, newDueDate, newHours);

    const deadline: Deadline = {
      id: `dl-${Date.now()}`,
      title: newTitle,
      description: 'Custom academic commitment',
      category: newCategory,
      dueDate: new Date(newDueDate).toISOString(),
      priority: newPriority,
      estimatedWorkloadHours: newHours,
      status: 'in_progress',
      linkedSubjectId: newSubjectId,
      backwardPlan,
      createdAt: new Date().toISOString(),
    };

    storage.saveDeadline(deadline);
    setShowAddModal(false);
    setSelectedDeadline(deadline);
    setNewTitle('');
    setNewDueDate('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Deadline Planner & Backward Scheduler
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Automatic backward planning distributing study phases, retrieval checkpoints, and mock exams across available days.
          </p>
        </div>

        <button
          onClick={() => {
            if (!requireAuth('add exams or deadlines to the database')) return;
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          <span>New Exam or Deadline</span>
        </button>
      </div>

      {/* Main Grid: Left Deadlines List, Right Countdown & Backward Schedule */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Deadlines List */}
        <div className="space-y-3 lg:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Active Deliverables ({deadlines.length})
          </span>

          <div className="space-y-2.5">
            {deadlines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center text-xs text-slate-500">
                No deadlines tracked yet. Click "+ Add Deadline" or import your course syllabus.
              </div>
            ) : (
              deadlines.map((d) => {
                const isSelected = selectedDeadline?.id === d.id;
                const diffDays = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / (1000 * 3600 * 24));
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDeadline(d)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-600/10 shadow-md'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-slate-400">
                        {d.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold font-mono ${
                            diffDays <= 7 ? 'text-rose-400' : 'text-slate-300'
                          }`}
                        >
                          {diffDays > 0 ? `${diffDays} days left` : 'Today!'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDeadline(d.id);
                          }}
                          title="Delete deliverable"
                          className="rounded p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-white truncate">{d.title}</h3>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{d.estimatedWorkloadHours}h estimated</span>
                      <span className="capitalize">{d.priority} priority</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 2 Cols: Live Ticking Countdown & Backward Plan */}
        <div className="space-y-6 lg:col-span-2">
          {selectedDeadline ? (
            <>
              {/* Giant Live Countdown Card */}
              <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-[11px] font-mono font-bold uppercase text-indigo-300">
                    Countdown Ticker
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      Target: {new Date(selectedDeadline.dueDate).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleDeleteDeadline(selectedDeadline.id)}
                      title="Delete this deadline"
                      className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <h2 className="mt-3 text-lg sm:text-xl font-bold text-white">
                  {selectedDeadline.title}
                </h2>

                {countdown && (
                  <div className="mt-6 grid grid-cols-4 gap-3 text-center">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-2xl sm:text-3xl font-black text-white">{countdown.days}</div>
                      <div className="text-[10px] uppercase font-mono text-slate-400">Days</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-2xl sm:text-3xl font-black text-white">{countdown.hours}</div>
                      <div className="text-[10px] uppercase font-mono text-slate-400">Hours</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-2xl sm:text-3xl font-black text-white">{countdown.minutes}</div>
                      <div className="text-[10px] uppercase font-mono text-slate-400">Minutes</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-2xl sm:text-3xl font-black text-indigo-400">{countdown.seconds}</div>
                      <div className="text-[10px] uppercase font-mono text-slate-400">Seconds</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Backward Planning Roadmap */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-slate-800/80 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Suggested Preparation Milestones
                    </h3>
                    <p className="text-xs text-slate-400">
                      Calculated backward from target date to ensure learning, practice, and mock exams fit comfortably.
                    </p>
                  </div>

                  <button
                    onClick={handleGenerateBackwardPlan}
                    disabled={isRecalculating}
                    className="flex items-center gap-1.5 self-start rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50 transition-all"
                  >
                    {isRecalculating ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    )}
                    <span>{isRecalculating ? 'Recalibrating...' : 'Recalculate Schedule'}</span>
                  </button>
                </div>

                {recalculateFeedback && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{recalculateFeedback}</span>
                    </div>
                    <button
                      onClick={() => setRecalculateFeedback(null)}
                      className="text-emerald-400/70 hover:text-emerald-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Steps List */}
                <div className="space-y-3">
                  {selectedDeadline.backwardPlan.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No preparation steps calculated yet. Click "Recalculate Schedule" above!
                    </div>
                  ) : (
                    selectedDeadline.backwardPlan.map((step, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleTogglePlanStep(idx)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 text-xs transition-colors ${
                          step.completed
                            ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-400 opacity-60'
                            : 'border-slate-800 bg-slate-950/50 text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-lg border ${
                              step.completed
                                ? 'border-emerald-400 bg-emerald-500 text-white'
                                : 'border-slate-600'
                            }`}
                          >
                            {step.completed && <Check className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <span className={step.completed ? 'line-through' : 'font-semibold'}>
                              {step.title}
                            </span>
                            <div className="text-[10px] text-slate-500">
                              {step.date} • ~{step.estimatedHours}h effort ({step.type})
                            </div>
                          </div>
                        </div>

                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 uppercase">
                          {step.type}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
              <ClockAlert className="mx-auto h-10 w-10 text-slate-600" />
              <h3 className="mt-3 text-sm font-bold text-white">No Deadline Selected</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Create an exam deadline or import your syllabus with a target exam date to generate an automated backward study roadmap.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Deadline Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">New Exam or Deliverable</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeadline} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. CS-402 Final Exam"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as DeadlineCategory)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
                  >
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                    <option value="project_milestone">Project Milestone</option>
                    <option value="research">Research Submission</option>
                    <option value="presentation">Presentation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Estimated Effort (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={newHours}
                    onChange={(e) => setNewHours(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Linked Subject</label>
                <select
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}: {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Create & Generate Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
