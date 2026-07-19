import { useEffect, useRef, useState } from "react";
import { buildStatePushWsUrl, iobrokerClient } from "@/services/iobrokerClient";
import type { DatapointConfig } from "@/types/domain";

const POLL_INTERVAL_MS = 5000;
const WS_RECONNECT_BASE_DELAY_MS = 850;
const WS_RECONNECT_MAX_DELAY_MS = 8000;
const REFETCH_DEBOUNCE_MS = 150;

function isTriggered(dp: DatapointConfig, state: ioBroker.State | null | undefined): boolean {
  if (!state) return false;
  if (dp.valueType === "boolean") return state.val === true;
  return dp.triggerString !== undefined && state.val === dp.triggerString;
}

export function useFloorplanLiveBindings(datapoints: DatapointConfig[], boundIds: string[]): ReadonlySet<string> {
  const [activeIds, setActiveIds] = useState<ReadonlySet<string>>(new Set());
  const idsRef = useRef<string[]>(boundIds);
  const dpByIdRef = useRef<Map<string, DatapointConfig>>(new Map());
  idsRef.current = boundIds;
  dpByIdRef.current = new Map(datapoints.map((dp) => [dp.id, dp]));

  const boundIdsKey = boundIds.join(",");

  useEffect(() => {
    let disposed = false;
    let ws: WebSocket | null = null;
    let reconnectAttempt = 0;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let refetchTimeout: ReturnType<typeof setTimeout> | null = null;

    function stopPolling(): void {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }

    async function refreshValues(): Promise<void> {
      const ids = idsRef.current;
      if (ids.length === 0) {
        if (!disposed) setActiveIds(new Set());
        return;
      }
      try {
        const states = await iobrokerClient.readStates(ids);
        const next = new Set<string>();
        for (const id of ids) {
          const dp = dpByIdRef.current.get(id);
          if (dp && isTriggered(dp, states[id])) {
            next.add(id);
          }
        }
        if (!disposed) setActiveIds(next);
      } catch {
        // transiente Fehler ignorieren, letzter bekannter Zustand bleibt erhalten
      }
    }

    function scheduleRefetch(): void {
      if (refetchTimeout) clearTimeout(refetchTimeout);
      refetchTimeout = setTimeout(() => void refreshValues(), REFETCH_DEBOUNCE_MS);
    }

    function startPolling(): void {
      stopPolling();
      pollInterval = setInterval(() => void refreshValues(), POLL_INTERVAL_MS);
    }

    function connect(): void {
      if (disposed) return;
      const socket = new WebSocket(buildStatePushWsUrl());
      ws = socket;

      socket.onopen = () => {
        reconnectAttempt = 0;
        stopPolling();
        socket.send(JSON.stringify({ type: "watch", ids: idsRef.current }));
        void refreshValues();
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as { type?: string; states?: Record<string, unknown> };
          if (msg.type === "stateBatch" && msg.states && Object.keys(msg.states).some((id) => idsRef.current.includes(id))) {
            scheduleRefetch();
          }
        } catch {
          // ignoriere unbekannte/kaputte Nachrichten
        }
      };

      socket.onclose = () => {
        if (disposed) return;
        startPolling();
        const delay = Math.min(WS_RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt, WS_RECONNECT_MAX_DELAY_MS);
        reconnectAttempt += 1;
        reconnectTimeout = setTimeout(connect, delay);
      };

      socket.onerror = () => socket.close();
    }

    void refreshValues();
    connect();

    return () => {
      disposed = true;
      stopPolling();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (refetchTimeout) clearTimeout(refetchTimeout);
      ws?.close();
      ws = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundIdsKey]);

  return activeIds;
}
