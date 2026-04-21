import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, promptTemplate, variableValues } = body as {
      apiKey: string;
      promptTemplate: string;
      variableValues: Record<string, string>;
    };

    if (!apiKey || !promptTemplate) {
      return NextResponse.json(
        { error: "apiKey and promptTemplate are required" },
        { status: 400 },
      );
    }

    let filledPrompt = promptTemplate;
    if (variableValues) {
      for (const [key, value] of Object.entries(variableValues)) {
        filledPrompt = filledPrompt.replaceAll(`{${key}}`, value);
      }
    }

    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
      return NextResponse.json(
        { error: `Fireworks API error: ${response.status}`, detail: errorText },
        { status: response.status },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
