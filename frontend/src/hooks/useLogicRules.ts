import { useCallback, useEffect, useState } from "react";
import { iobrokerClient } from "@/services/iobrokerClient";
import type { LogicRule } from "@/types/logic";

interface UseLogicRulesResult {
  rules: LogicRule[];
  isLoading: boolean;
  error: string | null;
  save: (next: LogicRule[]) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useLogicRules(): UseLogicRulesResult {
  const [rules, setRules] = useState<LogicRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await iobrokerClient.getConfig<LogicRule[]>("/config/rules");
      setRules(next);
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

  const save = useCallback(async (next: LogicRule[]) => {
    try {
      await iobrokerClient.putConfig("/config/rules", next);
      setRules(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return { rules, isLoading, error, save, refresh };
}
