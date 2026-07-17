import type * as utils from "@iobroker/adapter-core";
import type { EventBus } from "../core/eventBus";
import type { ZoneEngine } from "../core/zoneEngine";
import type { SensorAggregator } from "../core/sensorAggregator";
import type { TelegramNotifier } from "../domain/telegram";

export interface ApiDeps {
  adapter: utils.AdapterInstance;
  bus: EventBus;
  zoneEngine: ZoneEngine;
  sensorAggregator: SensorAggregator;
  telegramNotifier: TelegramNotifier;
}
