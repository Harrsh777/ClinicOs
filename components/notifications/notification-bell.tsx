"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getNotificationBellStateAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications";

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell({ variant = "light" }: { variant?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const { unread: nextUnread, items: nextItems } = await getNotificationBellStateAction(20);
      setUnread(nextUnread);
      setItems(nextItems as NotificationRow[]);
    });
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }, 120_000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      return () => document.removeEventListener("mousedown", onClickOutside);
    }
  }, [open]);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open) refresh();
  }

  async function handleRead(id: string) {
    await markNotificationReadAction(id);
    refresh();
  }

  async function handleReadAll() {
    await markAllNotificationsReadAction();
    refresh();
  }

  const isLight = variant === "light";

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className={cn(
          "clinic-topnav-icon-btn relative",
          !isLight && "border-0 bg-transparent text-slate-400 hover:bg-white/5 hover:text-white"
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger-500)] px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl shadow-xl",
            isLight
              ? "border border-[var(--border)] bg-white"
              : "border border-slate-700/60 bg-slate-900"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between border-b px-3 py-2",
              isLight ? "border-[var(--border)]" : "border-slate-700/60"
            )}
          >
            <p className={cn("text-sm font-medium", isLight ? "text-[var(--text-primary)]" : "text-white")}>
              Notifications
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleReadAll}
                disabled={pending}
                className={cn(
                  "flex items-center gap-1 text-xs",
                  isLight ? "text-[var(--text-muted)] hover:text-[var(--text-primary)]" : "text-slate-400 hover:text-white"
                )}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className={cn("px-3 py-6 text-center text-sm", isLight ? "text-[var(--text-muted)]" : "text-slate-500")}>
                No notifications yet
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => !n.is_read && handleRead(n.id)}
                  className={cn(
                    "w-full border-b px-3 py-2.5 text-left transition",
                    isLight
                      ? "border-[var(--border)] hover:bg-[var(--surface-1)]"
                      : "border-slate-800 hover:bg-slate-800/50",
                    !n.is_read && (isLight ? "bg-[var(--brand-50)]" : "bg-slate-800/30")
                  )}
                >
                  <p className={cn("text-sm font-medium", isLight ? "text-[var(--text-primary)]" : "text-white")}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className={cn("mt-0.5 line-clamp-2 text-xs", isLight ? "text-[var(--text-secondary)]" : "text-slate-400")}>
                      {n.body}
                    </p>
                  )}
                  <p className={cn("mt-1 text-[10px]", isLight ? "text-[var(--text-muted)]" : "text-slate-600")}>
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
