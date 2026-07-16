"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramNotifier = void 0;
const json_1 = require("../core/json");
function render(text, vars) {
    return text.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
}
class TelegramNotifier {
    constructor(adapter) {
        this.adapter = adapter;
    }
    async notifyByTriggerId(datapointId, vars = {}) {
        const template = (await this.loadTemplates()).find((t) => t.triggerId === datapointId);
        if (template) {
            await this.send(template, vars);
        }
    }
    async notifyByTemplateId(templateId, vars = {}) {
        const template = (await this.loadTemplates()).find((t) => t.id === templateId);
        if (template) {
            await this.send(template, vars);
        }
    }
    async send(template, vars) {
        const text = render(template.messageText, vars);
        await this.adapter.sendTo("telegram.0", "send", { text });
    }
    async loadTemplates() {
        const state = await this.adapter.getStateAsync("config.telegramTemplates");
        return (0, json_1.parseJsonArray)(state?.val);
    }
}
exports.TelegramNotifier = TelegramNotifier;
