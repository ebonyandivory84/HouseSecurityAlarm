import { useCallback, useEffect, useState } from "react";
import { iobrokerClient } from "@/services/iobrokerClient";
import type { TelegramTemplate } from "@/types/telegram";

interface UseTelegramTemplatesResult {
  templates: TelegramTemplate[];
  isLoading: boolean;
  error: string | null;
  save: (next: TelegramTemplate[]) => Promise<void>;
  testSend: (templateId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTelegramTemplates(): UseTelegramTemplatesResult {
  const [templates, setTemplates] = useState<TelegramTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await iobrokerClient.getConfig<TelegramTemplate[]>("/config/telegram-templates");
      setTemplates(next);
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

  const save = useCallback(async (next: TelegramTemplate[]) => {
    try {
      await iobrokerClient.putConfig("/config/telegram-templates", next);
      setTemplates(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const testSend = useCallback(async (templateId: string) => {
    try {
      await iobrokerClient.testSendTelegram(templateId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return { templates, isLoading, error, save, testSend, refresh };
}
