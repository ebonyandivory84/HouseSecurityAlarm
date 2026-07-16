"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEvaluator = void 0;
class RuleEvaluator {
    constructor(sensors) {
        this.sensors = sensors;
    }
    evaluateRules(rules, mode) {
        const actions = [];
        for (const rule of rules) {
            if (!rule.enabled || !this.isScoped(rule, mode)) {
                continue;
            }
            if (this.evaluateGroup(rule.when)) {
                actions.push(...rule.then);
            }
        }
        return actions;
    }
    isScoped(rule, mode) {
        if (mode === "unscharf") {
            return false;
        }
        return rule.scopeModes.includes(mode);
    }
    evaluateGroup(group) {
        const results = group.children.map((child) => child.kind === "group" ? this.evaluateGroup(child) : this.evaluateLeaf(child));
        return group.op === "AND" ? results.every(Boolean) : results.some(Boolean);
    }
    evaluateLeaf(leaf) {
        const comparator = leaf.comparator ?? "triggered";
        switch (comparator) {
            case "triggered":
                return this.sensors.isTriggered(leaf.datapointId);
            case "equals":
                return this.sensors.getRawValue(leaf.datapointId) === leaf.value;
            case "above":
                return Number(this.sensors.getRawValue(leaf.datapointId)) > Number(leaf.value);
            case "below":
                return Number(this.sensors.getRawValue(leaf.datapointId)) < Number(leaf.value);
            default:
                return false;
        }
    }
}
exports.RuleEvaluator = RuleEvaluator;
