import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ckiryrgdenoycrqqatyi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNraXJ5cmdkZW5veWNycXFhdHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNjAyMzEsImV4cCI6MjEwODczNjIzMX0.NlKlsIgaDr7687_aMXDbWyYgrWXWcagrJ2EtTDGC8mE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Invoke the server-side AI proxy Edge Function.
 * Protects credentials by keeping the OpenRouter API key on the server.
 */
export async function invokeAIProxy(
  action: 'explain_stage' | 'generate_questions' | 'generate_flashcards' | 'grade_subjective',
  payload: Record<string, any>,
  modelOverride?: string
): Promise<{ data?: any; error?: string; cached?: boolean; isQuotaExhausted?: boolean; useFallback?: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        action,
        payload,
        model: modelOverride || import.meta.env.VITE_OPENROUTER_MODEL,
      },
    });

    if (error) {
      return {
        error: error.message || 'AI Edge Function failed',
        useFallback: true,
      };
    }

    if (data?.error) {
      return {
        error: data.error,
        isQuotaExhausted: !!data.isQuotaExhausted,
        useFallback: true,
      };
    }

    return { data: data?.data, cached: data?.cached };
  } catch (err: any) {
    return {
      error: err.message || 'Network error calling AI service',
      useFallback: true,
    };
  }
}

/**
 * Upload a document or note file to Supabase private Storage bucket.
 * Enforces per-user folder ownership (userId/filename) with RLS.
 */
export async function uploadResourceDocument(
  userId: string,
  file: File
): Promise<{ path?: string; url?: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('resources')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data } = supabase.storage.from('resources').getPublicUrl(filePath);
    return { path: filePath, url: data.publicUrl };
  } catch (err: any) {
    return { error: err.message };
  }
}
