import type * as utils from "@iobroker/adapter-core";
import { parseJsonArray } from "../core/json";
import type { TelegramTemplate } from "../config/types";

function render(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

export class TelegramNotifier {
  public constructor(private readonly adapter: utils.AdapterInstance) {}

  public async notifyByTriggerId(datapointId: string, vars: Record<string, string> = {}): Promise<void> {
    const template = (await this.loadTemplates()).find((t) => t.triggerId === datapointId);
    if (template) {
      await this.send(template, vars);
    }
  }

  public async notifyByTemplateId(templateId: string, vars: Record<string, string> = {}): Promise<void> {
    const template = (await this.loadTemplates()).find((t) => t.id === templateId);
    if (template) {
      await this.send(template, vars);
    }
  }

  private async send(template: TelegramTemplate, vars: Record<string, string>): Promise<void> {
    const text = render(template.messageText, vars);
    await this.adapter.sendTo("telegram.0", "send", { text });
  }

  private async loadTemplates(): Promise<TelegramTemplate[]> {
    const state = await this.adapter.getStateAsync("config.telegramTemplates");
    return parseJsonArray<TelegramTemplate>(state?.val);
  }
}
