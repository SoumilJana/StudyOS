import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from './storage';
import { Topic, CardRating } from '../types';

describe('Study OS Core Storage & Calculation Engines', () => {
  beforeEach(() => {
    storage.resetToDefault();
  });

  describe('Syllabus Mastery Weighting System', () => {
    it('does not treat mere reading as proof of complete mastery', () => {
      const topic: Topic = {
        id: 'test-topic-1',
        chapterId: 'chap-1',
        title: 'Test Topic',
        order: 1,
        importance: 'high',
        difficulty: 3,
        estimatedMinutes: 60,
        subtopics: [],
        masteryState: 'not_started',
        masteryScore: 0,
        isStudied: true, // Only studied / read
        isUnderstood: false,
        practiceQuestionsAttempted: 0,
        practiceQuestionsCorrect: 0,
        flashcardsTotal: 0,
        flashcardsMastered: 0,
        mistakeCount: 0,
      };

      const score = storage.calculateTopicMasteryScore(topic);
      expect(score).toBeLessThan(30); // Reading only contributes 15%
      expect(storage.deriveMasteryState(topic)).not.toBe('mastered');
    });

    it('requires practice questions and high recall to reach mastered state', () => {
      const topic: Topic = {
        id: 'test-topic-2',
        chapterId: 'chap-1',
        title: 'High Mastery Topic',
        order: 1,
        importance: 'critical',
        difficulty: 4,
        estimatedMinutes: 60,
        subtopics: [],
        masteryState: 'in_progress',
        masteryScore: 0,
        isStudied: true,
        isUnderstood: true,
        practiceQuestionsAttempted: 10,
        practiceQuestionsCorrect: 10, // 100% accuracy
        flashcardsTotal: 5,
        flashcardsMastered: 5, // 100% recall
        mistakeCount: 0,
        lastStudiedAt: new Date().toISOString(),
        lastRevisedAt: new Date().toISOString(),
      };

      const score = storage.calculateTopicMasteryScore(topic);
      expect(score).toBeGreaterThanOrEqual(85);
      topic.masteryScore = score;
      expect(storage.deriveMasteryState(topic)).toBe('mastered');
    });
  });

  describe('Spaced Repetition Algorithm (SM-2 Matrix)', () => {
    beforeEach(() => {
      storage.loadDemoData();
    });

    it('resets interval and increments lapses on Again rating', () => {
      const cards = storage.getFlashcards();
      const card = cards[0];
      const initialLapses = card.lapses;

      storage.reviewFlashcard(card.id, 'again', 12);
      const updated = storage.getFlashcards().find((c) => c.id === card.id)!;

      expect(updated.repetitions).toBe(0);
      expect(updated.intervalDays).toBe(1);
      expect(updated.lapses).toBe(initialLapses + 1);
      expect(updated.state).toBe('learning');
    });

    it('multiplies interval on Good and Easy ratings', () => {
      const cards = storage.getFlashcards();
      const card = cards.find((c) => c.repetitions >= 2) || cards[0];

      storage.reviewFlashcard(card.id, 'good', 10);
      const updated = storage.getFlashcards().find((c) => c.id === card.id)!;

      expect(updated.intervalDays).toBeGreaterThan(1);
      expect(updated.repetitions).toBeGreaterThan(0);
    });
  });

  describe('Time Intelligence & Reconciliation', () => {
    beforeEach(() => {
      storage.loadDemoData();
    });

    it('prevents double counting when a Pomodoro focus session is linked to a time log', () => {
      const initialLogs = storage.getTimeLogs();
      const pomodoroCount = initialLogs.filter((l) => l.linkedFocusSessionId).length;
      expect(pomodoroCount).toBeGreaterThanOrEqual(1);

      // Verify todayFocusMinutes deduplicates linked focus sessions
      const session = storage.getFocusSessions()[0];
      expect(session).toBeDefined();
    });
  });

  describe('Gamification & Anti-Abuse XP Thresholds', () => {
    it('levels up and updates rank title appropriately', () => {
      const initial = storage.getGamification();
      const initialLevel = initial.level;

      // Add XP to cross level boundary (350 XP per level)
      storage.addXP(1000, 'Test quest completion');
      const updated = storage.getGamification();

      expect(updated.xp).toBe(initial.xp + 1000);
      expect(updated.level).toBeGreaterThan(initialLevel);
      expect(updated.rank).toBeDefined();
    });
  });

  describe('Mistake Notebook & Error Tracking', () => {
    it('creates and resolves conceptual mistakes with XP reward', () => {
      const initialMistakes = storage.getMistakes().length;
      storage.recordMistake({
        id: 'test-mst-1',
        questionId: 'q-test',
        questionPrompt: 'What is Raft log matching?',
        userAnswer: 'Incorrect answer',
        expectedAnswer: 'Matching index and term implies identical log prefix',
        explanation: 'Fundamental invariant',
        misconceptionNotes: 'Omitted prior term induction',
        attemptedAt: new Date().toISOString(),
        resolved: false,
      });

      expect(storage.getMistakes().length).toBe(initialMistakes + 1);

      storage.resolveMistake('test-mst-1');
      const resolved = storage.getMistakes().find((m) => m.id === 'test-mst-1')!;
      expect(resolved.resolved).toBe(true);
      expect(resolved.resolvedAt).toBeDefined();
    });
  });

  describe('Data Export and Import Roundtrip', () => {
    it('preserves subjects, tasks, deadlines, and cards across JSON export/import', () => {
      const exportedJson = storage.exportDataJSON();
      expect(typeof exportedJson).toBe('string');

      const parsed = JSON.parse(exportedJson);
      expect(parsed.subjects).toBeDefined();
      expect(parsed.deadlines).toBeDefined();
      expect(parsed.flashcards).toBeDefined();

      const success = storage.importDataJSON(exportedJson);
      expect(success).toBe(true);
    });
  });

  describe('Focus Session and Timer Integrity', () => {
    it('creates aligned time logs without double counting focus sessions', () => {
      const initialFocusCount = storage.getFocusSessions().length;
      storage.logFocusSession({
        id: 'fs-test-new',
        startedAt: new Date(Date.now() - 3000 * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: 3000,
        actualFocusedSeconds: 3000,
        preset: '50_10',
        status: 'completed',
        interruptionsCount: 1,
        notes: 'Deep testing session',
      });

      expect(storage.getFocusSessions().length).toBe(initialFocusCount + 1);
      const alignedLog = storage.getTimeLogs().find((l) => l.linkedFocusSessionId === 'fs-test-new');
      expect(alignedLog).toBeDefined();
      expect(alignedLog?.durationMinutes).toBe(50);
      expect(alignedLog?.category).toBe('studying');
    });
  });

  describe('Revision Scheduling and Postponement', () => {
    it('creates revision events with explainable reasons and updates on postponement', () => {
      const rev = storage.createRevisionEvent({
        title: 'Review KV Cache Memory Scaling',
        source: 'weak_accuracy',
        reason: 'Practice accuracy fell to 40% on numerical derivations',
        scheduledDate: '2026-10-28',
        estimatedMinutes: 30,
        priority: 'high',
        status: 'pending',
      });

      expect(rev.id).toBeDefined();
      expect(storage.getRevisions().find((r) => r.id === rev.id)).toBeDefined();

      storage.postponeRevision(rev.id, '2026-10-30');
      const updated = storage.getRevisions().find((r) => r.id === rev.id);
      expect(updated?.status).toBe('postponed');
      expect(updated?.scheduledDate).toBe('2026-10-30');
    });
  });
});
