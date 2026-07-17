import React, { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { DatapointPickerModal } from "@/components/logic/DatapointPickerModal";
import { palette, radius, spacing } from "@/theme/palette";
import {
  ACTION_TYPE_LABELS,
  createDefaultAction,
  type RuleAction,
  type RuleActionType,
} from "@/types/logic";
import type { DatapointConfig } from "@/types/domain";
import type { TelegramTemplate } from "@/types/telegram";

const ACTION_TYPES: RuleActionType[] = ["setState", "telegram", "cameraLed", "cameraSiren"];

interface ActionListEditorProps {
  actions: RuleAction[];
  onChange: (next: RuleAction[]) => void;
  cameraDatapoints: DatapointConfig[];
  telegramTemplates: TelegramTemplate[];
}

export function ActionListEditor({
  actions,
  onChange,
  cameraDatapoints,
  telegramTemplates,
}: ActionListEditorProps): React.JSX.Element {
  function updateAction(index: number, next: RuleAction): void {
    onChange(actions.map((a, i) => (i === index ? next : a)));
  }

  function removeAction(index: number): void {
    onChange(actions.filter((_, i) => i !== index));
  }

  function moveAction(index: number, dir: -1 | 1): void {
    const target = index + dir;
    if (target < 0 || target >= actions.length) return;
    const next = [...actions];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    onChange(next);
  }

  function addAction(type: RuleActionType): void {
    onChange([...actions, createDefaultAction(type)]);
  }

  return (
    <View style={styles.container}>
      {actions.length === 0 ? <Text style={styles.emptyHint}>Keine Aktionen.</Text> : null}
      {actions.map((action, index) => (
        <ActionRow
          key={index}
          action={action}
          onChange={(next) => updateAction(index, next)}
          onRemove={() => removeAction(index)}
          onMoveUp={index > 0 ? () => moveAction(index, -1) : undefined}
          onMoveDown={index < actions.length - 1 ? () => moveAction(index, 1) : undefined}
          cameraDatapoints={cameraDatapoints}
          telegramTemplates={telegramTemplates}
        />
      ))}
      <View style={styles.addRow}>
        {ACTION_TYPES.map((type) => (
          <Pressable key={type} onPress={() => addAction(type)} style={styles.addButton}>
            <Text style={styles.addLabel}>+ {ACTION_TYPE_LABELS[type]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

interface ActionRowProps {
  action: RuleAction;
  onChange: (next: RuleAction) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  cameraDatapoints: DatapointConfig[];
  telegramTemplates: TelegramTemplate[];
}

function ActionRow({
  action,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  cameraDatapoints,
  telegramTemplates,
}: ActionRowProps): React.JSX.Element {
  const [cameraPickerVisible, setCameraPickerVisible] = useState(false);
  const cameraLabel =
    action.type === "cameraLed" || action.type === "cameraSiren"
      ? cameraDatapoints.find((dp) => dp.id === action.cameraId)?.label ?? action.cameraId
      : "";

  return (
    <View style={styles.row}>
      <View style={styles.topRow}>
        <Text style={styles.typeLabel}>{ACTION_TYPE_LABELS[action.type]}</Text>
        <View style={styles.moveGroup}>
          {onMoveUp ? (
            <Pressable onPress={onMoveUp} style={styles.moveButton}>
              <Text style={styles.moveLabel}>▲</Text>
            </Pressable>
          ) : null}
          {onMoveDown ? (
            <Pressable onPress={onMoveDown} style={styles.moveButton}>
              <Text style={styles.moveLabel}>▼</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onRemove} style={styles.removeButton}>
            <Text style={styles.removeLabel}>×</Text>
          </Pressable>
        </View>
      </View>

      {action.type === "setState" ? (
        <View style={styles.fields}>
          <TextInput
            value={action.stateId}
            onChangeText={(text) => onChange({ ...action, stateId: text })}
            placeholder="State-ID"
            placeholderTextColor={palette.textSecondary}
            style={styles.input}
          />
          <TextInput
            value={String(action.value ?? "")}
            onChangeText={(text) => onChange({ ...action, value: coerce(text) })}
            placeholder="Wert"
            placeholderTextColor={palette.textSecondary}
            style={styles.input}
          />
        </View>
      ) : null}

      {action.type === "telegram" ? (
        <View style={styles.fields}>
          <View style={styles.chipRow}>
            {telegramTemplates.length === 0 ? (
              <Text style={styles.emptyHint}>Keine Vorlagen vorhanden.</Text>
            ) : null}
            {telegramTemplates.map((tpl) => (
              <Pressable
                key={tpl.id}
                onPress={() => onChange({ ...action, templateId: tpl.id })}
                style={[styles.chip, action.templateId === tpl.id && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, action.templateId === tpl.id && styles.chipLabelActive]} numberOfLines={1}>
                  {tpl.triggerId || tpl.id}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={action.withSnapshot ?? ""}
            onChangeText={(text) => onChange({ ...action, withSnapshot: text || undefined })}
            placeholder="Snapshot-Kamera-ID (optional)"
            placeholderTextColor={palette.textSecondary}
            style={styles.input}
          />
        </View>
      ) : null}

      {action.type === "cameraLed" || action.type === "cameraSiren" ? (
        <View style={styles.fields}>
          <Pressable style={styles.input} onPress={() => setCameraPickerVisible(true)}>
            <Text style={styles.datapointLabel} numberOfLines={1}>
              {cameraLabel || "Kamera wählen"}
            </Text>
          </Pressable>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Ein</Text>
            <Switch
              value={action.value}
              onValueChange={(v) => onChange({ ...action, value: v })}
              trackColor={{ true: palette.accent, false: palette.glassBorder }}
            />
          </View>
          <DatapointPickerModal
            visible={cameraPickerVisible}
            title="Kamera wählen"
            datapoints={cameraDatapoints}
            onSelect={(id) => onChange({ ...action, cameraId: id })}
            onClose={() => setCameraPickerVisible(false)}
          />
        </View>
      ) : null}
    </View>
  );
}

function coerce(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.trim() !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  emptyHint: { color: palette.textSecondary, fontSize: 12 },
  row: {
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.chip,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeLabel: { color: palette.textPrimary, fontSize: 13, fontWeight: "700" },
  moveGroup: { flexDirection: "row", gap: 4 },
  moveButton: { paddingHorizontal: 6, paddingVertical: 4 },
  moveLabel: { color: palette.textSecondary, fontSize: 12 },
  removeButton: { paddingHorizontal: 8, paddingVertical: 4 },
  removeLabel: { color: palette.danger, fontSize: 16, fontWeight: "700" },
  fields: { gap: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: palette.textPrimary,
    fontSize: 13,
  },
  datapointLabel: { color: palette.textPrimary, fontSize: 13, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    maxWidth: 160,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.glassBorder,
  },
  chipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  chipLabel: { color: palette.textSecondary, fontSize: 12 },
  chipLabelActive: { color: palette.background, fontWeight: "700" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  switchLabel: { color: palette.textSecondary, fontSize: 12 },
  addRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  addButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.accent,
  },
  addLabel: { color: palette.accent, fontSize: 12, fontWeight: "700" },
});
