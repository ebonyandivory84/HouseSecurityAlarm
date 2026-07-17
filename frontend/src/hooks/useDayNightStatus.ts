import { useCallback, useEffect, useRef, useState } from "react";
import { buildStatePushWsUrl, iobrokerClient } from "@/services/iobrokerClient";
import type { DayNightMode } from "@/types/domain";

const WATCHED_IDS = ["daynight.mode", "daynight.isNight"];

const POLL_INTERVAL_MS = 5000;
const WS_RECONNECT_BASE_DELAY_MS = 850;
const WS_RECONNECT_MAX_DELAY_MS = 8000;
const REFETCH_DEBOUNCE_MS = 150;

interface DayNightStatus {
  mode: DayNightMode | null;
  isNight: boolean;
}

interface UseDayNightStatusResult {
  status: DayNightStatus | null;
  isOnline: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDayNightStatus(): UseDayNightStatusResult {
  const [status, setStatus] = useState<DayNightStatus | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const values = await iobrokerClient.readStates(WATCHED_IDS);
      const modeVal = values["daynight.mode"]?.val;
      setStatus({
        mode: typeof modeVal === "string" ? (modeVal as DayNightMode) : null,
        isNight: Boolean(values["daynight.isNight"]?.val),
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    refetchTimeoutRef.current = setTimeout(() => {
      void refresh();
    }, REFETCH_DEBOUNCE_MS);
  }, [refresh]);

  useEffect(() => {
    disposedRef.current = false;

    function stopPolling(): void {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    function startPolling(): void {
      stopPolling();
      pollIntervalRef.current = setInterval(() => {
        void refresh();
      }, POLL_INTERVAL_MS);
    }

    function connect(): void {
      if (disposedRef.current) {
        return;
      }
      const url = buildStatePushWsUrl();
      if (!url) {
        startPolling();
        return;
      }

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
        setIsOnline(true);
        stopPolling();
        ws.send(JSON.stringify({ type: "watch", ids: WATCHED_IDS }));
        void refresh();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg?.type === "stateBatch" && msg.states) {
            const changedWatched = Object.keys(msg.states).some((id) => WATCHED_IDS.includes(id));
            if (changedWatched) {
              scheduleRefetch();
            }
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        setIsOnline(false);
        if (disposedRef.current) {
          return;
        }
        startPolling();
        const delay = Math.min(
          WS_RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttemptRef.current,
          WS_RECONNECT_MAX_DELAY_MS
        );
        reconnectAttemptRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    void refresh();
    connect();

    return () => {
      disposedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
      stopPolling();
      wsRef.current?.close();
    };
  }, [refresh, scheduleRefetch]);

  return { status, isOnline, error, refresh };
}
