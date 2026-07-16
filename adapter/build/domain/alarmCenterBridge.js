"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlarmCenterBridge = void 0;
const json_1 = require("../core/json");
const EMPTY_MAPPING = {
    armedStateId: "",
    perimeterStateId: "",
    countdownStateId: "",
    sirenStateId: "",
    triggerStateId: "",
    displayStateId: "",
    buzzerStateId: "",
    ledRedStateId: "",
    ledYellowStateId: "",
    fingerprintStateId: "",
};
class AlarmCenterBridge {
    constructor(adapter, bus, zoneEngine) {
        this.adapter = adapter;
        this.bus = bus;
        this.zoneEngine = zoneEngine;
        this.mapping = EMPTY_MAPPING;
    }
    async init() {
        const state = await this.adapter.getStateAsync("config.alarmCenterMapping");
        this.mapping = (0, json_1.parseJsonObject)(state?.val, EMPTY_MAPPING);
        this.bus.on("modeChanged", (payload) => {
            void this.pushMode(payload.mode);
        });
        this.bus.on("alarmTriggered", () => {
            void this.pushAlarm(true);
        });
        this.bus.on("alarmCleared", () => {
            void this.pushAlarm(false);
        });
        this.bus.on("countdownStarted", (payload) => {
            void this.pushCountdown(payload.remainingSec, true);
        });
        this.bus.on("countdownTick", (payload) => {
            void this.pushCountdown(payload.remainingSec, true);
        });
        this.bus.on("countdownStopped", () => {
            void this.pushCountdown(0, false);
        });
        if (this.mapping.fingerprintStateId) {
            await this.adapter.subscribeForeignStatesAsync(this.mapping.fingerprintStateId);
        }
    }
    isFingerprintState(id) {
        return this.mapping.fingerprintStateId !== "" && id === this.mapping.fingerprintStateId;
    }
    async handleFingerprintMatch(state) {
        if (!state.val) {
            return;
        }
        await this.adapter.setStateAsync("alarmcenter.fingerprintLastMatch", Date.now(), true);
        await this.zoneEngine.disarm();
    }
    async pushMode(mode) {
        if (this.mapping.armedStateId) {
            await this.adapter.setForeignStateAsync(this.mapping.armedStateId, mode !== "unscharf", false);
        }
        if (this.mapping.perimeterStateId) {
            await this.adapter.setForeignStateAsync(this.mapping.perimeterStateId, mode !== "unscharf", false);
        }
        if (this.mapping.displayStateId) {
            await this.adapter.setForeignStateAsync(this.mapping.displayStateId, mode, false);
        }
    }
    async pushAlarm(active) {
        if (this.mapping.sirenStateId) {
            await this.adapter.setForeignStateAsync(this.mapping.sirenStateId, active, false);
        }
        if (this.mapping.ledRedStateId) {
            await this.adapter.setForeignStateAsync(this.mapping.ledRedStateId, active, false);
        }
    }
    async pushCountdown(remainingSec, active) {
        if (this.mapping.countdownStateId) {
            await this.adapter.setForeignStateAsync(this.mapping.countdownStateId, remainingSec, false);
        }
        if (this.mapping.buzzerStateId) {
            await this.adapter.setForeignStateAsync(this.mapping.buzzerStateId, active, false);
        }
        if (this.mapping.ledYellowStateId) {
            await this.adapter.setForeignStateAsync(this.mapping.ledYellowStateId, active, false);
        }
    }
}
exports.AlarmCenterBridge = AlarmCenterBridge;
