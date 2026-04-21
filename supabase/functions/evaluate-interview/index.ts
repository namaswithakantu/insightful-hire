import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { role, answers } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const summary = answers
      .map((a: any, i: number) => `Q${i + 1}: ${a.question}\nA: ${a.answer}\nScores: correctness=${a.correctness}, clarity=${a.clarity}, reasoning=${a.reasoning}, depth=${a.depth}, overall=${a.score}`)
      .join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `Aggregate an interview for role ${role}. Provide explainable summary.` },
          { role: "user", content: `Interview transcript with per-question scores:\n\n${summary}\n\nReturn the aggregated evaluation.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_summary",
              parameters: {
                type: "object",
                properties: {
                  overall_score: { type: "number" },
                  strengths: { type: "array", items: { type: "string" } },
                  weaknesses: { type: "array", items: { type: "string" } },
                  skill_scores: {
                    type: "object",
                    properties: {
                      correctness: { type: "number" },
                      clarity: { type: "number" },
                      reasoning: { type: "number" },
                      depth: { type: "number" },
                      communication: { type: "number" },
                      problem_solving: { type: "number" },
                    },
                    required: ["correctness", "clarity", "reasoning", "depth", "communication", "problem_solving"],
                    additionalProperties: false,
                  },
                },
                required: ["overall_score", "strengths", "weaknesses", "skill_scores"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_summary" } },
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
    console.error("evaluate-interview error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});