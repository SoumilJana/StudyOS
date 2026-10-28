import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Subject,
  Deadline,
  Project,
  Task,
  Flashcard,
  FlashcardDeck,
  Question,
  MistakeRecord,
  TimeLog,
  FocusSession,
  HourlyCheckin,
  RevisionEvent,
  GamificationState,
  UserSettings,
  AppNotification,
  Resource,
} from '../types';
import { storage } from '../services/storage';

interface GlobalTimerState {
  isRunning: boolean;
  isPaused: boolean;
  mode: 'focus' | 'break';
  secondsLeft: number;
  totalPlannedSeconds: number;
  actualSecondsElapsed: number;
  interruptions: number;
  linkedSubjectId?: string;
  linkedChapterId?: string;
  linkedTaskId?: string;
  startedAt?: string;
}

interface StudyOSContextType {
  subjects: Subject[];
  deadlines: Deadline[];
  projects: Project[];
  tasks: Task[];
  decks: FlashcardDeck[];
  flashcards: Flashcard[];
  questions: Question[];
  mistakes: MistakeRecord[];
  revisions: RevisionEvent[];
  timeLogs: TimeLog[];
  focusSessions: FocusSession[];
  hourlyCheckins: HourlyCheckin[];
  gamification: GamificationState;
  settings: UserSettings;
  notifications: AppNotification[];
  resources: Resource[];

  // Computed metrics
  overallSyllabusProgress: number;
  dueFlashcardsCount: number;
  todayFocusMinutes: number;
  todayTargetMinutes: number;
  weakTopics: { subjectName: string; chapterTitle: string; topicTitle: string; score: number; topicId: string; subjectId: string }[];
  nearestDeadline: Deadline | null;
  dueRevisionsToday: RevisionEvent[];

  // Global Pomodoro Timer
  timer: GlobalTimerState;
  startTimer: (durationMinutes: number, mode: 'focus' | 'break', subjectId?: string, taskId?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  skipTimerPhase: () => void;
  recordTimerInterruption: () => void;

  // Hourly Check-in modal controller
  showHourlyPrompt: boolean;
  setShowHourlyPrompt: (show: boolean) => void;
  submitHourlyCheckin: (category: import('../types').TimeCategory, note?: string) => void;
  snoozeHourlyCheckin: () => void;

  // Quick Action / Command Palette
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
}

const StudyOSContext = createContext<StudyOSContextType | null>(null);

export const StudyOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [, setTick] = useState(0);

  // Global Timer State persisted in sessionStorage/localStorage for reload recovery
  const [timer, setTimer] = useState<GlobalTimerState>(() => {
    try {
      const saved = localStorage.getItem('study_os_active_timer');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If it was running, calculate elapsed time since saved timestamp
        if (parsed.isRunning && parsed.lastTimestamp) {
          const now = Date.now();
          const elapsedDelta = Math.floor((now - parsed.lastTimestamp) / 1000);
          const newSecondsLeft = Math.max(0, parsed.secondsLeft - elapsedDelta);
          const newActualElapsed = (parsed.actualSecondsElapsed || 0) + elapsedDelta;
          return {
            ...parsed,
            secondsLeft: newSecondsLeft,
            actualSecondsElapsed: newActualElapsed,
            isRunning: newSecondsLeft > 0,
            isPaused: false,
          };
        }
        return parsed;
      }
    } catch {
      // fallback
    }
    return {
      isRunning: false,
      isPaused: false,
      mode: 'focus',
      secondsLeft: 50 * 60,
      totalPlannedSeconds: 50 * 60,
      actualSecondsElapsed: 0,
      interruptions: 0,
    };
  });

  const [showHourlyPrompt, setShowHourlyPrompt] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Subscribe to storage updates
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  // Timer Tick effect
  useEffect(() => {
    if (!timer.isRunning || timer.isPaused) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev.secondsLeft <= 1) {
          // Timer finished!
          clearInterval(interval);
          // Log session if focus mode
          if (prev.mode === 'focus') {
            storage.logFocusSession({
              id: `fs-${Date.now()}`,
              startedAt: prev.startedAt || new Date(Date.now() - prev.totalPlannedSeconds * 1000).toISOString(),
              endedAt: new Date().toISOString(),
              durationSeconds: prev.totalPlannedSeconds,
              actualFocusedSeconds: prev.actualSecondsElapsed + 1,
              preset: prev.totalPlannedSeconds === 3000 ? '50_10' : prev.totalPlannedSeconds === 1500 ? '25_5' : 'custom',
              subjectId: prev.linkedSubjectId,
              taskId: prev.linkedTaskId,
              status: 'completed',
              interruptionsCount: prev.interruptions,
              notes: 'Full focus session finished successfully.',
            });

            // Trigger notification
            storage.createNotification({
              title: 'Focus Session Completed!',
              message: 'Great job! Time for a well-deserved recovery break.',
              category: 'focus',
              actionUrl: '/focus',
            });
          }

          // Switch to break
          const isNextBreak = prev.mode === 'focus';
          const breakDuration = prev.totalPlannedSeconds >= 3000 ? 10 * 60 : 5 * 60;

          return {
            ...prev,
            isRunning: false,
            isPaused: false,
            mode: isNextBreak ? 'break' : 'focus',
            secondsLeft: isNextBreak ? breakDuration : prev.totalPlannedSeconds,
            totalPlannedSeconds: isNextBreak ? breakDuration : prev.totalPlannedSeconds,
            actualSecondsElapsed: 0,
            interruptions: 0,
          };
        }

        const updated: GlobalTimerState = {
          ...prev,
          secondsLeft: prev.secondsLeft - 1,
          actualSecondsElapsed: prev.actualSecondsElapsed + 1,
        };

        // Persist timestamp for reload tolerance
        try {
          localStorage.setItem('study_os_active_timer', JSON.stringify({
            ...updated,
            lastTimestamp: Date.now(),
          }));
        } catch {
          // ignore
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.isPaused]);

  // Hourly Check-in prompt trigger checking
  useEffect(() => {
    const settings = storage.getSettings();
    if (!settings.hourlyCheckinEnabled) return;

    const checkinInterval = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();

      // Check quiet hours
      const [qStartH] = (settings.quietHoursStart || '22:00').split(':').map(Number);
      const [qEndH] = (settings.quietHoursEnd || '07:30').split(':').map(Number);

      const inQuietHours =
        qStartH > qEndH
          ? currentHour >= qStartH || currentHour < qEndH
          : currentHour >= qStartH && currentHour < qEndH;

      if (!inQuietHours && currentMinutes === 0 && !showHourlyPrompt) {
        setShowHourlyPrompt(true);
      }
    }, 60000);

    return () => clearInterval(checkinInterval);
  }, [showHourlyPrompt]);

  // Keyboard shortcut for Command Palette (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Timer Methods
  const startTimer = (durationMinutes: number, mode: 'focus' | 'break', subjectId?: string, taskId?: string) => {
    const seconds = durationMinutes * 60;
    const newTimer: GlobalTimerState = {
      isRunning: true,
      isPaused: false,
      mode,
      secondsLeft: seconds,
      totalPlannedSeconds: seconds,
      actualSecondsElapsed: 0,
      interruptions: 0,
      linkedSubjectId: subjectId,
      linkedTaskId: taskId,
      startedAt: new Date().toISOString(),
    };
    setTimer(newTimer);
    try {
      localStorage.setItem('study_os_active_timer', JSON.stringify({ ...newTimer, lastTimestamp: Date.now() }));
    } catch {
      // ignore
    }
  };

  const pauseTimer = () => {
    setTimer((prev) => {
      const updated = { ...prev, isPaused: true };
      localStorage.setItem('study_os_active_timer', JSON.stringify(updated));
      return updated;
    });
  };

  const resumeTimer = () => {
    setTimer((prev) => {
      const updated = { ...prev, isPaused: false, isRunning: true };
      localStorage.setItem('study_os_active_timer', JSON.stringify({ ...updated, lastTimestamp: Date.now() }));
      return updated;
    });
  };

  const resetTimer = () => {
    setTimer((prev) => {
      const resetState: GlobalTimerState = {
        isRunning: false,
        isPaused: false,
        mode: prev.mode,
        secondsLeft: prev.totalPlannedSeconds,
        totalPlannedSeconds: prev.totalPlannedSeconds,
        actualSecondsElapsed: 0,
        interruptions: 0,
      };
      localStorage.removeItem('study_os_active_timer');
      return resetState;
    });
  };

  const skipTimerPhase = () => {
    setTimer((prev) => {
      const nextMode = prev.mode === 'focus' ? 'break' : 'focus';
      const duration = nextMode === 'break' ? 10 * 60 : 50 * 60;
      const updated: GlobalTimerState = {
        isRunning: false,
        isPaused: false,
        mode: nextMode,
        secondsLeft: duration,
        totalPlannedSeconds: duration,
        actualSecondsElapsed: 0,
        interruptions: 0,
      };
      localStorage.setItem('study_os_active_timer', JSON.stringify(updated));
      return updated;
    });
  };

  const recordTimerInterruption = () => {
    setTimer((prev) => ({
      ...prev,
      interruptions: prev.interruptions + 1,
    }));
  };

  // Hourly Check-in Methods
  const submitHourlyCheckin = (category: import('../types').TimeCategory, note?: string) => {
    const now = new Date();
    storage.saveHourlyCheckin({
      id: `chk-${Date.now()}`,
      timestamp: now.toISOString(),
      category,
      note,
      status: 'completed',
      loggedAt: now.toISOString(),
    });

    // Also optionally record a 60 min time log
    storage.saveTimeLog({
      id: `tl-chk-${Date.now()}`,
      activity: note || `Hourly log: ${category}`,
      category,
      startedAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      endedAt: now.toISOString(),
      durationMinutes: 60,
      isPlanned: false,
      tags: ['Hourly Check-in'],
    });

    setShowHourlyPrompt(false);
  };

  const snoozeHourlyCheckin = () => {
    setShowHourlyPrompt(false);
  };

  // Data queries
  const subjects = storage.getSubjects();
  const deadlines = storage.getDeadlines();
  const projects = storage.getProjects();
  const tasks = storage.getTasks();
  const decks = storage.getDecks();
  const flashcards = storage.getFlashcards();
  const questions = storage.getQuestions();
  const mistakes = storage.getMistakes();
  const revisions = storage.getRevisions();
  const timeLogs = storage.getTimeLogs();
  const focusSessions = storage.getFocusSessions();
  const hourlyCheckins = storage.getHourlyCheckins();
  const gamification = storage.getGamification();
  const settings = storage.getSettings();
  const notifications = storage.getNotifications();
  const resources = storage.getResources();

  // Computed: Overall Syllabus Progress across all subjects
  const overallSyllabusProgress = useMemo(() => {
    let totalTopics = 0;
    let totalScoreSum = 0;
    for (const sub of subjects) {
      for (const mod of sub.modules) {
        for (const chap of mod.chapters) {
          for (const top of chap.topics) {
            totalTopics++;
            totalScoreSum += top.masteryScore;
          }
        }
      }
    }
    return totalTopics > 0 ? Math.round(totalScoreSum / totalTopics) : 0;
  }, [subjects]);

  // Computed: Due Flashcards Count (cards with dueDate <= today)
  const dueFlashcardsCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return flashcards.filter((c) => c.dueDate <= today).length;
  }, [flashcards]);

  // Computed: Today's Focus Minutes (prevents double-counting by deduplicating linked focus sessions)
  const todayFocusMinutes = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const seenFocusIds = new Set<string>();
    let minutes = 0;

    for (const log of timeLogs) {
      if (log.startedAt.startsWith(today)) {
        if (log.linkedFocusSessionId) {
          if (!seenFocusIds.has(log.linkedFocusSessionId)) {
            seenFocusIds.add(log.linkedFocusSessionId);
            minutes += log.durationMinutes;
          }
        } else if (log.category === 'studying' || log.category === 'revision' || log.category === 'practice_questions' || log.category === 'coding_projects') {
          minutes += log.durationMinutes;
        }
      }
    }
    return minutes;
  }, [timeLogs]);

  // Computed: Weak topics (accuracy < 60% or mistakeCount > 1)
  const weakTopics = useMemo(() => {
    const list: { subjectName: string; chapterTitle: string; topicTitle: string; score: number; topicId: string; subjectId: string }[] = [];
    for (const sub of subjects) {
      for (const mod of sub.modules) {
        for (const chap of mod.chapters) {
          for (const top of chap.topics) {
            if (top.masteryScore < 60 || top.mistakeCount >= 2) {
              list.push({
                subjectName: sub.name,
                chapterTitle: chap.title,
                topicTitle: top.title,
                score: top.masteryScore,
                topicId: top.id,
                subjectId: sub.id,
              });
            }
          }
        }
      }
    }
    return list;
  }, [subjects]);

  // Computed: Nearest deadline
  const nearestDeadline = useMemo(() => {
    const upcoming = deadlines
      .filter((d) => d.status !== 'completed')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [deadlines]);

  // Computed: Due revisions today
  const dueRevisionsToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return revisions.filter((r) => r.scheduledDate <= today && r.status === 'pending');
  }, [revisions]);

  const value = {
    subjects,
    deadlines,
    projects,
    tasks,
    decks,
    flashcards,
    questions,
    mistakes,
    revisions,
    timeLogs,
    focusSessions,
    hourlyCheckins,
    gamification,
    settings,
    notifications,
    resources,

    overallSyllabusProgress,
    dueFlashcardsCount,
    todayFocusMinutes,
    todayTargetMinutes: settings.dailyFocusTargetMinutes,
    weakTopics,
    nearestDeadline,
    dueRevisionsToday,

    timer,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipTimerPhase,
    recordTimerInterruption,

    showHourlyPrompt,
    setShowHourlyPrompt,
    submitHourlyCheckin,
    snoozeHourlyCheckin,

    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
  };

  return <StudyOSContext.Provider value={value}>{children}</StudyOSContext.Provider>;
};

export const useStudyOS = () => {
  const context = useContext(StudyOSContext);
  if (!context) {
    throw new Error('useStudyOS must be used within a StudyOSProvider');
  }
  return context;
};
