import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ClockAlert,
  BrainCircuit,
  Swords,
  Hourglass,
  CalendarCheck2,
  CheckCircle2,
  Flame,
  Zap,
  Target,
  BarChart2,
  AlertTriangle,
  Play,
  Plus,
  SlidersHorizontal,
  Upload,
  FileUp,
  Loader2,
  BookOpen,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useStudyOS } from '../context/StudyOSContext';
import { setupCourseFromSyllabus } from '../services/syllabusImporter';

export const CommandCenterView: React.FC = () => {
  const navigate = useNavigate();
  const {
    subjects,
    tasks,
    deadlines,
    dueFlashcardsCount,
    dueRevisionsToday,
    weakTopics,
    nearestDeadline,
    todayFocusMinutes,
    todayTargetMinutes,
    overallSyllabusProgress,
    gamification,
    settings,
    startTimer,
    timer,
  } = useStudyOS();

  const [filterSubjectId] = useState<string>('all');

  // Syllabus Setup Wizard State (supports single or multi-file uploads with limits)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState('Extracting syllabus & planning...');

  const MAX_FILES = 10;
  const MAX_FILE_SIZE_MB = 30;
  const MAX_TOTAL_SIZE_MB = 100;

  const handleFilesSelect = (filesToAdd: FileList | File[]) => {
    setUploadError(null);
    const newArr = Array.from(filesToAdd);
    const combined = [...uploadedFiles, ...newArr];

    if (combined.length > MAX_FILES) {
      setUploadError(`Upload limit: Maximum ${MAX_FILES} files allowed. You have ${combined.length}.`);
      return;
    }

    let totalBytes = 0;
    for (const f of combined) {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setUploadError(`"${f.name}" exceeds the ${MAX_FILE_SIZE_MB}MB per-file size limit.`);
        return;
      }
      totalBytes += f.size;
    }

    if (totalBytes > MAX_TOTAL_SIZE_MB * 1024 * 1024) {
      setUploadError(`Total batch size exceeds the ${MAX_TOTAL_SIZE_MB}MB safety limit.`);
      return;
    }

    setUploadedFiles(combined);

    // Auto-detect title & code from syllabus or primary file
    const primary =
      combined.find((f) => /syllabus|outline|curriculum/i.test(f.name)) || combined[0];
    if (primary) {
      const rawName = primary.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      if (!courseTitle) setCourseTitle(rawName);
      const codeMatch = rawName.match(/\b([A-Z]{3,6}\d{3,4}[A-Z]?)\b/i);
      if (!courseCode && codeMatch) {
        setCourseCode(codeMatch[0].toUpperCase());
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateCourse = async () => {
    if (uploadedFiles.length === 0) return;
    setIsGenerating(true);
    setUploadError(null);
    setGenerateStatus(
      `Extracting ${uploadedFiles.length} document${uploadedFiles.length > 1 ? 's' : ''} & structuring syllabus...`
    );
    try {
      await setupCourseFromSyllabus(uploadedFiles, examDate, courseTitle, courseCode);
      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
      } catch {
        // Confetti fallback
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setUploadError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate Next Recommended Action
  const getRecommendedAction = () => {
    if (subjects.length === 0) {
      return {
        title: 'Setup Your First Subject & Exam Plan',
        subtitle: 'Upload your course syllabus PDF and target exam date below to let Study OS generate your roadmap.',
        actionText: 'Scroll to Setup',
        onAction: () => {
          const el = document.getElementById('syllabus-setup-wizard');
          el?.scrollIntoView({ behavior: 'smooth' });
        },
        icon: Sparkles,
        badge: 'Welcome to Study OS',
        color: 'from-indigo-600/30 to-violet-500/10 border-indigo-500/30 text-indigo-200',
      };
    }
    if (dueRevisionsToday.length > 0) {
      const urgentRev = dueRevisionsToday[0];
      return {
        title: `Priority Revision: ${urgentRev.title}`,
        subtitle: urgentRev.reason,
        actionText: 'Review Revision',
        onAction: () => navigate('/calendar'),
        icon: CalendarCheck2,
        badge: 'Revision Due Today',
        color: 'from-amber-600/30 to-amber-500/10 border-amber-500/30 text-amber-200',
      };
    }
    if (weakTopics.length > 0) {
      const top = weakTopics[0];
      return {
        title: `Target Weak Topic: ${top.topicTitle}`,
        subtitle: `Mastery score is ${top.score}%. Reinforce active recall and practice questions in ${top.subjectName}.`,
        actionText: 'Drill in Arena',
        onAction: () => navigate('/arena'),
        icon: Swords,
        badge: 'Weak Topic',
        color: 'from-rose-600/30 to-rose-500/10 border-rose-500/30 text-rose-200',
      };
    }
    if (dueFlashcardsCount > 0) {
      return {
        title: `Memory Lab: ${dueFlashcardsCount} Flashcards Due`,
        subtitle: 'Optimal spaced repetition intervals require review today to prevent decay.',
        actionText: 'Review Cards',
        onAction: () => navigate('/memory'),
        icon: BrainCircuit,
        badge: 'Spaced Repetition',
        color: 'from-indigo-600/30 to-indigo-500/10 border-indigo-500/30 text-indigo-200',
      };
    }
    return {
      title: 'Maintain Momentum: Deep Focus Session',
      subtitle: `Log a 50-minute focused study session toward your daily ${todayTargetMinutes}m goal.`,
      actionText: 'Launch Focus Room',
      onAction: () => {
        startTimer(50, 'focus');
        navigate('/focus');
      },
      icon: Hourglass,
      badge: 'Focus Sprint',
      color: 'from-indigo-600/30 to-violet-500/10 border-indigo-500/30 text-indigo-200',
    };
  };

  const nextAction = getRecommendedAction();
  const IconNext = nextAction.icon;

  const todayTasks = tasks.filter((t) => t.status !== 'done').slice(0, 4);

  // Time to nearest deadline calculation
  const getDeadlineStats = () => {
    if (!nearestDeadline) return null;
    const diff = new Date(nearestDeadline.dueDate).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return {
      daysLeft: days,
      title: nearestDeadline.title,
      category: nearestDeadline.category,
      hours: nearestDeadline.estimatedWorkloadHours,
    };
  };
  const nearestStats = getDeadlineStats();

  const focusPercent = Math.min(100, Math.round((todayFocusMinutes / Math.max(1, todayTargetMinutes)) * 100));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Welcome & Quick Action Launcher */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Command Center
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Operational dashboard unifying your syllabus, active deadlines, time logs, and revision memory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              startTimer(50, 'focus');
              navigate('/focus');
            }}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 active:scale-95"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>Start 50m Focus</span>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            title="Configure Dashboard Widgets"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hero: What Should I Do Next? */}
      {settings.dashboardWidgets.heroAction && (
        <div
          className={`relative overflow-hidden rounded-2xl border bg-gradient-to-r p-5 shadow-xl ${nextAction.color}`}
        >
          <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold">
                  {nextAction.badge}
                </span>
                <span className="text-[11px] font-medium text-slate-300">
                  Recommended Next Action
                </span>
              </div>
              <h2 className="text-lg font-bold text-white sm:text-xl">{nextAction.title}</h2>
              <p className="max-w-2xl text-xs text-slate-300">{nextAction.subtitle}</p>
            </div>

            <button
              onClick={nextAction.onAction}
              className="flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md transition-all hover:bg-slate-100 active:scale-95 md:self-center"
            >
              <IconNext className="h-4 w-4 text-indigo-600" />
              <span>{nextAction.actionText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* First-Time User Onboarding / Syllabus Setup Wizard */}
      {subjects.length === 0 && (
        <div id="syllabus-setup-wizard" className="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Setup Your Course, Syllabus & Exam Plan</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Upload your course syllabus PDF (or lecture notes) and set your target exam date. Study OS will automatically extract your modules, generate a backward revision calendar, create your initial flashcard deck, and organize your study roadmap.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* 1. File Upload (Multiple Files Supported) */}
            <div className="md:col-span-1 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  1. Syllabus & Lecture Notes ({uploadedFiles.length}/10)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Max 30MB/file</span>
              </div>

              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.length) {
                    handleFilesSelect(e.dataTransfer.files);
                  }
                }}
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-indigo-500/50 bg-indigo-500/5 p-3.5 text-center cursor-pointer hover:bg-indigo-500/10 transition-colors"
              >
                <Upload className="h-5 w-5 text-indigo-400" />
                <span className="mt-1 text-xs font-semibold text-white">
                  {uploadedFiles.length > 0 ? '+ Add More Files' : 'Select or Drop Files'}
                </span>
                <span className="text-[10px] text-slate-400">PDF, DOCX, TXT, MD (Up to 10 files)</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) handleFilesSelect(e.target.files);
                  }}
                />
              </label>

              {/* Uploaded Files Chips */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-slate-950/80 px-2.5 py-1.5 text-[11px] border border-slate-800"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate text-slate-200">{file.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({(file.size / (1024 * 1024)).toFixed(1)}MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(idx);
                        }}
                        className="text-slate-500 hover:text-rose-400 ml-1 rounded p-0.5"
                        title="Remove file"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploadError && (
                <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-300">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            {/* 2. Course Name & Code */}
            <div className="space-y-2 md:col-span-1">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">2. Course Title</label>
                <input
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g. Ethical Hacking"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Course Code (Optional)</label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="e.g. PECCS701I"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>

            {/* 3. Exam Date & Submit */}
            <div className="space-y-3 md:col-span-1 flex flex-col justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">3. Target Exam Date</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateCourse}
                disabled={uploadedFiles.length === 0 || isGenerating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="truncate">{generateStatus}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>
                      {uploadedFiles.length > 0
                        ? `Generate Study OS Plan (${uploadedFiles.length} File${uploadedFiles.length > 1 ? 's' : ''})`
                        : 'Select Files to Generate Plan'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Core Vital Health Cards */}
      {settings.dashboardWidgets.quickStats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* 1. Nearest Deadline */}
          <div
            onClick={() => navigate('/deadlines')}
            className="cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 transition-all hover:border-slate-700 hover:bg-slate-900"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">Nearest Deadline</span>
              <ClockAlert className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {nearestStats ? (
                <span>
                  {nearestStats.daysLeft} <span className="text-xs font-normal text-slate-400">days left</span>
                </span>
              ) : (
                <span className="text-base text-slate-500">None upcoming</span>
              )}
            </div>
            <p className="mt-1 truncate text-[11px] text-slate-400">
              {nearestStats ? nearestStats.title : 'All commitments clear'}
            </p>
          </div>

          {/* 2. Today's Focused Time vs Target */}
          <div
            onClick={() => navigate('/time')}
            className="cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 transition-all hover:border-slate-700 hover:bg-slate-900"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">Focus Target</span>
              <Hourglass className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {todayFocusMinutes}m{' '}
              <span className="text-xs font-normal text-slate-400">/ {todayTargetMinutes}m</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${focusPercent}%` }}
              />
            </div>
          </div>

          {/* 3. Memory Lab & Due Flashcards */}
          <div
            onClick={() => navigate('/memory')}
            className="cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 transition-all hover:border-slate-700 hover:bg-slate-900"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">Flashcards Due</span>
              <BrainCircuit className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {dueFlashcardsCount}{' '}
              <span className="text-xs font-normal text-slate-400">cards</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {dueFlashcardsCount > 0 ? 'SRS review required' : 'Retention optimal'}
            </p>
          </div>

          {/* 4. Weighted Syllabus Mastery */}
          <div
            onClick={() => navigate('/learning')}
            className="cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 transition-all hover:border-slate-700 hover:bg-slate-900"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">Syllabus Mastery</span>
              <Target className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {overallSyllabusProgress}%
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${overallSyllabusProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left Column (Tasks & Subject Health), Right Column (Weak Topics & Gamification) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols */}
        <div className="space-y-6 lg:col-span-2">
          {/* Today's Tasks & Next Deliverables */}
          {settings.dashboardWidgets.todayTasks && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Today's Priority Tasks</h3>
                </div>
                <button
                  onClick={() => navigate('/workbench')}
                  className="text-xs text-indigo-400 hover:underline"
                >
                  View all in Workbench ({tasks.length})
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                {todayTasks.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No active tasks scheduled for today. Great job!
                  </div>
                ) : (
                  todayTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => navigate('/workbench')}
                      className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/40 p-3 transition-colors hover:border-slate-700 hover:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            t.priority === 'urgent'
                              ? 'bg-rose-500'
                              : t.priority === 'high'
                              ? 'bg-amber-500'
                              : 'bg-indigo-500'
                          }`}
                        />
                        <div>
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
                            {t.title}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span>{t.estimatedMinutes}m planned</span>
                            {t.dueDate && <span>• Due {t.dueDate}</span>}
                          </div>
                        </div>
                      </div>

                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 capitalize">
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Subject Mastery Radar Cards */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Syllabus Coverage by Subject</h3>
              </div>
              <button
                onClick={() => navigate('/learning')}
                className="text-xs text-indigo-400 hover:underline"
              >
                Open Learning Studio
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {subjects.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 col-span-3">
                  No subjects enrolled yet. Use the setup wizard above to import your syllabus.
                </div>
              ) : (
                subjects.map((sub) => {
                  // Calculate subject mastery score
                  let totalTopics = 0;
                  let sumScores = 0;
                  sub.modules.forEach((m) =>
                    m.chapters.forEach((c) =>
                      c.topics.forEach((t) => {
                        totalTopics++;
                        sumScores += t.masteryScore;
                      })
                    )
                  );
                  const subScore = totalTopics > 0 ? Math.round(sumScores / totalTopics) : 0;

                  return (
                    <div
                      key={sub.id}
                      onClick={() => navigate('/learning')}
                      className="cursor-pointer rounded-xl border border-slate-800/80 bg-slate-950/50 p-3.5 transition-all hover:border-slate-700 hover:bg-slate-900"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-800">
                          {sub.code}
                        </span>
                        <span className="text-xs font-bold text-slate-200">{subScore}%</span>
                      </div>
                      <div className="mt-2 text-xs font-bold text-white truncate">{sub.name}</div>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {sub.exams.length} exam{sub.exams.length !== 1 ? 's' : ''} scheduled
                      </p>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full bg-indigo-500"
                          style={{ width: `${subScore}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Weak Topics Radar & Gamification Missions */}
        <div className="space-y-6">
          {/* Weak Topics Warning Radar */}
          {settings.dashboardWidgets.weakTopics && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-white">Underperforming Topics</h3>
                </div>
                <button
                  onClick={() => navigate('/arena')}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Mistake Drill
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                {subjects.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No subjects enrolled yet. Import your course above to track topics.
                  </div>
                ) : weakTopics.length === 0 ? (
                  <div className="py-6 text-center text-xs text-emerald-400">
                    No critical weak spots detected. All topics above 60% accuracy!
                  </div>
                ) : (
                  weakTopics.slice(0, 3).map((w, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigate('/arena')}
                      className="cursor-pointer rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 transition-colors hover:border-rose-500/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {w.topicTitle}
                        </span>
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-rose-300">
                          {w.score}% Mastery
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400 truncate">
                        {w.subjectName} • {w.chapterTitle}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Gamification, XP & Daily Quests */}
          {settings.dashboardWidgets.streakXp && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-violet-400" />
                  <h3 className="text-sm font-bold text-white">Progression & Daily Quests</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Flame className="h-3.5 w-3.5 fill-amber-400" />
                  <span>{gamification.currentStreak} Day Streak</span>
                </div>
              </div>

              {/* Rank & Level overview */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                <div>
                  <div className="text-xs font-semibold text-violet-300">Rank: {gamification.rank}</div>
                  <div className="text-sm font-bold text-white">Level {gamification.level}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-violet-300">{gamification.xp} XP</span>
                  <div className="text-[10px] text-slate-400">Next rank at {(gamification.level) * 350} XP</div>
                </div>
              </div>

              {/* Missions list */}
              <div className="mt-4 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Daily Missions
                </span>
                {gamification.missions.map((m) => {
                  const percent = Math.min(100, Math.round((m.progress / m.maxProgress) * 100));
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-medium ${m.completed ? 'text-emerald-400 line-through' : 'text-slate-200'}`}>
                          {m.title}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-amber-400">
                          +{m.xpReward} XP
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full ${m.completed ? 'bg-emerald-400' : 'bg-indigo-500'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">
                          {m.progress}/{m.maxProgress}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
