import { useCallback, useEffect, useRef, useState } from "react";
import { buildStatePushWsUrl, iobrokerClient } from "@/services/iobrokerClient";
import type { AlarmCenterStatus, ZoneCommand } from "@/types/domain";

const WATCHED_IDS = [
  "zones.mode",
  "alarm.active",
  "alarm.panicActive",
  "countdown.active",
  "countdown.remainingSec",
  "alarmcenter.online",
  "alarm.triggerReason",
  "alarm.triggerZone",
];

const POLL_INTERVAL_MS = 5000;
const WS_RECONNECT_BASE_DELAY_MS = 850;
const WS_RECONNECT_MAX_DELAY_MS = 8000;
const REFETCH_DEBOUNCE_MS = 150;

interface UseAlarmCenterStatusResult {
  status: AlarmCenterStatus | null;
  isOnline: boolean;
  error: string | null;
  sendCommand: (command: ZoneCommand) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAlarmCenterStatus(): UseAlarmCenterStatusResult {
  const [status, setStatus] = useState<AlarmCenterStatus | null>(null);
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
      const next = await iobrokerClient.getAlarmCenterStatus();
      setStatus(next);
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

  const sendCommand = useCallback(
    async (command: ZoneCommand) => {
      try {
        const result = await iobrokerClient.sendAlarmCenterCommand(command);
        setError(null);
        setStatus((prev) => (prev ? { ...prev, mode: result.mode as AlarmCenterStatus["mode"] } : prev));
        void refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [refresh]
  );

  return { status, isOnline, error, sendCommand, refresh };
}
