import { supabase } from './supabaseClient';
import { storage } from './storage';
import { Deadline } from '../types';

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncedAt: string | null;
  message?: string;
}

/**
 * Deterministically formats any arbitrary string ID into a valid RFC4122 v4 UUID string
 * so PostgreSQL uuid primary keys never throw syntax errors.
 */
export function toValidUuid(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  // Form a valid v4 UUID: 8-4-4-4-12
  return `${hex}-0000-4000-8000-${hex.padStart(12, '0')}`;
}

export class CloudSyncService {
  private status: SyncStatus = {
    state: 'idle',
    lastSyncedAt: null,
  };

  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Push local offline data to Supabase PostgreSQL database
   */
  public async syncToCloud(userId: string): Promise<{ success: boolean; message: string }> {
    if (!userId) {
      return { success: false, message: 'User must be authenticated to sync with cloud.' };
    }

    this.status = { state: 'syncing', lastSyncedAt: this.status.lastSyncedAt };

    try {
      const settings = storage.getSettings();
      const gamification = storage.getGamification();
      const deadlines = storage.getDeadlines();
      const projects = storage.getProjects();
      const tasks = storage.getTasks();
      const decks = storage.getDecks();
      const timeLogs = storage.getTimeLogs();
      const focusSessions = storage.getFocusSessions();

      // 1. Sync User Profile Settings
      await supabase.from('user_profiles').upsert({
        id: userId,
        user_name: settings.userName,
        theme: settings.theme,
        daily_focus_target_minutes: settings.dailyFocusTargetMinutes,
        pomodoro_work_minutes: settings.pomodoroWorkMinutes,
        pomodoro_break_minutes: settings.pomodoroBreakMinutes,
        hourly_checkin_enabled: settings.hourlyCheckinEnabled,
        quiet_hours_start: settings.quietHoursStart,
        quiet_hours_end: settings.quietHoursEnd,
        ai_provider: settings.aiProvider,
        ai_model: settings.aiModel,
        updated_at: new Date().toISOString(),
      });

      // 2. Sync Gamification Profile
      await supabase.from('gamification_profiles').upsert({
        user_id: userId,
        xp: gamification.xp,
        level: gamification.level,
        rank: gamification.rank,
        current_streak: gamification.currentStreak,
        longest_streak: gamification.longestStreak,
        last_active_date: gamification.lastActiveDate,
        achievements: gamification.achievements,
        daily_missions: gamification.missions.filter((m) => m.type === 'daily'),
        weekly_challenges: gamification.missions.filter((m) => m.type === 'weekly'),
        updated_at: new Date().toISOString(),
      });

      // 3. Sync Deadlines
      if (deadlines.length > 0) {
        const deadlineRows = deadlines.map((d) => ({
          id: toValidUuid(d.id),
          user_id: userId,
          title: d.title,
          description: d.description || '',
          category: d.category,
          due_date: d.dueDate,
          priority: d.priority,
          estimated_workload_hours: d.estimatedWorkloadHours,
          status: d.status,
          backward_plan: d.backwardPlan || [],
          completed_at: d.completedAt || null,
        }));
        await supabase.from('deadlines').upsert(deadlineRows, { onConflict: 'id' });
      }

      // 4. Sync Projects
      if (projects.length > 0) {
        const projectRows = projects.map((p) => ({
          id: toValidUuid(p.id),
          user_id: userId,
          title: p.title,
          description: p.description || '',
          status: p.status,
          priority: p.priority,
          start_date: p.startDate,
          target_date: p.targetDate || null,
          estimated_hours: p.estimatedHours,
          actual_hours_tracked: p.actualHoursTracked,
          milestones: p.milestones || [],
          tags: p.tags || [],
        }));
        await supabase.from('projects').upsert(projectRows, { onConflict: 'id' });
      }

      // 5. Sync Tasks
      if (tasks.length > 0) {
        const taskRows = tasks.map((t) => ({
          id: toValidUuid(t.id),
          user_id: userId,
          title: t.title,
          description: t.description || '',
          status: t.status,
          priority: t.priority,
          due_date: t.dueDate || null,
          estimated_minutes: t.estimatedMinutes,
          actual_minutes: t.actualMinutes,
          category: t.category,
          project_id: t.projectId ? toValidUuid(t.projectId) : null,
          dependencies: t.dependencies || [],
          subtasks: t.subtasks || [],
          completed_at: t.completedAt || null,
        }));
        await supabase.from('tasks').upsert(taskRows, { onConflict: 'id' });
      }

      // 6. Sync Flashcard Decks
      if (decks.length > 0) {
        const deckRows = decks.map((dk) => ({
          id: toValidUuid(dk.id),
          user_id: userId,
          title: dk.title,
          description: dk.description || '',
          color: dk.color,
        }));
        await supabase.from('flashcard_decks').upsert(deckRows, { onConflict: 'id' });
      }

      // 7. Sync Time Logs
      if (timeLogs.length > 0) {
        const timeLogRows = timeLogs.map((tl) => ({
          id: toValidUuid(tl.id),
          user_id: userId,
          date: tl.startedAt.split('T')[0],
          start_time: tl.startedAt,
          end_time: tl.endedAt,
          duration_minutes: tl.durationMinutes,
          category: tl.category,
          activity_description: tl.activity,
          energy_rating: 4,
          focus_quality_score: 85,
          is_pomodoro: !!tl.linkedFocusSessionId,
          linked_focus_session_id: tl.linkedFocusSessionId ? toValidUuid(tl.linkedFocusSessionId) : null,
        }));
        await supabase.from('time_logs').upsert(timeLogRows, { onConflict: 'id' });
      }

      // 8. Sync Focus Sessions
      if (focusSessions.length > 0) {
        const sessionRows = focusSessions.map((fs) => ({
          id: toValidUuid(fs.id),
          user_id: userId,
          type: fs.preset,
          planned_duration_minutes: Math.round(fs.durationSeconds / 60),
          actual_duration_minutes: Math.round(fs.actualFocusedSeconds / 60),
          started_at: fs.startedAt,
          ended_at: fs.endedAt || null,
          completed: fs.status === 'completed',
          interruptions: fs.interruptionsCount,
          distraction_notes: fs.notes ? [fs.notes] : [],
        }));
        await supabase.from('focus_sessions').upsert(sessionRows, { onConflict: 'id' });
      }

      const now = new Date().toLocaleTimeString();
      this.status = {
        state: 'success',
        lastSyncedAt: now,
        message: `Synced successfully at ${now}`,
      };
      return { success: true, message: `Cloud sync completed at ${now}` };
    } catch (err: any) {
      console.error('Cloud sync failed:', err);
      this.status = {
        state: 'error',
        lastSyncedAt: this.status.lastSyncedAt,
        message: err.message || 'Sync failed',
      };
      return { success: false, message: err.message || 'Cloud sync failed' };
    }
  }

  /**
   * Pull records from Supabase cloud database down into local storage
   */
  public async restoreFromCloud(userId: string): Promise<{ success: boolean; message: string }> {
    if (!userId) {
      return { success: false, message: 'User must be authenticated to pull from cloud.' };
    }

    this.status = { state: 'syncing', lastSyncedAt: this.status.lastSyncedAt };

    try {
      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        storage.updateSettings({
          userName: profile.user_name || 'Scholar',
          theme: profile.theme || 'dark',
          dailyFocusTargetMinutes: profile.daily_focus_target_minutes || 240,
          pomodoroWorkMinutes: profile.pomodoro_work_minutes || 50,
          pomodoroBreakMinutes: profile.pomodoro_break_minutes || 10,
          hourlyCheckinEnabled: profile.hourly_checkin_enabled ?? true,
          quietHoursStart: profile.quiet_hours_start || '22:00',
          quietHoursEnd: profile.quiet_hours_end || '07:30',
          aiProvider: profile.ai_provider || 'openrouter',
          aiModel: profile.ai_model || 'nvidia/nemotron-3.5-lightning:free',
        });
      }

      // 2. Fetch Gamification
      const { data: gamification } = await supabase
        .from('gamification_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (gamification) {
        const currentGamification = storage.getGamification();
        const merged = {
          ...currentGamification,
          xp: Math.max(currentGamification.xp, gamification.xp || 0),
          level: Math.max(currentGamification.level, gamification.level || 1),
          rank: gamification.rank || currentGamification.rank,
          currentStreak: Math.max(currentGamification.currentStreak, gamification.current_streak || 0),
          longestStreak: Math.max(currentGamification.longestStreak, gamification.longest_streak || 0),
        };
        // Save to storage
        storage.importDataJSON(JSON.stringify({ gamification: merged }));
      }

      // 3. Fetch Deadlines
      const { data: cloudDeadlines } = await supabase
        .from('deadlines')
        .select('*')
        .eq('user_id', userId);

      if (cloudDeadlines && cloudDeadlines.length > 0) {
        cloudDeadlines.forEach((cd) => {
          const dl: Deadline = {
            id: cd.id,
            title: cd.title,
            description: cd.description || '',
            category: cd.category,
            dueDate: cd.due_date,
            priority: cd.priority,
            estimatedWorkloadHours: cd.estimated_workload_hours,
            status: cd.status,
            backwardPlan: cd.backward_plan || [],
            createdAt: cd.created_at || new Date().toISOString(),
          };
          storage.saveDeadline(dl);
        });
      }

      const now = new Date().toLocaleTimeString();
      this.status = {
        state: 'success',
        lastSyncedAt: now,
        message: `Restored from cloud at ${now}`,
      };
      return { success: true, message: `Restored data from cloud at ${now}` };
    } catch (err: any) {
      console.error('Cloud restore error:', err);
      this.status = {
        state: 'error',
        lastSyncedAt: this.status.lastSyncedAt,
        message: err.message || 'Cloud restore failed',
      };
      return { success: false, message: err.message || 'Failed to restore data from cloud' };
    }
  }
}

export const cloudSync = new CloudSyncService();
