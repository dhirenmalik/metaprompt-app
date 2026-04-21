import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const testSchema = z.object({
  apiKey: z.string().max(128).optional(),
  promptTemplate: z.string().min(1, "Prompt template is required").max(50000),
  variableValues: z
    .record(z.string(), z.string().max(10000))
    .refine((obj) => Object.keys(obj).length <= 50, "Maximum 50 variables allowed")
    .optional()
    .default({}),
});

export async function POST(request: NextRequest) {
  // Rate limiting
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip")) ?? "unknown";
  const { success, remaining, resetAt } = rateLimit(ip, { maxRequests: 15, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(resetAt) } },
    );
  }

  try {
    const body = await request.json();
    const parsed = testSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const { apiKey, promptTemplate, variableValues } = parsed.data;

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

    let filledPrompt = promptTemplate;
    for (const [key, value] of Object.entries(variableValues)) {
      filledPrompt = filledPrompt.replaceAll(`{$${key}}`, value);
      filledPrompt = filledPrompt.replaceAll(`{${key}}`, value);
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
          messages: [{ role: "user", content: filledPrompt }],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[test] Fireworks API error:", response.status, errorText);
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
    console.error("[test] Internal error:", error);
    return NextResponse.json(
      { error: "An internal error occurred. Please try again." },
      { status: 500 },
    );
  }
}
