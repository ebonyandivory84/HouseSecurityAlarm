import type * as utils from "@iobroker/adapter-core";
import { EventBus } from "../core/eventBus";
import { parseJsonObject } from "../core/json";
import type { AlarmCenterMapping } from "../config/types";
import type { ZoneEngine } from "../core/zoneEngine";

const EMPTY_MAPPING: AlarmCenterMapping = {
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

export class AlarmCenterBridge {
  private mapping: AlarmCenterMapping = EMPTY_MAPPING;

  public constructor(
    private readonly adapter: utils.AdapterInstance,
    private readonly bus: EventBus,
    private readonly zoneEngine: ZoneEngine
  ) {}

  public async init(): Promise<void> {
    const state = await this.adapter.getStateAsync("config.alarmCenterMapping");
    this.mapping = parseJsonObject<AlarmCenterMapping>(state?.val, EMPTY_MAPPING);

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

  public isFingerprintState(id: string): boolean {
    return this.mapping.fingerprintStateId !== "" && id === this.mapping.fingerprintStateId;
  }

  public async handleFingerprintMatch(state: ioBroker.State): Promise<void> {
    if (!state.val) {
      return;
    }
    await this.adapter.setStateAsync("alarmcenter.fingerprintLastMatch", Date.now(), true);
    await this.zoneEngine.disarm();
  }

  private async pushMode(mode: string): Promise<void> {
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

  private async pushAlarm(active: boolean): Promise<void> {
    if (this.mapping.sirenStateId) {
      await this.adapter.setForeignStateAsync(this.mapping.sirenStateId, active, false);
    }
    if (this.mapping.ledRedStateId) {
      await this.adapter.setForeignStateAsync(this.mapping.ledRedStateId, active, false);
    }
  }

  private async pushCountdown(remainingSec: number, active: boolean): Promise<void> {
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
