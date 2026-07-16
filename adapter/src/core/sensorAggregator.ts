import type * as utils from "@iobroker/adapter-core";
import { EventBus } from "./eventBus";
import { parseJsonArray } from "./json";
import type { DatapointConfig } from "../config/types";

export class SensorAggregator {
  private readonly datapoints = new Map<string, DatapointConfig>();
  private readonly triggeredState = new Map<string, boolean>();
  private readonly rawValues = new Map<string, unknown>();

  public constructor(
    private readonly adapter: utils.AdapterInstance,
    private readonly bus: EventBus
  ) {}

  public async init(): Promise<void> {
    const registryState = await this.adapter.getStateAsync("config.datapointRegistry");
    const registry = parseJsonArray<DatapointConfig>(registryState?.val);
    for (const dp of registry) {
      if (!dp.enabled) {
        continue;
      }
      this.datapoints.set(dp.id, dp);
      this.triggeredState.set(dp.id, false);
      await this.adapter.subscribeForeignStatesAsync(dp.id);
    }
  }

  public getDatapoint(id: string): DatapointConfig | undefined {
    return this.datapoints.get(id);
  }

  public isTriggered(id: string): boolean {
    return this.triggeredState.get(id) ?? false;
  }

  public getRawValue(id: string): unknown {
    return this.rawValues.get(id);
  }

  public getTriggeredIds(): string[] {
    return [...this.triggeredState.entries()].filter(([, triggered]) => triggered).map(([id]) => id);
  }

  public handleForeignStateChange(id: string, state: ioBroker.State | null | undefined): void {
    const dp = this.datapoints.get(id);
    if (!dp || !state) {
      return;
    }
    this.rawValues.set(id, state.val);
    const triggered = this.normalize(dp, state.val);
    const previous = this.triggeredState.get(id) ?? false;
    this.triggeredState.set(id, triggered);
    if (triggered !== previous) {
      this.bus.emit("datapointChanged", { datapointId: id, triggered, zone: dp.zone ?? null, ts: Date.now() });
    }
  }

  private normalize(dp: DatapointConfig, val: unknown): boolean {
    if (dp.valueType === "boolean") {
      return Boolean(val);
    }
    return typeof val === "string" && dp.triggerString !== undefined && val === dp.triggerString;
  }
}
