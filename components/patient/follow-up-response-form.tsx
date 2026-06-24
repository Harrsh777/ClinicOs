"use client";

import { useState, useTransition } from "react";
import { respondToFollowUpAction } from "@/lib/actions/patient-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FollowUpResponseForm({ taskId }: { taskId: string }) {
  const [response, setResponse] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!response.trim()) return;
    startTransition(async () => {
      const result = await respondToFollowUpAction(taskId, response.trim());
      if (result.error) setMessage(result.error);
      else {
        setMessage("Response submitted. Thank you!");
        setResponse("");
      }
    });
  }

  return (
    <div className="space-y-2">
      <Input
        label="Your response"
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="How are you feeling? Any side effects?"
      />
      {message && <p className="text-sm text-[var(--success-700)]">{message}</p>}
      <Button onClick={submit} loading={pending} size="sm">
        Submit Response
      </Button>
    </div>
  );
}
