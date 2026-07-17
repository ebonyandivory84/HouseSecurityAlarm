import { useEffect, useRef, useState } from "react";
import { buildStatePushWsUrl } from "@/services/iobrokerClient";

const WS_RECONNECT_BASE_DELAY_MS = 850;
const WS_RECONNECT_MAX_DELAY_MS = 8000;

export interface CameraSnapshot {
  cameraId: string;
  url: string;
  ts: number;
}

interface UseCameraSnapshotsResult {
  snapshots: Record<string, CameraSnapshot>;
  isOnline: boolean;
}

export function useCameraSnapshots(enabled = true): UseCameraSnapshotsResult {
  const [snapshots, setSnapshots] = useState<Record<string, CameraSnapshot>>({});
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
          if (msg?.type === "cameraSnapshot" && typeof msg.cameraId === "string" && typeof msg.url === "string") {
            setSnapshots((prev) => ({
              ...prev,
              [msg.cameraId]: { cameraId: msg.cameraId, url: msg.url, ts: msg.ts ?? Date.now() },
            }));
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

  return { snapshots, isOnline };
}
