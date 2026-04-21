import { NextRequest, NextResponse } from "next/server";
import { METAPROMPT } from "@/lib/metaprompt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, task, variables } = body as {
      apiKey: string;
      task: string;
      variables: string[];
    };

    if (!apiKey || !task) {
      return NextResponse.json(
        { error: "apiKey and task are required" },
        { status: 400 },
      );
    }

    const prompt = METAPROMPT.replace("{{TASK}}", task);

    let assistantPartial = "<Inputs>";
    if (variables && variables.length > 0) {
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
          Authorization: `Bearer ${apiKey}`,
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
