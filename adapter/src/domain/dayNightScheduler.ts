import type * as utils from "@iobroker/adapter-core";
import { getSunTimes } from "../core/sunCalc";
import { parseJsonObject } from "../core/json";
import type { DayNightConfig } from "../config/types";
import type { SensorAggregator } from "../core/sensorAggregator";

const EMPTY_CONFIG: DayNightConfig = {
  duskOffsetMin: 30,
  dawnOffsetMin: 30,
  useBrightnessOverride: false,
};

const POLL_INTERVAL_MS = 60_000;
const DAY_MS = 86_400_000;

type Mode = "day" | "dusk" | "night";

export class DayNightScheduler {
  private config: DayNightConfig = EMPTY_CONFIG;
  private mode: Mode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly adapter: utils.AdapterInstance,
    private readonly sensors: SensorAggregator
  ) {}

  public async init(): Promise<void> {
    const state = await this.adapter.getStateAsync("config.dayNight");
    this.config = parseJsonObject<DayNightConfig>(state?.val, EMPTY_CONFIG);

    await this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, POLL_INTERVAL_MS);
  }

  public dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    const mode = await this.computeMode();
    if (mode === this.mode) {
      return;
    }
    this.mode = mode;
    await this.adapter.setStateAsync("daynight.mode", mode, true);
    await this.adapter.setStateAsync("daynight.isNight", mode === "night", true);
  }

  private async computeMode(): Promise<Mode> {
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
      const { sunrise, sunset } = getSunTimes(day, latitude, longitude);
      const dawnStart = sunrise.getTime() - this.config.dawnOffsetMin * 60_000;
      const dawnEnd = sunrise.getTime() + this.config.dawnOffsetMin * 60_000;
      const duskStart = sunset.getTime() - this.config.duskOffsetMin * 60_000;
      const duskEnd = sunset.getTime() + this.config.duskOffsetMin * 60_000;

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
