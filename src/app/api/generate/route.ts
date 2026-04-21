import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { METAPROMPT } from "@/lib/metaprompt";
import { rateLimit } from "@/lib/rate-limit";

const VARIABLE_NAME_REGEX = /^[A-Za-z0-9_]{1,64}$/;

const generateSchema = z.object({
  apiKey: z.string().max(128).optional(),
  task: z.string().min(1, "Task description is required").max(10000),
  variables: z
    .array(z.string().max(64).regex(VARIABLE_NAME_REGEX, "Invalid variable name"))
    .max(20, "Maximum 20 variables allowed")
    .optional()
    .default([]),
});

export async function POST(request: NextRequest) {
  // Rate limiting
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip")) ?? "unknown";
  const { success, remaining, resetAt } = rateLimit(ip, { maxRequests: 10, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(resetAt) } },
    );
  }

  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const { apiKey, task, variables } = parsed.data;

    const resolvedApiKey = apiKey || process.env.FIREWORKS_API_KEY;

    if (!resolvedApiKey) {
      return NextResponse.json(
        {
          error:
            "API key is required. Provide it in the UI or set FIREWORKS_API_KEY in .env.local",
        },
        { status: 400 },
      );
    }

    const prompt = METAPROMPT.replace("{{TASK}}", task);

    // Build assistant partial to seed the model's output format
    // Uses {VARIABLE} without $ — the model follows the examples which use {$VARIABLE}
    let assistantPartial = "<Inputs>";
    if (variables.length > 0) {
      const variableString = variables
        .map((v) => `\n{${v.toUpperCase()}}`)
        .join("");
      assistantPartial += `${variableString}\n</Inputs><Instructions Structure>`;
    }

    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resolvedApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "accounts/fireworks/models/glm-5p1",
          max_tokens: 4096,
          temperature: 0,
          messages: [
            { role: "user", content: prompt },
            { role: "assistant", content: assistantPartial },
          ],
        }),
      },
    );

    if (!response.ok) {
      // SECURITY: Log upstream error server-side only, return generic message to client
      const errorText = await response.text();
      console.error("[generate] Fireworks API error:", response.status, errorText);
      return NextResponse.json(
        { error: `Upstream API error (${response.status}). Please try again.` },
        { status: 502 },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json(
      { content },
      { headers: { "X-RateLimit-Remaining": String(remaining) } },
    );
  } catch (error) {
    // SECURITY: Don't leak internal error details
    console.error("[generate] Internal error:", error);
    return NextResponse.json(
      { error: "An internal error occurred. Please try again." },
      { status: 500 },
    );
  }
}
