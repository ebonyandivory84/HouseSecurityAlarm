import type { ConditionGroup, ConditionLeaf, LogicRule, RuleAction } from "../config/types";
import type { SensorAggregator } from "./sensorAggregator";
import type { EventBus, ZoneMode } from "./eventBus";

export class RuleEvaluator {
  public constructor(
    private readonly sensors: SensorAggregator,
    private readonly bus?: EventBus
  ) {}

  public evaluateRules(rules: LogicRule[], mode: ZoneMode): RuleAction[] {
    const actions: RuleAction[] = [];
    for (const rule of rules) {
      if (!rule.enabled || !this.isScoped(rule, mode)) {
        continue;
      }
      if (this.evaluateGroup(rule.when)) {
        actions.push(...rule.then);
        this.bus?.emit("ruleTrace", { ruleId: rule.id, ruleName: rule.name, actions: rule.then, ts: Date.now() });
      }
    }
    return actions;
  }

  private isScoped(rule: LogicRule, mode: ZoneMode): boolean {
    if (mode === "unscharf") {
      return false;
    }
    return rule.scopeModes.includes(mode);
  }

  private evaluateGroup(group: ConditionGroup): boolean {
    const results = group.children.map((child) =>
      child.kind === "group" ? this.evaluateGroup(child) : this.evaluateLeaf(child)
    );
    return group.op === "AND" ? results.every(Boolean) : results.some(Boolean);
  }

  private evaluateLeaf(leaf: ConditionLeaf): boolean {
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
