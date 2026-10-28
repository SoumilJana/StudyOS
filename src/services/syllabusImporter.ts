import { Subject, Module, Chapter, Topic, Deadline, Task, FlashcardDeck, Flashcard, Resource, CardFormat, CardState } from '../types';
import { storage } from './storage';
import { aiService } from './aiService';
import { parseUploadedDocument } from './documentExtractor';

export interface SyllabusImportResult {
  subject: Subject;
  deadline: Deadline;
  tasks: Task[];
  deck: FlashcardDeck;
  flashcards: Flashcard[];
  resource: Resource;
}

/**
 * Parses raw text extracted from a syllabus document and extracts course hierarchy
 */
export function extractHierarchyFromSyllabusText(text: string, fallbackTitle = 'Course Syllabus'): {
  courseTitle: string;
  courseCode: string;
  modules: Module[];
} {
  // 1. Invert or extract course code & title
  const codeMatch = text.match(/Course Code\s*[-–:]?\s*([A-Z0-9_-]+)/i) || text.match(/\b([A-Z]{3,6}\d{3,4}[A-Z]?)\b/);
  const courseCode = codeMatch ? codeMatch[1].trim() : 'COURSE101';

  const titleMatch = text.match(/Course Title\s*[-–:]?\s*([A-Za-z0-9 &,/()_-]+)/i);
  let courseTitle = titleMatch ? titleMatch[1].trim() : fallbackTitle;
  if (courseTitle.length < 3 || courseTitle.toLowerCase().includes('detailed syllabus')) {
    courseTitle = fallbackTitle;
  }

  // 2. Extract modules & topics
  const modules: Module[] = [];

  // Match pattern "1 <Topic> Sub-topics" or "Module 1: <Topic>"
  // Test for Ethical Hacking style: 1 Fundamentals of Ethical Hacking... 2 System Hacking...
  const moduleBlocks: { num: number; title: string; content: string }[] = [];

  const moduleRegex = /(?:Module\s*No\.?\s*|\bModule\s*[-–:]?\s*)?([1-9])\s+([A-Za-z][A-Za-z0-9 &,/()_-]{4,60})/g;
  let match: RegExpExecArray | null;
  const matches: { index: number; num: number; title: string }[] = [];

  while ((match = moduleRegex.exec(text)) !== null) {
    // Filter out common false positives
    const title = match[2].trim();
    if (!title.toLowerCase().includes('lecture') && !title.toLowerCase().includes('credit') && !title.toLowerCase().includes('semester')) {
      matches.push({ index: match.index, num: parseInt(match[1], 10), title });
    }
  }

  if (matches.length >= 2) {
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const endIdx = next ? next.index : Math.min(text.length, current.index + 2000);
      const content = text.slice(current.index, endIdx);
      moduleBlocks.push({ num: current.num, title: current.title, content });
    }
  }

  // Fallback: If no regex modules matched, build 4 balanced modules based on headings or text blocks
  if (moduleBlocks.length === 0) {
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 5);
    const chunk = Math.max(1, Math.floor(lines.length / 4));
    for (let i = 0; i < 4; i++) {
      const slice = lines.slice(i * chunk, (i + 1) * chunk);
      moduleBlocks.push({
        num: i + 1,
        title: slice[0]?.slice(0, 40) || `Module ${i + 1}: Core Concepts`,
        content: slice.join('\n'),
      });
    }
  }

  // Convert moduleBlocks into Structured Modules, Chapters, and Topics
  moduleBlocks.forEach((mb, mIdx) => {
    const modId = `mod-${mIdx + 1}-${Date.now()}`;
    const chapterId = `chap-${mIdx + 1}-${Date.now()}`;
    const sentences = mb.content
      .split(/[.\n;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 8 && s.length < 90 && !s.includes('http'));

    const topics: Topic[] = [];
    const topicCount = Math.max(2, Math.min(5, sentences.length));

    for (let t = 0; t < topicCount; t++) {
      const title = sentences[t] ? sentences[t].replace(/^[0-9.-]+\s*/, '') : `Key Topic ${t + 1}`;
      const topicId = `top-${mIdx + 1}-${t + 1}-${Date.now().toString(36)}`;
      topics.push({
        id: topicId,
        chapterId,
        title: title.slice(0, 50),
        order: t + 1,
        importance: 'high',
        difficulty: 3,
        estimatedMinutes: 45,
        subtopics: [
          { id: `subtop-${mIdx}-${t}-1`, topicId, title: 'Core Definitions & Foundations', completed: false },
          { id: `subtop-${mIdx}-${t}-2`, topicId, title: 'Mechanisms & Protocols', completed: false },
          { id: `subtop-${mIdx}-${t}-3`, topicId, title: 'Exam Scenarios & Defenses', completed: false },
        ],
        masteryState: 'not_started',
        masteryScore: 0,
        isStudied: false,
        isUnderstood: false,
        practiceQuestionsAttempted: 0,
        practiceQuestionsCorrect: 0,
        flashcardsTotal: 3,
        flashcardsMastered: 0,
        mistakeCount: 0,
      });
    }

    const chapter: Chapter = {
      id: chapterId,
      moduleId: modId,
      title: `${mb.title} Comprehensive Guide`,
      order: mIdx + 1,
      learningObjectives: ['Master fundamental theory', 'Apply practical techniques', 'Prepare for exam questions'],
      estimatedMinutes: topics.length * 45,
      topics,
    };

    modules.push({
      id: modId,
      subjectId: '',
      title: `Module ${mb.num}: ${mb.title}`,
      order: mb.num || mIdx + 1,
      weight: Math.round(100 / Math.max(1, moduleBlocks.length)),
      chapters: [chapter],
    });
  });

  return {
    courseTitle,
    courseCode,
    modules,
  };
}

/**
 * End-to-End Orchestrator:
 * Ingests a syllabus file and exam date, and sets up the entire Study OS environment!
 */
export async function setupCourseFromSyllabus(
  file: File,
  examDateStr: string,
  customSubjectName?: string,
  customSubjectCode?: string
): Promise<SyllabusImportResult> {
  // 1. Extract document text using client-side parser
  const doc = await parseUploadedDocument(file);

  // 2. Extract structured hierarchy
  const hierarchy = extractHierarchyFromSyllabusText(doc.extractedText, file.name.replace(/\.[^/.]+$/, ''));
  const finalTitle = customSubjectName?.trim() || hierarchy.courseTitle;
  const finalCode = customSubjectCode?.trim() || hierarchy.courseCode;

  // 3. Create Subject
  const subjectId = `sub-${Date.now()}`;
  const subjectModules = hierarchy.modules.map((m) => ({
    ...m,
    subjectId,
  }));

  const subject: Subject = {
    id: subjectId,
    name: finalTitle,
    code: finalCode,
    color: '#6366f1',
    icon: 'Shield',
    description: `Curriculum and exam roadmap generated from ${file.name}.`,
    exams: [
      {
        id: `exam-${Date.now()}`,
        subjectId,
        name: `${finalTitle} Examination`,
        date: examDateStr,
        targetScore: 90,
        weighting: 100,
        status: 'upcoming',
      },
    ],
    modules: subjectModules,
    createdAt: new Date().toISOString(),
  };
  storage.saveSubject(subject);

  // 4. Save Syllabus to Resource Library
  const resourceId = `res-${Date.now()}`;
  const resource: Resource = {
    id: resourceId,
    title: `${finalTitle} - Official Syllabus`,
    type: 'pdf',
    extractedText: doc.extractedText,
    extractedSections: doc.sections,
    fileHash: doc.fileHash,
    fileSize: doc.fileSize,
    subjectId: subject.id,
    tags: ['Syllabus', 'Official Outline', `${doc.pageCount || 1} Pages`],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  storage.saveResource(resource);

  // 5. Generate Exam Deadline & Backward Study Plan
  const allTopicIds = hierarchy.modules.flatMap((m) => m.chapters.flatMap((c) => c.topics.map((t) => t.id)));
  const backwardPlan = aiService.generateBackwardPlan(
    `${finalTitle} Final Exam`,
    examDateStr,
    30, // 30 target study hours
    allTopicIds
  );

  const deadlineId = `dl-${Date.now()}`;
  const deadline: Deadline = {
    id: deadlineId,
    title: `${finalTitle} Examination`,
    description: `Comprehensive examination roadmap backward-planned from ${examDateStr}.`,
    category: 'exam',
    dueDate: examDateStr,
    priority: 'urgent',
    estimatedWorkloadHours: 30,
    status: 'in_progress',
    linkedSubjectId: subject.id,
    backwardPlan,
    notes: `Comprehensive examination roadmap backward-planned from ${examDateStr}.`,
    createdAt: new Date().toISOString(),
  };
  storage.saveDeadline(deadline);

  // 6. Generate Initial Flashcard Deck & Cards
  const deckId = `deck-${Date.now()}`;
  const firstModuleTopics = hierarchy.modules[0]?.chapters[0]?.topics || [];
  const deck: FlashcardDeck = {
    id: deckId,
    title: `${finalTitle} Mastery Deck`,
    subjectId: subject.id,
    description: `High-yield active recall flashcards generated from ${finalTitle} syllabus.`,
    color: '#6366f1',
    cardCount: firstModuleTopics.length,
    createdAt: new Date().toISOString(),
  };
  storage.saveDeck(deck);

  const todayStr = new Date().toISOString().split('T')[0];
  const flashcards: Flashcard[] = firstModuleTopics.map((top, idx) => ({
    id: `card-${Date.now()}-${idx}`,
    deckId: deck.id,
    subjectId: subject.id,
    topicId: top.id,
    front: `What is the core definition and security relevance of ${top.title}?`,
    back: `A foundational mechanism in ${finalTitle}. Mastering this is essential for exam questions and practical scenario analysis.`,
    format: 'concept' as CardFormat,
    state: 'new' as CardState,
    intervalDays: 1,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueDate: todayStr,
    tags: [finalCode, top.title],
    reviewHistory: [],
    createdAt: new Date().toISOString(),
  }));

  flashcards.forEach((c) => storage.saveFlashcard(c));

  // 7. Generate Initial Workbench Study Tasks
  const tasks: Task[] = [
    {
      id: `task-${Date.now()}-1`,
      title: `Read & Digest ${hierarchy.modules[0]?.title || 'Module 1'} Overview`,
      subjectId: subject.id,
      dueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
      priority: 'high',
      status: 'in_progress',
      estimatedMinutes: 60,
      actualMinutes: 0,
      category: 'academic',
      dependencies: [],
      subtasks: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: `task-${Date.now()}-2`,
      title: `Complete initial flashcards in ${deck.title}`,
      subjectId: subject.id,
      dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
      priority: 'medium',
      status: 'todo',
      estimatedMinutes: 30,
      actualMinutes: 0,
      category: 'review',
      dependencies: [],
      subtasks: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: `task-${Date.now()}-3`,
      title: `Attempt Module 1 practice questions in Exam Arena`,
      subjectId: subject.id,
      dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
      priority: 'medium',
      status: 'todo',
      estimatedMinutes: 45,
      actualMinutes: 0,
      category: 'academic',
      dependencies: [],
      subtasks: [],
      createdAt: new Date().toISOString(),
    },
  ];

  tasks.forEach((t) => storage.saveTask(t));

  // 8. Award Genesis Scholar XP & Notification
  storage.addXP(100, `Created course "${finalTitle}" from syllabus`);
  storage.createNotification({
    title: 'Course & Exam Plan Ready! 🚀',
    message: `Generated ${hierarchy.modules.length} modules, exam backward plan to ${examDateStr}, and initial tasks for ${finalTitle}.`,
    category: 'system',
  });

  return {
    subject,
    deadline,
    tasks,
    deck,
    flashcards,
    resource,
  };
}
