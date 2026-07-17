"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRestRoutes = registerRestRoutes;
const json_1 = require("../core/json");
const defaults_1 = require("../config/defaults");
const ZONE_COMMANDS = ["armPerimeter", "armAussenhaut", "armVollschutz", "disarm"];
function isZoneCommand(value) {
    return typeof value === "string" && ZONE_COMMANDS.includes(value);
}
function registerJsonConfigRoute(router, path, stateId, deps, fallback, isArray) {
    router.get(path, async (_req, res) => {
        try {
            const state = await deps.adapter.getStateAsync(stateId);
            const value = isArray ? (0, json_1.parseJsonArray)(state?.val) : (0, json_1.parseJsonObject)(state?.val, fallback);
            res.json(value);
        }
        catch {
            res.status(500).json({ error: `failed to read ${stateId}` });
        }
    });
    router.put(path, async (req, res) => {
        const body = req.body;
        if (isArray && !Array.isArray(body)) {
            res.status(400).json({ error: "expected a JSON array" });
            return;
        }
        if (!isArray && (typeof body !== "object" || body === null || Array.isArray(body))) {
            res.status(400).json({ error: "expected a JSON object" });
            return;
        }
        try {
            await deps.adapter.setStateAsync(stateId, JSON.stringify(body), true);
            res.json({ ok: true });
        }
        catch {
            res.status(500).json({ error: `failed to write ${stateId}` });
        }
    });
}
function registerRestRoutes(router, deps) {
    const objectsCache = new Map();
    const OBJECTS_CACHE_TTL_MS = 5 * 60000;
    router.post("/states", async (req, res) => {
        const ids = req.body?.ids;
        if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
            res.status(400).json({ error: "ids must be a string array" });
            return;
        }
        try {
            const result = {};
            await Promise.all(ids.map(async (id) => {
                result[id] = (await deps.adapter.getForeignStateAsync(id)) ?? null;
            }));
            res.json(result);
        }
        catch {
            res.status(500).json({ error: "failed to read states" });
        }
    });
    router.put("/state", async (req, res) => {
        const { id, value, ack } = req.body ?? {};
        if (typeof id !== "string" || id.length === 0) {
            res.status(400).json({ error: "id is required" });
            return;
        }
        try {
            await deps.adapter.setForeignStateAsync(id, value, ack === true);
            res.json({ ok: true });
        }
        catch {
            res.status(500).json({ error: "failed to write state" });
        }
    });
    router.post("/objects", async (req, res) => {
        const pattern = typeof req.body?.pattern === "string" ? req.body.pattern : "*";
        const type = typeof req.body?.type === "string" ? req.body.type : undefined;
        const cacheKey = `${pattern}::${type ?? ""}`;
        const cached = objectsCache.get(cacheKey);
        if (cached && Date.now() - cached.ts < OBJECTS_CACHE_TTL_MS) {
            res.json(cached.data);
            return;
        }
        try {
            const data = type
                ? await deps.adapter.getForeignObjectsAsync(pattern, type)
                : await deps.adapter.getForeignObjectsAsync(pattern);
            objectsCache.set(cacheKey, { ts: Date.now(), data });
            res.json(data);
        }
        catch {
            res.status(500).json({ error: "failed to read objects" });
        }
    });
    registerJsonConfigRoute(router, "/config/rules", "config.rules", deps, [], true);
    registerJsonConfigRoute(router, "/config/telegram-templates", "config.telegramTemplates", deps, [], true);
    registerJsonConfigRoute(router, "/config/daynight", "config.dayNight", deps, defaults_1.DEFAULT_DAY_NIGHT_CONFIG, false);
    registerJsonConfigRoute(router, "/config/presence", "config.presence", deps, defaults_1.DEFAULT_PRESENCE_CONFIG, false);
    registerJsonConfigRoute(router, "/config/zones", "config.zoneAssignment", deps, {}, false);
    registerJsonConfigRoute(router, "/floorplan", "config.floorplan", deps, {}, false);
    router.get("/config/datapoints/:category", async (req, res) => {
        try {
            const state = await deps.adapter.getStateAsync("config.datapointRegistry");
            const all = (0, json_1.parseJsonArray)(state?.val);
            const category = req.params.category;
            res.json(category === "all" ? all : all.filter((dp) => dp.category === category));
        }
        catch {
            res.status(500).json({ error: "failed to read config.datapointRegistry" });
        }
    });
    router.put("/config/datapoints/:category", async (req, res) => {
        const category = req.params.category;
        const incoming = req.body;
        if (!Array.isArray(incoming)) {
            res.status(400).json({ error: "expected a JSON array of datapoints" });
            return;
        }
        try {
            const state = await deps.adapter.getStateAsync("config.datapointRegistry");
            const all = (0, json_1.parseJsonArray)(state?.val);
            const merged = category === "all"
                ? incoming
                : [...all.filter((dp) => dp.category !== category), ...incoming];
            await deps.adapter.setStateAsync("config.datapointRegistry", JSON.stringify(merged), true);
            res.json({ ok: true });
        }
        catch {
            res.status(500).json({ error: "failed to write config.datapointRegistry" });
        }
    });
    router.get("/alarmcenter/status", async (_req, res) => {
        try {
            const [alarmActive, panicActive, countdownActive, countdownRemaining, online, triggerReason, triggerZone] = await Promise.all([
                deps.adapter.getStateAsync("alarm.active"),
                deps.adapter.getStateAsync("alarm.panicActive"),
                deps.adapter.getStateAsync("countdown.active"),
                deps.adapter.getStateAsync("countdown.remainingSec"),
                deps.adapter.getStateAsync("alarmcenter.online"),
                deps.adapter.getStateAsync("alarm.triggerReason"),
                deps.adapter.getStateAsync("alarm.triggerZone"),
            ]);
            res.json({
                mode: deps.zoneEngine.getMode(),
                alarmActive: Boolean(alarmActive?.val),
                panicActive: Boolean(panicActive?.val),
                countdownActive: Boolean(countdownActive?.val),
                countdownRemainingSec: Number(countdownRemaining?.val ?? 0),
                alarmCenterOnline: Boolean(online?.val),
                triggerReason: typeof triggerReason?.val === "string" ? triggerReason.val : null,
                triggerZone: typeof triggerZone?.val === "string" ? triggerZone.val : null,
                triggeredDatapointIds: deps.sensorAggregator.getTriggeredIds(),
            });
        }
        catch {
            res.status(500).json({ error: "failed to read alarmcenter status" });
        }
    });
    router.post("/alarmcenter/command", async (req, res) => {
        const command = req.body?.command;
        if (!isZoneCommand(command)) {
            res.status(400).json({ error: `command must be one of ${ZONE_COMMANDS.join(", ")}` });
            return;
        }
        try {
            await deps.zoneEngine[command]();
            res.json({ ok: true, mode: deps.zoneEngine.getMode() });
        }
        catch {
            res.status(500).json({ error: "failed to execute command" });
        }
    });
    router.post("/telegram/test-send", async (req, res) => {
        const templateId = req.body?.templateId;
        if (typeof templateId !== "string" || templateId.length === 0) {
            res.status(400).json({ error: "templateId is required" });
            return;
        }
        const vars = typeof req.body?.vars === "object" && req.body.vars !== null ? req.body.vars : undefined;
        try {
            await deps.telegramNotifier.notifyByTemplateId(templateId, vars);
            res.json({ ok: true });
        }
        catch {
            res.status(500).json({ error: "failed to send telegram message" });
        }
    });
}
