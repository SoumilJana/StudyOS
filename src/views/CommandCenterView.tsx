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
  Loader2,
  BookOpen,
  X,
  FileText,
  AlertCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  GraduationCap,
} from 'lucide-react';
import { useStudyOS } from '../context/StudyOSContext';
import { useAuth } from '../context/AuthContext';
import { setupCourseFromSyllabus } from '../services/syllabusImporter';

export const CommandCenterView: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, requireAuth } = useAuth();
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
    gamification,
    settings,
    startTimer,
  } = useStudyOS();

  // Syllabus Setup Wizard State
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
  const [showAddCourseSection, setShowAddCourseSection] = useState(false);

  const MAX_FILES = 10;
  const MAX_FILE_SIZE_MB = 30;
  const MAX_TOTAL_SIZE_MB = 100;

  const handleFilesSelect = (filesToAdd: FileList | File[]) => {
    if (!requireAuth('upload files and add courses to the database')) return;
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
    if (!requireAuth('generate and save courses to the database')) return;
    if (uploadedFiles.length === 0) return;
    setIsGenerating(true);
    setUploadError(null);
    setGenerateStatus(
      `Extracting ${uploadedFiles.length} document${uploadedFiles.length > 1 ? 's' : ''} & structuring syllabus...`
    );
    try {
      await setupCourseFromSyllabus(uploadedFiles, examDate, courseTitle, courseCode);
      setUploadedFiles([]);
      setCourseTitle('');
      setCourseCode('');
      setShowAddCourseSection(false);
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
        actionText: 'Practice Quiz',
        onAction: () => navigate('/arena'),
        icon: Swords,
        badge: 'Weak Topic',
        color: 'from-rose-600/30 to-rose-500/10 border-rose-500/30 text-rose-200',
      };
    }
    if (dueFlashcardsCount > 0) {
      return {
        title: `Flashcards: ${dueFlashcardsCount} Due for Review`,
        subtitle: 'Review your spaced repetition cards today to reinforce long-term memory retention.',
        actionText: 'Review Cards',
        onAction: () => navigate('/memory'),
        icon: BrainCircuit,
        badge: 'Flashcards Due',
        color: 'from-indigo-600/30 to-indigo-500/10 border-indigo-500/30 text-indigo-200',
      };
    }
    return {
      title: 'Maintain Momentum: Deep Focus Session',
      subtitle: `Log a 50-minute focused study session toward your daily ${todayTargetMinutes}m goal.`,
      actionText: 'Start Focus',
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

  // Shared Syllabus Upload Form
  const renderUploadForm = (isNewUser: boolean = false) => (
    <div className={`rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 ${isNewUser ? 'max-w-3xl mx-auto' : ''}`}>
      {!isAuthenticated && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 sm:p-3.5 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="leading-snug">
              <strong>Sign-in Required:</strong> Please log in first so your generated courses and schedules are saved to your account.
            </span>
          </div>
          <button
            onClick={() => requireAuth('import syllabi and save courses')}
            className="ml-2.5 shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-amber-400 transition"
          >
            Log In First
          </button>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <h2 className="text-sm sm:text-base font-bold text-white">
            {isNewUser ? 'Step 1: Upload Your Syllabus & Schedule Exam' : 'Add New Course or Syllabus'}
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-300 leading-relaxed">
          Upload your course syllabus PDF or lecture notes and choose your exam date. Study OS will automatically extract your modules, schedule daily preparation milestones, and generate flashcards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 pt-1">
        {/* 1. File Upload */}
        <div className="md:col-span-1 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              1. Syllabus / Notes ({uploadedFiles.length}/10)
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
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-indigo-500/50 bg-indigo-500/5 p-4 text-center cursor-pointer hover:bg-indigo-500/10 active:scale-[0.99] transition-all"
          >
            <Upload className="h-6 w-6 text-indigo-400 mb-1" />
            <span className="text-xs font-semibold text-white">
              {uploadedFiles.length > 0 ? '+ Add More Files' : 'Select or Drop Files'}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">PDF, DOCX, TXT, MD</span>
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
        <div className="space-y-2.5 md:col-span-1">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">2. Course Title</label>
            <input
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="e.g. Ethical Hacking"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 sm:p-2 text-sm sm:text-xs text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Course Code (Optional)</label>
            <input
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="e.g. CS401"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 sm:p-2 text-sm sm:text-xs text-slate-100 font-mono placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* 3. Exam Date & Action */}
        <div className="space-y-3 md:col-span-1 flex flex-col justify-between">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">3. Target Exam Date</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 sm:p-2 text-sm sm:text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerateCourse}
            disabled={uploadedFiles.length === 0 || isGenerating}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 transition-all"
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
                    ? `Generate Study Plan (${uploadedFiles.length} File${uploadedFiles.length > 1 ? 's' : ''})`
                    : 'Select Files to Generate Plan'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // ZERO-STATE: FIRST-TIME ONBOARDING (Clean, beautiful, zero clutter)
  // =========================================================================
  if (subjects.length === 0) {
    return (
      <div className="space-y-8 pb-12 pt-2">
        {/* Welcome Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Welcome to Study OS</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Turn your syllabus into a master plan
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Upload your syllabus or lecture notes and set your exam date. Study OS automatically breaks down your modules, calculates your daily schedule, and generates practice questions.
          </p>
        </div>

        {/* 3-Step Setup Wizard */}
        {renderUploadForm(true)}

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto pt-2">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <ClockAlert className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Backward Schedule</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Calculates daily milestones backwards from exam day so learning, review, and practice fit naturally without cramming.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Active Flashcards</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Creates high-yield flashcards across all chapters and schedules reviews with spaced repetition.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
              <Swords className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Practice Quizzes</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Diagnose weak topics with immediate step-by-step explanations, formatted tables, and exam pointers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ACTIVE DASHBOARD: STREAMLINED & SELF-EXPLANATORY
  // =========================================================================
  return (
    <div className="space-y-5 sm:space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
            Daily study overview, upcoming deadlines, and priority tasks.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1 sm:pt-0">
          <button
            onClick={() => setShowAddCourseSection(!showAddCourseSection)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-700 hover:bg-slate-900 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-400" />
            <span>Add Course</span>
            {showAddCourseSection ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={() => {
              startTimer(50, 'focus');
              navigate('/focus');
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 active:scale-95"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>Start 50m Focus</span>
          </button>
        </div>
      </div>

      {/* Collapsible Add Course Section */}
      {showAddCourseSection && (
        <div className="animate-in fade-in slide-in-from-top-2">
          {renderUploadForm(false)}
        </div>
      )}

      {/* Priority Action Banner */}
      <div
        className={`relative overflow-hidden rounded-2xl border bg-gradient-to-r p-4 sm:p-5 shadow-lg ${nextAction.color}`}
      >
        <div className="relative z-10 flex flex-col justify-between gap-3 sm:gap-4 md:flex-row md:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold">
                {nextAction.badge}
              </span>
              <span className="text-[11px] font-medium text-slate-300">
                Recommended Action
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">{nextAction.title}</h2>
            <p className="max-w-2xl text-xs text-slate-300">{nextAction.subtitle}</p>
          </div>

          <button
            onClick={nextAction.onAction}
            className="flex items-center justify-center gap-2 w-full sm:w-auto self-start rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition-all hover:bg-slate-100 active:scale-95 md:self-center shrink-0"
          >
            <IconNext className="h-4 w-4 text-indigo-600" />
            <span>{nextAction.actionText}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 3 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* 1. Nearest Exam */}
        <div
          onClick={() => navigate('/deadlines')}
          className="cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 transition-all hover:border-slate-700 hover:bg-slate-900"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Upcoming Exam</span>
            <ClockAlert className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {nearestStats ? (
              <span>
                {nearestStats.daysLeft} <span className="text-xs font-normal text-slate-400">days left</span>
              </span>
            ) : (
              <span className="text-base text-slate-500">None scheduled</span>
            )}
          </div>
          <p className="mt-1 truncate text-[11px] text-slate-400">
            {nearestStats ? nearestStats.title : 'All commitments clear'}
          </p>
        </div>

        {/* 2. Due Flashcards */}
        <div
          onClick={() => navigate('/memory')}
          className="cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 transition-all hover:border-slate-700 hover:bg-slate-900"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Due Flashcards</span>
            <BrainCircuit className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {dueFlashcardsCount}{' '}
            <span className="text-xs font-normal text-slate-400">cards</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {dueFlashcardsCount > 0 ? 'Ready for spaced review' : 'Retention optimal'}
          </p>
        </div>

        {/* 3. Daily Focus Target */}
        <div
          onClick={() => navigate('/time')}
          className="cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 transition-all hover:border-slate-700 hover:bg-slate-900"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Today's Focus</span>
            <Hourglass className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {todayFocusMinutes}m{' '}
            <span className="text-xs font-normal text-slate-400">/ {todayTargetMinutes}m goal</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${focusPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (Tasks & Enrolled Courses), Right Column (Quests & Topics) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Today's Priority Tasks */}
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
                View all in Tasks ({tasks.length})
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {todayTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No pending tasks for today. You're completely caught up!
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

          {/* Enrolled Courses & Study Roadmaps */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">My Enrolled Courses</h3>
              </div>
              <button
                onClick={() => navigate('/learning')}
                className="text-xs text-indigo-400 hover:underline"
              >
                Open Course Materials
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {subjects.map((sub) => {
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
                    className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-800">
                          {sub.code || 'COURSE'}
                        </span>
                        <h4 className="mt-1 text-xs font-bold text-white line-clamp-1">{sub.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {sub.modules.length} Modules • {totalTopics} Topics
                        </p>
                      </div>
                      <span className="text-xs font-bold text-indigo-300">{subScore}%</span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-indigo-500"
                        style={{ width: `${subScore}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => navigate('/learning')}
                        className="flex-1 rounded-lg bg-indigo-600/20 px-2.5 py-1.5 text-center text-[11px] font-semibold text-indigo-300 hover:bg-indigo-600/30 transition-colors"
                      >
                        Study Notes
                      </button>
                      <button
                        onClick={() => navigate('/arena')}
                        className="flex-1 rounded-lg border border-slate-800 px-2.5 py-1.5 text-center text-[11px] font-semibold text-slate-300 hover:bg-slate-800/50 transition-colors"
                      >
                        Practice Quiz
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-6">
          {/* Weak Topics Warning */}
          {weakTopics.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-white">Topics Requiring Review</h3>
                </div>
                <button
                  onClick={() => navigate('/arena')}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Mistake Drill
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                {weakTopics.slice(0, 3).map((w, idx) => (
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
                ))}
              </div>
            </div>
          )}

          {/* Gamification, XP & Daily Quests */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Daily Quests & Streak</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Flame className="h-3.5 w-3.5 fill-amber-400" />
                <span>{gamification.currentStreak}d Streak</span>
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
                <div className="text-[10px] text-slate-400">Next rank at {gamification.level * 350} XP</div>
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
        </div>
      </div>
    </div>
  );
};
