-- ==============================================================================
-- STUDY OS — Enable Supabase Realtime for Multi-Device Synchronization
-- ==============================================================================

-- Enable REPLICA IDENTITY FULL on tables so realtime events include old & new records
ALTER TABLE public.user_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.gamification_state REPLICA IDENTITY FULL;
ALTER TABLE public.deadlines REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.flashcard_decks REPLICA IDENTITY FULL;
ALTER TABLE public.flashcards REPLICA IDENTITY FULL;
ALTER TABLE public.focus_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.time_logs REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gamification_state;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deadlines;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.flashcard_decks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.flashcards;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.focus_sessions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.time_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
