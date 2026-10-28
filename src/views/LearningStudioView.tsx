import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  BrainCircuit,
  Swords,
  ChevronRight,
  Upload,
  FileText,
  AlertCircle,
  ArrowRight,
  Check,
  FileUp,
  Loader2,
  X,
} from 'lucide-react';
import { useStudyOS } from '../context/StudyOSContext';
import { useAuth } from '../context/AuthContext';
import { aiService, TutoringResponse } from '../services/aiService';
import { storage } from '../services/storage';
import { parseUploadedDocument } from '../services/documentExtractor';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

export const LearningStudioView: React.FC = () => {
  const { subjects, settings, resources } = useStudyOS();
  const { requireAuth } = useAuth();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [tutoringData, setTutoringData] = useState<TutoringResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isParsingDoc, setIsParsingDoc] = useState<boolean>(false);
  const [userSelectedOption, setUserSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [flashcardsCreated, setFlashcardsCreated] = useState<boolean>(false);
  const [questionsCreated, setQuestionsCreated] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [groundingText, setGroundingText] = useState<string>('');
  const [mobileTreeOpen, setMobileTreeOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  useEffect(() => {
    const sel = subjects.find((s) => s.id === selectedSubjectId);
    if (sel) {
      const firstTopic = sel.modules[0]?.chapters[0]?.topics[0];
      if (firstTopic && (!selectedTopicId || !sel.modules.some((m) => m.chapters.some((c) => c.topics.some((t) => t.id === selectedTopicId))))) {
        setSelectedTopicId(firstTopic.id);
      }
    }
  }, [selectedSubjectId, subjects, selectedTopicId]);

  useEffect(() => {
    const cachedText = sessionStorage.getItem('study_os_active_grounding_text');
    const cachedTitle = sessionStorage.getItem('study_os_active_grounding_title');
    if (cachedText) {
      setGroundingText(cachedText);
      setUploadedFileName(cachedTitle || 'Custom Material');
    }
  }, []);

  const handleFileUpload = async (fileInput: FileList | File[] | File) => {
    const rawFiles = fileInput instanceof File ? [fileInput] : Array.from(fileInput);
    if (rawFiles.length === 0) return;

    if (rawFiles.length > 10) {
      alert('Upload limit: Maximum 10 files allowed at once.');
      return;
    }

    setIsParsingDoc(true);
    try {
      const docs = await Promise.all(rawFiles.map((f) => parseUploadedDocument(f)));
      const combinedText = docs
        .map((d, i) => `=== SOURCE: ${rawFiles[i].name} ===\n${d.extractedText}`)
        .join('\n\n');
      setGroundingText(combinedText);
      const titleLabel =
        rawFiles.length === 1
          ? `${docs[0].title} (${docs[0].pageCount ? `${docs[0].pageCount} pgs` : `${docs[0].wordCount.toLocaleString()} wds`})`
          : `${rawFiles.length} Documents Combined (${rawFiles.map((f) => f.name).join(', ')})`;
      setUploadedFileName(titleLabel);
      sessionStorage.setItem('study_os_active_grounding_text', combinedText);
      sessionStorage.setItem('study_os_active_grounding_title', titleLabel);

      // Save each to resource library
      docs.forEach((doc, idx) => {
        const res = {
          id: `res-${Date.now()}-${idx}`,
          title: doc.title,
          type: doc.type,
          extractedText: doc.extractedText,
          extractedSections: doc.sections,
          fileHash: doc.fileHash,
          fileSize: doc.fileSize,
          subjectId: selectedSubjectId,
          tags: [doc.type.toUpperCase(), 'Studio Grounding'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        storage.saveResource(res);
      });

      storage.createNotification({
        title: 'Study Materials Grounded',
        message: `Parsed ${rawFiles.length} document${rawFiles.length > 1 ? 's' : ''}. Tutor is now actively grounded in your source notes.`,
        category: 'system',
      });
      // Re-trigger current step with grounding
      if (currentTopic && currentChapter) {
        handleTeachStep(currentStepIndex, combinedText);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error reading file: ${msg}`);
    } finally {
      setIsParsingDoc(false);
    }
  };

  const handleClearGrounding = () => {
    setGroundingText('');
    setUploadedFileName(null);
    sessionStorage.removeItem('study_os_active_grounding_text');
    sessionStorage.removeItem('study_os_active_grounding_title');
    if (currentTopic && currentChapter) {
      handleTeachStep(currentStepIndex, undefined);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Find selected chapter and topic
  let currentChapter: any = null;
  let currentTopic: any = null;
  if (selectedSubject) {
    for (const mod of selectedSubject.modules) {
      for (const chap of mod.chapters) {
        const found = chap.topics.find((t) => t.id === selectedTopicId);
        if (found) {
          currentChapter = chap;
          currentTopic = found;
          break;
        }
      }
    }
  }

  // Fetch or trigger step
  const handleTeachStep = async (stepIdx: number, overrideText?: string) => {
    if (!currentTopic || !currentChapter) return;
    setLoading(true);
    setCurrentStepIndex(stepIdx);
    setUserSelectedOption(null);
    setShowExplanation(false);
    setFlashcardsCreated(false);
    setQuestionsCreated(false);

    try {
      const activeText = overrideText !== undefined ? overrideText : groundingText;
      const response = await aiService.explainChapterTopic(
        currentChapter.title,
        currentTopic.title,
        stepIdx,
        settings,
        activeText || undefined
      );
      setTutoringData(response);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  React.useEffect(() => {
    if (currentTopic && !tutoringData && !loading) {
      handleTeachStep(0);
    }
  }, [currentTopic]);

  const handleOptionSelect = (idx: number) => {
    if (userSelectedOption !== null) return;
    setUserSelectedOption(idx);
    setShowExplanation(true);

    if (tutoringData && idx === tutoringData.retrievalQuestion.correctIndex) {
      storage.addXP(25, 'Answered retrieval checkpoint correctly');
      // Update topic mastery
      if (selectedSubject && currentTopic) {
        storage.updateTopicMastery(selectedSubject.id, currentTopic.id, {
          isUnderstood: true,
          isStudied: true,
          practiceQuestionsAttempted: currentTopic.practiceQuestionsAttempted + 1,
          practiceQuestionsCorrect: currentTopic.practiceQuestionsCorrect + 1,
        });
      }
    } else {
      if (selectedSubject && currentTopic) {
        storage.updateTopicMastery(selectedSubject.id, currentTopic.id, {
          isStudied: true,
          practiceQuestionsAttempted: currentTopic.practiceQuestionsAttempted + 1,
        });
      }
    }
  };

  const handleGenerateCards = async () => {
    if (!requireAuth('generate and save flashcards to the database')) return;
    if (!selectedSubject || !currentTopic) return;
    const cards = await aiService.generateFlashcards(selectedSubject.name, currentTopic.title, 3);
    cards.forEach((c) => {
      storage.saveFlashcard({
        ...c,
        id: `fc-gen-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        subjectId: selectedSubject.id,
        topicId: currentTopic.id,
        createdAt: new Date().toISOString(),
        reviewHistory: [],
      });
    });
    setFlashcardsCreated(true);
    storage.addXP(20, 'Generated topic flashcards');
  };

  const handleGenerateQuestions = async () => {
    if (!requireAuth('generate and save questions to the database')) return;
    if (!selectedSubject || !currentTopic) return;
    const questions = await aiService.generateQuestions(selectedSubject.name, currentTopic.title, 3);
    questions.forEach((q) => {
      storage.saveQuestion({
        ...q,
        subjectId: selectedSubject.id,
        topicId: currentTopic.id,
      });
    });
    setQuestionsCreated(true);
    storage.addXP(20, 'Generated practice questions');
  };

  const stepLabels = [
    '1. Mental Model',
    '2. Core Mechanics',
    '3. Derivations',
    '4. Exam Traps',
    '5. Failure Modes',
    '6. Recall Checkpoint',
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Subject Picker */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            AI Learning Studio
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Interactive cognitive tutoring grounded in your documents, structured across active recall checkpoints.
          </p>
        </div>

        {/* Subject dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              const sub = subjects.find((s) => s.id === e.target.value);
              const firstTop = sub?.modules[0]?.chapters[0]?.topics[0];
              if (firstTop) setSelectedTopicId(firstTop.id);
            }}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-indigo-500"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}: {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Topic Selector Bar */}
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3 lg:hidden">
        <div className="flex items-center gap-2 truncate pr-2">
          <BookOpen className="h-4 w-4 shrink-0 text-indigo-400" />
          <span className="text-xs font-semibold text-white truncate">
            {currentTopic ? `${currentChapter?.title || ''} • ${currentTopic.title}` : 'Select a Topic'}
          </span>
        </div>
        <button
          onClick={() => setMobileTreeOpen(!mobileTreeOpen)}
          className="shrink-0 rounded-lg bg-indigo-600/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 transition-colors"
        >
          {mobileTreeOpen ? 'Close Menu' : 'Browse Topics'}
        </button>
      </div>

      {/* Main Grid: Left Navigation Tree (Syllabus & Documents), Right Active Tutor Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Column: Syllabus Hierarchy & Document Upload */}
        <div className={`space-y-4 lg:col-span-1 ${mobileTreeOpen ? 'block' : 'hidden lg:block'}`}>
          {/* Document Attachment Widget */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Source Material Grounding
              </span>
              {uploadedFileName && (
                <button
                  onClick={handleClearGrounding}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-medium flex items-center gap-0.5"
                >
                  <X className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {uploadedFileName ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{uploadedFileName}</span>
                </div>
                <p className="text-[10px] text-slate-300 leading-tight">
                  Tutor explanations and active recall questions are strictly grounded in this source document.
                </p>
              </div>
            ) : isParsingDoc ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                <span className="mt-2 text-xs font-semibold text-white">Extracting document text...</span>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-3 text-center transition-colors hover:border-indigo-500 hover:bg-slate-900">
                  <Upload className="h-5 w-5 text-indigo-400" />
                  <span className="mt-1 text-xs font-medium text-slate-300">
                    Drop PDF, DOCX, or Notes
                  </span>
                  <span className="text-[10px] text-slate-500">In-browser client-side parsing</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc,.txt,.md,.markdown,.json,.py,.js,.ts,.cpp,.c,.java"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) handleFileUpload(e.target.files);
                    }}
                  />
                </label>

                {resources.length > 0 && (
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Or choose from Resource Library:</label>
                    <select
                      onChange={(e) => {
                        const res = resources.find((r) => r.id === e.target.value);
                        if (res) {
                          setGroundingText(res.extractedText || '');
                          const label = `${res.title} (${res.type.toUpperCase()})`;
                          setUploadedFileName(label);
                          sessionStorage.setItem('study_os_active_grounding_text', res.extractedText || '');
                          sessionStorage.setItem('study_os_active_grounding_title', label);
                          if (currentTopic && currentChapter) {
                            handleTeachStep(currentStepIndex, res.extractedText);
                          }
                        }
                      }}
                      defaultValue=""
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="" disabled>Select saved document...</option>
                      {resources.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({r.type.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chapters & Topics Selector */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Syllabus Hierarchy
            </span>

            <div className="mt-3 space-y-4">
              {selectedSubject?.modules.map((mod) => (
                <div key={mod.id} className="space-y-2">
                  <div className="text-xs font-bold text-indigo-300">{mod.title}</div>
                  {mod.chapters.map((chap) => (
                    <div key={chap.id} className="pl-2 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span className="truncate">{chap.title}</span>
                      </div>
                      <div className="pl-3 space-y-1">
                        {chap.topics.map((t) => {
                          const isSelected = t.id === selectedTopicId;
                          return (
                            <button
                              key={t.id}
                              onClick={() => {
                                setSelectedTopicId(t.id);
                                setMobileTreeOpen(false);
                                handleTeachStep(0);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-all ${
                                isSelected
                                  ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500'
                                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                              }`}
                            >
                              <span className="truncate">{t.title}</span>
                              <span className="rounded bg-slate-800 px-1 py-0.5 text-[9px] font-mono text-slate-400">
                                {t.masteryScore}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 3 Cols: Active Tutoring Studio */}
        <div className="space-y-6 lg:col-span-3">
          {/* Step Progression Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar rounded-2xl border border-slate-800 bg-slate-900/50 p-2 sm:flex-wrap">
            {stepLabels.map((lbl, idx) => (
              <button
                key={idx}
                onClick={() => handleTeachStep(idx)}
                className={`shrink-0 sm:flex-1 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                  currentStepIndex === idx
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Topic Detail Header */}
          {currentTopic && (
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-300 uppercase">
                    {currentTopic.importance} Priority
                  </span>
                  <span className="text-xs text-slate-400">
                    Difficulty: {currentTopic.difficulty}/5 • ~{currentTopic.estimatedMinutes}m duration
                  </span>
                </div>
                <h2 className="mt-1 text-xl font-bold text-white">{currentTopic.title}</h2>
              </div>

              {/* Instant Synthesis Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateCards}
                  disabled={flashcardsCreated}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                    flashcardsCreated
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <BrainCircuit className="h-3.5 w-3.5" />
                  <span>{flashcardsCreated ? 'Cards Added!' : 'Gen Flashcards'}</span>
                </button>

                <button
                  onClick={handleGenerateQuestions}
                  disabled={questionsCreated}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                    questionsCreated
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <Swords className="h-3.5 w-3.5" />
                  <span>{questionsCreated ? 'Questions Added!' : 'Gen Practice Qs'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Explanation Content Box */}
          {loading ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40">
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Sparkles className="h-6 w-6 animate-spin text-indigo-400" />
                <span className="text-xs">Synthesizing stage breakdown and active retrieval...</span>
              </div>
            </div>
          ) : tutoringData ? (
            <div className="space-y-6">
              {/* Markdown Content Area */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 leading-relaxed">
                <MarkdownRenderer content={tutoringData.explanation} />

                {/* Key Formulas / Definitions Box */}
                {tutoringData.keyFormulasOrDefinitions.length > 0 && (
                  <div className="mt-5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                      Core Formulas & Axioms
                    </span>
                    <ul className="mt-2 space-y-1.5 text-xs text-indigo-200 font-mono">
                      {tutoringData.keyFormulasOrDefinitions.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-indigo-400 mt-0.5">•</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Exam Tip Alert */}
                {tutoringData.examTip && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <div>
                      <span className="font-bold">High-Yield Exam Pointer: </span>
                      <MarkdownRenderer content={tutoringData.examTip} className="inline" />
                    </div>
                  </div>
                )}
              </div>

              {/* Active Retrieval Checkpoint Question */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                  <HelpCircle className="h-4 w-4" />
                  <span>Cognitive Retrieval Checkpoint</span>
                </div>
                <h3 className="mt-2 text-sm sm:text-base font-bold text-white">
                  {tutoringData.retrievalQuestion.prompt}
                </h3>

                <div className="mt-4 space-y-2">
                  {tutoringData.retrievalQuestion.options.map((opt, idx) => {
                    const isSelected = userSelectedOption === idx;
                    const isCorrect = idx === tutoringData.retrievalQuestion.correctIndex;
                    let style = 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700';

                    if (userSelectedOption !== null) {
                      if (isCorrect) {
                        style = 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200 font-semibold';
                      } else if (isSelected) {
                        style = 'border-rose-500/50 bg-rose-500/20 text-rose-200';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(idx)}
                        disabled={userSelectedOption !== null}
                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs transition-all ${style}`}
                      >
                        <span>{opt}</span>
                        {userSelectedOption !== null && isCorrect && (
                          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation on Answer */}
                {showExplanation && (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-300 animate-in fade-in">
                    <span className="font-bold text-white">Explanation: </span>
                    <span>{tutoringData.retrievalQuestion.explanation}</span>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => handleTeachStep((currentStepIndex + 1) % stepLabels.length)}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        <span>Next Learning Stage</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : !currentTopic ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
              <GraduationCap className="mx-auto h-10 w-10 text-slate-600" />
              <h3 className="mt-3 text-sm font-bold text-white">
                {subjects.length === 0 ? 'No Courses Enrolled Yet' : 'Select a Topic to Start Learning'}
              </h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                {subjects.length === 0
                  ? 'Import your course syllabus PDF on the Command Center to automatically populate your modules and begin AI-guided study.'
                  : 'Pick a module or topic from the left sidebar, or upload lecture notes above to start interactive AI tutoring.'}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
