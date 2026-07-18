// SYNC: adapter/src/config/types.ts ↔ frontend/src/types/telegram.ts — bei Änderung beide Seiten pflegen
export interface TelegramTemplate {
  id: string;
  triggerId: string;
  messageText: string;
  includeSnapshot: boolean;
  snapshotCameraId?: string;
  caption?: string;
}

export function createDefaultTelegramTemplate(id: string): TelegramTemplate {
  return {
    id,
    triggerId: "",
    messageText: "Alarm ausgelöst: {reason}",
    includeSnapshot: false,
  };
}
