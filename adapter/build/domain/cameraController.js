"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CameraController = void 0;
class CameraController {
    constructor(adapter, sensors) {
        this.adapter = adapter;
        this.sensors = sensors;
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
}
exports.CameraController = CameraController;
