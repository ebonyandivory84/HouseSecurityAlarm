"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CameraController = void 0;
const axios_1 = __importDefault(require("axios"));
const SNAPSHOT_COOLDOWN_MS = 30000;
const SNAPSHOT_MAX_RETRIES = 1;
const DETECTION_KEYS = ["personDetectionId", "animalDetectionId", "objectDetectionId"];
class CameraController {
    constructor(adapter, sensors, bus, zoneEngine) {
        this.adapter = adapter;
        this.sensors = sensors;
        this.bus = bus;
        this.zoneEngine = zoneEngine;
        this.detectionIdToCameraId = new Map();
        this.lastSnapshotAt = new Map();
    }
    async init() {
        this.detectionIdToCameraId.clear();
        const cameras = this.sensors.getDatapointsByCategory("camera");
        for (const dp of cameras) {
            for (const key of DETECTION_KEYS) {
                const detectionId = dp.cameraCapabilities?.[key];
                if (detectionId) {
                    this.detectionIdToCameraId.set(detectionId, dp.id);
                    await this.adapter.subscribeForeignStatesAsync(detectionId);
                }
            }
        }
    }
    handleForeignStateChange(id, state) {
        const cameraId = this.detectionIdToCameraId.get(id);
        if (!cameraId || !state?.val) {
            return;
        }
        if (this.zoneEngine.getMode() === "unscharf") {
            return;
        }
        void this.captureSnapshot(cameraId);
    }
    async setLed(cameraId, value) {
        const ledId = this.sensors.getDatapoint(cameraId)?.cameraCapabilities?.ledId;
        if (ledId) {
            await this.adapter.setForeignStateAsync(ledId, value, false);
        }
    }
    async setSiren(cameraId, value) {
        const sirenId = this.sensors.getDatapoint(cameraId)?.cameraCapabilities?.sirenId;
        if (sirenId) {
            await this.adapter.setForeignStateAsync(sirenId, value, false);
        }
    }
    async captureSnapshot(cameraId) {
        const lastAt = this.lastSnapshotAt.get(cameraId) ?? 0;
        if (Date.now() - lastAt < SNAPSHOT_COOLDOWN_MS) {
            return;
        }
        const snapshotStateId = this.sensors.getDatapoint(cameraId)?.cameraCapabilities?.snapshotStateId;
        if (!snapshotStateId) {
            return;
        }
        const snapshotState = await this.adapter.getForeignStateAsync(snapshotStateId);
        const sourceUrl = snapshotState?.val;
        if (typeof sourceUrl !== "string" || !sourceUrl) {
            return;
        }
        for (let attempt = 0; attempt <= SNAPSHOT_MAX_RETRIES; attempt++) {
            try {
                const response = await axios_1.default.get(sourceUrl, { responseType: "arraybuffer" });
                const contentType = String(response.headers["content-type"] ?? "").split(";")[0].trim();
                const buffer = Buffer.from(response.data);
                if (!contentType.startsWith("image/") || buffer.length === 0) {
                    continue;
                }
                this.lastSnapshotAt.set(cameraId, Date.now());
                const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;
                this.bus.emit("cameraSnapshot", { cameraId, url: dataUri, ts: Date.now() });
                return;
            }
            catch {
                // retry, up to SNAPSHOT_MAX_RETRIES
            }
        }
    }
}
exports.CameraController = CameraController;
