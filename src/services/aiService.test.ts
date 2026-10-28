import { describe, it, expect, vi } from 'vitest';
import { aiService } from './aiService';

// Mock the network invokeAIProxy so unit tests run deterministically and fast
vi.mock('./supabaseClient', () => ({
  invokeAIProxy: vi.fn().mockResolvedValue({
    data: null,
    useFallback: true,
  }),
  uploadResourceDocument: vi.fn(),
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

describe('AI Service Layer & Backward Planning Engine', () => {
  it('generates a realistic backward study schedule respecting exam dates and buffers', () => {
    const examDate = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
    const steps = aiService.generateBackwardPlan(
      'Cloud Architecture Midterm',
      examDate,
      20,
      ['top-raft-safety']
    );

    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps[steps.length - 1].type).toBe('buffer');
    expect(steps[steps.length - 2].type).toBe('mock');

    const totalHours = steps.reduce((sum, s) => sum + s.estimatedHours, 0);
    expect(totalHours).toBeCloseTo(20, 1);
  });

  it('grades subjective answers with partial credit and criteria breakdown', async () => {
    const prompt = 'Explain the trade-off between latency and consistency in distributed consensus.';
    const rubric = [
      { criteria: 'Mentions communication latency vs consistency trade-off', points: 1.5 },
      { criteria: 'Mentions impact on stale reads or conflict resolution', points: 1.5 },
    ];

    const answer = 'Lower latency requires reducing round-trip communication or loosening consistency, leading to potential stale reads or conflicts.';
    const result = await aiService.gradeSubjectiveAnswer(prompt, rubric, answer);

    expect(result.scoreAwarded).toBeGreaterThan(0);
    expect(result.maxScore).toBe(3);
    expect(result.criteriaBreakdown.length).toBe(2);
    expect(result.percentage).toBeGreaterThanOrEqual(50);
  });

  it('awards zero for empty or trivial subjective answers', async () => {
    const result = await aiService.gradeSubjectiveAnswer('Prompt', undefined, '');
    expect(result.scoreAwarded).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('generates source-grounded questions with negative marking penalties', async () => {
    const questions = await aiService.generateQuestions('Distributed Systems', 'Raft Consensus', 3, 4);
    expect(questions.length).toBe(3);
    expect(questions[0].marks).toBeGreaterThan(0);
    expect(questions[0].negativeMarks).toBeDefined();
    expect(questions[0].explanation).toBeDefined();
  });
});
