"use client";

import { useState, useEffect, useCallback } from "react";
import { extractPrompt, extractVariables } from "@/lib/parser";

type GenerateState = { status: "idle" } | { status: "loading" } | { status: "success"; raw: string; prompt: string; variables: Set<string> } | { status: "error"; message: string };

type TestState = { status: "idle" } | { status: "loading" } | { status: "success"; output: string } | { status: "error"; message: string };

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [task, setTask] = useState("");
  const [variablesInput, setVariablesInput] = useState("");
  const [generateState, setGenerateState] = useState<GenerateState>({ status: "idle" });
  const [testState, setTestState] = useState<TestState>({ status: "idle" });
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("fireworks-api-key");
    if (stored) setApiKey(stored);
  }, []);

  useEffect(() => {
    if (apiKey) localStorage.setItem("fireworks-api-key", apiKey);
  }, [apiKey]);

  const handleGenerate = useCallback(async () => {
    if (!apiKey || !task) return;
    setGenerateState({ status: "loading" });
    setTestState({ status: "idle" });

    const variables = variablesInput
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, task, variables }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      const prompt = extractPrompt(data.content);
      const vars = extractVariables(data.content);
      setGenerateState({ status: "success", raw: data.content, prompt, variables: vars });
      const vals: Record<string, string> = {};
      vars.forEach((v) => { vals[v] = ""; });
      setVariableValues(vals);
    } catch (err) {
      setGenerateState({ status: "error", message: err instanceof Error ? err.message : "Unknown error" });
    }
  }, [apiKey, task, variablesInput]);

  const handleTest = useCallback(async () => {
    if (!apiKey || generateState.status !== "success") return;
    setTestState({ status: "loading" });

    try {
      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          promptTemplate: generateState.prompt,
          variableValues,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test failed");
      setTestState({ status: "success", output: data.content });
    } catch (err) {
      setTestState({ status: "error", message: err instanceof Error ? err.message : "Unknown error" });
    }
  }, [apiKey, generateState, variableValues]);

  const handleCopy = useCallback(() => {
    if (generateState.status !== "success") return;
    navigator.clipboard.writeText(generateState.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generateState]);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-12">
          <h1 className="text-2xl font-bold tracking-tight">Metaprompt</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Generate optimized prompt templates from task descriptions. Powered by GLM 5.1 on Fireworks AI.
          </p>
        </header>

        <section className="mb-8">
          <label htmlFor="api-key" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
            Fireworks API Key
          </label>
          <div className="relative">
            <input
              id="api-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Fireworks API key"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:ring-offset-0"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
          {apiKey && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Key saved to localStorage</p>
          )}
        </section>

        <section className="mb-8">
          <label htmlFor="task" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
            Task Description
          </label>
          <textarea
            id="task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder='e.g. "Draft an email responding to a customer complaint"'
            rows={3}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm placeholder:text-zinc-400 resize-y focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:ring-offset-0"
          />
          <div className="mt-3">
            <label htmlFor="variables" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Variables <span className="text-zinc-400">(optional, comma-separated)</span>
            </label>
            <input
              id="variables"
              type="text"
              value={variablesInput}
              onChange={(e) => setVariablesInput(e.target.value)}
              placeholder="e.g. CUSTOMER_EMAIL, COMPANY_NAME"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:ring-offset-0"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!apiKey || !task || generateState.status === "loading"}
            className="mt-4 w-full rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generateState.status === "loading" ? "Generating..." : "Generate Prompt"}
          </button>
        </section>

        {generateState.status === "error" && (
          <div className="mb-8 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {generateState.message}
          </div>
        )}

        {generateState.status === "success" && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Generated Prompt</h2>
              <button
                onClick={handleCopy}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {generateState.variables.size > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {Array.from(generateState.variables).map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-700 dark:text-zinc-300"
                  >
                    {`{${v}}`}
                  </span>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
              {generateState.prompt}
            </div>
          </section>
        )}

        {generateState.status === "success" && generateState.variables.size > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-3">Test Prompt</h2>
            <div className="space-y-3 mb-4">
              {Array.from(generateState.variables).map((v) => (
                <div key={v}>
                  <label htmlFor={`var-${v}`} className="block text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1">
                    {`{${v}}`}
                  </label>
                  <textarea
                    id={`var-${v}`}
                    value={variableValues[v] || ""}
                    onChange={(e) =>
                      setVariableValues((prev) => ({ ...prev, [v]: e.target.value }))
                    }
                    rows={2}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm placeholder:text-zinc-400 resize-y focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:ring-offset-0"
                    placeholder={`Value for ${v}`}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleTest}
              disabled={
                testState.status === "loading" ||
                !Object.values(variableValues).every(Boolean)
              }
              className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {testState.status === "loading" ? "Testing..." : "Test Prompt"}
            </button>
          </section>
        )}

        {testState.status === "error" && (
          <div className="mb-8 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {testState.message}
          </div>
        )}

        {testState.status === "success" && (
          <section className="mb-12">
            <h2 className="text-sm font-semibold mb-3">Test Output</h2>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 text-sm whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {testState.output}
            </div>
          </section>
        )}

        <footer className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">
            Based on <a href="https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prompt-generator" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-600 dark:hover:text-zinc-300">Anthropic Metaprompt</a>. Hosted on Vercel.
          </p>
        </footer>
      </div>
    </div>
  );
}
