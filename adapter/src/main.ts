import * as utils from "@iobroker/adapter-core";
import { bootstrapObjectTree } from "./objects/objectTree";
import { EventBus } from "./core/eventBus";
import { ZoneEngine } from "./core/zoneEngine";
import { SensorAggregator } from "./core/sensorAggregator";
import { AlarmController } from "./core/alarmController";
import { parseJsonArray } from "./core/json";
import { RuleEvaluator } from "./core/ruleEvaluator";
import { TelegramNotifier } from "./domain/telegram";
import { CameraController } from "./domain/cameraController";
import { AlarmCenterBridge } from "./domain/alarmCenterBridge";
import { DayNightScheduler } from "./domain/dayNightScheduler";
import { PresenceTracker } from "./domain/presenceTracker";
import { startApiServer, type ApiServerHandle } from "./api/server";
import type { LogicRule } from "./config/types";

const COMMAND_HANDLERS: Record<string, keyof Pick<ZoneEngine, "armPerimeter" | "armAussenhaut" | "armVollschutz" | "disarm">> = {
  "commands.armPerimeter": "armPerimeter",
  "commands.armAussenhaut": "armAussenhaut",
  "commands.armVollschutz": "armVollschutz",
  "commands.disarm": "disarm",
};

class HouseSecurityAlarm extends utils.Adapter {
  private readonly bus = new EventBus();
  private zoneEngine!: ZoneEngine;
  private sensorAggregator!: SensorAggregator;
  private alarmController!: AlarmController;
  private ruleEvaluator!: RuleEvaluator;
  private telegramNotifier!: TelegramNotifier;
  private cameraController!: CameraController;
  private alarmCenterBridge!: AlarmCenterBridge;
  private dayNightScheduler!: DayNightScheduler;
  private presenceTracker!: PresenceTracker;
  private apiServer?: ApiServerHandle;

  public constructor(options: Partial<utils.AdapterOptions> = {}) {
    super({
      ...options,
      name: "housesecurityalarm",
      useFormatDate: true,
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }

  private async onReady(): Promise<void> {
    await bootstrapObjectTree(this);

    this.zoneEngine = new ZoneEngine(this, this.bus);
    await this.zoneEngine.init();

    this.sensorAggregator = new SensorAggregator(this, this.bus);
    await this.sensorAggregator.init();

    this.alarmController = new AlarmController(this, this.bus, this.zoneEngine, this.sensorAggregator);
    await this.alarmController.init();
    this.ruleEvaluator = new RuleEvaluator(this.sensorAggregator, this.bus);

    this.telegramNotifier = new TelegramNotifier(this);
    this.cameraController = new CameraController(this, this.sensorAggregator, this.bus, this.zoneEngine);
    await this.cameraController.init();

    this.alarmCenterBridge = new AlarmCenterBridge(this, this.bus, this.zoneEngine);
    await this.alarmCenterBridge.init();

    this.dayNightScheduler = new DayNightScheduler(this, this.sensorAggregator);
    await this.dayNightScheduler.init();

    this.presenceTracker = new PresenceTracker(this, this.bus, this.sensorAggregator, this.zoneEngine);
    await this.presenceTracker.init();

    this.apiServer = await startApiServer({
      adapter: this,
      bus: this.bus,
      zoneEngine: this.zoneEngine,
      sensorAggregator: this.sensorAggregator,
      telegramNotifier: this.telegramNotifier,
    });

    await this.subscribeStatesAsync("commands.*");
    await this.setStateAsync("info.connection", true, true);
  }

  private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
    if (!state) {
      return;
    }

    if (!state.ack && state.val === true) {
      if (id.endsWith("commands.panic")) {
        await this.alarmController.panic();
        await this.setStateAsync(id, false, true);
        return;
      }

      const suffix = Object.keys(COMMAND_HANDLERS).find((key) => id.endsWith(key));
      if (suffix) {
        await this.zoneEngine[COMMAND_HANDLERS[suffix]]();
        await this.setStateAsync(id, false, true);
        return;
      }
    }

    if (this.alarmCenterBridge.isFingerprintState(id)) {
      await this.alarmCenterBridge.handleFingerprintMatch(state);
      return;
    }

    if (this.sensorAggregator.getDatapoint(id)) {
      this.sensorAggregator.handleForeignStateChange(id, state);
      await this.runRules();
      return;
    }

    this.cameraController.handleForeignStateChange(id, state);
  }

  private async runRules(): Promise<void> {
    const rulesState = await this.getStateAsync("config.rules");
    const rules = parseJsonArray<LogicRule>(rulesState?.val);
    const actions = this.ruleEvaluator.evaluateRules(rules, this.zoneEngine.getMode());
    for (const action of actions) {
      switch (action.type) {
        case "setState":
          await this.setForeignStateAsync(action.stateId, action.value as ioBroker.StateValue, true);
          break;
        case "telegram":
          await this.telegramNotifier.notifyByTemplateId(action.templateId);
          break;
        case "cameraLed":
          await this.cameraController.setLed(action.cameraId, action.value);
          break;
        case "cameraSiren":
          await this.cameraController.setSiren(action.cameraId, action.value);
          break;
      }
    }
  }

  private async onUnload(callback: () => void): Promise<void> {
    try {
      this.dayNightScheduler?.dispose();
      this.alarmController?.dispose();
      await this.apiServer?.dispose();
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
