"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DayNightScheduler = void 0;
const sunCalc_1 = require("../core/sunCalc");
const json_1 = require("../core/json");
const EMPTY_CONFIG = {
    duskOffsetMin: 30,
    dawnOffsetMin: 30,
    useBrightnessOverride: false,
};
const POLL_INTERVAL_MS = 60000;
const DAY_MS = 86400000;
class DayNightScheduler {
    constructor(adapter, sensors) {
        this.adapter = adapter;
        this.sensors = sensors;
        this.config = EMPTY_CONFIG;
        this.mode = null;
        this.timer = null;
    }
    async init() {
        const state = await this.adapter.getStateAsync("config.dayNight");
        this.config = (0, json_1.parseJsonObject)(state?.val, EMPTY_CONFIG);
        await this.tick();
        this.timer = setInterval(() => {
            void this.tick();
        }, POLL_INTERVAL_MS);
    }
    dispose() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    async tick() {
        const mode = await this.computeMode();
        if (mode === this.mode) {
            return;
        }
        this.mode = mode;
        await this.adapter.setStateAsync("daynight.mode", mode, true);
        await this.adapter.setStateAsync("daynight.isNight", mode === "night", true);
    }
    async computeMode() {
        if (this.config.useBrightnessOverride && this.config.brightnessDatapointId) {
            const raw = this.sensors.getRawValue(this.config.brightnessDatapointId);
            const threshold = this.config.brightnessNightThreshold ?? 0;
            if (raw !== undefined) {
                return Number(raw) < threshold ? "night" : "day";
            }
        }
        const latitude = this.adapter.latitude;
        const longitude = this.adapter.longitude;
        if (typeof latitude !== "number" || typeof longitude !== "number") {
            return "night";
        }
        const now = Date.now();
        for (const offsetDays of [-1, 0, 1]) {
            const day = new Date(now + offsetDays * DAY_MS);
            const { sunrise, sunset } = (0, sunCalc_1.getSunTimes)(day, latitude, longitude);
            const dawnStart = sunrise.getTime() - this.config.dawnOffsetMin * 60000;
            const dawnEnd = sunrise.getTime() + this.config.dawnOffsetMin * 60000;
            const duskStart = sunset.getTime() - this.config.duskOffsetMin * 60000;
            const duskEnd = sunset.getTime() + this.config.duskOffsetMin * 60000;
            if (now >= dawnStart && now <= dawnEnd) {
                return "dusk";
            }
            if (now >= duskStart && now <= duskEnd) {
                return "dusk";
            }
            if (now > dawnEnd && now < duskStart) {
                return "day";
            }
        }
        return "night";
    }
}
exports.DayNightScheduler = DayNightScheduler;
