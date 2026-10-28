import React, { useState, useEffect, useMemo } from 'react';
import {
  Swords,
  Timer,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  BookOpen,
  Send,
  HelpCircle,
  Flag,
  Award,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  Layers,
  Loader2,
  X,
  Filter,
} from 'lucide-react';
import { useStudyOS } from '../context/StudyOSContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { aiService } from '../services/aiService';
import { Question, MistakeRecord } from '../types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

export const ExamArenaView: React.FC = () => {
  const { questions, mistakes, subjects, weakTopics } = useStudyOS();
  const { requireAuth } = useAuth();

  const [activeTab, setActiveTab] = useState<'arena' | 'mistakes'>('arena');
  const [selectedMode, setSelectedMode] = useState<'topic' | 'mixed' | 'weak' | 'mock'>('mixed');
  const [isTestRunning, setIsTestRunning] = useState<boolean>(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [testSecondsLeft, setTestSecondsLeft] = useState<number>(1800); // 30 mins
  const [testCompleted, setTestCompleted] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    score: number;
    maxScore: number;
    correctCount: number;
    negativeDeductions: number;
  } | null>(null);

  // Curriculum Scope & Sprint Controls
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [sprintSize, setSprintSize] = useState<number>(5);

  // AI Question Generation Modal State
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [selectedTopicForGen, setSelectedTopicForGen] = useState<string>('');
  const [genCount, setGenCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genFeedback, setGenFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const allSubjectTopics = useMemo(() => {
    return activeSubject?.modules.flatMap((m) => m.chapters.flatMap((c) => c.topics)) || [];
  }, [activeSubject]);

  useEffect(() => {
    if (allSubjectTopics.length > 0 && !selectedTopicForGen) {
      setSelectedTopicForGen(allSubjectTopics[0].id);
    }
  }, [allSubjectTopics, selectedTopicForGen]);

  // Compute filtered question pool for active subject & module
  const filteredPool = useMemo(() => {
    let pool = [...questions];
    if (selectedSubjectId) {
      const subQ = pool.filter((q) => q.subjectId === selectedSubjectId);
      if (subQ.length > 0) pool = subQ;
    }
    if (selectedModuleId !== 'all') {
      const mod = activeSubject?.modules.find((m) => m.id === selectedModuleId);
      if (mod) {
        const modTopicIds = mod.chapters.flatMap((c) => c.topics.map((t) => t.id));
        const modQ = pool.filter((q) => q.topicId && modTopicIds.includes(q.topicId));
        if (modQ.length > 0) pool = modQ;
      }
    }
    return pool;
  }, [questions, selectedSubjectId, selectedModuleId, activeSubject]);

  // Restore active test from localStorage if available
  useEffect(() => {
    try {
      const savedTest = localStorage.getItem('study_os_active_test');
      if (savedTest) {
        const parsed = JSON.parse(savedTest);
        if (parsed.isTestRunning) {
          setTestQuestions(parsed.testQuestions);
          setUserAnswers(parsed.userAnswers);
          setCurrentQuestionIdx(parsed.currentQuestionIdx || 0);
          setTestSecondsLeft(parsed.testSecondsLeft || 1200);
          setIsTestRunning(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!isTestRunning || testCompleted) return;
    const interval = setInterval(() => {
      setTestSecondsLeft((prev) => {
        if (prev <= 1) {
          handleFinishTest();
          return 0;
        }
        const updated = prev - 1;
        try {
          localStorage.setItem(
            'study_os_active_test',
            JSON.stringify({
              isTestRunning: true,
              testQuestions,
              userAnswers,
              currentQuestionIdx,
              testSecondsLeft: updated,
            })
          );
        } catch {
          // ignore
        }
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTestRunning, testCompleted, testQuestions, userAnswers, currentQuestionIdx]);

  const startPractice = (mode: 'topic' | 'mixed' | 'weak' | 'mock') => {
    if (!requireAuth('start retrieval drills and save progress to the database')) return;
    let pool = [...filteredPool];
    if (pool.length === 0) {
      pool = [...questions];
    }
    if (pool.length === 0) {
      alert('No practice questions available yet. Use the "+ Generate AI Questions" button above to synthesize questions from your syllabus!');
      return;
    }

    if (mode === 'weak' && weakTopics.length > 0) {
      const weakIds = weakTopics.map((w) => w.topicId);
      const filtered = pool.filter((q) => q.topicId && weakIds.includes(q.topicId));
      if (filtered.length > 0) pool = filtered;
    }

    // Determine count and time
    const count = mode === 'mock' ? Math.min(20, Math.max(8, pool.length)) : Math.min(sprintSize, pool.length);
    const durationMinutes = mode === 'mock' ? 45 : Math.max(5, count * 2);

    // Shuffle pool
    const selected = pool.sort(() => Math.random() - 0.5).slice(0, count);
    setTestQuestions(selected);
    setUserAnswers({});
    setCurrentQuestionIdx(0);
    setTestSecondsLeft(durationMinutes * 60);
    setTestCompleted(false);
    setTestResult(null);
    setIsTestRunning(true);

    try {
      localStorage.setItem(
        'study_os_active_test',
        JSON.stringify({
          isTestRunning: true,
          testQuestions: selected,
          userAnswers: {},
          currentQuestionIdx: 0,
          testSecondsLeft: durationMinutes * 60,
        })
      );
    } catch {
      // ignore
    }
  };

  const handleGenerateQuestionsWithAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth('generate practice questions with AI')) return;
    if (!activeSubject) return;

    const targetTopic = allSubjectTopics.find((t) => t.id === selectedTopicForGen) || allSubjectTopics[0];
    if (!targetTopic) return;

    setIsGenerating(true);
    setGenFeedback(null);

    try {
      const resources = storage.getResources().filter((r) => r.subjectId === activeSubject.id);
      const docContext = resources.map((r) => r.extractedText).join('\n\n').slice(0, 3000);

      const generated = await aiService.generateQuestions(
        activeSubject.name,
        targetTopic.title,
        genCount,
        3,
        docContext
      );

      generated.forEach((q) => {
        storage.saveQuestion({
          ...q,
          subjectId: activeSubject.id,
          topicId: targetTopic.id,
        });
      });

      setGenFeedback(`✓ Successfully added ${generated.length} fresh practice questions on "${targetTopic.title}" to your question bank!`);
      setTimeout(() => {
        setShowAiModal(false);
        setGenFeedback(null);
      }, 2000);
    } catch (err: any) {
      setGenFeedback(`Failed to generate questions: ${err.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectAnswer = (qId: string, answer: string) => {
    const updated = { ...userAnswers, [qId]: answer };
    setUserAnswers(updated);
    try {
      localStorage.setItem(
        'study_os_active_test',
        JSON.stringify({
          isTestRunning: true,
          testQuestions,
          userAnswers: updated,
          currentQuestionIdx,
          testSecondsLeft,
        })
      );
    } catch {
      // ignore
    }
  };

  const handleFinishTest = async () => {
    setIsTestRunning(false);
    setTestCompleted(true);
    localStorage.removeItem('study_os_active_test');

    let totalScore = 0;
    let maxScore = 0;
    let correct = 0;
    let negativeDeductions = 0;

    for (const q of testQuestions) {
      maxScore += q.marks;
      const userAns = userAnswers[q.id];

      let isCorrect = false;
      if (q.type === 'mcq_single' || q.type === 'true_false') {
        isCorrect = userAns === q.correctAnswer;
      } else if (q.type === 'numerical') {
        isCorrect = Math.abs(parseFloat(userAns || '0') - parseFloat(q.correctAnswer as string)) < 0.1;
      } else if (q.type === 'short_answer') {
        const grade = await aiService.gradeSubjectiveAnswer(q.prompt, q.rubricCriteria, userAns || '');
        if (grade.percentage >= 70) isCorrect = true;
        totalScore += grade.scoreAwarded;
      }

      if (isCorrect) {
        correct++;
        if (q.type !== 'short_answer') totalScore += q.marks;
      } else {
        if (userAns && q.negativeMarks) {
          negativeDeductions += q.negativeMarks;
          totalScore = Math.max(0, totalScore - q.negativeMarks);
        }

        // Record in Mistake Notebook!
        if (userAns) {
          storage.recordMistake({
            id: `mst-${Date.now()}-${q.id}`,
            questionId: q.id,
            topicId: q.topicId,
            subjectId: q.subjectId,
            questionPrompt: q.prompt,
            userAnswer: userAns,
            expectedAnswer: q.correctAnswer,
            explanation: q.explanation,
            misconceptionNotes: q.misconceptions?.[0] || 'Incorrect conceptual deduction under exam conditions.',
            attemptedAt: new Date().toISOString(),
            resolved: false,
          });
        }
      }

      // Update topic mastery stats
      if (q.subjectId && q.topicId) {
        storage.updateTopicMastery(q.subjectId, q.topicId, {
          practiceQuestionsAttempted: 1,
          practiceQuestionsCorrect: isCorrect ? 1 : 0,
        });
      }
    }

    setTestResult({
      score: Math.max(0, Math.round(totalScore * 10) / 10),
      maxScore,
      correctCount: correct,
      negativeDeductions,
    });

    const xpEarned = Math.round(totalScore * 15);
    storage.addXP(xpEarned, `Completed Exam Arena practice: ${correct}/${testQuestions.length} correct`);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Exam Arena & Mistake Notebook
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            High-stakes practice simulations, negative marking, deterministic & AI rubric grading, and automatic misconception logging.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
          <button
            onClick={() => setActiveTab('arena')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'arena'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords className="h-3.5 w-3.5" />
            <span>Practice Arena</span>
          </button>
          <button
            onClick={() => setActiveTab('mistakes')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'mistakes'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Mistake Notebook ({mistakes.filter((m) => !m.resolved).length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'arena' ? (
        !isTestRunning && !testCompleted ? (
          /* Arena Mode Selection Grid */
          <div className="space-y-6">
            {/* Question Pool Control Bar */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 shadow-lg">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Curriculum Question Bank
                    </span>
                    <span className="ml-2 text-xs font-mono font-semibold text-indigo-400">
                      {filteredPool.length} Questions Ready
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Sprint Size Selector */}
                  <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1 text-[11px] font-semibold">
                    <span className="px-2 text-slate-400">Sprint:</span>
                    {[5, 10, 20].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSprintSize(sz)}
                        className={`rounded-lg px-2.5 py-1 transition-colors ${
                          sprintSize === sz
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sz} Qs
                      </button>
                    ))}
                  </div>

                  {/* Generate with AI Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!requireAuth('generate practice questions with AI')) return;
                      setShowAiModal(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:opacity-95 transition-opacity"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>+ Generate AI Questions</span>
                  </button>
                </div>
              </div>

              {/* Module Scope Filter Pills */}
              {activeSubject && activeSubject.modules.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-800/80 pt-2.5">
                  <span className="mr-1 text-[11px] font-medium text-slate-500">Filter Module:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedModuleId('all')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      selectedModuleId === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'border border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    All Curriculum ({questions.filter((q) => !selectedSubjectId || q.subjectId === selectedSubjectId).length} Qs)
                  </button>
                  {activeSubject.modules.map((m, idx) => {
                    const modTopicIds = m.chapters.flatMap((c) => c.topics.map((t) => t.id));
                    const modCount = questions.filter((q) => q.topicId && modTopicIds.includes(q.topicId)).length;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedModuleId(m.id)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                          selectedModuleId === m.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'border border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        Module {idx + 1}: {m.title.length > 20 ? m.title.slice(0, 18) + '...' : m.title} ({modCount} Qs)
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {filteredPool.length === 0 && (
              <div className="rounded-2xl border border-dashed border-indigo-500/30 bg-indigo-950/20 p-5 text-center">
                <Swords className="mx-auto h-7 w-7 text-indigo-400" />
                <h3 className="mt-2 text-sm font-bold text-white">No Questions in this Filter</h3>
                <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                  Click "+ Generate AI Questions" above to instantly synthesize examination questions from your course text.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Mode 1: Weak Topics Drill */}
              <div
                onClick={() => startPractice('weak')}
                className="cursor-pointer rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 transition-all hover:border-rose-500 hover:bg-rose-500/15"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300 uppercase">
                    High Priority
                  </span>
                  <Swords className="h-4 w-4 text-rose-400" />
                </div>
                <h3 className="mt-3 text-base font-bold text-white">Weak-Topic Drill</h3>
                <p className="mt-1 text-xs text-slate-300">
                  Laser focus on questions from topics where your historical accuracy is under 60%.
                </p>
                <div className="mt-4 text-[11px] font-semibold text-rose-300">
                  {weakTopics.length} vulnerable topic{weakTopics.length !== 1 ? 's' : ''} targeted →
                </div>
              </div>

              {/* Mode 2: Mixed-Topic Practice */}
              <div
                onClick={() => startPractice('mixed')}
                className="cursor-pointer rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 transition-all hover:border-indigo-500 hover:bg-indigo-500/15"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-300 uppercase">
                    Balanced
                  </span>
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                </div>
                <h3 className="mt-3 text-base font-bold text-white">Mixed-Topic Blitz</h3>
                <p className="mt-1 text-xs text-slate-300">
                  Interleaved retrieval across your active curriculum modules to build long-term retention.
                </p>
                <div className="mt-4 text-[11px] font-semibold text-indigo-300">
                  Start {Math.min(sprintSize, filteredPool.length || 5)}-question sprint →
                </div>
              </div>

              {/* Mode 3: Full Timed Mock Exam */}
              <div
                onClick={() => startPractice('mock')}
                className="cursor-pointer rounded-2xl border border-violet-500/30 bg-violet-500/10 p-5 transition-all hover:border-violet-500 hover:bg-violet-500/15"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-violet-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-violet-300 uppercase">
                    Exam Simulation
                  </span>
                  <Timer className="h-4 w-4 text-violet-400" />
                </div>
                <h3 className="mt-3 text-base font-bold text-white">Full Mock Examination</h3>
                <p className="mt-1 text-xs text-slate-300">
                  Strict 45-minute countdown, negative marking penalties, and comprehensive score breakdown.
                </p>
                <div className="mt-4 text-[11px] font-semibold text-violet-300">
                  Begin {Math.min(20, Math.max(8, filteredPool.length))}-question simulation →
                </div>
              </div>

              {/* Mode 4: Retry Mistakes */}
              <div
                onClick={() => setActiveTab('mistakes')}
                className="cursor-pointer rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 transition-all hover:border-amber-500 hover:bg-amber-500/15"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 uppercase">
                    Reinforce
                  </span>
                  <RotateCcw className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="mt-3 text-base font-bold text-white">Mistake Re-Test</h3>
                <p className="mt-1 text-xs text-slate-300">
                  Directly attempt questions you previously missed until the underlying misconception is cured.
                </p>
                <div className="mt-4 text-[11px] font-semibold text-amber-300">
                  {mistakes.filter((m) => !m.resolved).length} active misconception{mistakes.filter((m) => !m.resolved).length !== 1 ? 's' : ''} →
                </div>
              </div>
            </div>

            {/* Modal: Generate AI Practice Questions */}
            {showAiModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Generate AI Practice Questions</h3>
                        <p className="text-[11px] text-slate-400">Synthesizes exam-grade questions from your syllabus</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAiModal(false)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleGenerateQuestionsWithAI} className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300">Select Topic to Test</label>
                      <select
                        value={selectedTopicForGen}
                        onChange={(e) => setSelectedTopicForGen(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      >
                        {allSubjectTopics.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300">Question Quantity</label>
                      <div className="mt-1.5 flex gap-2">
                        {[3, 5, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setGenCount(num)}
                            className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-all ${
                              genCount === num
                                ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                                : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {num} Questions
                          </button>
                        ))}
                      </div>
                    </div>

                    {genFeedback && (
                      <div
                        className={`rounded-xl border p-3 text-xs ${
                          genFeedback.startsWith('✓')
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                        }`}
                      >
                        {genFeedback}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAiModal(false)}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isGenerating}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Generate Questions</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : isTestRunning ? (
          /* Live Test Engine */
          <div className="space-y-6">
            {/* Top Status Bar: Timer + Navigator */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center gap-2 font-mono text-sm font-bold text-white">
                <Timer className="h-4 w-4 text-amber-400" />
                <span className={testSecondsLeft < 300 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}>
                  {formatTimer(testSecondsLeft)}
                </span>
                <span className="text-xs text-slate-500 font-normal">remaining</span>
              </div>

              {/* Question Navigation Dots */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {testQuestions.map((q, idx) => {
                  const answered = !!userAnswers[q.id];
                  const isCurrent = idx === currentQuestionIdx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`h-7 w-7 rounded-lg text-xs font-mono font-bold transition-all ${
                        isCurrent
                          ? 'border-2 border-indigo-500 bg-indigo-600 text-white'
                          : answered
                          ? 'bg-slate-700 text-slate-200'
                          : 'border border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Finish Exam Button */}
              <button
                onClick={handleFinishTest}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit Assessment</span>
              </button>
            </div>

            {/* Current Question Body */}
            {testQuestions[currentQuestionIdx] && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-indigo-400">
                    Question {currentQuestionIdx + 1} of {testQuestions.length}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                      +{testQuestions[currentQuestionIdx].marks} Marks
                    </span>
                    {testQuestions[currentQuestionIdx].negativeMarks ? (
                      <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono text-rose-300">
                        -{testQuestions[currentQuestionIdx].negativeMarks} Negative
                      </span>
                    ) : null}
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white">
                  {testQuestions[currentQuestionIdx].prompt}
                </h3>

                {/* Options or Answer Input */}
                {testQuestions[currentQuestionIdx].options ? (
                  <div className="space-y-2.5">
                    {testQuestions[currentQuestionIdx].options?.map((opt) => {
                      const isSelected = userAnswers[testQuestions[currentQuestionIdx].id] === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectAnswer(testQuestions[currentQuestionIdx].id, opt.id)}
                          className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 text-xs transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200 font-semibold shadow-sm'
                              : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span>{opt.text}</span>
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
                            }`}
                          >
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-slate-400 font-medium">Type your answer:</label>
                    <textarea
                      rows={3}
                      value={userAnswers[testQuestions[currentQuestionIdx].id] || ''}
                      onChange={(e) => handleSelectAnswer(testQuestions[currentQuestionIdx].id, e.target.value)}
                      placeholder="Enter formula, value, or explanation..."
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Navigation Back / Next */}
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
                  <button
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>
                  <button
                    disabled={currentQuestionIdx === testQuestions.length - 1}
                    onClick={() => setCurrentQuestionIdx((p) => Math.min(testQuestions.length - 1, p + 1))}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-30"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : testCompleted && testResult ? (
          /* Test Results & Detailed Review */
          <div className="space-y-6">
            <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-900/30 to-violet-900/20 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
                <Award className="h-8 w-8" />
              </div>
              <h2 className="mt-3 text-2xl font-black text-white">Assessment Complete!</h2>
              <p className="mt-1 text-xs text-slate-300">
                Performance recorded into topic mastery scores & Mistake Notebook.
              </p>

              <div className="mt-6 flex justify-center gap-6">
                <div>
                  <div className="text-3xl font-black text-white">{testResult.score}</div>
                  <div className="text-[11px] uppercase font-mono text-slate-400">Score ({testResult.maxScore} Max)</div>
                </div>
                <div className="h-10 w-px bg-slate-800" />
                <div>
                  <div className="text-3xl font-black text-emerald-400">{testResult.correctCount}</div>
                  <div className="text-[11px] uppercase font-mono text-slate-400">Correct ({testQuestions.length})</div>
                </div>
                {testResult.negativeDeductions > 0 && (
                  <>
                    <div className="h-10 w-px bg-slate-800" />
                    <div>
                      <div className="text-3xl font-black text-rose-400">-{testResult.negativeDeductions}</div>
                      <div className="text-[11px] uppercase font-mono text-slate-400">Penalties</div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => startPractice('mixed')}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Start New Practice Sprint
                </button>
                <button
                  onClick={() => setActiveTab('mistakes')}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                >
                  Review Recorded Mistakes
                </button>
              </div>
            </div>

            {/* Answer Key Breakdown */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">Detailed Solutions & Misconception Review</h3>
              {testQuestions.map((q, idx) => {
                const userAns = userAnswers[q.id];
                const isCorrect = userAns === q.correctAnswer;
                return (
                  <div
                    key={q.id}
                    className={`rounded-xl border p-4 text-xs ${
                      isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-200">
                        {idx + 1}. {q.prompt}
                      </span>
                      <span className={isCorrect ? 'text-emerald-400' : 'text-rose-400'}>
                        {isCorrect ? 'Correct (+ ' + q.marks + ')' : 'Incorrect (Recorded)'}
                      </span>
                    </div>
                    <div className="mt-2 text-slate-300">
                      <span className="font-bold text-slate-400">Your Answer: </span>
                      <span>{userAns || '(Unanswered)'}</span>
                    </div>
                    <div className="mt-1 text-slate-300">
                      <span className="font-bold text-emerald-400">Expected: </span>
                      <span>{String(q.correctAnswer)}</span>
                    </div>
                    <div className="mt-2 text-slate-400">
                      <span className="font-bold text-slate-300">Explanation: </span>
                      <MarkdownRenderer content={q.explanation} className="mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null
      ) : (
        /* Mistake Notebook Tab */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Mistake Notebook & Misconceptions</h3>
              <p className="text-xs text-slate-400">
                Items missed in tests are stored here with their underlying misconceptions and feed revision schedules.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {mistakes.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No mistakes recorded yet. Attempt questions in the Arena!
              </div>
            ) : (
              mistakes.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl border p-4 text-xs transition-colors ${
                    m.resolved
                      ? 'border-slate-800 bg-slate-950/30 text-slate-500 opacity-60'
                      : 'border-rose-500/30 bg-rose-500/5 text-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="font-bold text-white">{m.questionPrompt}</div>
                      <div className="text-rose-300">
                        <span className="font-semibold text-slate-400">Your Answer: </span>
                        <span>{String(m.userAnswer)}</span>
                      </div>
                      <div className="text-emerald-300">
                        <span className="font-semibold text-slate-400">Expected Answer: </span>
                        <span>{String(m.expectedAnswer)}</span>
                      </div>
                      <div className="text-slate-300">
                        <span className="font-semibold text-slate-400">Underlying Misconception: </span>
                        <span>{m.misconceptionNotes}</span>
                      </div>
                    </div>

                    {!m.resolved ? (
                      <button
                        onClick={() => storage.resolveMistake(m.id)}
                        className="rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-600/30"
                      >
                        Mark Resolved (+35 XP)
                      </button>
                    ) : (
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
