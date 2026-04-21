import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, answer, role } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert technical interviewer for the role: ${role}. Evaluate the candidate's answer fairly and explainably. Score each dimension 0-100. Be critical but constructive.`,
          },
          {
            role: "user",
            content: `Question: ${question}\n\nCandidate's answer: ${answer}\n\nEvaluate the answer using the provided tool.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_evaluation",
              description: "Return structured evaluation",
              parameters: {
                type: "object",
                properties: {
                  correctness: { type: "number", description: "0-100" },
                  clarity: { type: "number", description: "0-100" },
                  reasoning: { type: "number", description: "0-100" },
                  depth: { type: "number", description: "0-100" },
                  score: { type: "number", description: "Overall 0-100" },
                  feedback: { type: "string", description: "1-2 sentence summary" },
                  missing_concepts: { type: "array", items: { type: "string" } },
                  improvements: { type: "array", items: { type: "string" } },
                },
                required: ["correctness", "clarity", "reasoning", "depth", "score", "feedback", "missing_concepts", "improvements"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_evaluation" } },
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
    console.error("evaluate-answer error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});