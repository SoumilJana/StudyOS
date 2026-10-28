import { supabase } from '../supabaseClient';
import { CloudSyncAdapter, PushResult, PullResult } from './SyncAdapter';
import { SyncMutation, SyncProvider, RemoteChange } from './types';
import { toValidUuid } from '../cloudSync';
export { toValidUuid };

export class SupabaseSyncAdapter implements CloudSyncAdapter {
  public readonly provider: SyncProvider = 'supabase';
  private realtimeChannel: any = null;

  public async initialize(_userId: string): Promise<void> {
    // Initial verification
  }

  public destroy(): void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  public async pushMutations(mutations: SyncMutation[], userId: string): Promise<PushResult> {
    const appliedMutationIds: string[] = [];
    const failedMutations: { id: string; error: string }[] = [];

    for (const m of mutations) {
      try {
        if (m.operation === 'delete') {
          await this.handleDelete(m, userId);
        } else {
          await this.handleUpsert(m, userId);
        }
        appliedMutationIds.push(m.id);
      } catch (err: any) {
        console.warn(`[SupabaseSync] Mutation ${m.id} failed:`, err);
        failedMutations.push({ id: m.id, error: err.message || 'Mutation failed' });
      }
    }

    return { appliedMutationIds, failedMutations };
  }

  private async handleDelete(m: SyncMutation, userId: string): Promise<void> {
    const tableMap: Record<string, string> = {
      deadline: 'deadlines',
      project: 'projects',
      task: 'tasks',
      deck: 'flashcard_decks',
      flashcard: 'flashcards',
      timeLog: 'time_logs',
      focusSession: 'focus_sessions',
      question: 'questions',
      mistake: 'mistake_records',
      revision: 'revision_events',
    };

    const tableName = tableMap[m.entityType];
    if (!tableName) return;

    const rowId = toValidUuid(m.entityId);
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', rowId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  private async handleUpsert(m: SyncMutation, userId: string): Promise<void> {
    const p = m.payload;
    if (!p) return;

    switch (m.entityType) {
      case 'settings': {
        const { error } = await supabase.from('user_profiles').upsert({
          id: userId,
          user_name: p.userName,
          theme: p.theme,
          daily_focus_target_minutes: p.dailyFocusTargetMinutes,
          pomodoro_work_minutes: p.pomodoroWorkMinutes,
          pomodoro_break_minutes: p.pomodoroBreakMinutes,
          hourly_checkin_enabled: p.hourlyCheckinEnabled,
          quiet_hours_start: p.quietHoursStart,
          quiet_hours_end: p.quietHoursEnd,
          ai_provider: p.aiProvider,
          ai_model: p.aiModel,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        break;
      }

      case 'gamification': {
        const { error } = await supabase.from('gamification_state').upsert({
          user_id: userId,
          xp: p.xp,
          level: p.level,
          rank: p.rank,
          current_streak: p.currentStreak,
          longest_streak: p.longestStreak,
          last_active_date: p.lastActiveDate,
          achievements: p.achievements || [],
          daily_missions: (p.missions || []).filter((x: any) => x.type === 'daily'),
          weekly_challenges: (p.missions || []).filter((x: any) => x.type === 'weekly'),
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        break;
      }

      case 'deadline': {
        const { error } = await supabase.from('deadlines').upsert({
          id: toValidUuid(p.id),
          user_id: userId,
          title: p.title,
          description: p.description || '',
          category: p.category,
          due_date: p.dueDate,
          priority: p.priority,
          estimated_workload_hours: p.estimatedWorkloadHours,
          status: p.status,
          backward_plan: p.backwardPlan || [],
          completed_at: p.completedAt || null,
        });
        if (error) throw error;
        break;
      }

      case 'project': {
        const { error } = await supabase.from('projects').upsert({
          id: toValidUuid(p.id),
          user_id: userId,
          title: p.title,
          description: p.description || '',
          status: p.status,
          priority: p.priority,
          start_date: p.startDate,
          target_date: p.targetDate || null,
          estimated_hours: p.estimatedHours,
          actual_hours_tracked: p.actualHoursTracked || 0,
          milestones: p.milestones || [],
          tags: p.tags || [],
        });
        if (error) throw error;
        break;
      }

      case 'task': {
        const { error } = await supabase.from('tasks').upsert({
          id: toValidUuid(p.id),
          user_id: userId,
          title: p.title,
          description: p.description || '',
          status: p.status,
          priority: p.priority,
          due_date: p.dueDate || null,
          estimated_minutes: p.estimatedMinutes,
          actual_minutes: p.actualMinutes || 0,
          category: p.category,
          project_id: p.projectId ? toValidUuid(p.projectId) : null,
          dependencies: p.dependencies || [],
          subtasks: p.subtasks || [],
          completed_at: p.completedAt || null,
        });
        if (error) throw error;
        break;
      }

      case 'deck': {
        const { error } = await supabase.from('flashcard_decks').upsert({
          id: toValidUuid(p.id),
          user_id: userId,
          title: p.title,
          description: p.description || '',
          color: p.color || '#6366f1',
        });
        if (error) throw error;
        break;
      }

      case 'flashcard': {
        const { error } = await supabase.from('flashcards').upsert({
          id: toValidUuid(p.id),
          user_id: userId,
          deck_id: toValidUuid(p.deckId),
          front: p.front,
          back: p.back,
          format: p.format || 'concept',
          tags: p.tags || [],
          state: p.state || 'new',
          interval_days: p.intervalDays || 1,
          ease_factor: p.easeFactor || 2.5,
          repetitions: p.repetitions || 0,
          lapses: p.lapses || 0,
          due_date: p.dueDate || new Date().toISOString().split('T')[0],
          review_history: p.reviewHistory || [],
        });
        if (error) throw error;
        break;
      }

      case 'focusSession': {
        const { error } = await supabase.from('focus_sessions').upsert({
          id: toValidUuid(p.id),
          user_id: userId,
          type: p.preset || '50_10',
          planned_duration_minutes: Math.round((p.durationSeconds || 3000) / 60),
          actual_duration_minutes: Math.round((p.actualFocusedSeconds || 0) / 60),
          started_at: p.startedAt,
          ended_at: p.endedAt || null,
          completed: p.status === 'completed',
          interruptions: p.interruptionsCount || 0,
          distraction_notes: p.notes ? [p.notes] : [],
        });
        if (error) throw error;
        break;
      }

      case 'timeLog': {
        const { error } = await supabase.from('time_logs').upsert({
          id: toValidUuid(p.id),
          user_id: userId,
          date: p.startedAt ? p.startedAt.split('T')[0] : new Date().toISOString().split('T')[0],
          start_time: p.startedAt,
          end_time: p.endedAt,
          duration_minutes: p.durationMinutes || 0,
          category: p.category,
          activity_description: p.activity,
          is_pomodoro: !!p.linkedFocusSessionId,
          linked_focus_session_id: p.linkedFocusSessionId ? toValidUuid(p.linkedFocusSessionId) : null,
        });
        if (error) throw error;
        break;
      }

      default:
        break;
    }
  }

  public async pullLatestChanges(userId: string): Promise<PullResult> {
    const timestamp = Date.now();
    const entities: Record<string, any[]> = {};

    try {
      const [
        { data: profile },
        { data: gamification },
        { data: deadlines },
        { data: projects },
        { data: tasks },
        { data: decks },
        { data: flashcards },
        { data: focusSessions },
        { data: timeLogs },
      ] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('gamification_state').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('deadlines').select('*').eq('user_id', userId),
        supabase.from('projects').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('flashcard_decks').select('*').eq('user_id', userId),
        supabase.from('flashcards').select('*').eq('user_id', userId),
        supabase.from('focus_sessions').select('*').eq('user_id', userId),
        supabase.from('time_logs').select('*').eq('user_id', userId),
      ]);

      if (profile) entities.settings = [profile];
      if (gamification) entities.gamification = [gamification];
      if (deadlines) entities.deadlines = deadlines;
      if (projects) entities.projects = projects;
      if (tasks) entities.tasks = tasks;
      if (decks) entities.decks = decks;
      if (flashcards) entities.flashcards = flashcards;
      if (focusSessions) entities.focusSessions = focusSessions;
      if (timeLogs) entities.timeLogs = timeLogs;
    } catch (err) {
      console.error('[SupabaseSync] Failed to pull changes:', err);
    }

    return { entities, timestamp };
  }

  public subscribeToRealtime(
    userId: string,
    onRemoteChange: (change: RemoteChange) => void
  ): () => void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }

    const channel = supabase
      .channel(`study-os-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deadlines' },
        (payload) => {
          onRemoteChange({
            table: 'deadlines',
            eventType: payload.eventType as any,
            newRecord: payload.new,
            oldRecord: payload.old,
            timestamp: new Date().toISOString(),
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          onRemoteChange({
            table: 'tasks',
            eventType: payload.eventType as any,
            newRecord: payload.new,
            oldRecord: payload.old,
            timestamp: new Date().toISOString(),
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          onRemoteChange({
            table: 'projects',
            eventType: payload.eventType as any,
            newRecord: payload.new,
            oldRecord: payload.old,
            timestamp: new Date().toISOString(),
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gamification_state' },
        (payload) => {
          onRemoteChange({
            table: 'gamification_state',
            eventType: payload.eventType as any,
            newRecord: payload.new,
            oldRecord: payload.old,
            timestamp: new Date().toISOString(),
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Connected to realtime
        }
      });

    this.realtimeChannel = channel;

    return () => {
      supabase.removeChannel(channel);
      this.realtimeChannel = null;
    };
  }
}
