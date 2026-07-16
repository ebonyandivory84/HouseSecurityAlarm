import * as utils from "@iobroker/adapter-core";

class HouseSecurityAlarm extends utils.Adapter {
  public constructor(options: Partial<utils.AdapterOptions> = {}) {
    super({
      ...options,
      name: "housesecurityalarm",
    });
    this.on("ready", this.onReady.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }

  private async onReady(): Promise<void> {
    await this.setStateAsync("info.connection", true, true);
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
