import type * as utils from "@iobroker/adapter-core";
import type { SensorAggregator } from "../core/sensorAggregator";

export class CameraController {
  public constructor(
    private readonly adapter: utils.AdapterInstance,
    private readonly sensors: SensorAggregator
  ) {}

  public async setLed(cameraId: string, value: boolean): Promise<void> {
    const ledId = this.sensors.getDatapoint(cameraId)?.cameraCapabilities?.ledId;
    if (ledId) {
      await this.adapter.setForeignStateAsync(ledId, value, false);
    }
  }

  public async setSiren(cameraId: string, value: boolean): Promise<void> {
    const sirenId = this.sensors.getDatapoint(cameraId)?.cameraCapabilities?.sirenId;
    if (sirenId) {
      await this.adapter.setForeignStateAsync(sirenId, value, false);
    }
  }
}
