import type { AlarmCenterStatus, ZoneCommand } from "@/types/domain";

const API_BASE = "/housealarm/api";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const iobrokerClient = {
  async readStates(ids: string[]): Promise<Record<string, ioBroker.State | null>> {
    return requestJson("/states", { method: "POST", body: JSON.stringify({ ids }) });
  },

  async writeState(id: string, value: ioBroker.StateValue, ack = false): Promise<void> {
    await requestJson("/state", { method: "PUT", body: JSON.stringify({ id, value, ack }) });
  },

  async listObjects(pattern: string, type?: ioBroker.ObjectType): Promise<Record<string, ioBroker.Object>> {
    return requestJson("/objects", { method: "POST", body: JSON.stringify({ pattern, type }) });
  },

  async getAlarmCenterStatus(): Promise<AlarmCenterStatus> {
    return requestJson("/alarmcenter/status");
  },

  async sendAlarmCenterCommand(command: ZoneCommand): Promise<{ ok: boolean; mode: string }> {
    return requestJson("/alarmcenter/command", { method: "POST", body: JSON.stringify({ command }) });
  },

  async testSendTelegram(templateId: string, vars?: Record<string, unknown>): Promise<void> {
    await requestJson("/telegram/test-send", { method: "POST", body: JSON.stringify({ templateId, vars }) });
  },

  async getConfig<T>(path: string): Promise<T> {
    return requestJson(path);
  },

  async putConfig<T>(path: string, value: T): Promise<void> {
    await requestJson(path, { method: "PUT", body: JSON.stringify(value) });
  },
};

export function buildStatePushWsUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${API_BASE}/ws`;
}
