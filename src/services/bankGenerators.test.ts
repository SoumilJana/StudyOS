import { describe, it, expect } from 'vitest';
import { generateCuratedQuestionsForTopics } from './questionBankGenerator';
import { generateCuratedFlashcardsForTopics } from './flashcardBankGenerator';
import { Subject, Module, FlashcardDeck } from '../types';

describe('Question and Flashcard Bank Generators', () => {
  const mockSubject: Subject = {
    id: 'sub-test-1',
    name: 'Ethical Hacking',
    code: 'CS401',
    color: '#6366f1',
    icon: 'Shield',
    description: 'Ethical hacking course',
    exams: [],
    modules: [],
    createdAt: new Date().toISOString(),
  };

  const mockDeck: FlashcardDeck = {
    id: 'deck-test-1',
    title: 'Ethical Hacking Mastery Deck',
    subjectId: 'sub-test-1',
    description: 'High-yield flashcards',
    color: '#6366f1',
    cardCount: 0,
    createdAt: new Date().toISOString(),
  };

  const mockModules: Module[] = [
    {
      id: 'mod-1',
      subjectId: 'sub-test-1',
      title: 'Module 1: Fundamentals of Ethical Hacking & Reconnaissance',
      order: 1,
      weight: 20,
      chapters: [
        {
          id: 'chap-1',
          moduleId: 'mod-1',
          title: 'Reconnaissance and Kill Chain',
          order: 1,
          learningObjectives: ['Master Recon'],
          estimatedMinutes: 90,
          topics: [
            {
              id: 'top-1-1',
              chapterId: 'chap-1',
              title: 'Lockheed Martin Cyber Kill Chain',
              order: 1,
              importance: 'critical',
              difficulty: 2,
              estimatedMinutes: 45,
              subtopics: [],
              masteryState: 'not_started',
              masteryScore: 0,
              isStudied: false,
              isUnderstood: false,
              practiceQuestionsAttempted: 0,
              practiceQuestionsCorrect: 0,
              flashcardsTotal: 1,
              flashcardsMastered: 0,
              mistakeCount: 0,
            },
            {
              id: 'top-1-2',
              chapterId: 'chap-1',
              title: 'Reconnaissance & Footprinting Techniques',
              order: 2,
              importance: 'high',
              difficulty: 3,
              estimatedMinutes: 45,
              subtopics: [],
              masteryState: 'not_started',
              masteryScore: 0,
              isStudied: false,
              isUnderstood: false,
              practiceQuestionsAttempted: 0,
              practiceQuestionsCorrect: 0,
              flashcardsTotal: 1,
              flashcardsMastered: 0,
              mistakeCount: 0,
            },
            {
              id: 'top-1-corrupted',
              chapterId: 'chap-1',
              title: 'pdf ===',
              order: 3,
              importance: 'high',
              difficulty: 3,
              estimatedMinutes: 45,
              subtopics: [],
              masteryState: 'not_started',
              masteryScore: 0,
              isStudied: false,
              isUnderstood: false,
              practiceQuestionsAttempted: 0,
              practiceQuestionsCorrect: 0,
              flashcardsTotal: 1,
              flashcardsMastered: 0,
              mistakeCount: 0,
            },
          ],
        },
      ],
    },
    {
      id: 'mod-2',
      subjectId: 'sub-test-1',
      title: 'Module 2: Scanning & System Hacking',
      order: 2,
      weight: 20,
      chapters: [
        {
          id: 'chap-2',
          moduleId: 'mod-2',
          title: 'System Hacking',
          order: 1,
          learningObjectives: ['Master Scanning'],
          estimatedMinutes: 90,
          topics: [
            {
              id: 'top-2-1',
              chapterId: 'chap-2',
              title: 'Nmap Port Scanning & Flags',
              order: 1,
              importance: 'critical',
              difficulty: 3,
              estimatedMinutes: 45,
              subtopics: [],
              masteryState: 'not_started',
              masteryScore: 0,
              isStudied: false,
              isUnderstood: false,
              practiceQuestionsAttempted: 0,
              practiceQuestionsCorrect: 0,
              flashcardsTotal: 1,
              flashcardsMastered: 0,
              mistakeCount: 0,
            },
            {
              id: 'top-2-2',
              chapterId: 'chap-2',
              title: 'Privilege Escalation Techniques',
              order: 2,
              importance: 'critical',
              difficulty: 4,
              estimatedMinutes: 45,
              subtopics: [],
              masteryState: 'not_started',
              masteryScore: 0,
              isStudied: false,
              isUnderstood: false,
              practiceQuestionsAttempted: 0,
              practiceQuestionsCorrect: 0,
              flashcardsTotal: 1,
              flashcardsMastered: 0,
              mistakeCount: 0,
            },
          ],
        },
      ],
    },
  ];

  it('generates high-yield questions with topicId linkages and skips corrupted topics', () => {
    const questions = generateCuratedQuestionsForTopics(mockSubject, mockModules);
    expect(questions.length).toBeGreaterThanOrEqual(4);
    
    // Check that every question has subjectId and topicId
    questions.forEach((q) => {
      expect(q.subjectId).toBe('sub-test-1');
      expect(q.topicId).toBeDefined();
      expect(q.prompt).not.toContain('pdf ===');
      expect(q.options?.length).toBe(4);
      expect(q.correctAnswer).toBeDefined();
    });

    // Check that curated templates match correctly
    const killChainQ = questions.find((q) => q.prompt.includes('Lockheed Martin Cyber Kill Chain'));
    expect(killChainQ).toBeDefined();
    expect(killChainQ?.topicId).toBe('top-1-1');
  });

  it('generates high-yield flashcards with authentic answers and skips junk topic titles', () => {
    const cards = generateCuratedFlashcardsForTopics(mockSubject, mockDeck, mockModules);
    expect(cards.length).toBeGreaterThanOrEqual(4);

    cards.forEach((c) => {
      expect(c.subjectId).toBe('sub-test-1');
      expect(c.deckId).toBe('deck-test-1');
      expect(c.front).not.toContain('pdf ===');
      expect(c.back).not.toContain('A fundamental security concept in');
      expect(c.back.length).toBeGreaterThan(50);
    });

    const nmapCard = cards.find((c) => c.front.includes('Nmap TCP SYN Stealth Scan'));
    expect(nmapCard).toBeDefined();
    expect(nmapCard?.back).toContain('Half-Open');
  });
});
