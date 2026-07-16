import type * as utils from "@iobroker/adapter-core";
import { EventBus, ZoneMode } from "./eventBus";

export interface DerivedZoneState {
  perimeterActive: boolean;
  aussenhautActive: boolean;
  innenraumActive: boolean;
}

const VALID_MODES: ZoneMode[] = ["unscharf", "perimeter", "aussenhaut", "vollschutz"];

export function deriveZoneState(mode: ZoneMode): DerivedZoneState {
  return {
    perimeterActive: mode !== "unscharf",
    aussenhautActive: mode === "aussenhaut" || mode === "vollschutz",
    innenraumActive: mode === "vollschutz",
  };
}

export class ZoneEngine {
  private mode: ZoneMode = "unscharf";

  public constructor(
    private readonly adapter: utils.AdapterInstance,
    private readonly bus: EventBus
  ) {}

  public getMode(): ZoneMode {
    return this.mode;
  }

  public async init(): Promise<void> {
    const state = await this.adapter.getStateAsync("zones.mode");
    const restored = state?.val;
    if (typeof restored === "string" && (VALID_MODES as string[]).includes(restored)) {
      this.mode = restored as ZoneMode;
    }
    await this.publish(this.mode, this.mode, false);
  }

  public async armPerimeter(): Promise<void> {
    await this.transition("perimeter");
  }

  public async armAussenhaut(): Promise<void> {
    await this.transition("aussenhaut");
  }

  public async armVollschutz(): Promise<void> {
    await this.transition("vollschutz");
  }

  public async disarm(): Promise<void> {
    await this.transition("unscharf");
  }

  private async transition(target: ZoneMode): Promise<void> {
    const previousMode = this.mode;
    if (previousMode === target) {
      return;
    }
    this.mode = target;
    await this.publish(previousMode, target, true);
  }

  private async publish(previousMode: ZoneMode, mode: ZoneMode, emitEvent: boolean): Promise<void> {
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
