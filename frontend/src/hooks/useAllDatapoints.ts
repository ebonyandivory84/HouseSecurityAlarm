import { useCallback, useEffect, useState } from "react";
import { iobrokerClient } from "@/services/iobrokerClient";
import type { DatapointConfig } from "@/types/domain";

interface UseAllDatapointsResult {
  datapoints: DatapointConfig[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAllDatapoints(): UseAllDatapointsResult {
  const [datapoints, setDatapoints] = useState<DatapointConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await iobrokerClient.getConfig<DatapointConfig[]>("/config/datapoints/all");
      setDatapoints(next);
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

  return { datapoints, isLoading, error, refresh };
}
