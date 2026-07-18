import { useCallback, useEffect, useState } from "react";
import { iobrokerClient } from "@/services/iobrokerClient";
import type { FloorplanConfig } from "@/types/domain";

const EMPTY_CONFIG: FloorplanConfig = { rooms: [] };

interface UseFloorplanConfigResult {
  config: FloorplanConfig;
  isLoading: boolean;
  error: string | null;
  save: (next: FloorplanConfig) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFloorplanConfig(): UseFloorplanConfigResult {
  const [config, setConfig] = useState<FloorplanConfig>(EMPTY_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await iobrokerClient.getConfig<FloorplanConfig>("/floorplan");
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

  const save = useCallback(async (next: FloorplanConfig) => {
    try {
      await iobrokerClient.putConfig("/floorplan", next);
      setConfig(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return { config, isLoading, error, save, refresh };
}
