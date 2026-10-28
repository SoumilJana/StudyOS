-- ==============================================================================
-- STUDY OS — Production PostgreSQL Schema with Strict RLS and Indexes
-- ==============================================================================

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT 'Scholar',
  avatar_seed text DEFAULT 'study-avatar',
  theme text NOT NULL DEFAULT 'dark',
  daily_focus_target_minutes int NOT NULL DEFAULT 240,
  pomodoro_work_minutes int NOT NULL DEFAULT 50,
  pomodoro_break_minutes int NOT NULL DEFAULT 10,
  hourly_checkin_enabled boolean NOT NULL DEFAULT true,
  quiet_hours_start text NOT NULL DEFAULT '22:00',
  quiet_hours_end text NOT NULL DEFAULT '07:30',
  ai_provider text NOT NULL DEFAULT 'openrouter',
  ai_model text NOT NULL DEFAULT 'meta-llama/llama-3.3-70b-instruct:free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  icon text NOT NULL DEFAULT 'Network',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Exams
CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  date timestamptz NOT NULL,
  target_score numeric NOT NULL DEFAULT 90,
  weighting numeric NOT NULL DEFAULT 35,
  status text NOT NULL DEFAULT 'upcoming',
  total_marks int DEFAULT 100,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Modules
CREATE TABLE IF NOT EXISTS public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_num int NOT NULL DEFAULT 1,
  weight numeric NOT NULL DEFAULT 40,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Chapters
CREATE TABLE IF NOT EXISTS public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_num int NOT NULL DEFAULT 1,
  description text,
  learning_objectives text[] DEFAULT '{}',
  estimated_minutes int NOT NULL DEFAULT 120,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Topics
CREATE TABLE IF NOT EXISTS public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_num int NOT NULL DEFAULT 1,
  importance text NOT NULL DEFAULT 'medium',
  difficulty int NOT NULL DEFAULT 3,
  estimated_minutes int NOT NULL DEFAULT 45,
  mastery_state text NOT NULL DEFAULT 'not_started',
  mastery_score int NOT NULL DEFAULT 0,
  is_studied boolean NOT NULL DEFAULT false,
  is_understood boolean NOT NULL DEFAULT false,
  is_excluded_from_exam boolean NOT NULL DEFAULT false,
  practice_questions_attempted int NOT NULL DEFAULT 0,
  practice_questions_correct int NOT NULL DEFAULT 0,
  flashcards_total int NOT NULL DEFAULT 0,
  flashcards_mastered int NOT NULL DEFAULT 0,
  mistake_count int NOT NULL DEFAULT 0,
  last_studied_at timestamptz,
  last_revised_at timestamptz,
  next_revision_due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Deadlines & Backward Planner
CREATE TABLE IF NOT EXISTS public.deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'exam',
  due_date timestamptz NOT NULL,
  priority text NOT NULL DEFAULT 'high',
  estimated_workload_hours numeric NOT NULL DEFAULT 20,
  status text NOT NULL DEFAULT 'in_progress',
  linked_subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  linked_exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL,
  backward_plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'in_progress',
  priority text NOT NULL DEFAULT 'medium',
  start_date date NOT NULL DEFAULT current_date,
  target_date date,
  estimated_hours numeric NOT NULL DEFAULT 25,
  actual_hours_tracked numeric NOT NULL DEFAULT 0,
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  estimated_minutes int NOT NULL DEFAULT 60,
  actual_minutes int NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'academic',
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  dependencies text[] DEFAULT '{}',
  subtasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Flashcard Decks
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Flashcards (SM-2 / Spaced Repetition)
CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id uuid REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  front text NOT NULL,
  back text NOT NULL,
  format text NOT NULL DEFAULT 'concept',
  tags text[] DEFAULT '{}',
  source_reference text,
  state text NOT NULL DEFAULT 'new',
  interval_days int NOT NULL DEFAULT 1,
  ease_factor numeric NOT NULL DEFAULT 2.5,
  repetitions int NOT NULL DEFAULT 0,
  lapses int NOT NULL DEFAULT 0,
  due_date date NOT NULL DEFAULT current_date,
  last_reviewed_at timestamptz,
  review_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Question Banks
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'mcq_single',
  prompt text NOT NULL,
  options jsonb,
  correct_answer jsonb NOT NULL,
  explanation text NOT NULL,
  misconceptions text[] DEFAULT '{}',
  rubric_criteria jsonb,
  difficulty int NOT NULL DEFAULT 3,
  marks numeric NOT NULL DEFAULT 4,
  negative_marks numeric NOT NULL DEFAULT 1,
  source_reference text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 13. Mistake Records
CREATE TABLE IF NOT EXISTS public.mistake_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  question_prompt text NOT NULL,
  user_answer text NOT NULL,
  expected_answer text NOT NULL,
  explanation text NOT NULL,
  misconception_notes text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 14. Revision Events
CREATE TABLE IF NOT EXISTS public.revision_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  source text NOT NULL DEFAULT 'spaced_repetition',
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  reason text NOT NULL,
  scheduled_date date NOT NULL DEFAULT current_date,
  estimated_minutes int NOT NULL DEFAULT 30,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  postponed_to_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 15. Focus Sessions (Pomodoro)
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_seconds int NOT NULL,
  actual_focused_seconds int NOT NULL,
  preset text NOT NULL DEFAULT '50_10',
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'completed',
  interruptions_count int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 16. Time Logs (Zero Double-Counting)
CREATE TABLE IF NOT EXISTS public.time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity text NOT NULL,
  category text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_minutes int NOT NULL,
  is_planned boolean NOT NULL DEFAULT true,
  linked_focus_session_id uuid REFERENCES public.focus_sessions(id) ON DELETE SET NULL,
  linked_subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  linked_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  notes text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 17. Hourly Check-ins
CREATE TABLE IF NOT EXISTS public.hourly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hour_timestamp timestamptz NOT NULL,
  category text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 18. Resources & Documents
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'pdf',
  storage_path text,
  url text,
  file_hash text,
  file_size bigint,
  extracted_text text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 19. Gamification State
CREATE TABLE IF NOT EXISTS public.gamification_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp int NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 1,
  rank text NOT NULL DEFAULT 'Initiate',
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_active_date date NOT NULL DEFAULT current_date,
  streak_freeze_available int NOT NULL DEFAULT 2,
  missions jsonb NOT NULL DEFAULT '[]'::jsonb,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 20. Reusable AI Cache (Server-side deduplication & cost-control)
CREATE TABLE IF NOT EXISTS public.ai_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash text NOT NULL UNIQUE,
  model text NOT NULL,
  response_content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- INDEXES FOR SCALE & QUERY OPTIMIZATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_subjects_user ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_user_date ON public.exams(user_id, date);
CREATE INDEX IF NOT EXISTS idx_modules_subject ON public.modules(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_module ON public.chapters(module_id);
CREATE INDEX IF NOT EXISTS idx_topics_chapter ON public.topics(chapter_id);
CREATE INDEX IF NOT EXISTS idx_topics_user_due ON public.topics(user_id, next_revision_due_at);
CREATE INDEX IF NOT EXISTS idx_deadlines_user_date ON public.deadlines(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_due ON public.flashcards(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON public.questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_user_resolved ON public.mistake_records(user_id, resolved);
CREATE INDEX IF NOT EXISTS idx_revisions_user_date ON public.revision_events(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_started ON public.time_logs(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON public.focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_user ON public.resources(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_hash ON public.ai_cache(prompt_hash);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistake_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hourly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

-- Macro policy generator pattern: TO authenticated with (auth.uid() = user_id)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'subjects', 'exams', 'modules', 'chapters', 'topics',
      'deadlines', 'projects', 'tasks', 'flashcard_decks', 'flashcards',
      'questions', 'mistake_records', 'revision_events', 'focus_sessions',
      'time_logs', 'hourly_checkins', 'resources'
    ])
  LOOP
    EXECUTE format('
      CREATE POLICY "user_select_%1$s" ON public.%1$s
        FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
      CREATE POLICY "user_insert_%1$s" ON public.%1$s
        FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
      CREATE POLICY "user_update_%1$s" ON public.%1$s
        FOR UPDATE TO authenticated
        USING ((select auth.uid()) = user_id)
        WITH CHECK ((select auth.uid()) = user_id);
      CREATE POLICY "user_delete_%1$s" ON public.%1$s
        FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);
    ', tbl);
  END LOOP;
END $$;

-- user_profiles policies (uses id as user_id)
CREATE POLICY "user_select_profiles" ON public.user_profiles
  FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY "user_insert_profiles" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "user_update_profiles" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- gamification_state policies
CREATE POLICY "user_select_gamification" ON public.gamification_state
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "user_insert_gamification" ON public.gamification_state
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "user_update_gamification" ON public.gamification_state
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ai_cache policies (Read for all authenticated, insert restricted)
CREATE POLICY "user_select_ai_cache" ON public.ai_cache
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_insert_ai_cache" ON public.ai_cache
  FOR INSERT TO authenticated WITH CHECK (true);

-- User auto-creation trigger on auth.users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, user_name)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Scholar'));

  INSERT INTO public.gamification_state (user_id, xp, level, rank)
  VALUES (new.id, 100, 1, 'Initiate');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
