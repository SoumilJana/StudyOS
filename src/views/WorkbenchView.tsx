import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Plus,
  Play,
  Layers,
  Calendar,
  AlertCircle,
  X,
  Check,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useStudyOS } from '../context/StudyOSContext';
import { storage } from '../services/storage';
import { Task, Project, PriorityLevel, TaskStatus } from '../types';

export const WorkbenchView: React.FC = () => {
  const navigate = useNavigate();
  const { projects, tasks, startTimer, subjects } = useStudyOS();

  const [activeTab, setActiveTab] = useState<'board' | 'list' | 'projects'>('board');
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);

  // New Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>('medium');
  const [taskEstimatedMins, setTaskEstimatedMins] = useState(60);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskProjectId, setTaskProjectId] = useState<string>('');

  // New Project Form
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projTargetDate, setProjTargetDate] = useState('');
  const [projHours, setProjHours] = useState(25);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: taskTitle,
      status: 'todo',
      priority: taskPriority,
      dueDate: taskDueDate || undefined,
      estimatedMinutes: taskEstimatedMins,
      actualMinutes: 0,
      category: 'coding',
      projectId: taskProjectId || undefined,
      dependencies: [],
      subtasks: [],
      createdAt: new Date().toISOString(),
    };

    storage.saveTask(newTask);
    storage.addXP(20, 'Created task');
    setShowTaskModal(false);
    setTaskTitle('');
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle) return;

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      title: projTitle,
      description: projDesc,
      status: 'in_progress',
      priority: 'high',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: projTargetDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      estimatedHours: projHours,
      actualHoursTracked: 0,
      milestones: [],
      tags: ['Personal'],
      createdAt: new Date().toISOString(),
    };

    storage.saveProject(newProject);
    setShowProjectModal(false);
    setProjTitle('');
    setProjDesc('');
  };

  const handleLaunchFocus = (task: Task) => {
    startTimer(50, 'focus', task.subjectId, task.id);
    navigate('/focus');
  };

  const columns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'todo', label: 'To Do', color: 'border-slate-700 bg-slate-900/50' },
    { status: 'in_progress', label: 'In Progress', color: 'border-indigo-500/30 bg-indigo-500/5' },
    { status: 'in_review', label: 'In Review / Test', color: 'border-amber-500/30 bg-amber-500/5' },
    { status: 'done', label: 'Completed', color: 'border-emerald-500/30 bg-emerald-500/5' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Workbench & Project Tracker
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Deliverable execution for assignments, coding projects, research milestones, and non-syllabus work.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
            <button
              onClick={() => setActiveTab('board')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                activeTab === 'board' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                activeTab === 'projects' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Projects ({projects.length})
            </button>
          </div>

          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {activeTab === 'board' ? (
        /* Kanban Board */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                className={`flex flex-col rounded-2xl border p-4 min-h-[500px] ${col.color}`}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{col.label}</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-400">
                    {colTasks.length}
                  </span>
                </div>

                <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      className="group rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs space-y-2.5 shadow-sm transition-all hover:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-200">{t.title}</span>
                        <button
                          onClick={() => handleLaunchFocus(t)}
                          className="opacity-0 group-hover:opacity-100 rounded-lg bg-indigo-600/20 p-1 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all"
                          title="Launch Pomodoro Focus for this task"
                        >
                          <Play className="h-3 w-3 fill-current" />
                        </button>
                      </div>

                      {t.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2">{t.description}</p>
                      )}

                      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-500 font-mono">
                        <span>~{t.estimatedMinutes}m</span>
                        <div className="flex items-center gap-1">
                          {col.status !== 'done' && (
                            <button
                              onClick={() => storage.updateTaskStatus(t.id, 'done')}
                              className="text-emerald-400 hover:underline"
                            >
                              ✓ Done
                            </button>
                          )}
                          {col.status === 'todo' && (
                            <button
                              onClick={() => storage.updateTaskStatus(t.id, 'in_progress')}
                              className="text-indigo-400 hover:underline ml-1.5"
                            >
                              Start →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Projects List View */
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowProjectModal(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Project</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {projects.map((p) => {
              const projectTasks = tasks.filter((t) => t.projectId === p.id);
              const doneTasks = projectTasks.filter((t) => t.status === 'done');
              const percent = projectTasks.length > 0 ? Math.round((doneTasks.length / projectTasks.length) * 100) : 0;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono text-indigo-300 font-bold uppercase">
                      {p.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Target: {p.targetDate}</span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">{p.title}</h3>
                    <p className="mt-1 text-xs text-slate-400">{p.description}</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Tasks: {doneTasks.length}/{projectTasks.length} completed</span>
                      <span className="font-bold text-white">{percent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create New Task</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Implement log compaction RPC"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Estimated Duration (Mins)</label>
                  <input
                    type="number"
                    min={15}
                    value={taskEstimatedMins}
                    onChange={(e) => setTaskEstimatedMins(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as PriorityLevel)}
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
                <label className="text-xs font-semibold text-slate-300">Link to Project (Optional)</label>
                <select
                  value={taskProjectId}
                  onChange={(e) => setTaskProjectId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
                >
                  <option value="">Independent Task</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create New Project</h3>
              <button onClick={() => setShowProjectModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Project Title</label>
                <input
                  type="text"
                  required
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  placeholder="e.g. Raft Consensus Node Implementation"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  placeholder="Summary of goals and deliverables"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
