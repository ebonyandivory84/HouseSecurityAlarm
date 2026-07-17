import { useCallback, useEffect, useState } from "react";
import { iobrokerClient } from "@/services/iobrokerClient";
import type { AlarmCenterMapping } from "@/types/domain";

const EMPTY_MAPPING: AlarmCenterMapping = {
  armedStateId: "",
  perimeterStateId: "",
  countdownStateId: "",
  sirenStateId: "",
  triggerStateId: "",
  displayStateId: "",
  buzzerStateId: "",
  ledRedStateId: "",
  ledYellowStateId: "",
  fingerprintStateId: "",
};

interface UseAlarmCenterMappingResult {
  mapping: AlarmCenterMapping;
  isLoading: boolean;
  error: string | null;
  save: (next: AlarmCenterMapping) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAlarmCenterMapping(): UseAlarmCenterMappingResult {
  const [mapping, setMapping] = useState<AlarmCenterMapping>(EMPTY_MAPPING);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await iobrokerClient.getConfig<AlarmCenterMapping>("/config/alarmcenter-mapping");
      setMapping(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (next: AlarmCenterMapping) => {
    try {
      await iobrokerClient.putConfig("/config/alarmcenter-mapping", next);
      setMapping(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return { mapping, isLoading, error, save, refresh };
}
