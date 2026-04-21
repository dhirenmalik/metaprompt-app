"use client";

import { useState, useCallback } from "react";
import { extractPrompt, extractVariables } from "@/lib/parser";

type Step = "input" | "generated" | "testing";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [task, setTask] = useState("");
  const [variables, setVariables] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [generating, setGenerating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [rawResponse, setRawResponse] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [extractedVars, setExtractedVars] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {},
  );
  const [testResult, setTestResult] = useState("");
  const [error, setError] = useState("");

  const handleGenerate = useCallback(async () => {
    if (!task.trim()) {
      setError("Task description is required.");
      return;
    }
    setError("");
    setGenerating(true);
    setRawResponse("");
    setPromptTemplate("");
    setExtractedVars([]);
    setTestResult("");

    try {
      const varsArray = variables
        .split(",")
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean);

      const body: Record<string, unknown> = { task: task.trim(), variables: varsArray };
      if (apiKey.trim()) body.apiKey = apiKey.trim();

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed.");
        return;
      }

      const content = data.content as string;
      setRawResponse(content);

      try {
        const template = extractPrompt(content);
        const vars = extractVariables(content);
        const varArray = Array.from(vars);
        setPromptTemplate(template);
        setExtractedVars(varArray);
        setStep("generated");
      } catch {
        setPromptTemplate(content);
        setExtractedVars([]);
        setStep("generated");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }, [apiKey, task, variables]);

  const handleTest = useCallback(async () => {
    if (!promptTemplate) return;
    setError("");
    setTesting(true);
    setTestResult("");

    try {
      const body: Record<string, unknown> = { promptTemplate, variableValues };
      if (apiKey.trim()) body.apiKey = apiKey.trim();

      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Test failed.");
        return;
      }
      setTestResult(data.content as string);
      setStep("testing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setTesting(false);
    }
  }, [apiKey, promptTemplate, variableValues]);

  // Strip $ prefix for cleaner display
  const displayVar = (v: string) => (v.startsWith("$") ? v.slice(1) : v);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Fixed gradient background */}
      <div className="fixed inset-0 bg-black -z-10" />

      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950/80 via-black to-zinc-900/60 -z-10" />

      {/* Header */}
      <header className="border-b border-white/[0.08] px-6 py-4 backdrop-blur-md bg-white/[0.03]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-50">
              Metaprompt
            </h1>
            <p className="text-sm text-zinc-400">
              Powered by GLM 5.1 on Fireworks AI
            </p>
          </div>
          <a
            href="https://fireworks.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            fireworks.ai
          </a>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 relative">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Error banner */}
          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-950/40 backdrop-blur-xl px-4 py-3 text-sm text-red-300 font-medium">
              {error}
            </div>
          )}

          {/* Step 1: Input */}
          <section className="rounded-2xl border border-white/[0.12] bg-white/[0.07] backdrop-blur-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/30 text-xs font-bold text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                1
              </span>
              <h2 className="text-lg font-semibold text-zinc-100">
                Describe your task
              </h2>
            </div>

            <div className="space-y-3 pl-11">
              {/* API Key */}
              <div>
                <label
                  htmlFor="apiKey"
                  className="block text-sm font-medium text-zinc-300 mb-1.5"
                >
                  Fireworks AI API Key{" "}
                  <span className="text-zinc-500 font-normal">
                    (optional if set in .env.local)
                  </span>
                </label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="fw-..."
                  className="w-full rounded-xl border border-white/[0.12] bg-white/[0.05] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/30 transition-colors"
                />
              </div>

              {/* Task */}
              <div>
                <label
                  htmlFor="task"
                  className="block text-sm font-medium text-zinc-300 mb-1.5"
                >
                  Task Description
                </label>
                <textarea
                  id="task"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="e.g. Draft an email responding to a customer complaint"
                  rows={3}
                  className="w-full rounded-xl border border-white/[0.12] bg-white/[0.05] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/30 resize-y transition-colors"
                />
              </div>

              {/* Variables */}
              <div>
                <label
                  htmlFor="variables"
                  className="block text-sm font-medium text-zinc-300 mb-1.5"
                >
                  Input Variables{" "}
                  <span className="text-zinc-500 font-normal">
                    (optional, comma-separated — leave empty to let the model choose)
                  </span>
                </label>
                <input
                  id="variables"
                  value={variables}
                  onChange={(e) => setVariables(e.target.value)}
                  placeholder="e.g. CUSTOMER_EMAIL, COMPANY_NAME"
                  className="w-full rounded-xl border border-white/[0.12] bg-white/[0.05] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/30 transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || !task.trim()}
                className="rounded-xl bg-cyan-500/20 border border-cyan-400/30 px-5 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400/50 hover:text-cyan-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_16px_rgba(6,182,212,0.15)]"
              >
                {generating ? "Generating..." : "Generate Prompt Template"}
              </button>
            </div>
          </section>

          {/* Step 2: Generated Prompt */}
          {(step === "generated" || step === "testing") && promptTemplate && (
            <section className="rounded-2xl border border-white/[0.12] bg-white/[0.07] backdrop-blur-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/30 text-xs font-bold text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                  2
                </span>
                <h2 className="text-lg font-semibold text-zinc-100">
                  Generated Prompt Template
                </h2>
              </div>

              <div className="pl-11 space-y-3">
                {/* Variables found */}
                {extractedVars.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-zinc-400">
                      Variables:
                    </span>
                    {extractedVars.map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center rounded-full bg-white/[0.08] border border-white/[0.15] px-2.5 py-0.5 text-xs font-mono font-medium text-cyan-300"
                      >
                        {`{${displayVar(v)}}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Prompt template display */}
                <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4">
                  <pre className="whitespace-pre-wrap text-sm text-zinc-200 font-mono leading-relaxed overflow-x-auto">
                    {promptTemplate}
                  </pre>
                </div>

                {/* Toggle raw response */}
                <details className="group">
                  <summary className="text-sm text-zinc-400 cursor-pointer hover:text-cyan-400 transition-colors">
                    Show raw model response
                  </summary>
                  <div className="mt-2 rounded-xl border border-white/[0.08] bg-black/30 p-4">
                    <pre className="whitespace-pre-wrap text-xs text-zinc-400 font-mono leading-relaxed overflow-x-auto">
                      {rawResponse}
                    </pre>
                  </div>
                </details>
              </div>
            </section>
          )}

          {/* Step 3: Test */}
          {(step === "generated" || step === "testing") && promptTemplate && (
            <section className="rounded-2xl border border-white/[0.12] bg-white/[0.07] backdrop-blur-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/30 text-xs font-bold text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                  3
                </span>
                <h2 className="text-lg font-semibold text-zinc-100">
                  Test your prompt
                </h2>
              </div>

              <div className="pl-11 space-y-3">
                {extractedVars.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-400">
                      Fill in values for each variable to test the prompt:
                    </p>
                    {extractedVars.map((v) => (
                      <div key={v}>
                        <label
                          htmlFor={`var-${v}`}
                          className="block text-sm font-medium font-mono text-cyan-300 mb-1.5"
                        >
                          {`{${displayVar(v)}}`}
                        </label>
                        <textarea
                          id={`var-${v}`}
                          value={variableValues[v] || ""}
                          onChange={(e) =>
                            setVariableValues((prev) => ({
                              ...prev,
                              [v]: e.target.value,
                            }))
                          }
                          placeholder={`Enter value for ${displayVar(v)}`}
                          rows={2}
                          className="w-full rounded-xl border border-white/[0.12] bg-white/[0.05] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/30 resize-y transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">
                    No variables detected. The prompt will be sent as-is.
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="rounded-xl bg-cyan-500/20 border border-cyan-400/30 px-5 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400/50 hover:text-cyan-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_16px_rgba(6,182,212,0.15)]"
                >
                  {testing ? "Running..." : "Test Prompt"}
                </button>

                {/* Test result */}
                {testResult && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-zinc-300">
                      Model Output
                    </h3>
                    <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4">
                      <pre className="whitespace-pre-wrap text-sm text-zinc-200 font-mono leading-relaxed overflow-x-auto">
                        {testResult}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Info section */}
          <section className="rounded-2xl border border-white/[0.10] bg-white/[0.05] backdrop-blur-xl p-6 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-100">
              How it works
            </h3>
            <ul className="text-sm text-zinc-400 space-y-1.5 list-disc list-inside">
              <li>
                Enter a task description and optionally specify input variable
                names
              </li>
              <li>
                The metaprompt uses few-shot examples to guide the model into
                generating a structured prompt template
              </li>
              <li>
                Variables like <code className="font-mono text-xs bg-white/[0.08] border border-white/[0.12] text-cyan-300 px-1.5 py-0.5 rounded-md">{`{DOCUMENT}`}</code> become
                placeholders you can fill in when testing
              </li>
              <li>
                The generated prompt is a starting point — iterate and improve
                it for your use case
              </li>
            </ul>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-4">
        <div className="max-w-4xl mx-auto text-center text-xs text-zinc-500">
          Based on the Anthropic Metaprompt notebook. Adapted for Fireworks AI.
        </div>
      </footer>
    </div>
  );
}
