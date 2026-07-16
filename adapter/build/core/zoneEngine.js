"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoneEngine = void 0;
exports.deriveZoneState = deriveZoneState;
const VALID_MODES = ["unscharf", "perimeter", "aussenhaut", "vollschutz"];
function deriveZoneState(mode) {
    return {
        perimeterActive: mode !== "unscharf",
        aussenhautActive: mode === "aussenhaut" || mode === "vollschutz",
        innenraumActive: mode === "vollschutz",
    };
}
class ZoneEngine {
    constructor(adapter, bus) {
        this.adapter = adapter;
        this.bus = bus;
        this.mode = "unscharf";
    }
    getMode() {
        return this.mode;
    }
    async init() {
        const state = await this.adapter.getStateAsync("zones.mode");
        const restored = state?.val;
        if (typeof restored === "string" && VALID_MODES.includes(restored)) {
            this.mode = restored;
        }
        await this.publish(this.mode, this.mode, false);
    }
    async armPerimeter() {
        await this.transition("perimeter");
    }
    async armAussenhaut() {
        await this.transition("aussenhaut");
    }
    async armVollschutz() {
        await this.transition("vollschutz");
    }
    async disarm() {
        await this.transition("unscharf");
    }
    async transition(target) {
        const previousMode = this.mode;
        if (previousMode === target) {
            return;
        }
        this.mode = target;
        await this.publish(previousMode, target, true);
    }
    async publish(previousMode, mode, emitEvent) {
        const derived = deriveZoneState(mode);
        await this.adapter.setStateAsync("zones.mode", mode, true);
        await this.adapter.setStateAsync("zones.perimeterActive", derived.perimeterActive, true);
        await this.adapter.setStateAsync("zones.aussenhautActive", derived.aussenhautActive, true);
        await this.adapter.setStateAsync("zones.innenraumActive", derived.innenraumActive, true);
        if (emitEvent) {
            this.bus.emit("modeChanged", { previousMode, mode, ts: Date.now() });
        }
    }
}
exports.ZoneEngine = ZoneEngine;
