import { EventEmitter } from "events";
import type { RuleAction } from "../config/types";

export type ZoneMode = "unscharf" | "perimeter" | "aussenhaut" | "vollschutz";

export interface DomainEventMap {
  modeChanged: { previousMode: ZoneMode; mode: ZoneMode; ts: number };
  alarmTriggered: { reason: string; zone?: string; datapointId?: string; ts: number };
  alarmCleared: { ts: number };
  countdownStarted: { remainingSec: number; ts: number };
  countdownTick: { remainingSec: number };
  countdownStopped: { ts: number };
  datapointChanged: { datapointId: string; triggered: boolean; zone: string | null; ts: number };
  ruleTrace: { ruleId: string; ruleName: string; actions: RuleAction[]; ts: number };
  cameraSnapshot: { cameraId: string; url: string; ts: number };
}

type EventName = keyof DomainEventMap;

export class EventBus {
  private readonly emitter = new EventEmitter();

  public on<K extends EventName>(event: K, listener: (payload: DomainEventMap[K]) => void): void {
    this.emitter.on(event, listener);
  }

  public off<K extends EventName>(event: K, listener: (payload: DomainEventMap[K]) => void): void {
    this.emitter.off(event, listener);
  }

  public emit<K extends EventName>(event: K, payload: DomainEventMap[K]): void {
    this.emitter.emit(event, payload);
  }
}
