import { useCallback, useEffect, useRef, useState } from "react";
import { buildStatePushWsUrl, iobrokerClient } from "@/services/iobrokerClient";
import type { DatapointCategory, DatapointConfig } from "@/types/domain";

const POLL_INTERVAL_MS = 5000;
const WS_RECONNECT_BASE_DELAY_MS = 850;
const WS_RECONNECT_MAX_DELAY_MS = 8000;
const REFETCH_DEBOUNCE_MS = 150;

interface UseDatapointCategoryResult {
  datapoints: DatapointConfig[];
  liveValues: Record<string, ioBroker.State | null>;
  isLoading: boolean;
  isOnline: boolean;
  error: string | null;
  save: (next: DatapointConfig[]) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDatapointCategory(category: DatapointCategory): UseDatapointCategoryResult {
  const [datapoints, setDatapoints] = useState<DatapointConfig[]>([]);
  const [liveValues, setLiveValues] = useState<Record<string, ioBroker.State | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);
  const idsRef = useRef<string[]>([]);

  const refreshValues = useCallback(async () => {
    const ids = idsRef.current;
    if (ids.length === 0) {
      setLiveValues({});
      return;
    }
    try {
      const values = await iobrokerClient.readStates(ids);
      setLiveValues(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await iobrokerClient.getConfig<DatapointConfig[]>(`/config/datapoints/${category}`);
      setDatapoints(next);
      idsRef.current = next.map((dp) => dp.id);
      setError(null);
      await refreshValues();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [category, refreshValues]);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    refetchTimeoutRef.current = setTimeout(() => {
      void refreshValues();
    }, REFETCH_DEBOUNCE_MS);
  }, [refreshValues]);

  useEffect(() => {
    disposedRef.current = false;
    setIsLoading(true);

    function stopPolling(): void {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    function startPolling(): void {
      stopPolling();
      pollIntervalRef.current = setInterval(() => {
        void refreshValues();
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
        ws.send(JSON.stringify({ type: "watch", ids: idsRef.current }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg?.type === "stateBatch" && msg.states) {
            const changedWatched = Object.keys(msg.states).some((id) => idsRef.current.includes(id));
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
  }, [category, refresh, refreshValues, scheduleRefetch]);

  const save = useCallback(
    async (next: DatapointConfig[]) => {
      try {
        await iobrokerClient.putConfig(`/config/datapoints/${category}`, next);
        setDatapoints(next);
        idsRef.current = next.map((dp) => dp.id);
        setError(null);
        wsRef.current?.send(JSON.stringify({ type: "watch", ids: idsRef.current }));
        await refreshValues();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [category, refreshValues]
  );

  return { datapoints, liveValues, isLoading, isOnline, error, save, refresh };
}
