import { useCallback, useEffect, useState } from "react";
import { iobrokerClient } from "@/services/iobrokerClient";
import type { PresenceConfig } from "@/types/domain";

const EMPTY_CONFIG: PresenceConfig = {
  datapointIds: [],
  autoDisarmOnPresence: false,
};

interface UsePresenceConfigResult {
  config: PresenceConfig;
  isLoading: boolean;
  error: string | null;
  save: (next: PresenceConfig) => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePresenceConfig(): UsePresenceConfigResult {
  const [config, setConfig] = useState<PresenceConfig>(EMPTY_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await iobrokerClient.getConfig<PresenceConfig>("/config/presence");
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

  const save = useCallback(async (next: PresenceConfig) => {
    try {
      await iobrokerClient.putConfig("/config/presence", next);
      setConfig(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return { config, isLoading, error, save, refresh };
}
