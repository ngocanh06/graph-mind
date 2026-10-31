/**
 * useWatcherEvents — shared hook that connects to SSE stream with polling fallback
 * Manages:
 * - Realtime Server-Sent Events (SSE) push from backend (0ms latency)
 * - Polling fallback to /file-watcher/events for resilience
 * - Pure white modern SaaS toast preview for newly arrived events
 * - Notification Center state (list, read/unread state persisted in localStorage)
 * - Broadcasts window event 'graphmind:watcher-event' for views to auto-refresh (e.g. DocumentsView on DELETE)
 */
import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://localhost:5000/api/v1/sync/file-watcher/events?limit=50";
const SSE_URL = "http://localhost:5000/api/v1/sync/file-watcher/stream";
const POLL_MS = 2500;
const STORAGE_KEY = "graphmind_read_notifications";

function getReadIdsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIdsToStorage(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function useWatcherEvents() {
  const [events, setEvents] = useState([]);
  const [readIds, setReadIds] = useState(getReadIdsFromStorage);
  const [toastEvent, setToastEvent] = useState(null);
  const lastIdRef = useRef(null);
  const isInit = useRef(true);
  const toastTimer = useRef(null);

  const markAsRead = useCallback((id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIdsToStorage(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setEvents((currentEvents) => {
      const allIds = new Set(currentEvents.map((e) => e.id));
      saveReadIdsToStorage(allIds);
      setReadIds(allIds);
      return currentEvents;
    });
  }, []);

  const triggerEventReceived = useCallback((newest) => {
    if (!newest || !newest.id) return;
    if (newest.id === lastIdRef.current) return;
    lastIdRef.current = newest.id;

    // Prepend to events if not already present
    setEvents((prev) => {
      if (prev.some((e) => e.id === newest.id)) return prev;
      return [newest, ...prev.slice(0, 49)];
    });

    // Trigger toast
    setToastEvent(newest);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastEvent(null), 5000);

    // Broadcast event for views (DocumentsView, Connectors, etc.)
    try {
      window.dispatchEvent(new CustomEvent("graphmind:watcher-event", { detail: newest }));
    } catch {}
  }, []);

  // 1. Initial load & Periodic reconciliation poll
  useEffect(() => {
    let alive = true;

    const poll = async () => {
      try {
        const res = await fetch(API);
        if (!res.ok || !alive) return;
        const data = await res.json();
        const list = data.events || [];
        if (!alive) return;

        setEvents(list);

        if (isInit.current) {
          lastIdRef.current = list[0]?.id ?? null;
          isInit.current = false;
          return;
        }

        const newest = list[0];
        if (newest && newest.id !== lastIdRef.current) {
          triggerEventReceived(newest);
        }
      } catch {
        // Backend temporarily offline
      }
    };

    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(iv);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [triggerEventReceived]);

  // 2. Realtime SSE Connection for instantaneous 0ms push
  useEffect(() => {
    if (typeof window === "undefined" || !window.EventSource) return;

    let sse;
    try {
      sse = new EventSource(SSE_URL);
      sse.onmessage = (event) => {
        try {
          if (!event.data || event.data.trim().startsWith(":")) return;
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.id) {
            triggerEventReceived(parsed);
          }
        } catch {}
      };
      sse.onerror = () => {
        // SSE will attempt auto-reconnect; interval poll continues in parallel
      };
    } catch {}

    return () => {
      if (sse) sse.close();
    };
  }, [triggerEventReceived]);

  const unreadCount = events.filter((e) => !readIds.has(e.id)).length;

  return {
    events,
    unreadCount,
    readIds,
    toastEvent,
    markAsRead,
    markAllRead,
    dismissToast: () => setToastEvent(null),
  };
}
