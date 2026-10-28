import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_FREE_MODELS = [
  "nvidia/nemotron-3.5-lightning:free",
  "liquid/lfm-2.5-2.6b:free",
  "google/gemma-4-26b-a4b-it:free",
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, payload, model: requestedModel } = body;

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "OPENROUTER_API_KEY is not configured on the server.",
          useFallback: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Determine candidate model list (only free models!)
    const envModel = Deno.env.get("OPENROUTER_MODEL");
    const candidateModels = requestedModel
      ? [requestedModel]
      : envModel
      ? [envModel, ...DEFAULT_FREE_MODELS.filter((m) => m !== envModel)]
      : DEFAULT_FREE_MODELS;

    // Build prompt based on action
    let systemPrompt = "You are an elite tutor and exam designer in Study OS. Respond with valid JSON only.";
    let userPrompt = "";

    if (action === "explain_stage") {
      systemPrompt += " Produce a JSON object with: { stageTitle: string, explanation: string (markdown), keyFormulasOrDefinitions: string[], retrievalQuestion: { prompt: string, options: string[], correctIndex: number, explanation: string }, examTip: string }";
      userPrompt = `Teach topic "${payload.topicTitle}" from chapter "${payload.chapterTitle}". Step index: ${payload.stepIndex}. Context: ${payload.referenceContext || "Standard curriculum"}.`;
    } else if (action === "generate_questions") {
      systemPrompt += " Produce a JSON array of question objects: [{ type: 'mcq_single'|'true_false'|'numerical'|'short_answer', prompt: string, options?: [{id: string, text: string}], correctAnswer: string, explanation: string, misconceptions: string[], difficulty: number, marks: number }]";
      userPrompt = `Generate ${payload.count || 3} source-grounded exam questions for topic "${payload.topicTitle}" in subject "${payload.subjectName}". Difficulty: ${payload.difficulty || 3}.`;
    } else if (action === "generate_flashcards") {
      systemPrompt += " Produce a JSON array of flashcard objects: [{ front: string, back: string, format: 'concept'|'formula'|'basic'|'code', tags: string[] }]";
      userPrompt = `Generate ${payload.count || 3} spaced-repetition flashcards for topic "${payload.topicTitle}" in subject "${payload.subjectName}".`;
    } else if (action === "grade_subjective") {
      systemPrompt += " Produce a JSON object: { scoreAwarded: number, maxScore: number, percentage: number, criteriaBreakdown: [{ criteria: string, pointsAwarded: number, maxPoints: number, comment: string }], feedback: string, misconceptionIdentified?: string }";
      userPrompt = `Grade student answer against prompt: "${payload.prompt}". Rubric criteria: ${JSON.stringify(payload.rubricCriteria)}. Student answer: "${payload.userAnswer}".`;
    } else {
      userPrompt = payload.customPrompt || "Provide a concise summary.";
    }

    // Deduplicate / Cache check via prompt hash
    const encoder = new TextEncoder();
    const data = encoder.encode(`${userPrompt}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const promptHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Initialize Supabase admin client for caching
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const { data: cached } = await supabaseAdmin
          .from("ai_cache")
          .select("response_content, model")
          .eq("prompt_hash", promptHash)
          .maybeSingle();

        if (cached && cached.response_content) {
          const parsedCache = JSON.parse(cached.response_content);
          return new Response(
            JSON.stringify({ data: parsedCache, cached: true, model: cached.model }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        // continue to live query
      }
    }

    // Attempt candidates sequentially with timeout
    let lastError: any = null;
    let selectedModel = candidateModels[0];

    for (const modelToTry of candidateModels) {
      selectedModel = modelToTry;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://studyos.app",
            "X-Title": "Study OS",
          },
          body: JSON.stringify({
            model: modelToTry,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 1500,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          if (response.status === 429 || response.status === 402 || response.status === 404) {
            // Free quota limit on this candidate; try next candidate
            lastError = new Error(`Model ${modelToTry} rate-limited or unavailable.`);
            continue;
          }
          throw new Error(`OpenRouter (${response.status}): ${errText}`);
        }

        const completion = await response.json();
        const content = completion.choices?.[0]?.message?.content || "";

        // Parse JSON
        let parsedResult: any = null;
        try {
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          parsedResult = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : content);
        } catch {
          parsedResult = { rawText: content };
        }

        // Cache result in DB if supabase client available
        if (supabaseUrl && supabaseServiceKey && parsedResult) {
          try {
            const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
            await supabaseAdmin.from("ai_cache").upsert({
              prompt_hash: promptHash,
              model: modelToTry,
              response_content: JSON.stringify(parsedResult),
              metadata: { action, timestamp: new Date().toISOString() },
            });
          } catch {
            // ignore cache failure
          }
        }

        return new Response(
          JSON.stringify({ data: parsedResult, cached: false, model: modelToTry }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        lastError = err;
      }
    }

    return new Response(
      JSON.stringify({
        error: lastError?.message || "Free tier models are temporarily busy. Falling back to local offline mode.",
        isQuotaExhausted: true,
        useFallback: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error", useFallback: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
