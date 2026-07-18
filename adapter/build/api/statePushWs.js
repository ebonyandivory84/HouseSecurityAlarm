"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachStatePushWs = attachStatePushWs;
const ws_1 = require("ws");
const WS_PATH = "/housealarm/api/ws";
function attachStatePushWs(server, deps) {
    const wss = new ws_1.WebSocketServer({ server, path: WS_PATH });
    const watchedIds = new Map();
    function broadcastAll(message) {
        const raw = JSON.stringify(message);
        for (const socket of watchedIds.keys()) {
            if (socket.readyState === ws_1.WebSocket.OPEN) {
                socket.send(raw);
            }
        }
    }
    wss.on("connection", (socket) => {
        watchedIds.set(socket, new Set());
        socket.on("message", (raw) => {
            let parsed;
            try {
                parsed = JSON.parse(raw.toString());
            }
            catch {
                return;
            }
            if (parsed &&
                typeof parsed === "object" &&
                parsed.type === "watch" &&
                Array.isArray(parsed.ids)) {
                const ids = (parsed.ids).filter((id) => typeof id === "string");
                watchedIds.set(socket, new Set(ids));
            }
        });
        socket.on("close", () => {
            watchedIds.delete(socket);
        });
    });
    const onStateChange = (id, state) => {
        if (!state) {
            return;
        }
        const payload = { type: "stateBatch", states: { [id]: state.val }, ts: Date.now() };
        const raw = JSON.stringify(payload);
        for (const [socket, ids] of watchedIds) {
            if (ids.has(id) && socket.readyState === ws_1.WebSocket.OPEN) {
                socket.send(raw);
            }
        }
    };
    deps.adapter.on("stateChange", onStateChange);
    const onRuleTrace = (payload) => {
        broadcastAll({ type: "ruleTrace", ...payload });
    };
    deps.bus.on("ruleTrace", onRuleTrace);
    const onCameraSnapshot = (payload) => {
        broadcastAll({ type: "cameraSnapshot", ...payload });
    };
    deps.bus.on("cameraSnapshot", onCameraSnapshot);
    return {
        broadcast: broadcastAll,
        async dispose() {
            deps.adapter.off("stateChange", onStateChange);
            deps.bus.off("ruleTrace", onRuleTrace);
            deps.bus.off("cameraSnapshot", onCameraSnapshot);
            for (const socket of watchedIds.keys()) {
                socket.close();
            }
            await new Promise((resolve, reject) => {
                wss.close((err) => (err ? reject(err) : resolve()));
            });
        },
    };
}
