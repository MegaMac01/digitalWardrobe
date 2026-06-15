import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Defers a delete so it can be undone. The item is hidden immediately (via the
 * returned pendingIds set) but performDelete only runs after `delay` ms unless
 * undoDelete is called first. On unmount, any still-pending deletes are flushed
 * so the user's delete intent is honored.
 */
export function useDeferredDelete(performDelete, { delay = 5000 } = {}) {
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const timers = useRef(new Map());
  const performRef = useRef(performDelete);
  performRef.current = performDelete;

  const scheduleDelete = useCallback(
    (id, payload) => {
      if (timers.current.has(id)) return;
      setPendingIds((prev) => new Set(prev).add(id));
      const timeoutId = setTimeout(() => {
        timers.current.delete(id);
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        performRef.current(payload);
      }, delay);
      timers.current.set(id, { timeoutId, payload });
    },
    [delay]
  );

  const undoDelete = useCallback((id) => {
    const entry = timers.current.get(id);
    if (entry) clearTimeout(entry.timeoutId);
    timers.current.delete(id);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((entry) => {
        clearTimeout(entry.timeoutId);
        performRef.current(entry.payload);
      });
      map.clear();
    };
  }, []);

  return { pendingIds, scheduleDelete, undoDelete };
}
