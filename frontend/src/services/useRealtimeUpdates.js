import { useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

/**
 * Subscribe to server-sent events for real-time transaction updates.
 * Calls `onUpdate(event)` whenever a new transaction is broadcast.
 * Automatically reconnects on disconnect with exponential back-off.
 */
export function useRealtimeUpdates(onUpdate, enabled = true) {
  // Use refs so the effect doesn't re-run when callbacks change identity
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    let es = null;
    let retryTimer = null;
    let retryDelay = 3000;
    let destroyed = false;

    function connect() {
      if (destroyed || !enabledRef.current) return;
      const token = localStorage.getItem('token');
      if (!token) return;

      es = new EventSource(
        `${API_URL}/transactions/events?token=${encodeURIComponent(token)}`
      );

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type !== 'connected') {
            onUpdateRef.current?.(data);
          }
        } catch (_) {}
      };

      es.onerror = () => {
        es.close();
        es = null;
        if (!destroyed) {
          retryTimer = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 1.5, 30000); // cap at 30s
            connect();
          }, retryDelay);
        }
      };

      es.onopen = () => {
        retryDelay = 3000; // reset on successful connect
      };
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(retryTimer);
      es?.close();
    };
  }, []); // intentionally empty — we use refs for the callbacks
}
