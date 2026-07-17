export type ZoneMode = "unscharf" | "perimeter" | "aussenhaut" | "vollschutz";

export type ZoneCommand = "armPerimeter" | "armAussenhaut" | "armVollschutz" | "disarm";

export interface AlarmCenterStatus {
  mode: ZoneMode;
  alarmActive: boolean;
  panicActive: boolean;
  countdownActive: boolean;
  countdownRemainingSec: number;
  alarmCenterOnline: boolean;
  triggerReason: string | null;
  triggerZone: string | null;
  triggeredDatapointIds: string[];
}

export interface DerivedZoneState {
  perimeterActive: boolean;
  aussenhautActive: boolean;
  innenraumActive: boolean;
}

export function deriveZoneState(mode: ZoneMode): DerivedZoneState {
  return {
    perimeterActive: mode !== "unscharf",
    aussenhautActive: mode === "aussenhaut" || mode === "vollschutz",
    innenraumActive: mode === "vollschutz",
  };
}

export const ZONE_MODE_LABELS: Record<ZoneMode, string> = {
  unscharf: "Unscharf",
  perimeter: "Perimeterschutz",
  aussenhaut: "Außenhautschutz",
  vollschutz: "Vollschutz",
};
