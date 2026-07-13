"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Brain, Loader2, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const STARTER_PROMPTS = [
  "Differential diagnosis for fever + rash in a 5-year-old",
  "When to refer acute chest pain in primary care?",
  "Common drug interactions with metformin",
  "Management approach for newly diagnosed Type 2 diabetes",
];

export function AIDoctorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setError(null);
    setLoading(true);
    setInput("");

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("/api/ai/doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          history: messages,
        }),
      });

      const data = (await res.json()) as { answer?: string; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to get a response");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.answer ?? "" }]);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    } catch {
      setError("Network error — please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <Card className="!p-0 flex flex-col min-h-[520px] overflow-hidden">
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[min(60vh,560px)]"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="rounded-2xl bg-[var(--brand-500)]/10 p-4 mb-4">
                <Brain className="h-8 w-8 text-[var(--brand-500)]" />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">Ask AI Doctor</h3>
              <p className="text-sm text-[var(--text-muted)] mt-2 max-w-md">
                Clinical decision support for differential diagnosis, guidelines, drug questions,
                and treatment approaches. Not a substitute for your judgment.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="shrink-0 h-8 w-8 rounded-full bg-[var(--brand-500)]/10 flex items-center justify-center">
                    <Brain className="h-4 w-4 text-[var(--brand-500)]" />
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm max-w-[85%] whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-[var(--brand-500)] text-white"
                      : "bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)]"
                  )}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="shrink-0 h-8 w-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
                    <User className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI Doctor is thinking…
            </div>
          )}
        </div>

        {error && (
          <p className="px-5 pb-2 text-sm text-red-600">{error}</p>
        )}

        <form
          className="border-t border-[var(--border)] p-4 flex gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void sendQuestion(input);
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a clinical question…"
            className="min-h-[44px] max-h-32 resize-none"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendQuestion(input);
              }
            }}
          />
          <Button type="submit" disabled={loading || !input.trim()} className="shrink-0 gap-1.5">
            <Send className="h-4 w-4" />
            Ask
          </Button>
        </form>
      </Card>

      <aside className="space-y-4">
        <Card className="!p-4">
          <h3 className="text-sm font-semibold mb-3">Quick prompts</h3>
          <div className="space-y-2">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="w-full text-left text-xs rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface-2)] transition-colors"
                onClick={() => void sendQuestion(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>
        </Card>
        <Card className="!p-4 bg-amber-50/80 border-amber-200/60">
          <p className="text-xs text-amber-900/90 leading-relaxed">
            <strong>Disclaimer:</strong> AI Doctor provides educational decision support only.
            Always apply your clinical judgment and local protocols. Do not enter identifiable
            patient data.
          </p>
        </Card>
      </aside>
    </div>
  );
}
