import type * as utils from "@iobroker/adapter-core";
import { EventBus } from "../core/eventBus";
import { parseJsonObject } from "../core/json";
import type { PresenceConfig } from "../config/types";
import type { SensorAggregator } from "../core/sensorAggregator";
import type { ZoneEngine } from "../core/zoneEngine";

const EMPTY_CONFIG: PresenceConfig = {
  datapointIds: [],
  autoDisarmOnPresence: false,
};

export class PresenceTracker {
  private config: PresenceConfig = EMPTY_CONFIG;
  private confirmed = false;

  public constructor(
    private readonly adapter: utils.AdapterInstance,
    private readonly bus: EventBus,
    private readonly sensors: SensorAggregator,
    private readonly zoneEngine: ZoneEngine
  ) {}

  public async init(): Promise<void> {
    const state = await this.adapter.getStateAsync("config.presence");
    this.config = parseJsonObject<PresenceConfig>(state?.val, EMPTY_CONFIG);

    this.bus.on("datapointChanged", (payload) => {
      if (this.config.datapointIds.includes(payload.datapointId)) {
        void this.recompute();
      }
    });
  }

  private async recompute(): Promise<void> {
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
