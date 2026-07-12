"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getNotificationsAction,
  getUnreadNotificationCountAction,
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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const [count, list] = await Promise.all([
        getUnreadNotificationCountAction(),
        getNotificationsAction(20),
      ]);
      setUnread(count);
      setItems(list as NotificationRow[]);
    });
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
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

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-80 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-700/60 px-3 py-2">
            <p className="text-sm font-medium text-white">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleReadAll}
                disabled={pending}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">No notifications yet</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => !n.is_read && handleRead(n.id)}
                  className={cn(
                    "w-full border-b border-slate-800 px-3 py-2.5 text-left transition hover:bg-slate-800/50",
                    !n.is_read && "bg-slate-800/30"
                  )}
                >
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{n.body}</p>}
                  <p className="mt-1 text-[10px] text-slate-600">
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
