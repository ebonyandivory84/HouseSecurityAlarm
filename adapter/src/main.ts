import * as utils from "@iobroker/adapter-core";
import { bootstrapObjectTree } from "./objects/objectTree";
import { EventBus } from "./core/eventBus";
import { ZoneEngine } from "./core/zoneEngine";

const COMMAND_HANDLERS: Record<string, keyof Pick<ZoneEngine, "armPerimeter" | "armAussenhaut" | "armVollschutz" | "disarm">> = {
  "commands.armPerimeter": "armPerimeter",
  "commands.armAussenhaut": "armAussenhaut",
  "commands.armVollschutz": "armVollschutz",
  "commands.disarm": "disarm",
};

class HouseSecurityAlarm extends utils.Adapter {
  private readonly bus = new EventBus();
  private zoneEngine!: ZoneEngine;

  public constructor(options: Partial<utils.AdapterOptions> = {}) {
    super({
      ...options,
      name: "housesecurityalarm",
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }

  private async onReady(): Promise<void> {
    await bootstrapObjectTree(this);

    this.zoneEngine = new ZoneEngine(this, this.bus);
    await this.zoneEngine.init();

    await this.subscribeStatesAsync("commands.*");
    await this.setStateAsync("info.connection", true, true);
  }

  private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
    if (!state || state.ack || state.val !== true) {
      return;
    }
    const suffix = Object.keys(COMMAND_HANDLERS).find((key) => id.endsWith(key));
    if (!suffix) {
      return;
    }
    await this.zoneEngine[COMMAND_HANDLERS[suffix]]();
    await this.setStateAsync(id, false, true);
  }

  private onUnload(callback: () => void): void {
    try {
      callback();
    } catch {
      callback();
    }
  }
}

export function startAdapter(options: Partial<utils.AdapterOptions> = {}): HouseSecurityAlarm {
  return new HouseSecurityAlarm(options);
}

if (require.main !== module) {
  module.exports = startAdapter;
} else {
  startAdapter();
}
