"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceTracker = void 0;
const json_1 = require("../core/json");
const EMPTY_CONFIG = {
    datapointIds: [],
    autoDisarmOnPresence: false,
};
class PresenceTracker {
    constructor(adapter, bus, sensors, zoneEngine) {
        this.adapter = adapter;
        this.bus = bus;
        this.sensors = sensors;
        this.zoneEngine = zoneEngine;
        this.config = EMPTY_CONFIG;
        this.confirmed = false;
    }
    async init() {
        const state = await this.adapter.getStateAsync("config.presence");
        this.config = (0, json_1.parseJsonObject)(state?.val, EMPTY_CONFIG);
        this.bus.on("datapointChanged", (payload) => {
            if (this.config.datapointIds.includes(payload.datapointId)) {
                void this.recompute();
            }
        });
    }
    async recompute() {
        const confirmed = this.config.datapointIds.some((id) => this.sensors.isTriggered(id));
        if (confirmed === this.confirmed) {
            return;
        }
        this.confirmed = confirmed;
        await this.adapter.setStateAsync("presence.confirmed", confirmed, true);
        if (confirmed && this.config.autoDisarmOnPresence && this.zoneEngine.getMode() === "vollschutz") {
            await this.zoneEngine.armAussenhaut();
        }
    }
}
exports.PresenceTracker = PresenceTracker;
