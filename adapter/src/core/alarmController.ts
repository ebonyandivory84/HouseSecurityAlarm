import type * as utils from "@iobroker/adapter-core";
import type { EventBus, DomainEventMap } from "./eventBus";
import { deriveZoneState, ZoneEngine } from "./zoneEngine";
import type { SensorAggregator } from "./sensorAggregator";
import { parseJsonObject } from "./json";
import { DEFAULT_ALARM_TIMING_CONFIG } from "../config/defaults";
import type { AlarmTimingConfig } from "../config/types";

export class AlarmController {
  private timing: AlarmTimingConfig = DEFAULT_ALARM_TIMING_CONFIG;
  private alarmActive = false;

  private exitGraceActive = false;
  private exitGraceTimer?: ReturnType<typeof setTimeout>;

  private entryCountdownTimer?: ReturnType<typeof setInterval>;
  private entryCountdownRemaining = 0;
  private entryPendingReason?: string;
  private entryPendingZone?: string;
  private entryPendingDatapointId?: string;

  public constructor(
    private readonly adapter: utils.AdapterInstance,
    private readonly bus: EventBus,
    private readonly zoneEngine: ZoneEngine,
    private readonly sensorAggregator: SensorAggregator
  ) {}

  public async init(): Promise<void> {
    const state = await this.adapter.getStateAsync("config.alarmTiming");
    this.timing = parseJsonObject<AlarmTimingConfig>(state?.val, DEFAULT_ALARM_TIMING_CONFIG);

    await this.adapter.setStateAsync("alarm.active", false, true);
    await this.adapter.setStateAsync("alarm.panicActive", false, true);
    await this.adapter.setStateAsync("countdown.active", false, true);

    this.bus.on("modeChanged", (payload) => void this.handleModeChanged(payload));
    this.bus.on("datapointChanged", (payload) => void this.handleDatapointChanged(payload));
  }

  public async panic(): Promise<void> {
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

  public dispose(): void {
    this.clearExitGrace();
    this.stopEntryCountdown();
  }

  private async handleModeChanged({ previousMode, mode }: DomainEventMap["modeChanged"]): Promise<void> {
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

  private async handleDatapointChanged(payload: DomainEventMap["datapointChanged"]): Promise<void> {
    await this.publishTriggeredZones();

    if (!payload.triggered || this.exitGraceActive) {
      return;
    }

    const derived = deriveZoneState(this.zoneEngine.getMode());
    const zoneActive =
      payload.zone === "perimeter"
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

  private async publishTriggeredZones(): Promise<void> {
    const ids = this.sensorAggregator.getTriggeredIds();
    const zones = [
      ...new Set(
        ids
          .map((id) => this.sensorAggregator.getDatapoint(id)?.zone)
          .filter((zone): zone is "perimeter" | "aussenhaut" | "innenraum" => Boolean(zone))
      ),
    ];
    await this.adapter.setStateAsync("zones.triggeredZones", JSON.stringify(zones), true);
  }

  private startExitGrace(): void {
    this.clearExitGrace();
    this.exitGraceActive = true;
    this.exitGraceTimer = setTimeout(() => {
      this.exitGraceActive = false;
      this.exitGraceTimer = undefined;
    }, this.timing.exitDelaySec * 1000);
  }

  private clearExitGrace(): void {
    if (this.exitGraceTimer) {
      clearTimeout(this.exitGraceTimer);
      this.exitGraceTimer = undefined;
    }
    this.exitGraceActive = false;
  }

  private startEntryCountdown(label: string, zone: string | undefined, datapointId: string): void {
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

  private async tickEntryCountdown(): Promise<void> {
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

  private stopEntryCountdown(): void {
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

  private async triggerAlarm(reason: string, zone: string | undefined, datapointId: string | undefined): Promise<void> {
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

  private async clearAlarm(): Promise<void> {
    if (!this.alarmActive) {
      return;
    }
    this.alarmActive = false;
    await this.adapter.setStateAsync("alarm.active", false, true);
    await this.adapter.setStateAsync("alarm.panicActive", false, true);
    this.bus.emit("alarmCleared", { ts: Date.now() });
  }
}
