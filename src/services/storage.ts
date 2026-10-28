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
  CardRating,
  RankTitle,
} from '../types';

import {
  INITIAL_SUBJECTS,
  INITIAL_DEADLINES,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_DECKS,
  INITIAL_FLASHCARDS,
  INITIAL_QUESTIONS,
  INITIAL_MISTAKES,
  INITIAL_REVISIONS,
  INITIAL_TIME_LOGS,
  INITIAL_FOCUS_SESSIONS,
  INITIAL_GAMIFICATION,
  INITIAL_USER_SETTINGS,
  INITIAL_NOTIFICATIONS,
} from './seedData';

type Listener = () => void;

class StudyOSStorage {
  private listeners: Set<Listener> = new Set();

  private subjects: Subject[] = [];
  private deadlines: Deadline[] = [];
  private projects: Project[] = [];
  private tasks: Task[] = [];
  private decks: FlashcardDeck[] = [];
  private flashcards: Flashcard[] = [];
  private questions: Question[] = [];
  private mistakes: MistakeRecord[] = [];
  private revisions: RevisionEvent[] = [];
  private timeLogs: TimeLog[] = [];
  private focusSessions: FocusSession[] = [];
  private hourlyCheckins: HourlyCheckin[] = [];
  private gamification: GamificationState = INITIAL_GAMIFICATION;
  private settings: UserSettings = INITIAL_USER_SETTINGS;
  private notifications: AppNotification[] = [];
  private resources: Resource[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.subjects = this.loadFromStorage('study_os_subjects', INITIAL_SUBJECTS);
      this.deadlines = this.loadFromStorage('study_os_deadlines', INITIAL_DEADLINES);
      this.projects = this.loadFromStorage('study_os_projects', INITIAL_PROJECTS);
      this.tasks = this.loadFromStorage('study_os_tasks', INITIAL_TASKS);
      this.decks = this.loadFromStorage('study_os_decks', INITIAL_DECKS);
      this.flashcards = this.loadFromStorage('study_os_flashcards', INITIAL_FLASHCARDS);
      this.questions = this.loadFromStorage('study_os_questions', INITIAL_QUESTIONS);
      this.mistakes = this.loadFromStorage('study_os_mistakes', INITIAL_MISTAKES);
      this.revisions = this.loadFromStorage('study_os_revisions', INITIAL_REVISIONS);
      this.timeLogs = this.loadFromStorage('study_os_time_logs', INITIAL_TIME_LOGS);
      this.focusSessions = this.loadFromStorage('study_os_focus_sessions', INITIAL_FOCUS_SESSIONS);
      this.hourlyCheckins = this.loadFromStorage('study_os_hourly_checkins', []);
      this.gamification = this.loadFromStorage('study_os_gamification', INITIAL_GAMIFICATION);
      this.settings = this.loadFromStorage('study_os_settings', INITIAL_USER_SETTINGS);
      this.notifications = this.loadFromStorage('study_os_notifications', INITIAL_NOTIFICATIONS);
      this.resources = this.loadFromStorage('study_os_resources', []);

      // Verify streak and day-boundary maintenance
      this.verifyDailyStreak();
    } catch (e) {
      console.error('Failed to initialize StudyOSStorage:', e);
    }
  }

  private memoryStore: Map<string, string> = new Map();

  private loadFromStorage<T>(key: string, fallback: T): T {
    try {
      let data: string | null = null;
      if (typeof localStorage !== 'undefined') {
        data = localStorage.getItem(key);
      } else {
        data = this.memoryStore.get(key) || null;
      }
      if (!data) return fallback;
      return JSON.parse(data) as T;
    } catch {
      return fallback;
    }
  }

  private saveToStorage<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, serialized);
      } else {
        this.memoryStore.set(key, serialized);
      }
    } catch (e) {
      console.warn(`Storage quota warning for key ${key}:`, e);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Subscriber callback error:', err);
      }
    });
  }

  // ==========================================
  // Gamification & Progression
  // ==========================================
  public getGamification(): GamificationState {
    return { ...this.gamification };
  }

  public addXP(amount: number, reason: string): void {
    if (amount <= 0) return;
    const currentXP = this.gamification.xp + amount;
    const currentLevel = Math.floor(currentXP / 350) + 1;

    let rank: RankTitle = 'Initiate';
    if (currentLevel >= 25) rank = 'Sage';
    else if (currentLevel >= 18) rank = 'Grandmaster';
    else if (currentLevel >= 12) rank = 'Master';
    else if (currentLevel >= 8) rank = 'Strategist';
    else if (currentLevel >= 4) rank = 'Scholar';
    else if (currentLevel >= 2) rank = 'Apprentice';

    const leveledUp = currentLevel > this.gamification.level;

    this.gamification = {
      ...this.gamification,
      xp: currentXP,
      level: currentLevel,
      rank,
    };

    if (leveledUp) {
      this.createNotification({
        title: `Level Up! Level ${currentLevel} Reached!`,
        message: `Outstanding dedication! You advanced to Rank: ${rank}.`,
        category: 'gamification',
        actionUrl: '/',
      });
    }

    this.saveToStorage('study_os_gamification', this.gamification);
    this.notify();
  }

  private verifyDailyStreak(): void {
    const today = new Date().toISOString().split('T')[0];
    const lastActive = this.gamification.lastActiveDate;
    if (!lastActive) {
      this.gamification.lastActiveDate = today;
      return;
    }

    if (lastActive === today) {
      return; // Already marked today
    }

    const last = new Date(lastActive);
    const now = new Date(today);
    const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 1) {
      // Consecutive day!
      this.gamification.currentStreak += 1;
      if (this.gamification.currentStreak > this.gamification.longestStreak) {
        this.gamification.longestStreak = this.gamification.currentStreak;
      }
      this.gamification.lastActiveDate = today;
      this.addXP(40, 'Daily streak continued');
    } else if (diffDays > 1) {
      // Streak broken unless freeze is available
      if (this.gamification.streakFreezeAvailable > 0) {
        this.gamification.streakFreezeAvailable -= 1;
        this.gamification.lastActiveDate = today;
        this.createNotification({
          title: 'Streak Freeze Shield Activated',
          message: `Your streak freeze protected your ${this.gamification.currentStreak}-day streak!`,
          category: 'gamification',
        });
      } else {
        this.gamification.currentStreak = 1;
        this.gamification.lastActiveDate = today;
      }
    }

    this.saveToStorage('study_os_gamification', this.gamification);
  }

  // ==========================================
  // Settings
  // ==========================================
  public getSettings(): UserSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<UserSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveToStorage('study_os_settings', this.settings);
    this.notify();
  }

  // ==========================================
  // Subjects & Syllabus Hierarchy
  // ==========================================
  public getSubjects(): Subject[] {
    return [...this.subjects];
  }

  public getSubject(id: string): Subject | undefined {
    return this.subjects.find((s) => s.id === id);
  }

  public saveSubject(subject: Subject): void {
    const index = this.subjects.findIndex((s) => s.id === subject.id);
    if (index >= 0) {
      this.subjects[index] = subject;
    } else {
      this.subjects.push(subject);
    }
    this.saveToStorage('study_os_subjects', this.subjects);
    this.notify();
  }

  public deleteSubject(id: string): void {
    this.subjects = this.subjects.filter((s) => s.id !== id);
    this.saveToStorage('study_os_subjects', this.subjects);
    this.notify();
  }

  public updateTopicMastery(
    subjectId: string,
    topicId: string,
    updates: Partial<import('../types').Topic>
  ): void {
    const subject = this.subjects.find((s) => s.id === subjectId);
    if (!subject) return;

    for (const mod of subject.modules) {
      for (const chap of mod.chapters) {
        const topic = chap.topics.find((t) => t.id === topicId);
        if (topic) {
          Object.assign(topic, updates);
          // Recalculate deterministic topic score
          topic.masteryScore = this.calculateTopicMasteryScore(topic);
          topic.masteryState = this.deriveMasteryState(topic);
          this.saveSubject(subject);
          return;
        }
      }
    }
  }

  /**
   * Transparent Weighting System:
   * Mastery Score (0 - 100) is composed of:
   * 1. Study completion (15%)
   * 2. Flashcard recall retention (25%)
   * 3. Practice questions accuracy (40%)
   * 4. Freshness/Decay adjustment (20%)
   */
  public calculateTopicMasteryScore(topic: import('../types').Topic): number {
    let score = 0;
    if (topic.isStudied) score += 15;

    // Flashcard mastery component (25%)
    if (topic.flashcardsTotal > 0) {
      const cardRatio = Math.min(1, topic.flashcardsMastered / topic.flashcardsTotal);
      score += cardRatio * 25;
    } else if (topic.isUnderstood) {
      score += 15;
    }

    // Practice question accuracy (40%)
    if (topic.practiceQuestionsAttempted > 0) {
      const accuracy = topic.practiceQuestionsCorrect / topic.practiceQuestionsAttempted;
      score += accuracy * 40;
    }

    // Freshness & decay (20%)
    if (topic.lastRevisedAt || topic.lastStudiedAt) {
      const lastDate = new Date(topic.lastRevisedAt || topic.lastStudiedAt!);
      const now = new Date();
      const daysSince = Math.max(0, (now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      // Half-life decay over 14 days
      const decayFactor = Math.max(0.2, 1 - daysSince / 21);
      score += decayFactor * 20;
    }

    // Subtopics component bonus if applicable
    if (topic.subtopics.length > 0) {
      const completedCount = topic.subtopics.filter((st) => st.completed).length;
      const subRatio = completedCount / topic.subtopics.length;
      score = Math.round(score * 0.8 + subRatio * 20);
    }

    return Math.min(100, Math.round(score));
  }

  public deriveMasteryState(topic: import('../types').Topic): import('../types').MasteryState {
    const score = topic.masteryScore;
    if (topic.nextRevisionDueAt && new Date(topic.nextRevisionDueAt) <= new Date()) {
      return 'revision_due';
    }
    if (score >= 85 && topic.practiceQuestionsAttempted >= 5) {
      return 'mastered';
    }
    if (score >= 65 && topic.practiceQuestionsAttempted > 0) {
      return 'practised';
    }
    if (topic.isUnderstood) {
      return 'understood';
    }
    if (topic.isStudied) {
      return 'studied';
    }
    if (topic.practiceQuestionsAttempted > 0 || topic.subtopics.some((st) => st.completed)) {
      return 'in_progress';
    }
    return 'not_started';
  }

  // ==========================================
  // Deadlines & Backward Planner
  // ==========================================
  public getDeadlines(): Deadline[] {
    return [...this.deadlines];
  }

  public saveDeadline(deadline: Deadline): void {
    const index = this.deadlines.findIndex((d) => d.id === deadline.id);
    if (index >= 0) {
      this.deadlines[index] = deadline;
    } else {
      this.deadlines.push(deadline);
      this.addXP(25, 'Created planned deadline');
    }
    this.saveToStorage('study_os_deadlines', this.deadlines);
    this.notify();
  }

  public deleteDeadline(id: string): void {
    this.deadlines = this.deadlines.filter((d) => d.id !== id);
    this.saveToStorage('study_os_deadlines', this.deadlines);
    this.notify();
  }

  public updateBackwardPlanStep(deadlineId: string, stepIndex: number, completed: boolean): void {
    const deadline = this.deadlines.find((d) => d.id === deadlineId);
    if (!deadline || !deadline.backwardPlan[stepIndex]) return;

    deadline.backwardPlan[stepIndex].completed = completed;
    if (completed) {
      this.addXP(30, 'Completed backward preparation step');
    }
    this.saveDeadline(deadline);
  }

  // ==========================================
  // Projects & Tasks (Workbench)
  // ==========================================
  public getProjects(): Project[] {
    return [...this.projects];
  }

  public saveProject(project: Project): void {
    const index = this.projects.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      this.projects[index] = project;
    } else {
      this.projects.push(project);
      this.addXP(30, 'Created new project');
    }
    this.saveToStorage('study_os_projects', this.projects);
    this.notify();
  }

  public deleteProject(id: string): void {
    this.projects = this.projects.filter((p) => p.id !== id);
    this.saveToStorage('study_os_projects', this.projects);
    this.notify();
  }

  public getTasks(): Task[] {
    return [...this.tasks];
  }

  public saveTask(task: Task): void {
    const index = this.tasks.findIndex((t) => t.id === task.id);
    if (index >= 0) {
      this.tasks[index] = task;
    } else {
      this.tasks.push(task);
    }
    this.saveToStorage('study_os_tasks', this.tasks);
    this.notify();
  }

  public updateTaskStatus(taskId: string, status: import('../types').TaskStatus): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const oldStatus = task.status;
    task.status = status;
    if (status === 'done' && oldStatus !== 'done') {
      task.completedAt = new Date().toISOString();
      this.addXP(40, `Completed task: ${task.title}`);

      // Check mission progress
      this.progressMissions('task');
    }
    this.saveTask(task);
  }

  public deleteTask(id: string): void {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.saveToStorage('study_os_tasks', this.tasks);
    this.notify();
  }

  // ==========================================
  // Flashcards & Spaced Repetition (Memory Lab)
  // ==========================================
  public getDecks(): FlashcardDeck[] {
    return [...this.decks];
  }

  public saveDeck(deck: FlashcardDeck): void {
    const index = this.decks.findIndex((d) => d.id === deck.id);
    if (index >= 0) {
      this.decks[index] = deck;
    } else {
      this.decks.push(deck);
    }
    this.saveToStorage('study_os_decks', this.decks);
    this.notify();
  }

  public getFlashcards(): Flashcard[] {
    return [...this.flashcards];
  }

  public saveFlashcard(card: Flashcard): void {
    const index = this.flashcards.findIndex((c) => c.id === card.id);
    if (index >= 0) {
      this.flashcards[index] = card;
    } else {
      this.flashcards.push(card);
    }
    this.saveToStorage('study_os_flashcards', this.flashcards);
    this.notify();
  }

  public deleteFlashcard(id: string): void {
    this.flashcards = this.flashcards.filter((c) => c.id !== id);
    this.saveToStorage('study_os_flashcards', this.flashcards);
    this.notify();
  }

  /**
   * SM-2 Algorithmic Spaced Repetition calculation
   * Ratings:
   * - 'again': interval resets to 1, lapse count + 1, ease decreases
   * - 'hard': interval * 1.2, ease slightly reduced
   * - 'good': interval * easeFactor
   * - 'easy': interval * easeFactor * 1.3, ease increases
   */
  public reviewFlashcard(cardId: string, rating: CardRating, timeSpentSeconds: number): void {
    const card = this.flashcards.find((c) => c.id === cardId);
    if (!card) return;

    let easeFactor = card.easeFactor;
    let repetitions = card.repetitions;
    let lapses = card.lapses;
    let intervalDays = card.intervalDays;
    let state = card.state;

    if (rating === 'again') {
      repetitions = 0;
      lapses += 1;
      intervalDays = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      state = 'learning';
    } else if (rating === 'hard') {
      repetitions += 1;
      intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      state = repetitions > 3 ? 'review' : 'learning';
    } else if (rating === 'good') {
      repetitions += 1;
      if (repetitions === 1) intervalDays = 1;
      else if (repetitions === 2) intervalDays = 3;
      else intervalDays = Math.round(intervalDays * easeFactor);
      state = repetitions >= 4 ? 'mastered' : 'review';
    } else if (rating === 'easy') {
      repetitions += 1;
      if (repetitions === 1) intervalDays = 3;
      else intervalDays = Math.round(intervalDays * easeFactor * 1.3);
      easeFactor = Math.min(3.0, easeFactor + 0.15);
      state = 'mastered';
    }

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + intervalDays);
    const dueDateStr = nextDueDate.toISOString().split('T')[0];

    card.easeFactor = easeFactor;
    card.repetitions = repetitions;
    card.lapses = lapses;
    card.intervalDays = intervalDays;
    card.state = state;
    card.dueDate = dueDateStr;
    card.lastReviewedAt = new Date().toISOString();
    card.reviewHistory.push({
      reviewedAt: new Date().toISOString(),
      rating,
      scheduledIntervalDays: intervalDays,
      timeSpentSeconds,
    });

    this.saveFlashcard(card);

    // Reward XP based on recall effort
    const xpGain = rating === 'easy' ? 12 : rating === 'good' ? 10 : rating === 'hard' ? 6 : 4;
    this.addXP(xpGain, `Flashcard review (${rating})`);
    this.progressMissions('card');
  }

  // ==========================================
  // Questions & Mistake Notebook (Exam Arena)
  // ==========================================
  public getQuestions(): Question[] {
    return [...this.questions];
  }

  public saveQuestion(question: Question): void {
    const index = this.questions.findIndex((q) => q.id === question.id);
    if (index >= 0) {
      this.questions[index] = question;
    } else {
      this.questions.push(question);
    }
    this.saveToStorage('study_os_questions', this.questions);
    this.notify();
  }

  public getMistakes(): MistakeRecord[] {
    return [...this.mistakes];
  }

  public recordMistake(mistake: MistakeRecord): void {
    this.mistakes.push(mistake);
    this.saveToStorage('study_os_mistakes', this.mistakes);

    // Auto-create Revision event for repeated mistakes
    this.createRevisionEvent({
      title: `Mistake Drill: ${mistake.questionPrompt.slice(0, 40)}...`,
      source: 'mistake_notebook',
      subjectId: mistake.subjectId,
      topicId: mistake.topicId,
      reason: `Recorded in Mistake Notebook: ${mistake.misconceptionNotes || 'Failed assessment prompt.'}`,
      scheduledDate: new Date().toISOString().split('T')[0],
      estimatedMinutes: 20,
      priority: 'high',
      status: 'pending',
    });

    this.notify();
  }

  public resolveMistake(id: string): void {
    const m = this.mistakes.find((item) => item.id === id);
    if (!m) return;
    m.resolved = true;
    m.resolvedAt = new Date().toISOString();
    this.saveToStorage('study_os_mistakes', this.mistakes);
    this.addXP(35, 'Resolved conceptual mistake in notebook');
    this.notify();
  }

  // ==========================================
  // Smart Revision Calendar
  // ==========================================
  public getRevisions(): RevisionEvent[] {
    return [...this.revisions];
  }

  public createRevisionEvent(event: Omit<RevisionEvent, 'id'>): RevisionEvent {
    const newEvent: RevisionEvent = {
      ...event,
      id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    this.revisions.push(newEvent);
    this.saveToStorage('study_os_revisions', this.revisions);
    this.notify();
    return newEvent;
  }

  public completeRevision(id: string): void {
    const rev = this.revisions.find((r) => r.id === id);
    if (!rev) return;
    rev.status = 'completed';
    rev.completedAt = new Date().toISOString();
    this.saveToStorage('study_os_revisions', this.revisions);
    this.addXP(50, `Completed revision: ${rev.title}`);
    this.notify();
  }

  public postponeRevision(id: string, newDateStr: string): void {
    const rev = this.revisions.find((r) => r.id === id);
    if (!rev) return;
    rev.status = 'postponed';
    rev.postponedToDate = newDateStr;
    rev.scheduledDate = newDateStr;
    this.saveToStorage('study_os_revisions', this.revisions);
    this.notify();
  }

  // ==========================================
  // Focus Room & Time Intelligence
  // ==========================================
  public getFocusSessions(): FocusSession[] {
    return [...this.focusSessions];
  }

  public logFocusSession(session: FocusSession): void {
    this.focusSessions.push(session);
    this.saveToStorage('study_os_focus_sessions', this.focusSessions);

    // Also automatically create an aligned TimeLog so reports reflect it,
    // explicitly referencing linkedFocusSessionId to PREVENT double counting!
    if (session.actualFocusedSeconds >= 60) {
      const minutes = Math.round(session.actualFocusedSeconds / 60);
      const timeLog: TimeLog = {
        id: `tl-fs-${session.id}`,
        activity: session.notes || 'Pomodoro Focused Session',
        category: 'studying',
        startedAt: session.startedAt,
        endedAt: session.endedAt || new Date().toISOString(),
        durationMinutes: minutes,
        isPlanned: true,
        linkedFocusSessionId: session.id,
        linkedSubjectId: session.subjectId,
        linkedTaskId: session.taskId,
        tags: ['Pomodoro', 'Focus Room'],
      };
      this.saveTimeLog(timeLog);
    }

    // Award XP: 1 XP per minute of true focused effort
    const focusMinutes = Math.floor(session.actualFocusedSeconds / 60);
    this.addXP(focusMinutes, 'Deep focus session completed');
    this.progressMissions('focus', focusMinutes);
  }

  public getTimeLogs(): TimeLog[] {
    return [...this.timeLogs];
  }

  public saveTimeLog(log: TimeLog): void {
    const index = this.timeLogs.findIndex((t) => t.id === log.id);
    if (index >= 0) {
      this.timeLogs[index] = log;
    } else {
      this.timeLogs.push(log);
    }
    this.saveToStorage('study_os_time_logs', this.timeLogs);
    this.notify();
  }

  public deleteTimeLog(id: string): void {
    this.timeLogs = this.timeLogs.filter((t) => t.id !== id);
    this.saveToStorage('study_os_time_logs', this.timeLogs);
    this.notify();
  }

  public getHourlyCheckins(): HourlyCheckin[] {
    return [...this.hourlyCheckins];
  }

  public saveHourlyCheckin(checkin: HourlyCheckin): void {
    this.hourlyCheckins.push(checkin);
    this.saveToStorage('study_os_hourly_checkins', this.hourlyCheckins);
    this.addXP(15, 'Completed hourly productivity check-in');
    this.notify();
  }

  // ==========================================
  // Resources & Documents
  // ==========================================
  public getResources(): Resource[] {
    return [...this.resources];
  }

  public saveResource(resource: Resource): void {
    const index = this.resources.findIndex((r) => r.id === resource.id);
    if (index >= 0) {
      this.resources[index] = resource;
    } else {
      this.resources.push(resource);
    }
    this.saveToStorage('study_os_resources', this.resources);
    this.notify();
  }

  public deleteResource(id: string): void {
    this.resources = this.resources.filter((r) => r.id !== id);
    this.saveToStorage('study_os_resources', this.resources);
    this.notify();
  }

  // ==========================================
  // Notifications
  // ==========================================
  public getNotifications(): AppNotification[] {
    return [...this.notifications];
  }

  public createNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'read' | 'scheduledFor' | 'deduplicationKey'> & { deduplicationKey?: string }): void {
    const key = notif.deduplicationKey || `${notif.category}_${Date.now()}`;
    // Deduplicate within same category and key
    if (this.notifications.some((n) => n.deduplicationKey === key && !n.read)) {
      return;
    }

    const item: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: notif.title,
      message: notif.message,
      category: notif.category,
      scheduledFor: new Date().toISOString(),
      read: false,
      actionUrl: notif.actionUrl,
      deduplicationKey: key,
      createdAt: new Date().toISOString(),
    };

    this.notifications.unshift(item);
    this.saveToStorage('study_os_notifications', this.notifications);
    this.notify();
  }

  public markNotificationRead(id: string): void {
    const notif = this.notifications.find((n) => n.id === id);
    if (!notif) return;
    notif.read = true;
    this.saveToStorage('study_os_notifications', this.notifications);
    this.notify();
  }

  public clearAllNotifications(): void {
    this.notifications = [];
    this.saveToStorage('study_os_notifications', this.notifications);
    this.notify();
  }

  // ==========================================
  // Mission Progress Helper
  // ==========================================
  private progressMissions(type: 'task' | 'card' | 'focus', increment = 1): void {
    let updated = false;
    for (const m of this.gamification.missions) {
      if (m.completed) continue;
      if (type === 'focus' && m.id === 'm-daily-focus') {
        m.progress = Math.min(m.maxProgress, m.progress + increment);
        if (m.progress >= m.maxProgress) {
          m.completed = true;
          this.addXP(m.xpReward, `Completed Mission: ${m.title}`);
        }
        updated = true;
      } else if (type === 'card' && m.id === 'm-daily-cards') {
        m.progress = Math.min(m.maxProgress, m.progress + increment);
        if (m.progress >= m.maxProgress) {
          m.completed = true;
          this.addXP(m.xpReward, `Completed Mission: ${m.title}`);
        }
        updated = true;
      }
    }
    if (updated) {
      this.saveToStorage('study_os_gamification', this.gamification);
    }
  }

  // ==========================================
  // Data Export & Reset
  // ==========================================
  public exportDataJSON(): string {
    const bundle = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      subjects: this.subjects,
      deadlines: this.deadlines,
      projects: this.projects,
      tasks: this.tasks,
      decks: this.decks,
      flashcards: this.flashcards,
      questions: this.questions,
      mistakes: this.mistakes,
      revisions: this.revisions,
      timeLogs: this.timeLogs,
      focusSessions: this.focusSessions,
      hourlyCheckins: this.hourlyCheckins,
      gamification: this.gamification,
      settings: this.settings,
      notifications: this.notifications,
      resources: this.resources,
    };
    return JSON.stringify(bundle, null, 2);
  }

  public importDataJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.subjects) this.saveToStorage('study_os_subjects', (this.subjects = data.subjects));
      if (data.deadlines) this.saveToStorage('study_os_deadlines', (this.deadlines = data.deadlines));
      if (data.projects) this.saveToStorage('study_os_projects', (this.projects = data.projects));
      if (data.tasks) this.saveToStorage('study_os_tasks', (this.tasks = data.tasks));
      if (data.decks) this.saveToStorage('study_os_decks', (this.decks = data.decks));
      if (data.flashcards) this.saveToStorage('study_os_flashcards', (this.flashcards = data.flashcards));
      if (data.questions) this.saveToStorage('study_os_questions', (this.questions = data.questions));
      if (data.mistakes) this.saveToStorage('study_os_mistakes', (this.mistakes = data.mistakes));
      if (data.revisions) this.saveToStorage('study_os_revisions', (this.revisions = data.revisions));
      if (data.timeLogs) this.saveToStorage('study_os_time_logs', (this.timeLogs = data.timeLogs));
      if (data.focusSessions) this.saveToStorage('study_os_focus_sessions', (this.focusSessions = data.focusSessions));
      if (data.gamification) this.saveToStorage('study_os_gamification', (this.gamification = data.gamification));
      if (data.settings) this.saveToStorage('study_os_settings', (this.settings = data.settings));
      if (data.resources) this.saveToStorage('study_os_resources', (this.resources = data.resources));
      this.notify();
      return true;
    } catch (e) {
      console.error('Import parse error:', e);
      return false;
    }
  }

  public resetToDefault(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    this.memoryStore.clear();
    this.init();
    this.notify();
  }
}

export const storage = new StudyOSStorage();
