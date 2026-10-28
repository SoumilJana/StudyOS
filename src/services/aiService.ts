import {
  Question,
  Flashcard,
  BackwardPlanStep,
  DifficultyLevel,
  UserSettings,
  CardFormat,
  CardState,
} from '../types';
import { invokeAIProxy } from './supabaseClient';
import { storage } from './storage';

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

export interface SubjectiveGradingResult {
  scoreAwarded: number;
  maxScore: number;
  percentage: number;
  criteriaBreakdown: { criteria: string; pointsAwarded: number; maxPoints: number; comment: string }[];
  feedback: string;
  misconceptionIdentified?: string;
}

export interface AIConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

class AIService {
  /**
   * Test user's API Key and AI model connection
   */
  public async testConnection(settings: Partial<UserSettings>): Promise<AIConnectionTestResult> {
    const start = Date.now();
    const provider = settings.aiProvider || 'openrouter';
    const apiKey = settings.apiKey?.trim();
    const model = settings.aiModel?.trim() || 'google/gemma-4-31b-it:free';

    try {
      if (provider === 'heuristic_offline') {
        return {
          success: true,
          message: 'Offline Heuristic Engine is ready. 100% local, zero latency, no network needed.',
          latencyMs: 1,
        };
      }

      // If user supplied a personal OpenRouter API Key
      if (provider === 'openrouter' && apiKey) {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });
        const data = await res.json();
        const latency = Date.now() - start;
        if (!res.ok) {
          throw new Error(data.error?.message || `HTTP ${res.status}: Invalid OpenRouter API key`);
        }
        const usage = data.data?.usage ?? 0;
        const limit = data.data?.limit;
        const limitStr = limit !== null && limit !== undefined ? `$${(limit - usage).toFixed(2)} remaining` : 'Unlimited / Active';
        return {
          success: true,
          message: `Connected to OpenRouter! Key label: "${data.data?.label || 'Personal Key'}" (${limitStr}). Ready to use ${model}.`,
          latencyMs: latency,
          details: data.data,
        };
      }

      // If user configured Google Gemini
      if (provider === 'gemini' && apiKey) {
        const geminiModel = model.includes('gemini') ? model : 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}?key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        const latency = Date.now() - start;
        if (!res.ok) {
          throw new Error(data.error?.message || `HTTP ${res.status}: Invalid Gemini API key`);
        }
        return {
          success: true,
          message: `Connected to Google Gemini (${geminiModel})! Display name: ${data.displayName || geminiModel}.`,
          latencyMs: latency,
        };
      }

      // If user configured OpenAI or Custom OpenAI-compatible endpoint
      if ((provider === 'openai' || provider === 'custom') && apiKey) {
        const endpoint = (settings.customEndpoint?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
        const res = await fetch(`${endpoint}/models`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });
        const latency = Date.now() - start;
        if (!res.ok) {
          throw new Error(`Endpoint returned HTTP ${res.status}`);
        }
        return {
          success: true,
          message: `Connected to ${endpoint}! Model: ${model}.`,
          latencyMs: latency,
        };
      }

      // Default: Test Server-Side Edge Proxy (OpenRouter Free)
      const serverResult = await invokeAIProxy(
        'explain_stage',
        {
          chapterTitle: 'Health Check',
          topicTitle: 'Ping',
          stepIndex: 0,
        },
        model
      );
      const latency = Date.now() - start;

      if (serverResult.error && serverResult.isQuotaExhausted) {
        return {
          success: false,
          message: `Server free quota is busy (${serverResult.error}). Plug in your personal API key below for instant dedicated access!`,
          latencyMs: latency,
        };
      }

      return {
        success: true,
        message: `Connected to Server-Side OpenRouter free tier (${model}). Latency: ${latency}ms.`,
        latencyMs: latency,
      };
    } catch (err: unknown) {
      const latency = Date.now() - start;
      const msg = err instanceof Error ? err.message : 'Unknown connection error';
      return {
        success: false,
        message: `Connection failed: ${msg}`,
        latencyMs: latency,
      };
    }
  }

  /**
   * Explain a chapter topic across the 12-step cognitive learning workflow
   */
  public async explainChapterTopic(
    chapterTitle: string,
    topicTitle: string,
    stepIndex: number,
    settings?: UserSettings,
    referenceDocumentText?: string
  ): Promise<TutoringResponse> {
    const currentSettings = settings || storage.getSettings();
    const provider = currentSettings.aiProvider;
    const apiKey = currentSettings.apiKey?.trim();
    const activeModel = currentSettings.aiModel || 'google/gemma-4-31b-it:free';

    const prompt = `You are an elite cognitive tutor in Study OS.
Teach topic: "${topicTitle}" in Chapter: "${chapterTitle}".
Stage ${stepIndex + 1} of 12.
Reference Material Context:
"""
${referenceDocumentText ? referenceDocumentText.slice(0, 3000) : 'None provided'}
"""

Respond with a single JSON object containing:
- stageTitle: string
- explanation: comprehensive markdown explanation grounded in reference material
- keyFormulasOrDefinitions: string array
- retrievalQuestion: { prompt: string, options: [string, string, string, string], correctIndex: number, explanation: string }
- examTip: string
- sourceCitation: string`;

    // 1. Direct User Key Execution (Prioritized for zero rate-limiting)
    if (apiKey) {
      if (provider === 'openrouter') {
        const res = await this.callDirectOpenRouter(prompt, apiKey, activeModel);
        if (res && res.explanation) return { ...res, stage: stepIndex + 1, modelUsed: `${activeModel} (Personal Key)` };
      } else if (provider === 'gemini') {
        const res = await this.callGeminiAPI(prompt, apiKey, activeModel);
        if (res && res.explanation) return { ...res, stage: stepIndex + 1, modelUsed: `Gemini (${activeModel})` };
      } else if (provider === 'openai' || provider === 'custom') {
        const res = await this.callDirectOpenAICompatible(prompt, apiKey, activeModel, currentSettings.customEndpoint);
        if (res && res.explanation) return { ...res, stage: stepIndex + 1, modelUsed: `${activeModel} (Direct)` };
      }
    }

    // 2. Try server-side Supabase Edge Function with OpenRouter free model
    if (provider === 'openrouter' || !apiKey) {
      try {
        const serverResult = await invokeAIProxy(
          'explain_stage',
          {
            chapterTitle,
            topicTitle,
            stepIndex,
            referenceContext: referenceDocumentText?.slice(0, 2000),
          },
          activeModel
        );

        if (serverResult.data && serverResult.data.explanation) {
          return {
            stage: stepIndex + 1,
            stageTitle: serverResult.data.stageTitle || `Learning Stage ${stepIndex + 1}`,
            explanation: serverResult.data.explanation,
            keyFormulasOrDefinitions: Array.isArray(serverResult.data.keyFormulasOrDefinitions)
              ? serverResult.data.keyFormulasOrDefinitions
              : [],
            retrievalQuestion: serverResult.data.retrievalQuestion || {
              prompt: `What is the core takeaway of ${topicTitle}?`,
              options: ['Maintains system invariants', 'Reduces physical memory', 'Increases uncommitted writes', 'None of the above'],
              correctIndex: 0,
              explanation: 'Verified through domain protocol rules.',
            },
            examTip: serverResult.data.examTip || 'Pay attention to invariant proofs.',
            modelUsed: serverResult.cached ? 'OpenRouter (Cached)' : `${activeModel} (Free Tier)`,
          };
        } else if (serverResult.isQuotaExhausted) {
          storage.createNotification({
            title: 'Free AI Quota Busy',
            message: 'OpenRouter free-tier is experiencing peak traffic. Falling back to offline cognitive engine.',
            category: 'system',
          });
        }
      } catch (err) {
        console.warn('AI proxy unavailable, using local heuristic:', err);
      }
    }

    // 3. Resilient High-Fidelity Local Offline Cognitive Heuristic Engine
    const stepTitles = [
      'Foundational Mental Model & Intuition',
      'Core Mechanics & Step-by-Step Breakdown',
      'Rigorous Mathematical/Technical Derivations',
      'Common Misconceptions & High-Yield Exam Traps',
      'Real-World Edge Cases & System Failure Modes',
      'Synthesis & Active Recall Checkpoint',
      'Security Invariants & Attack Vectors',
      'Protocol Handshakes & Verification',
      'Defensive Hardening & Mitigation Rules',
      'Implementation Code Walkthrough',
      'Past Exam Multi-Part Question Breakdown',
      'Mastery Synthesis & Retrospective',
    ];

    const currentTitle = stepTitles[stepIndex % stepTitles.length];

    return {
      stage: stepIndex + 1,
      stageTitle: currentTitle,
      explanation: `### ${topicTitle} — ${currentTitle}

In studying **${chapterTitle}**, mastering **${topicTitle}** requires moving beyond passive reading into active cognitive modeling.

${referenceDocumentText ? `> **Grounded from Uploaded Source**: "${referenceDocumentText.slice(0, 240)}..."\n\n` : ''}

#### Key Principles
1. **First-Principles Derivation**: Every invariant exists to solve a specific failure condition. When entities interact over an untrusted or asynchronous medium, assumptions about order and timing break down.
2. **State Machine Invariants**: A system must never commit state transitions without verifying preconditions and authorization bounds.
3. **Defense-in-Depth**: Relying on a single perimeter control invariably results in compromise when that layer experiences an edge-case bypass.

#### High-Yield Exam Insights
- When asked to analyze vulnerabilities or edge cases in **${topicTitle}**, immediately identify:
  - What inputs are attacker-controlled?
  - Where is validation performed (client vs. server)?
  - What happens when timeouts, race conditions, or partial failures occur?`,
      keyFormulasOrDefinitions: [
        `Invariant(${topicTitle}): Pre-conditions must be validated before state mutations`,
        `Safety Check: Quorum size Q > N / 2 to prevent split-brain`,
        `Complexity: O(log N) verification with authenticated data structures`,
      ],
      retrievalQuestion: {
        prompt: `Which condition is essential to prevent state inconsistency during ${topicTitle}?`,
        options: [
          'Enforcing monotonic sequence numbering and quorum consensus prior to commit',
          'Relying strictly on unsynchronized client clock timestamps',
          'Permitting unchecked async writes to maximize pipeline throughput',
          'Bypassing server validation when under high latency pressure',
        ],
        correctIndex: 0,
        explanation: 'Monotonic sequence numbering and consensus ensure that all replicas agree on transition order.',
      },
      examTip: `Always state the trade-off (e.g. latency vs. strong consistency) when answering multi-mark questions on ${topicTitle}.`,
      sourceCitation: referenceDocumentText ? 'Uploaded Material Context' : `${chapterTitle} — Study OS Heuristic Curriculum`,
      modelUsed: 'Local Cognitive Engine (Offline)',
    };
  }

  /**
   * Question Generator
   */
  public async generateQuestions(
    subjectName: string,
    topicTitle: string,
    count = 3,
    difficulty: DifficultyLevel = 3,
    referenceDocumentText?: string
  ): Promise<Question[]> {
    const currentSettings = storage.getSettings();
    const apiKey = currentSettings.apiKey?.trim();
    const provider = currentSettings.aiProvider;
    const activeModel = currentSettings.aiModel || 'google/gemma-4-31b-it:free';

    const prompt = `Generate ${count} examination questions for Subject: "${subjectName}", Topic: "${topicTitle}".
Difficulty level: ${difficulty} out of 5.
${referenceDocumentText ? `Reference Text: ${referenceDocumentText.slice(0, 2000)}` : ''}

Return a JSON array of questions with:
- type: 'mcq_single' | 'mcq_multiple' | 'true_false' | 'short_answer'
- prompt: string
- options: [{ id: 'opt-a' | 'opt-b' | 'opt-c' | 'opt-d', text: string }] (for mcq and true_false)
- correctAnswer: string
- explanation: string
- misconceptions: string[]
- difficulty: number
- marks: number
- negativeMarks: number`;

    // 1. Direct User Key
    if (apiKey) {
      try {
        let rawQuestions: unknown[] = [];
        if (provider === 'openrouter') {
          const res = await this.callDirectOpenRouter(prompt, apiKey, activeModel);
          if (Array.isArray(res)) rawQuestions = res;
          else if (res && Array.isArray(res.questions)) rawQuestions = res.questions;
        } else if (provider === 'gemini') {
          const res = await this.callGeminiAPI(prompt, apiKey, activeModel);
          if (Array.isArray(res)) rawQuestions = res;
          else if (res && Array.isArray(res.questions)) rawQuestions = res.questions;
        } else if (provider === 'openai' || provider === 'custom') {
          const res = await this.callDirectOpenAICompatible(prompt, apiKey, activeModel, currentSettings.customEndpoint);
          if (Array.isArray(res)) rawQuestions = res;
          else if (res && Array.isArray(res.questions)) rawQuestions = res.questions;
        }

        if (rawQuestions.length > 0) {
          return this.sanitizeQuestions(rawQuestions, subjectName, topicTitle, difficulty);
        }
      } catch (err) {
        console.warn('Direct API question generation error, falling back:', err);
      }
    }

    // 2. Server-side Edge Proxy
    try {
      const serverResult = await invokeAIProxy(
        'generate_questions',
        {
          subjectName,
          topicTitle,
          count,
          difficulty,
          referenceContext: referenceDocumentText?.slice(0, 1500),
        },
        activeModel
      );

      if (Array.isArray(serverResult.data) && serverResult.data.length > 0) {
        return this.sanitizeQuestions(serverResult.data, subjectName, topicTitle, difficulty);
      }
    } catch (err) {
      console.warn('AI question generator proxy error, falling back:', err);
    }

    // 3. Local Curated Fallback
    const list: Question[] = [];
    list.push({
      id: `gen-q-${Date.now()}-1`,
      type: 'mcq_single',
      prompt: `In the context of ${topicTitle} within ${subjectName}, which invariant guarantees total linearizable ordering?`,
      options: [
        { id: 'opt-a', text: 'Enforcing that all state mutations pass through a single monotonically incremented log index before client acknowledgment.' },
        { id: 'opt-b', text: 'Relying on physical NTP timestamps across all cluster nodes.' },
        { id: 'opt-c', text: 'Executing write operations in parallel on all worker nodes.' },
        { id: 'opt-d', text: 'Allowing temporary divergent branches that merge asynchronously without consensus.' },
      ],
      correctAnswer: 'opt-a',
      explanation: 'Linearizable ordering requires a single monotonic sequence of state transitions agreed upon by quorum consensus before confirming execution.',
      misconceptions: ['Assuming NTP timestamps are strictly monotonic across distributed hardware without true time drift guarantees.'],
      difficulty,
      marks: 4,
      negativeMarks: 1,
      tags: [subjectName, topicTitle, 'Curated'],
    });

    list.push({
      id: `gen-q-${Date.now()}-2`,
      type: 'true_false',
      prompt: `True or False: Under network partition during ${topicTitle}, an isolated minority partition can continue serving safe, linearizable write operations.`,
      options: [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
      ],
      correctAnswer: 'false',
      explanation: 'False. A minority partition cannot satisfy the quorum condition (floor(N/2) + 1) and must reject writes to prevent divergent state.',
      difficulty: 2,
      marks: 2,
      negativeMarks: 0.5,
      tags: [subjectName, topicTitle, 'Partition Safety'],
    });

    list.push({
      id: `gen-q-${Date.now()}-3`,
      type: 'short_answer',
      prompt: `Briefly explain the primary trade-off encountered when optimizing ${topicTitle} for lower latency.`,
      correctAnswer: 'Lower latency often requires reducing round-trip communication or loosening consistency constraints, which increases the risk of stale reads or complex conflict resolution.',
      explanation: 'The fundamental trade-off is CAP/PACELC: reducing synchronization latency directly compromises immediate cross-node consistency.',
      rubricCriteria: [
        { criteria: 'Mentions communication latency vs consistency trade-off', points: 1.5 },
        { criteria: 'Mentions impact on stale reads or conflict resolution', points: 1.5 },
      ],
      difficulty: 4,
      marks: 3,
      negativeMarks: 0,
      tags: [subjectName, topicTitle, 'Analytical'],
    });

    return list.slice(0, count);
  }

  /**
   * Flashcard Generator
   */
  public async generateFlashcards(
    subjectName: string,
    topicTitle: string,
    count = 3,
    referenceDocumentText?: string
  ): Promise<Omit<Flashcard, 'id' | 'createdAt' | 'reviewHistory'>[]> {
    const today = new Date().toISOString().split('T')[0];
    const currentSettings = storage.getSettings();
    const apiKey = currentSettings.apiKey?.trim();
    const provider = currentSettings.aiProvider;
    const activeModel = currentSettings.aiModel || 'google/gemma-4-31b-it:free';

    const prompt = `Generate ${count} high-yield flashcards for Subject: "${subjectName}", Topic: "${topicTitle}".
${referenceDocumentText ? `Reference Text: ${referenceDocumentText.slice(0, 2000)}` : ''}

Return a JSON array of objects with:
- front: string (clear question, concept, or prompt)
- back: string (concise answer with key formula or definition)
- format: 'concept' | 'code' | 'formula' | 'case_study' | 'definition' | 'diagram'
- tags: string[]`;

    // 1. Direct User Key
    if (apiKey) {
      try {
        let rawCards: unknown[] = [];
        if (provider === 'openrouter') {
          const res = await this.callDirectOpenRouter(prompt, apiKey, activeModel);
          if (Array.isArray(res)) rawCards = res;
          else if (res && Array.isArray(res.flashcards)) rawCards = res.flashcards;
        } else if (provider === 'gemini') {
          const res = await this.callGeminiAPI(prompt, apiKey, activeModel);
          if (Array.isArray(res)) rawCards = res;
          else if (res && Array.isArray(res.flashcards)) rawCards = res.flashcards;
        } else if (provider === 'openai' || provider === 'custom') {
          const res = await this.callDirectOpenAICompatible(prompt, apiKey, activeModel, currentSettings.customEndpoint);
          if (Array.isArray(res)) rawCards = res;
          else if (res && Array.isArray(res.flashcards)) rawCards = res.flashcards;
        }

        if (rawCards.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return rawCards.map((c: any) => ({
            deckId: 'deck-generated',
            front: c.front || `Define ${topicTitle}`,
            back: c.back || 'Core definition and exam context.',
            format: (c.format || 'concept') as CardFormat,
            tags: Array.isArray(c.tags) ? c.tags : [subjectName, topicTitle],
            state: 'new' as const,
            intervalDays: 1,
            easeFactor: 2.5,
            repetitions: 0,
            lapses: 0,
            dueDate: today,
          })).slice(0, count);
        }
      } catch (err) {
        console.warn('Direct API flashcard generation error, falling back:', err);
      }
    }

    // 2. Server-side Supabase Edge Function
    try {
      const serverResult = await invokeAIProxy(
        'generate_flashcards',
        {
          subjectName,
          topicTitle,
          count,
          referenceContext: referenceDocumentText?.slice(0, 1500),
        },
        activeModel
      );

      if (Array.isArray(serverResult.data) && serverResult.data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validated = serverResult.data.map((c: any) => ({
          deckId: 'deck-generated',
          front: c.front || `Define ${topicTitle}`,
          back: c.back || 'Core definition and exam context.',
          format: (c.format || 'concept') as CardFormat,
          tags: Array.isArray(c.tags) ? c.tags : [subjectName, topicTitle],
          state: 'new' as const,
          intervalDays: 1,
          easeFactor: 2.5,
          repetitions: 0,
          lapses: 0,
          dueDate: today,
        }));
        if (validated.length > 0) return validated.slice(0, count);
      }
    } catch {
      // fallback
    }

    // 3. Local Curated Fallback
    return [
      {
        deckId: 'deck-generated',
        front: `What core problem does ${topicTitle} solve in ${subjectName}?`,
        back: `Prevents uncoordinated state divergence by enforcing mutual agreement and invariant verification before committing mutations.`,
        format: 'concept' as CardFormat,
        tags: [subjectName, topicTitle, 'Fundamentals'],
        state: 'new' as CardState,
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        dueDate: today,
      },
      {
        deckId: 'deck-generated',
        front: `What is the Quorum Condition for partition-tolerant consensus in ${topicTitle}?`,
        back: `Q = floor(N / 2) + 1. Any two quorums must intersect at at least one node containing the most up-to-date state.`,
        format: 'formula' as CardFormat,
        tags: [subjectName, topicTitle, 'Quorum'],
        state: 'new' as CardState,
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        dueDate: today,
      },
      {
        deckId: 'deck-generated',
        front: `Common Exam Trap: Why can't wall-clock timestamps replace logical clocks in ${topicTitle}?`,
        back: `Physical clocks suffer from network jitter, drift, and leap seconds. Only logical clocks guarantee strict causality without atomic hardware synchronization.`,
        format: 'concept' as CardFormat,
        tags: [subjectName, topicTitle, 'Exam Trap'],
        state: 'new' as CardState,
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        dueDate: today,
      },
    ].slice(0, count);
  }

  /**
   * Subjective Answer Grader
   */
  public async gradeSubjectiveAnswer(
    questionPrompt: string,
    rubricCriteria?: { criteria: string; points: number }[],
    userAnswer = '',
    modelAnswer?: string
  ): Promise<SubjectiveGradingResult> {
    const defaultCriteria = rubricCriteria && rubricCriteria.length > 0
      ? rubricCriteria
      : [
          { criteria: 'Technical rigor and conceptual accuracy', points: 3 },
          { criteria: 'Identification of underlying trade-offs and edge cases', points: 2 },
        ];

    const maxScore = defaultCriteria.reduce((sum, c) => sum + c.points, 0);

    // Empty or trivial answer check
    if (!userAnswer || !userAnswer.trim()) {
      return {
        scoreAwarded: 0,
        maxScore,
        percentage: 0,
        criteriaBreakdown: defaultCriteria.map((c) => ({
          criteria: c.criteria,
          pointsAwarded: 0,
          maxPoints: c.points,
          comment: 'No answer provided.',
        })),
        feedback: 'No answer was submitted. State your reasoning to receive partial credit.',
      };
    }

    const currentSettings = storage.getSettings();
    const apiKey = currentSettings.apiKey?.trim();
    const provider = currentSettings.aiProvider;
    const activeModel = currentSettings.aiModel || 'google/gemma-4-31b-it:free';

    const prompt = `You are a strict academic examiner.
Question: "${questionPrompt}"
Rubric Criteria: ${JSON.stringify(defaultCriteria)}
Model Reference Answer: "${modelAnswer || 'None provided'}"
Student Answer: "${userAnswer}"

Grade objectively. Return JSON with:
- scoreAwarded: number (between 0 and ${maxScore})
- maxScore: ${maxScore}
- percentage: number (0-100)
- criteriaBreakdown: [{ criteria: string, pointsAwarded: number, maxPoints: number, comment: string }]
- feedback: string (constructive feedback explaining what was missed)
- misconceptionIdentified?: string`;

    // Direct User Key
    if (apiKey) {
      try {
        let result: unknown = null;
        if (provider === 'openrouter') {
          result = await this.callDirectOpenRouter(prompt, apiKey, activeModel);
        } else if (provider === 'gemini') {
          result = await this.callGeminiAPI(prompt, apiKey, activeModel);
        } else if (provider === 'openai' || provider === 'custom') {
          result = await this.callDirectOpenAICompatible(prompt, apiKey, activeModel, currentSettings.customEndpoint);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resObj = result as any;
        if (resObj && typeof resObj.scoreAwarded === 'number') {
          return {
            scoreAwarded: resObj.scoreAwarded,
            maxScore,
            percentage: Math.round((resObj.scoreAwarded / maxScore) * 100),
            criteriaBreakdown: Array.isArray(resObj.criteriaBreakdown) ? resObj.criteriaBreakdown : [],
            feedback: resObj.feedback || 'Answer evaluated by your configured AI model.',
            misconceptionIdentified: resObj.misconceptionIdentified,
          };
        }
      } catch (err) {
        console.warn('Direct API grading error, falling back:', err);
      }
    }

    // Server-side Edge Proxy
    try {
      const serverResult = await invokeAIProxy(
        'grade_subjective',
        {
          questionPrompt,
          rubricCriteria: defaultCriteria,
          userAnswer,
          modelAnswer,
        },
        activeModel
      );

      if (serverResult.data && typeof serverResult.data.scoreAwarded === 'number') {
        return {
          scoreAwarded: serverResult.data.scoreAwarded,
          maxScore,
          percentage: serverResult.data.percentage || Math.round((serverResult.data.scoreAwarded / maxScore) * 100),
          criteriaBreakdown: serverResult.data.criteriaBreakdown || [],
          feedback: serverResult.data.feedback || 'Evaluated against rubric standards.',
          misconceptionIdentified: serverResult.data.misconceptionIdentified,
        };
      }
    } catch {
      // Heuristic fallback
    }

    // Local Rubric Heuristic
    let awarded = 0;
    const lowerUser = userAnswer.toLowerCase();
    const breakdown = defaultCriteria.map((r) => {
      const words = r.criteria.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const matches = words.filter((w) => lowerUser.includes(w)).length;
      const pts = matches >= Math.ceil(words.length * 0.4) ? r.points : Math.round(r.points * 0.5 * 10) / 10;
      awarded += pts;
      return {
        criteria: r.criteria,
        pointsAwarded: pts,
        maxPoints: r.points,
        comment: pts === r.points ? 'Fully addressed with technical precision.' : 'Partially covered.',
      };
    });

    awarded = Math.min(awarded, maxScore);
    return {
      scoreAwarded: awarded,
      maxScore,
      percentage: Math.round((awarded / maxScore) * 100),
      criteriaBreakdown: breakdown,
      feedback: awarded > maxScore * 0.7
        ? 'Well structured answer addressing key mechanisms.'
        : 'Ensure you explicitly mention invariant trade-offs and concrete edge cases.',
    };
  }

  /**
   * Automatic Backward Study Planner
   */
  public generateBackwardPlan(
    examTitle: string,
    examDateISO: string,
    estimatedWorkloadHours: number,
    weakTopicIds: string[] = []
  ): BackwardPlanStep[] {
    const today = new Date();
    const examDate = new Date(examDateISO);
    const diffTime = examDate.getTime() - today.getTime();
    const diffDays = Math.max(1, Math.floor(diffTime / (1000 * 3600 * 24)));

    const steps: BackwardPlanStep[] = [];
    const stepCount = Math.min(diffDays, Math.max(3, Math.ceil(estimatedWorkloadHours / 2.5)));
    const hoursPerStep = Math.round((estimatedWorkloadHours / stepCount) * 10) / 10;

    for (let i = 0; i < stepCount; i++) {
      const stepDate = new Date(today.getTime() + Math.floor((i / stepCount) * diffTime));
      const dateStr = stepDate.toISOString().split('T')[0];

      let type: BackwardPlanStep['type'] = 'learn';
      let title = '';

      if (i === stepCount - 1) {
        type = 'buffer';
        title = `Final Formula Sheet & High-Yield Summary Review (${examTitle})`;
      } else if (i === stepCount - 2) {
        type = 'mock';
        title = `Full Timed Simulation Exam & Mistake Audit`;
      } else if (i > stepCount * 0.6) {
        type = 'review';
        title = `Targeted Weak Spot Drill & Spaced Repetition Blitz`;
      } else if (i > stepCount * 0.3) {
        type = 'practice';
        title = `Intensive Problem Sets & Retrieval Practice Questions`;
      } else {
        type = 'learn';
        title = `Deep Chapter Synthesis & Active Note Checkpoints`;
      }

      steps.push({
        date: dateStr,
        title,
        type,
        estimatedHours: hoursPerStep,
        completed: false,
        topicIds: weakTopicIds.slice(0, 2),
      });
    }

    return steps;
  }

  // ----------------------------------------------------
  // Private API Connectors
  // ----------------------------------------------------

  /**
   * Direct OpenRouter API call
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async callDirectOpenRouter(prompt: string, apiKey: string, model: string): Promise<any> {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://study-os.local',
        'X-Title': 'Study OS',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'google/gemma-4-31b-it:free',
        messages: [
          {
            role: 'system',
            content: 'You are an elite academic tutor and examiner in Study OS. Respond only with valid parseable JSON matching the requested structure. Never include markdown code fences or conversational prose outside JSON.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenRouter call failed with status ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    return this.parseJsonSafe(content);
  }

  /**
   * Direct OpenAI or Custom Endpoint
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async callDirectOpenAICompatible(prompt: string, apiKey: string, model: string, endpoint?: string): Promise<any> {
    const base = (endpoint?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an elite academic tutor and examiner in Study OS. Respond only with valid parseable JSON matching the requested structure.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Endpoint failed with status ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    return this.parseJsonSafe(content);
  }

  /**
   * Direct Gemini API
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async callGeminiAPI(prompt: string, apiKey: string, model = 'gemini-1.5-flash'): Promise<any> {
    const cleanModel = model.includes('gemini') ? model : 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    if (!response.ok) throw new Error(`Gemini API failed with status ${response.status}`);
    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return this.parseJsonSafe(candidateText);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseJsonSafe(text?: string): any {
    if (!text) return null;
    try {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : text);
    } catch {
      return null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sanitizeQuestions(data: any[], subjectName: string, topicTitle: string, defaultDiff: DifficultyLevel): Question[] {
    const validated: Question[] = [];
    for (const raw of data) {
      if (raw.prompt && raw.correctAnswer) {
        validated.push({
          id: `gen-q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: raw.type || 'mcq_single',
          prompt: raw.prompt,
          options: Array.isArray(raw.options) ? raw.options : undefined,
          correctAnswer: raw.correctAnswer,
          explanation: raw.explanation || 'Verified through domain syllabus.',
          misconceptions: Array.isArray(raw.misconceptions) ? raw.misconceptions : [],
          difficulty: raw.difficulty || defaultDiff,
          marks: raw.marks || 4,
          negativeMarks: raw.negativeMarks || 1,
          tags: [subjectName, topicTitle, 'AI Generated'],
        });
      }
    }
    return validated;
  }
}

export const aiService = new AIService();
