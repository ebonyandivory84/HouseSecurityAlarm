import axios from "axios";
import type * as utils from "@iobroker/adapter-core";
import type { EventBus } from "../core/eventBus";
import type { SensorAggregator } from "../core/sensorAggregator";
import type { ZoneEngine } from "../core/zoneEngine";

const SNAPSHOT_COOLDOWN_MS = 30_000;
const SNAPSHOT_MAX_RETRIES = 1;

const DETECTION_KEYS = ["personDetectionId", "animalDetectionId", "objectDetectionId"] as const;

export class CameraController {
  private readonly detectionIdToCameraId = new Map<string, string>();
  private readonly lastSnapshotAt = new Map<string, number>();

  public constructor(
    private readonly adapter: utils.AdapterInstance,
    private readonly sensors: SensorAggregator,
    private readonly bus: EventBus,
    private readonly zoneEngine: ZoneEngine
  ) {}

  public async init(): Promise<void> {
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

  public handleForeignStateChange(id: string, state: ioBroker.State | null | undefined): void {
    const cameraId = this.detectionIdToCameraId.get(id);
    if (!cameraId || !state?.val) {
      return;
    }
    if (this.zoneEngine.getMode() === "unscharf") {
      return;
    }
    void this.captureSnapshot(cameraId);
  }

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

  public async captureSnapshot(cameraId: string): Promise<void> {
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
        const response = await axios.get<ArrayBuffer>(sourceUrl, { responseType: "arraybuffer" });
        const contentType = String(response.headers["content-type"] ?? "").split(";")[0].trim();
        const buffer = Buffer.from(response.data);
        if (!contentType.startsWith("image/") || buffer.length === 0) {
          continue;
        }
        this.lastSnapshotAt.set(cameraId, Date.now());
        const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;
        this.bus.emit("cameraSnapshot", { cameraId, url: dataUri, ts: Date.now() });
        return;
      } catch {
        // retry, up to SNAPSHOT_MAX_RETRIES
      }
    }
  }
}
