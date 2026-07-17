import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { ApiDeps } from "./types";
import type { DomainEventMap } from "../core/eventBus";
import type { RuleAction } from "../config/types";

type ServerMessage =
  | { type: "stateBatch"; states: Record<string, ioBroker.StateValue>; ts: number }
  | { type: "cameraSnapshot"; cameraId: string; url: string; ts: number }
  | { type: "ruleTrace"; ruleId: string; ruleName: string; actions: RuleAction[]; ts: number };

export interface StatePushWsHandle {
  broadcast(message: ServerMessage): void;
  dispose(): Promise<void>;
}

const WS_PATH = "/housealarm/api/ws";

export function attachStatePushWs(server: Server, deps: ApiDeps): StatePushWsHandle {
  const wss = new WebSocketServer({ server, path: WS_PATH });
  const watchedIds = new Map<WebSocket, Set<string>>();

  function broadcastAll(message: ServerMessage): void {
    const raw = JSON.stringify(message);
    for (const socket of watchedIds.keys()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(raw);
      }
    }
  }

  wss.on("connection", (socket) => {
    watchedIds.set(socket, new Set());

    socket.on("message", (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed as Record<string, unknown>).type === "watch" &&
        Array.isArray((parsed as Record<string, unknown>).ids)
      ) {
        const ids = ((parsed as { ids: unknown[] }).ids).filter((id): id is string => typeof id === "string");
        watchedIds.set(socket, new Set(ids));
      }
    });

    socket.on("close", () => {
      watchedIds.delete(socket);
    });
  });

  const onStateChange = (id: string, state: ioBroker.State | null | undefined): void => {
    if (!state) {
      return;
    }
    const payload: ServerMessage = { type: "stateBatch", states: { [id]: state.val }, ts: Date.now() };
    const raw = JSON.stringify(payload);
    for (const [socket, ids] of watchedIds) {
      if (ids.has(id) && socket.readyState === WebSocket.OPEN) {
        socket.send(raw);
      }
    }
  };
  deps.adapter.on("stateChange", onStateChange);

  const onRuleTrace = (payload: DomainEventMap["ruleTrace"]): void => {
    broadcastAll({ type: "ruleTrace", ...payload });
  };
  deps.bus.on("ruleTrace", onRuleTrace);

  return {
    broadcast: broadcastAll,
    async dispose(): Promise<void> {
      deps.adapter.off("stateChange", onStateChange);
      deps.bus.off("ruleTrace", onRuleTrace);
      for (const socket of watchedIds.keys()) {
        socket.close();
      }
      await new Promise<void>((resolve, reject) => {
        wss.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
