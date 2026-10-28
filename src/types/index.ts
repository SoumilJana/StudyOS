// ==========================================
// STUDY OS — Comprehensive Type Definitions
// ==========================================

export type MasteryState =
  | 'not_started'
  | 'in_progress'
  | 'studied'
  | 'understood'
  | 'practised'
  | 'mastered'
  | 'revision_due';

export type ImportanceLevel = 'low' | 'medium' | 'high' | 'critical';
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface Subtopic {
  id: string;
  topicId: string;
  title: string;
  completed: boolean;
  notes?: string;
}

export interface Topic {
  id: string;
  chapterId: string;
  title: string;
  order: number;
  importance: ImportanceLevel;
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
  subtopics: Subtopic[];
  // Mastery & progress tracking
  masteryState: MasteryState;
  masteryScore: number; // 0 - 100 calculated
  isStudied: boolean;
  isUnderstood: boolean;
  isExcludedFromExam?: boolean;
  // Performance metrics
  practiceQuestionsAttempted: number;
  practiceQuestionsCorrect: number;
  flashcardsTotal: number;
  flashcardsMastered: number;
  mistakeCount: number;
  lastStudiedAt?: string; // ISO
  lastRevisedAt?: string; // ISO
  nextRevisionDueAt?: string; // ISO
}

export interface Chapter {
  id: string;
  moduleId: string;
  title: string;
  order: number;
  description?: string;
  learningObjectives: string[];
  estimatedMinutes: number;
  topics: Topic[];
  lastStudiedAt?: string;
  notes?: string;
}

export interface Module {
  id: string;
  subjectId: string;
  title: string;
  order: number;
  weight: number; // e.g. percentage 0-100
  chapters: Chapter[];
}

export interface Exam {
  id: string;
  subjectId: string;
  name: string;
  date: string; // ISO string e.g. 2026-11-15T09:00:00
  targetScore: number; // e.g. 90
  weighting: number; // percentage
  status: 'upcoming' | 'completed' | 'cancelled';
  totalMarks?: number;
  notes?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string; // e.g. CS-301
  color: string; // hex or tailwind token
  icon: string; // lucide icon identifier
  description: string;
  exams: Exam[];
  modules: Module[];
  createdAt: string;
}

// ------------------------------------------
// Resources & Document Understanding
// ------------------------------------------
export type ResourceType =
  | 'pdf'
  | 'docx'
  | 'pptx'
  | 'markdown'
  | 'image'
  | 'url'
  | 'note'
  | 'code';

export interface ExtractedSection {
  heading: string;
  page?: number;
  content: string;
}

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  fileHash?: string;
  fileSize?: number;
  url?: string;
  extractedText?: string;
  extractedSections?: ExtractedSection[];
  summary?: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  projectId?: string;
  tags: string[];
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------
// Flashcards & Spaced Repetition (Memory Lab)
// ------------------------------------------
export type CardRating = 'again' | 'hard' | 'good' | 'easy';
export type CardState = 'new' | 'learning' | 'review' | 'mastered';
export type CardFormat = 'basic' | 'cloze' | 'concept' | 'formula' | 'code';

export interface CardReviewRecord {
  reviewedAt: string; // ISO
  rating: CardRating;
  scheduledIntervalDays: number;
  timeSpentSeconds: number;
}

export interface Flashcard {
  id: string;
  deckId: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  front: string;
  back: string;
  format: CardFormat;
  tags: string[];
  sourceReference?: string; // e.g. "Doc: Chapter 3, p. 42"
  // Spaced repetition metadata (SM-2 / FSRS matrix)
  state: CardState;
  intervalDays: number;
  easeFactor: number; // default 2.5
  repetitions: number;
  lapses: number;
  dueDate: string; // ISO date string YYYY-MM-DD
  lastReviewedAt?: string;
  reviewHistory: CardReviewRecord[];
  createdAt: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  subjectId?: string;
  chapterId?: string;
  color: string;
  cardCount?: number;
  createdAt: string;
}

// ------------------------------------------
// Exam Arena & Questions
// ------------------------------------------
export type QuestionType =
  | 'mcq_single'
  | 'mcq_multi'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'long_form'
  | 'numerical'
  | 'coding';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  subjectId?: string;
  moduleId?: string;
  topicId?: string;
  type: QuestionType;
  prompt: string;
  options?: QuestionOption[];
  correctAnswer: string | string[]; // string or array for multi
  explanation: string;
  misconceptions?: string[]; // key pitfalls
  rubricCriteria?: { criteria: string; points: number }[];
  difficulty: DifficultyLevel;
  marks: number;
  negativeMarks?: number;
  sourceReference?: string;
  tags: string[];
}

export interface MistakeRecord {
  id: string;
  questionId: string;
  topicId?: string;
  subjectId?: string;
  questionPrompt: string;
  userAnswer: string | string[];
  expectedAnswer: string | string[];
  explanation: string;
  misconceptionNotes: string;
  attemptedAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface AssessmentAttempt {
  id: string;
  title: string;
  subjectId?: string;
  topicIds: string[];
  mode: 'topic' | 'mixed' | 'weak_topics' | 'mistake_retry' | 'timed' | 'mock_exam';
  totalQuestions: number;
  totalMarks: number;
  score: number;
  timeLimitMinutes?: number;
  timeSpentSeconds: number;
  completedAt?: string;
  isCompleted: boolean;
  questionResponses: {
    questionId: string;
    userResponse: string | string[];
    isCorrect: boolean;
    marksAwarded: number;
    feedback?: string;
  }[];
}

// ------------------------------------------
// Deadline Planner & Backward Planning
// ------------------------------------------
export type DeadlineCategory =
  | 'exam'
  | 'assignment'
  | 'project_milestone'
  | 'research'
  | 'presentation'
  | 'coursework'
  | 'personal'
  | 'custom';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface BackwardPlanStep {
  date: string; // YYYY-MM-DD
  title: string;
  type: 'learn' | 'practice' | 'review' | 'mock' | 'buffer';
  estimatedHours: number;
  completed: boolean;
  topicIds?: string[];
}

export interface Deadline {
  id: string;
  title: string;
  description: string;
  category: DeadlineCategory;
  dueDate: string; // ISO datetime
  priority: PriorityLevel;
  estimatedWorkloadHours: number;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  linkedSubjectId?: string;
  linkedExamId?: string;
  linkedProjectId?: string;
  notes?: string;
  completedAt?: string;
  backwardPlan: BackwardPlanStep[];
  createdAt: string;
}

// ------------------------------------------
// Smart Revision Calendar
// ------------------------------------------
export type RevisionSource =
  | 'spaced_repetition'
  | 'weak_accuracy'
  | 'decay_interval'
  | 'exam_countdown'
  | 'mistake_notebook'
  | 'manual';

export interface RevisionEvent {
  id: string;
  title: string;
  source: RevisionSource;
  subjectId?: string;
  topicId?: string;
  chapterId?: string;
  reason: string; // Explainable reason e.g. "Accuracy dropped to 45% in recent practice"
  scheduledDate: string; // YYYY-MM-DD
  estimatedMinutes: number;
  priority: PriorityLevel;
  status: 'pending' | 'completed' | 'postponed' | 'skipped';
  completedAt?: string;
  postponedToDate?: string;
}

// ------------------------------------------
// Focus Room (Pomodoro) & Time Intelligence
// ------------------------------------------
export type TimerMode = 'focus' | 'break';
export type TimerPreset = '50_10' | '25_5' | 'custom';

export interface FocusSession {
  id: string;
  startedAt: string; // ISO
  endedAt?: string;
  durationSeconds: number; // planned
  actualFocusedSeconds: number; // actual excluding pauses
  preset: TimerPreset;
  subjectId?: string;
  chapterId?: string;
  taskId?: string;
  projectId?: string;
  status: 'completed' | 'abandoned' | 'interrupted';
  interruptionsCount: number;
  notes?: string;
}

export type TimeCategory =
  | 'studying'
  | 'revision'
  | 'practice_questions'
  | 'coding_projects'
  | 'college'
  | 'work'
  | 'tuition'
  | 'exercise'
  | 'sleep'
  | 'meals_personal'
  | 'commute'
  | 'intentional_leisure'
  | 'social_media_distraction'
  | 'gaming'
  | 'unplanned_distraction'
  | 'unaccounted'
  | 'other';

export interface TimeLog {
  id: string;
  activity: string;
  category: TimeCategory;
  startedAt: string; // ISO
  endedAt: string; // ISO
  durationMinutes: number;
  isPlanned: boolean;
  linkedFocusSessionId?: string; // prevents double counting!
  linkedSubjectId?: string;
  linkedTaskId?: string;
  notes?: string;
  tags: string[];
}

export interface HourlyCheckin {
  id: string;
  timestamp: string; // Hour slot ISO
  category: TimeCategory;
  note?: string;
  status: 'completed' | 'snoozed' | 'missed';
  loggedAt: string;
}

// ------------------------------------------
// Workbench (Projects & Tasks)
// ------------------------------------------
export type ProjectStatus = 'planning' | 'in_progress' | 'blocked' | 'completed' | 'on_hold';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: PriorityLevel;
  startDate: string;
  targetDate: string;
  milestones: ProjectMilestone[];
  linkedSubjectId?: string;
  linkedDeadlineId?: string;
  estimatedHours: number;
  actualHoursTracked: number;
  tags: string[];
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: PriorityLevel;
  dueDate?: string;
  estimatedMinutes: number;
  actualMinutes: number;
  category: 'academic' | 'work' | 'coding' | 'admin' | 'review';
  projectId?: string;
  subjectId?: string;
  topicId?: string;
  dependencies: string[]; // IDs of tasks that must be finished first
  subtasks: { id: string; title: string; completed: boolean }[];
  completedAt?: string;
  createdAt: string;
}

// ------------------------------------------
// Gamification, Streaks & XP
// ------------------------------------------
export type RankTitle =
  | 'Initiate'
  | 'Apprentice'
  | 'Scholar'
  | 'Strategist'
  | 'Master'
  | 'Grandmaster'
  | 'Sage';

export interface Mission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  type: 'daily' | 'weekly';
  progress: number;
  maxProgress: number;
  completed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'focus' | 'mastery' | 'consistency' | 'speed' | 'grit';
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
}

export interface GamificationState {
  xp: number;
  level: number;
  rank: RankTitle;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  streakFreezeAvailable: number; // shield count
  missions: Mission[];
  achievements: Achievement[];
}

// ------------------------------------------
// Notifications & Alerts
// ------------------------------------------
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category:
    | 'exam'
    | 'deadline'
    | 'revision'
    | 'focus'
    | 'hourly_checkin'
    | 'gamification'
    | 'system';
  scheduledFor: string;
  read: boolean;
  actionUrl?: string;
  deduplicationKey: string;
  createdAt: string;
}

// ------------------------------------------
// User Settings & AI Configuration
// ------------------------------------------
export interface UserSettings {
  userName: string;
  avatarSeed: string;
  theme: 'dark' | 'light' | 'system';
  dailyFocusTargetMinutes: number; // e.g. 240 mins (4 hours)
  pomodoroWorkMinutes: number; // 50 or 25
  pomodoroBreakMinutes: number; // 10 or 5
  hourlyCheckinEnabled: boolean;
  quietHoursStart: string; // e.g. "22:00"
  quietHoursEnd: string; // e.g. "07:00"
  enableBrowserNotifications: boolean;
  // AI Config
  aiProvider: 'openrouter' | 'gemini' | 'openai' | 'claude' | 'custom' | 'heuristic_offline';
  apiKey?: string;
  customEndpoint?: string;
  aiModel?: string;
  // Dashboard Widget Visibility
  dashboardWidgets: {
    heroAction: boolean;
    quickStats: boolean;
    streakXp: boolean;
    dueRevisions: boolean;
    nearestDeadlines: boolean;
    weakTopics: boolean;
    todayTasks: boolean;
    timeAllocation: boolean;
    weeklyTrends: boolean;
  };
}

export interface TutoringResponse {
  stage: number;
  stageTitle: string;
  explanation: string;
  keyFormulasOrDefinitions: string[];
  retrievalQuestion: {
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  examTip: string;
  sourceCitation?: string;
  modelUsed?: string;
}
