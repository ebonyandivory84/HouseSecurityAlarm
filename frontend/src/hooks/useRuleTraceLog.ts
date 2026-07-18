import { useEffect, useRef, useState } from "react";
import { buildStatePushWsUrl } from "@/services/iobrokerClient";
import type { RuleAction } from "@/types/logic";

const WS_RECONNECT_BASE_DELAY_MS = 850;
const WS_RECONNECT_MAX_DELAY_MS = 8000;
const MAX_ENTRIES = 20;

export interface RuleTraceEntry {
  ruleId: string;
  ruleName: string;
  actions: RuleAction[];
  ts: number;
}

interface UseRuleTraceLogResult {
  entries: RuleTraceEntry[];
  isOnline: boolean;
}

export function useRuleTraceLog(enabled = true): UseRuleTraceLogResult {
  const [entries, setEntries] = useState<RuleTraceEntry[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    disposedRef.current = false;

    function connect(): void {
      if (disposedRef.current) {
        return;
      }
      const url = buildStatePushWsUrl();
      if (!url) {
        return;
      }

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
        setIsOnline(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (
            msg?.type === "ruleTrace" &&
            typeof msg.ruleId === "string" &&
            typeof msg.ruleName === "string" &&
            Array.isArray(msg.actions)
          ) {
            const entry: RuleTraceEntry = {
              ruleId: msg.ruleId,
              ruleName: msg.ruleName,
              actions: msg.actions,
              ts: msg.ts ?? Date.now(),
            };
            setEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
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

    connect();

    return () => {
      disposedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [enabled]);

  return { entries, isOnline };
}
