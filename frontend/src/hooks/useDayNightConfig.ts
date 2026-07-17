import { useCallback, useEffect, useState } from "react";
import { iobrokerClient } from "@/services/iobrokerClient";
import type { DayNightConfig } from "@/types/domain";

const EMPTY_CONFIG: DayNightConfig = {
  duskOffsetMin: 30,
  dawnOffsetMin: 30,
  useBrightnessOverride: false,
};

interface UseDayNightConfigResult {
  config: DayNightConfig;
  isLoading: boolean;
  error: string | null;
  save: (next: DayNightConfig) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDayNightConfig(): UseDayNightConfigResult {
  const [config, setConfig] = useState<DayNightConfig>(EMPTY_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await iobrokerClient.getConfig<DayNightConfig>("/config/daynight");
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

  const save = useCallback(async (next: DayNightConfig) => {
    try {
      await iobrokerClient.putConfig("/config/daynight", next);
      setConfig(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return { config, isLoading, error, save, refresh };
}
