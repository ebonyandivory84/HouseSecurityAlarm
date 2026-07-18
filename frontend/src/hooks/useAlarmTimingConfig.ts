import { useCallback, useEffect, useState } from "react";
import { iobrokerClient } from "@/services/iobrokerClient";
import type { AlarmTimingConfig } from "@/types/domain";

const EMPTY_CONFIG: AlarmTimingConfig = {
  exitDelaySec: 30,
  entryDelaySec: 30,
};

interface UseAlarmTimingConfigResult {
  config: AlarmTimingConfig;
  isLoading: boolean;
  error: string | null;
  save: (next: AlarmTimingConfig) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAlarmTimingConfig(): UseAlarmTimingConfigResult {
  const [config, setConfig] = useState<AlarmTimingConfig>(EMPTY_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await iobrokerClient.getConfig<AlarmTimingConfig>("/config/alarmtiming");
      setConfig(next);
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

  const save = useCallback(async (next: AlarmTimingConfig) => {
    try {
      await iobrokerClient.putConfig("/config/alarmtiming", next);
      setConfig(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return { config, isLoading, error, save, refresh };
}
