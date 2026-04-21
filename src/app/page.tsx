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
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Metaprompt
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Powered by GLM 5.1 on Fireworks AI
            </p>
          </div>
          <a
            href="https://fireworks.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
          >
            fireworks.ai
          </a>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Error banner */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Step 1: Input */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
                1
              </span>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Describe your task
              </h2>
            </div>

            <div className="space-y-3 pl-9">
              {/* API Key */}
              <div>
                <label
                  htmlFor="apiKey"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Fireworks AI API Key{" "}
                  <span className="text-zinc-400 font-normal">
                    (optional if set in .env.local)
                  </span>
                </label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="fw-..."
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
                />
              </div>

              {/* Task */}
              <div>
                <label
                  htmlFor="task"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Task Description
                </label>
                <textarea
                  id="task"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="e.g. Draft an email responding to a customer complaint"
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 resize-y"
                />
              </div>

              {/* Variables */}
              <div>
                <label
                  htmlFor="variables"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Input Variables{" "}
                  <span className="text-zinc-400 font-normal">
                    (optional, comma-separated — leave empty to let the model choose)
                  </span>
                </label>
                <input
                  id="variables"
                  value={variables}
                  onChange={(e) => setVariables(e.target.value)}
                  placeholder="e.g. CUSTOMER_EMAIL, COMPANY_NAME"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !task.trim()}
                className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? "Generating..." : "Generate Prompt Template"}
              </button>
            </div>
          </section>

          {/* Step 2: Generated Prompt */}
          {(step === "generated" || step === "testing") && promptTemplate && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
                  2
                </span>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Generated Prompt Template
                </h2>
              </div>

              <div className="pl-9 space-y-3">
                {/* Variables found */}
                {extractedVars.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      Variables:
                    </span>
                    {extractedVars.map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300"
                      >
                        {`{${displayVar(v)}}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Prompt template display */}
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4">
                  <pre className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200 font-mono leading-relaxed overflow-x-auto">
                    {promptTemplate}
                  </pre>
                </div>

                {/* Toggle raw response */}
                <details className="group">
                  <summary className="text-sm text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300">
                    Show raw model response
                  </summary>
                  <div className="mt-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4">
                    <pre className="whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400 font-mono leading-relaxed overflow-x-auto">
                      {rawResponse}
                    </pre>
                  </div>
                </details>
              </div>
            </section>
          )}

          {/* Step 3: Test */}
          {(step === "generated" || step === "testing") && promptTemplate && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
                  3
                </span>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Test your prompt
                </h2>
              </div>

              <div className="pl-9 space-y-3">
                {extractedVars.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Fill in values for each variable to test the prompt:
                    </p>
                    {extractedVars.map((v) => (
                      <div key={v}>
                        <label
                          htmlFor={`var-${v}`}
                          className="block text-sm font-medium font-mono text-zinc-700 dark:text-zinc-300 mb-1"
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
                          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 resize-y"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No variables detected. The prompt will be sent as-is.
                  </p>
                )}

                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {testing ? "Running..." : "Test Prompt"}
                </button>

                {/* Test result */}
                {testResult && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Model Output
                    </h3>
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4">
                      <pre className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200 font-mono leading-relaxed overflow-x-auto">
                        {testResult}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Info section */}
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-6 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              How it works
            </h3>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
              <li>
                Enter a task description and optionally specify input variable
                names
              </li>
              <li>
                The metaprompt uses few-shot examples to guide the model into
                generating a structured prompt template
              </li>
              <li>
                Variables like <code className="font-mono text-xs bg-zinc-200 dark:bg-zinc-700 px-1 rounded">{`{DOCUMENT}`}</code> become
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
      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto text-center text-xs text-zinc-400 dark:text-zinc-600">
          Based on the Anthropic Metaprompt notebook. Adapted for Fireworks AI.
        </div>
      </footer>
    </div>
  );
}
