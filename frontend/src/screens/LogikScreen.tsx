import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ActionListEditor } from "@/components/logic/ActionListEditor";
import { ConditionGroupEditor } from "@/components/logic/ConditionGroupEditor";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAllDatapoints } from "@/hooks/useAllDatapoints";
import { useLogicRules } from "@/hooks/useLogicRules";
import { useTelegramTemplates } from "@/hooks/useTelegramTemplates";
import { palette, radius, spacing } from "@/theme/palette";
import { createDefaultLogicRule, SCOPE_MODE_LABELS, type LogicRule, type ScopeMode } from "@/types/logic";

const SCOPE_MODES: ScopeMode[] = ["perimeter", "aussenhaut", "vollschutz"];

export function LogikScreen(): React.JSX.Element {
  const { rules, isLoading, error, save } = useLogicRules();
  const { datapoints } = useAllDatapoints();
  const { templates: telegramTemplates } = useTelegramTemplates();
  const [draft, setDraft] = useState<LogicRule[]>(rules);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(rules);
  }, [rules]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(rules);
  const cameraDatapoints = datapoints.filter((dp) => dp.category === "camera");

  function updateRule(index: number, next: LogicRule): void {
    setDraft((prev) => prev.map((r, i) => (i === index ? next : r)));
  }

  function removeRule(index: number): void {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }

  function addRule(): void {
    const rule = createDefaultLogicRule();
    setDraft((prev) => [...prev, rule]);
    setExpandedId(rule.id);
  }

  function toggleScopeMode(rule: LogicRule, mode: ScopeMode, index: number): void {
    const has = rule.scopeModes.includes(mode);
    const next = has ? rule.scopeModes.filter((m) => m !== mode) : [...rule.scopeModes, mode];
    updateRule(index, { ...rule, scopeModes: next });
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      await save(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {draft.length === 0 ? (
          <GlassCard style={styles.card}>
            <Text style={styles.hint}>Keine Regeln konfiguriert. Unten eine hinzufügen.</Text>
          </GlassCard>
        ) : null}

        {draft.map((rule, index) => {
          const expanded = expandedId === rule.id;
          return (
            <GlassCard key={rule.id} style={styles.card}>
              <View style={styles.rowHeader}>
                <TextInput
                  value={rule.name}
                  onChangeText={(text) => updateRule(index, { ...rule, name: text })}
                  style={styles.nameInput}
                  placeholder="Regelname"
                  placeholderTextColor={palette.textSecondary}
                />
                <Pressable onPress={() => removeRule(index)} style={styles.deleteButton}>
                  <Text style={styles.deleteLabel}>Entfernen</Text>
                </Pressable>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Aktiv</Text>
                <Switch
                  value={rule.enabled}
                  onValueChange={(value) => updateRule(index, { ...rule, enabled: value })}
                  trackColor={{ true: palette.accent, false: palette.zoneOff }}
                />
              </View>

              <Text style={styles.fieldLabel}>Gültig in Modus</Text>
              <View style={styles.chipRow}>
                {SCOPE_MODES.map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => toggleScopeMode(rule, mode, index)}
                    style={[styles.chip, rule.scopeModes.includes(mode) && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipLabel, rule.scopeModes.includes(mode) && styles.chipLabelActive]}
                    >
                      {SCOPE_MODE_LABELS[mode]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => setExpandedId(expanded ? null : rule.id)}
                style={styles.expandButton}
              >
                <Text style={styles.expandLabel}>{expanded ? "Details einklappen" : "Bedingungen & Aktionen bearbeiten"}</Text>
              </Pressable>

              {expanded ? (
                <View style={styles.expandedSection}>
                  <Text style={styles.fieldLabel}>Wenn</Text>
                  <ConditionGroupEditor
                    group={rule.when}
                    onChange={(next) => updateRule(index, { ...rule, when: next })}
                    datapoints={datapoints}
                  />
                  <Text style={styles.fieldLabel}>Dann</Text>
                  <ActionListEditor
                    actions={rule.then}
                    onChange={(next) => updateRule(index, { ...rule, then: next })}
                    cameraDatapoints={cameraDatapoints}
                    telegramTemplates={telegramTemplates}
                  />
                </View>
              ) : null}
            </GlassCard>
          );
        })}

        <Pressable onPress={addRule} style={styles.addButton}>
          <Text style={styles.addLabel}>+ Neue Regel</Text>
        </Pressable>

        <Pressable
          onPress={() => void handleSave()}
          disabled={!dirty || saving}
          style={({ pressed }) => [styles.saveButton, { opacity: !dirty || saving ? 0.4 : pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.saveLabel}>{saving ? "Speichert…" : "Änderungen speichern"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  loading: { flex: 1, backgroundColor: palette.background, alignItems: "center", justifyContent: "center" },
  error: { color: palette.danger, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  hint: { color: palette.textSecondary, fontSize: 14 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  nameInput: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  deleteButton: { paddingVertical: 2 },
  deleteLabel: { color: palette.danger, fontSize: 12, fontWeight: "600" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { color: palette.textSecondary, fontSize: 13 },
  fieldLabel: { color: palette.textSecondary, fontSize: 12, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.glassBorder,
  },
  chipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  chipLabel: { color: palette.textSecondary, fontSize: 12 },
  chipLabelActive: { color: palette.background, fontWeight: "700" },
  expandButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    alignItems: "center",
  },
  expandLabel: { color: palette.accent, fontSize: 13, fontWeight: "600" },
  expandedSection: { gap: spacing.sm },
  addButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    borderWidth: 2,
    borderColor: palette.accent,
    alignItems: "center",
  },
  addLabel: { color: palette.accent, fontSize: 14, fontWeight: "700" },
  saveButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.chip,
    backgroundColor: palette.accent,
    alignItems: "center",
  },
  saveLabel: { color: palette.background, fontSize: 15, fontWeight: "700" },
});
