"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Phone, Send, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  getConversationThreadAction,
  sendConversationMessageAction,
  startConversationAction,
} from "@/lib/actions/conversations";
import type { ConversationListItem } from "@/lib/conversations/service";

interface ConversationsInboxProps {
  initialConversations: ConversationListItem[];
  connected: boolean;
  basePath: string;
}

interface ThreadMessage {
  id: string;
  direction: string;
  sender_type: string;
  content: string;
  status: string;
  created_at: string;
}

export function ConversationsInbox({
  initialConversations,
  connected,
  basePath,
}: ConversationsInboxProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [patientName, setPatientName] = useState("");
  const [draft, setDraft] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadThread = useCallback(async (conversationId: string) => {
    const result = await getConversationThreadAction(conversationId);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessages(result.messages as ThreadMessage[]);
    setPatientName(result.conversation?.patient_name ?? "");
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (selectedId) {
      void Promise.resolve().then(() => {
        if (!cancelled) void loadThread(selectedId);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [selectedId, loadThread]);

  function handleSend() {
    if (!selectedId || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");

    startTransition(async () => {
      const result = await sendConversationMessageAction(selectedId, content);
      if (result.error) {
        setError(result.error);
        setDraft(content);
        return;
      }
      await loadThread(selectedId);
    });
  }

  function handleStartChat() {
    startTransition(async () => {
      const result = await startConversationAction(newPhone);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.conversationId) {
        setShowNewChat(false);
        setNewPhone("");
        setSelectedId(result.conversationId);
        window.location.reload();
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:gap-0 lg:overflow-hidden lg:rounded-3xl lg:border lg:border-[var(--border)]">
      <div className="flex flex-col border-[var(--border)] lg:border-r lg:bg-[var(--surface-1)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <div>
            <h2 className="font-semibold">Inbox</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {connected ? "WhatsApp connected" : "Connect WhatsApp to send live messages"}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setShowNewChat((v) => !v)}>
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        {showNewChat && (
          <div className="border-b border-[var(--border)] p-4">
            <Input
              label="Patient phone"
              placeholder="9876543210"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <Button className="mt-3 w-full" size="sm" onClick={handleStartChat} disabled={isPending}>
              Start conversation
            </Button>
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto lg:max-h-[calc(100vh-280px)]">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--text-secondary)]">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 opacity-40" />
              No conversations yet. Patient WhatsApp messages will appear here.
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setSelectedId(conv.id)}
                className={`flex w-full items-start gap-3 border-b border-[var(--border)] p-4 text-left transition hover:bg-white/70 ${
                  selectedId === conv.id ? "bg-white" : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{conv.patient_name}</p>
                    {conv.unread_count > 0 && (
                      <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-semibold text-white">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-[var(--text-secondary)]">
                    {conv.last_message_preview ?? "No messages yet"}
                  </p>
                  {conv.last_message_at && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-h-[420px] flex-col bg-white lg:min-h-[calc(100vh-280px)]">
        {selectedId ? (
          <>
            <div className="border-b border-[var(--border)] px-5 py-4">
              <p className="font-semibold">{patientName}</p>
              <p className="text-xs text-[var(--text-secondary)]">WhatsApp conversation</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.direction === "outbound"
                        ? "rounded-br-md bg-[var(--primary)] text-white"
                        : "rounded-bl-md bg-[var(--surface-1)] text-[var(--text-primary)]"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        msg.direction === "outbound" ? "text-white/70" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {msg.direction === "outbound" && ` · ${msg.status}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--border)] p-4">
              {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={connected ? "Type a message…" : "Connect WhatsApp to send…"}
                  disabled={!connected || isPending}
                  className="flex-1 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"
                />
                <Button onClick={handleSend} disabled={!connected || isPending || !draft.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="mb-4 h-12 w-12 text-[var(--text-muted)] opacity-40" />
            <p className="font-medium">Select a conversation</p>
            <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">
              Patient WhatsApp messages, appointment bookings, and staff replies all sync here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
