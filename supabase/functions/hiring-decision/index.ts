import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { role, overall_score, skill_scores, strengths, weaknesses, missing_concepts, violations_count } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const context = `Role: ${role}
Overall score: ${overall_score}
Skill scores: ${JSON.stringify(skill_scores ?? {})}
Strengths: ${(strengths ?? []).join("; ") || "n/a"}
Weaknesses: ${(weaknesses ?? []).join("; ") || "n/a"}
Missing concepts (aggregated): ${(missing_concepts ?? []).join("; ") || "n/a"}
Integrity violations: ${violations_count ?? 0}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a fair, explainable hiring assistant. Given a candidate's interview evaluation, produce a structured hiring recommendation.

Recommendation rubric:
- "strong_hire": overall ≥ 80, no critical gaps, ≤ 1 minor violation.
- "consider": overall 60–79, mixed performance, fixable gaps.
- "reject": overall < 60 OR major integrity violations OR critical missing concepts for the role.

Be concise, specific, and unbiased. Reference actual skill scores and concepts.`,
          },
          { role: "user", content: `Evaluate this candidate and return a hiring decision:\n\n${context}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_decision",
              parameters: {
                type: "object",
                properties: {
                  recommendation: { type: "string", enum: ["strong_hire", "consider", "reject"] },
                  confidence: { type: "number", description: "0–100 confidence in the recommendation" },
                  rationale: { type: "string", description: "2–3 sentence explanation citing scores and concepts" },
                  key_strengths: { type: "array", items: { type: "string" }, description: "Top 3 differentiating strengths" },
                  key_concerns: { type: "array", items: { type: "string" }, description: "Top 3 concerns or risks" },
                  next_steps: { type: "array", items: { type: "string" }, description: "Suggested follow-up (e.g., 'second-round system design')" },
                },
                required: ["recommendation", "confidence", "rationale", "key_strengths", "key_concerns", "next_steps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_decision" } },
      }),
    });

    if (response.status === 429)
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402)
      return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) {
      console.error("AI error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("hiring-decision error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});