import type * as utils from "@iobroker/adapter-core";

interface ChannelDef {
  _id: string;
  common: ioBroker.ChannelCommon;
}

interface StateDef {
  _id: string;
  common: ioBroker.StateCommon;
}

const channels: ChannelDef[] = [
  { _id: "zones", common: { name: "Zonen" } },
  { _id: "commands", common: { name: "Befehle" } },
  { _id: "alarm", common: { name: "Alarm" } },
  { _id: "countdown", common: { name: "Countdown" } },
  { _id: "presence", common: { name: "Anwesenheit" } },
  { _id: "daynight", common: { name: "Tag-Nacht" } },
  { _id: "alarmcenter", common: { name: "AlarmCenter" } },
  { _id: "config", common: { name: "Konfiguration" } },
];

const states: StateDef[] = [
  {
    _id: "zones.mode",
    common: {
      name: "Modus",
      type: "string",
      role: "state",
      read: true,
      write: true,
      def: "unscharf",
      states: { unscharf: "unscharf", perimeter: "perimeter", aussenhaut: "aussenhaut", vollschutz: "vollschutz" },
    },
  },
  {
    _id: "zones.perimeterActive",
    common: { name: "Perimeter aktiv", type: "boolean", role: "indicator", read: true, write: false, def: false },
  },
  {
    _id: "zones.aussenhautActive",
    common: { name: "Außenhaut aktiv", type: "boolean", role: "indicator", read: true, write: false, def: false },
  },
  {
    _id: "zones.innenraumActive",
    common: { name: "Innenraum aktiv", type: "boolean", role: "indicator", read: true, write: false, def: false },
  },
  {
    _id: "zones.triggeredZones",
    common: { name: "Ausgelöste Zonen", type: "string", role: "json", read: true, write: false, def: "[]" },
  },

  {
    _id: "commands.armPerimeter",
    common: { name: "Perimeterschutz scharf", type: "boolean", role: "button", read: false, write: true, def: false },
  },
  {
    _id: "commands.armAussenhaut",
    common: { name: "Außenhautschutz scharf", type: "boolean", role: "button", read: false, write: true, def: false },
  },
  {
    _id: "commands.armVollschutz",
    common: { name: "Vollschutz scharf", type: "boolean", role: "button", read: false, write: true, def: false },
  },
  {
    _id: "commands.disarm",
    common: { name: "Unscharf schalten", type: "boolean", role: "button", read: false, write: true, def: false },
  },
  {
    _id: "commands.panic",
    common: { name: "Panik auslösen", type: "boolean", role: "button", read: false, write: true, def: false },
  },

  {
    _id: "alarm.active",
    common: { name: "Alarm aktiv", type: "boolean", role: "indicator.alarm", read: true, write: false, def: false },
  },
  {
    _id: "alarm.panicActive",
    common: { name: "Panik aktiv", type: "boolean", role: "indicator.alarm", read: true, write: false, def: false },
  },
  {
    _id: "alarm.triggerReason",
    common: { name: "Auslösegrund", type: "string", role: "text", read: true, write: false, def: "" },
  },
  {
    _id: "alarm.triggerZone",
    common: { name: "Auslösezone", type: "string", role: "text", read: true, write: false, def: "" },
  },
  {
    _id: "alarm.triggerDatapoint",
    common: { name: "Auslöse-Datenpunkt", type: "string", role: "text", read: true, write: false, def: "" },
  },
  {
    _id: "alarm.triggerTs",
    common: { name: "Auslösezeitpunkt", type: "number", role: "value.time", read: true, write: false, def: 0 },
  },

  {
    _id: "countdown.remainingSec",
    common: { name: "Verbleibende Sekunden", type: "number", role: "value.interval", read: true, write: false, def: 0 },
  },
  {
    _id: "countdown.active",
    common: { name: "Countdown aktiv", type: "boolean", role: "indicator", read: true, write: false, def: false },
  },

  {
    _id: "presence.confirmed",
    common: { name: "Anwesenheit bestätigt", type: "boolean", role: "indicator", read: true, write: true, def: false },
  },

  {
    _id: "daynight.isNight",
    common: { name: "Ist Nacht", type: "boolean", role: "indicator", read: true, write: false, def: false },
  },
  {
    _id: "daynight.mode",
    common: {
      name: "Tag-Nacht-Modus",
      type: "string",
      role: "state",
      read: true,
      write: false,
      def: "day",
      states: { day: "day", dusk: "dusk", night: "night" },
    },
  },

  {
    _id: "alarmcenter.online",
    common: { name: "AlarmCenter online", type: "boolean", role: "indicator.reachable", read: true, write: false, def: false },
  },
  {
    _id: "alarmcenter.fingerprintLastMatch",
    common: { name: "Letzter Fingerabdruck-Match", type: "string", role: "text", read: true, write: false, def: "" },
  },

  {
    _id: "config.datapointRegistry",
    common: { name: "Datenpunkt-Registry", type: "string", role: "json", read: true, write: true, def: "[]" },
  },
  {
    _id: "config.zoneAssignment",
    common: { name: "Zonen-Zuordnung", type: "string", role: "json", read: true, write: true, def: "{}" },
  },
  {
    _id: "config.rules",
    common: { name: "Logikregeln", type: "string", role: "json", read: true, write: true, def: "[]" },
  },
  {
    _id: "config.telegramTemplates",
    common: { name: "Telegram-Vorlagen", type: "string", role: "json", read: true, write: true, def: "[]" },
  },
  {
    _id: "config.dayNight",
    common: { name: "Tag-Nacht-Konfiguration", type: "string", role: "json", read: true, write: true, def: "{}" },
  },
  {
    _id: "config.presence",
    common: { name: "Anwesenheits-Konfiguration", type: "string", role: "json", read: true, write: true, def: "{}" },
  },
  {
    _id: "config.alarmCenterMapping",
    common: { name: "AlarmCenter-Zuordnung", type: "string", role: "json", read: true, write: true, def: "{}" },
  },
  {
    _id: "config.floorplan",
    common: { name: "Grundriss-Konfiguration", type: "string", role: "json", read: true, write: true, def: "{}" },
  },
  {
    _id: "config.alarmTiming",
    common: { name: "Alarm-Zeitkonfiguration", type: "string", role: "json", read: true, write: true, def: "{}" },
  },
];

export async function bootstrapObjectTree(adapter: utils.AdapterInstance): Promise<void> {
  for (const ch of channels) {
    await adapter.setObjectNotExistsAsync(ch._id, { type: "channel", common: ch.common, native: {} });
  }
  for (const st of states) {
    await adapter.setObjectNotExistsAsync(st._id, { type: "state", common: st.common, native: {} });
  }
}
