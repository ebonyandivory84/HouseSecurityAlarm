"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorAggregator = void 0;
const json_1 = require("./json");
class SensorAggregator {
    constructor(adapter, bus) {
        this.adapter = adapter;
        this.bus = bus;
        this.datapoints = new Map();
        this.triggeredState = new Map();
        this.rawValues = new Map();
    }
    async init() {
        const registryState = await this.adapter.getStateAsync("config.datapointRegistry");
        const registry = (0, json_1.parseJsonArray)(registryState?.val);
        for (const dp of registry) {
            if (!dp.enabled) {
                continue;
            }
            this.datapoints.set(dp.id, dp);
            this.triggeredState.set(dp.id, false);
            await this.adapter.subscribeForeignStatesAsync(dp.id);
        }
    }
    getDatapoint(id) {
        return this.datapoints.get(id);
    }
    getDatapointsByCategory(category) {
        return [...this.datapoints.values()].filter((dp) => dp.category === category);
    }
    isTriggered(id) {
        return this.triggeredState.get(id) ?? false;
    }
    getRawValue(id) {
        return this.rawValues.get(id);
    }
    getTriggeredIds() {
        return [...this.triggeredState.entries()].filter(([, triggered]) => triggered).map(([id]) => id);
    }
    handleForeignStateChange(id, state) {
        const dp = this.datapoints.get(id);
        if (!dp || !state) {
            return;
        }
        this.rawValues.set(id, state.val);
        const triggered = this.normalize(dp, state.val);
        const previous = this.triggeredState.get(id) ?? false;
        this.triggeredState.set(id, triggered);
        if (triggered !== previous) {
            this.bus.emit("datapointChanged", { datapointId: id, triggered, zone: dp.zone ?? null, ts: Date.now() });
        }
    }
    normalize(dp, val) {
        if (dp.valueType === "boolean") {
            return Boolean(val);
        }
        return typeof val === "string" && dp.triggerString !== undefined && val === dp.triggerString;
    }
}
exports.SensorAggregator = SensorAggregator;
