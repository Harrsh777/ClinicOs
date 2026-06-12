"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Sparkles, Check, Loader2 } from "lucide-react";

interface ScribeDraft {
  symptoms: string;
  diagnosis: string;
  clinicalNotes: string;
  prescriptionDraft: {
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
}

interface AIScribePanelProps {
  disabled?: boolean;
  onApply: (draft: ScribeDraft) => void;
}

export function AIScribePanel({ disabled, onApply }: AIScribePanelProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [draft, setDraft] = useState<ScribeDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition ?? window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Type or paste notes below.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
    setError(null);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  async function processTranscript() {
    if (transcript.trim().length < 10) {
      setError("Please record or type at least a few sentences.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/scribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Processing failed");

      setDraft(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process transcript");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Card className="border-[var(--brand-200)] bg-gradient-to-br from-[var(--brand-50)] to-[var(--surface-0)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-500)] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">AI Medical Scribe</h3>
            <p className="text-xs text-[var(--text-muted)]">Dictate → review → apply to notes</p>
          </div>
        </div>
        <Badge variant="info">AI</Badge>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {!listening ? (
          <Button
            type="button"
            onClick={startListening}
            disabled={disabled}
            size="sm"
            className="gap-2"
          >
            <Mic className="h-4 w-4" />
            Start Scribe
          </Button>
        ) : (
          <Button type="button" onClick={stopListening} variant="danger" size="sm" className="gap-2">
            <MicOff className="h-4 w-4" />
            Stop Recording
          </Button>
        )}
        <Button
          type="button"
          onClick={() => void processTranscript()}
          disabled={disabled || processing || !transcript.trim()}
          variant="secondary"
          size="sm"
          loading={processing}
        >
          {processing ? "Processing..." : "Generate Notes"}
        </Button>
      </div>

      {listening && (
        <div className="flex items-center gap-2 mb-3 text-sm text-[var(--brand-600)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-400)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-500)]" />
          </span>
          Listening...
        </div>
      )}

      <textarea
        className="clinic-input w-full min-h-[100px] mb-3 text-sm"
        placeholder="Transcript appears here, or paste consultation notes..."
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        disabled={disabled}
      />

      {error && <p className="text-sm text-[var(--danger-500)] mb-3">{error}</p>}

      {draft && (
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-0)] p-4 space-y-3">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">AI Draft — Review before applying</p>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Symptoms:</span> {draft.symptoms}</div>
            <div><span className="font-medium">Diagnosis:</span> {draft.diagnosis}</div>
            <div><span className="font-medium">Notes:</span> {draft.clinicalNotes}</div>
            {draft.prescriptionDraft.length > 0 && (
              <div>
                <span className="font-medium">Rx Draft:</span>
                <ul className="mt-1 list-disc pl-4">
                  {draft.prescriptionDraft.map((rx, i) => (
                    <li key={i}>{rx.medicineName} — {rx.dosage}, {rx.frequency}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => onApply(draft)}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Apply to Consultation
          </Button>
        </div>
      )}

      {processing && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          AI is structuring your notes...
        </div>
      )}
    </Card>
  );
}
