"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlarmController = void 0;
const zoneEngine_1 = require("./zoneEngine");
const json_1 = require("./json");
const defaults_1 = require("../config/defaults");
class AlarmController {
    constructor(adapter, bus, zoneEngine, sensorAggregator) {
        this.adapter = adapter;
        this.bus = bus;
        this.zoneEngine = zoneEngine;
        this.sensorAggregator = sensorAggregator;
        this.timing = defaults_1.DEFAULT_ALARM_TIMING_CONFIG;
        this.alarmActive = false;
        this.exitGraceActive = false;
        this.entryCountdownRemaining = 0;
    }
    async init() {
        const state = await this.adapter.getStateAsync("config.alarmTiming");
        this.timing = (0, json_1.parseJsonObject)(state?.val, defaults_1.DEFAULT_ALARM_TIMING_CONFIG);
        await this.adapter.setStateAsync("alarm.active", false, true);
        await this.adapter.setStateAsync("alarm.panicActive", false, true);
        await this.adapter.setStateAsync("countdown.active", false, true);
        this.bus.on("modeChanged", (payload) => void this.handleModeChanged(payload));
        this.bus.on("datapointChanged", (payload) => void this.handleDatapointChanged(payload));
    }
    async panic() {
        this.stopEntryCountdown();
        await this.adapter.setStateAsync("alarm.active", true, true);
        await this.adapter.setStateAsync("alarm.panicActive", true, true);
        await this.adapter.setStateAsync("alarm.triggerReason", "Panik", true);
        await this.adapter.setStateAsync("alarm.triggerZone", "", true);
        await this.adapter.setStateAsync("alarm.triggerDatapoint", "", true);
        await this.adapter.setStateAsync("alarm.triggerTs", Date.now(), true);
        if (!this.alarmActive) {
            this.alarmActive = true;
            this.bus.emit("alarmTriggered", { reason: "Panik", ts: Date.now() });
        }
    }
    dispose() {
        this.clearExitGrace();
        this.stopEntryCountdown();
    }
    async handleModeChanged({ previousMode, mode }) {
        if (mode === "unscharf") {
            this.clearExitGrace();
            this.stopEntryCountdown();
            await this.clearAlarm();
            return;
        }
        if (previousMode === "unscharf") {
            this.startExitGrace();
        }
    }
    async handleDatapointChanged(payload) {
        await this.publishTriggeredZones();
        if (!payload.triggered || this.exitGraceActive) {
            return;
        }
        const derived = (0, zoneEngine_1.deriveZoneState)(this.zoneEngine.getMode());
        const zoneActive = payload.zone === "perimeter"
            ? derived.perimeterActive
            : payload.zone === "aussenhaut"
                ? derived.aussenhautActive
                : payload.zone === "innenraum"
                    ? derived.innenraumActive
                    : false;
        if (!zoneActive) {
            return;
        }
        const dp = this.sensorAggregator.getDatapoint(payload.datapointId);
        const label = dp?.label ?? payload.datapointId;
        if (dp?.category === "door") {
            this.startEntryCountdown(label, payload.zone ?? undefined, payload.datapointId);
            return;
        }
        await this.triggerAlarm(`${label} ausgelöst`, payload.zone ?? undefined, payload.datapointId);
    }
    async publishTriggeredZones() {
        const ids = this.sensorAggregator.getTriggeredIds();
        const zones = [
            ...new Set(ids
                .map((id) => this.sensorAggregator.getDatapoint(id)?.zone)
                .filter((zone) => Boolean(zone))),
        ];
        await this.adapter.setStateAsync("zones.triggeredZones", JSON.stringify(zones), true);
    }
    startExitGrace() {
        this.clearExitGrace();
        this.exitGraceActive = true;
        this.exitGraceTimer = setTimeout(() => {
            this.exitGraceActive = false;
            this.exitGraceTimer = undefined;
        }, this.timing.exitDelaySec * 1000);
    }
    clearExitGrace() {
        if (this.exitGraceTimer) {
            clearTimeout(this.exitGraceTimer);
            this.exitGraceTimer = undefined;
        }
        this.exitGraceActive = false;
    }
    startEntryCountdown(label, zone, datapointId) {
        if (this.entryCountdownTimer) {
            return;
        }
        this.entryPendingReason = `${label} – Eintrittsverzögerung abgelaufen`;
        this.entryPendingZone = zone;
        this.entryPendingDatapointId = datapointId;
        this.entryCountdownRemaining = this.timing.entryDelaySec;
        void this.adapter.setStateAsync("countdown.active", true, true);
        void this.adapter.setStateAsync("countdown.remainingSec", this.entryCountdownRemaining, true);
        this.bus.emit("countdownStarted", { remainingSec: this.entryCountdownRemaining, ts: Date.now() });
        this.entryCountdownTimer = setInterval(() => {
            void this.tickEntryCountdown();
        }, 1000);
    }
    async tickEntryCountdown() {
        this.entryCountdownRemaining -= 1;
        if (this.entryCountdownRemaining <= 0) {
            const reason = this.entryPendingReason;
            const zone = this.entryPendingZone;
            const datapointId = this.entryPendingDatapointId;
            this.stopEntryCountdown();
            await this.triggerAlarm(reason ?? "Eintrittsverzögerung abgelaufen", zone, datapointId);
            return;
        }
        await this.adapter.setStateAsync("countdown.remainingSec", this.entryCountdownRemaining, true);
        this.bus.emit("countdownTick", { remainingSec: this.entryCountdownRemaining });
    }
    stopEntryCountdown() {
        if (this.entryCountdownTimer) {
            clearInterval(this.entryCountdownTimer);
            this.entryCountdownTimer = undefined;
            void this.adapter.setStateAsync("countdown.active", false, true);
            void this.adapter.setStateAsync("countdown.remainingSec", 0, true);
            this.bus.emit("countdownStopped", { ts: Date.now() });
        }
        this.entryPendingReason = undefined;
        this.entryPendingZone = undefined;
        this.entryPendingDatapointId = undefined;
    }
    async triggerAlarm(reason, zone, datapointId) {
        this.stopEntryCountdown();
        await this.adapter.setStateAsync("alarm.active", true, true);
        await this.adapter.setStateAsync("alarm.triggerReason", reason, true);
        await this.adapter.setStateAsync("alarm.triggerZone", zone ?? "", true);
        await this.adapter.setStateAsync("alarm.triggerDatapoint", datapointId ?? "", true);
        await this.adapter.setStateAsync("alarm.triggerTs", Date.now(), true);
        if (!this.alarmActive) {
            this.alarmActive = true;
            this.bus.emit("alarmTriggered", { reason, zone, datapointId, ts: Date.now() });
        }
    }
    async clearAlarm() {
        if (!this.alarmActive) {
            return;
        }
        this.alarmActive = false;
        await this.adapter.setStateAsync("alarm.active", false, true);
        await this.adapter.setStateAsync("alarm.panicActive", false, true);
        this.bus.emit("alarmCleared", { ts: Date.now() });
    }
}
exports.AlarmController = AlarmController;
