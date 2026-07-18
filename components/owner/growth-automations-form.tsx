"use client";

import { useState } from "react";
import { updateGrowthAutomationsAction } from "@/lib/actions/owner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  parseGrowthSettings,
  type GrowthSettings,
} from "@/lib/engagement/growth-settings";

export function GrowthAutomationsForm({
  settings,
}: {
  settings: Record<string, unknown> | null | undefined;
}) {
  const initial = parseGrowthSettings(settings);
  const [growth, setGrowth] = useState<GrowthSettings>(initial);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await updateGrowthAutomationsAction(new FormData(e.currentTarget));
    setMessage(
      result?.error
        ? { type: "error", text: result.error }
        : { type: "success", text: "Growth automations saved" }
    );
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {message && (
        <Alert variant={message.type === "success" ? "success" : "error"}>{message.text}</Alert>
      )}

      <p className="text-sm text-[var(--text-muted)]">
        WhatsApp messages send automatically when enabled. Requires WhatsApp connected for your clinic.
        All automations are off by default.
      </p>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="googleReviewEnabled"
          checked={growth.googleReviewEnabled}
          onChange={(e) => setGrowth((g) => ({ ...g, googleReviewEnabled: e.target.checked }))}
          className="mt-1 h-4 w-4 rounded border-[var(--border)]"
        />
        <div className="flex-1 space-y-2">
          <div>
            <span className="text-sm font-medium">Google Review after consultation</span>
            <p className="text-xs text-[var(--text-muted)]">
              After each visit, thank the patient and open your Google Reviews link in one tap.
            </p>
          </div>
          <Input
            name="googleReviewUrl"
            label="Google Review URL"
            type="url"
            placeholder="https://g.page/r/…/review"
            value={growth.googleReviewUrl}
            onChange={(e) => setGrowth((g) => ({ ...g, googleReviewUrl: e.target.value }))}
          />
        </div>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="reactivateEnabled"
          checked={growth.reactivateEnabled}
          onChange={(e) => setGrowth((g) => ({ ...g, reactivateEnabled: e.target.checked }))}
          className="mt-1 h-4 w-4 rounded border-[var(--border)]"
        />
        <div>
          <span className="text-sm font-medium">Reactivate old patients</span>
          <p className="text-xs text-[var(--text-muted)]">
            Automatically nudge patients who haven&apos;t visited in 6, 12, or 18 months to book a checkup.
          </p>
        </div>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="noShowRemindersEnabled"
          checked={growth.noShowRemindersEnabled}
          onChange={(e) => setGrowth((g) => ({ ...g, noShowRemindersEnabled: e.target.checked }))}
          className="mt-1 h-4 w-4 rounded border-[var(--border)]"
        />
        <div>
          <span className="text-sm font-medium">Prevent no-shows</span>
          <p className="text-xs text-[var(--text-muted)]">
            Send a reminder one day before, and again about 2 hours before the appointment.
          </p>
        </div>
      </label>

      <Button type="submit" loading={loading}>
        Save growth automations
      </Button>
    </form>
  );
}
