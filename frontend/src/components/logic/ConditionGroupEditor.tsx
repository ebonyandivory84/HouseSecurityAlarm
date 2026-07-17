import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ConditionLeafRow } from "@/components/logic/ConditionLeafRow";
import { palette, radius, spacing } from "@/theme/palette";
import { createDefaultConditionLeaf, createEmptyConditionGroup, type ConditionGroup, type ConditionNode } from "@/types/logic";
import type { DatapointConfig } from "@/types/domain";

const DEPTH_COLORS = [palette.accent, palette.warning, palette.success];

interface ConditionGroupEditorProps {
  group: ConditionGroup;
  onChange: (next: ConditionGroup) => void;
  datapoints: DatapointConfig[];
  onRemove?: () => void;
  depth?: number;
}

export function ConditionGroupEditor({
  group,
  onChange,
  datapoints,
  onRemove,
  depth = 0,
}: ConditionGroupEditorProps): React.JSX.Element {
  const accent = DEPTH_COLORS[depth % DEPTH_COLORS.length];

  function updateChild(index: number, next: ConditionNode): void {
    onChange({ ...group, children: group.children.map((c, i) => (i === index ? next : c)) });
  }

  function removeChild(index: number): void {
    onChange({ ...group, children: group.children.filter((_, i) => i !== index) });
  }

  function moveChild(index: number, dir: -1 | 1): void {
    const target = index + dir;
    if (target < 0 || target >= group.children.length) return;
    const next = [...group.children];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    onChange({ ...group, children: next });
  }

  function addLeaf(): void {
    onChange({ ...group, children: [...group.children, createDefaultConditionLeaf()] });
  }

  function addGroup(): void {
    onChange({ ...group, children: [...group.children, createEmptyConditionGroup()] });
  }

  return (
    <View style={[styles.container, { borderColor: accent }]}>
      <View style={styles.headerRow}>
        <View style={styles.opGroup}>
          <Pressable
            onPress={() => onChange({ ...group, op: "AND" })}
            style={[styles.opChip, group.op === "AND" && { backgroundColor: accent, borderColor: accent }]}
          >
            <Text style={[styles.opLabel, group.op === "AND" && styles.opLabelActive]}>UND</Text>
          </Pressable>
          <Pressable
            onPress={() => onChange({ ...group, op: "OR" })}
            style={[styles.opChip, group.op === "OR" && { backgroundColor: accent, borderColor: accent }]}
          >
            <Text style={[styles.opLabel, group.op === "OR" && styles.opLabelActive]}>ODER</Text>
          </Pressable>
        </View>
        {onRemove ? (
          <Pressable onPress={onRemove} style={styles.removeGroupButton}>
            <Text style={styles.removeGroupLabel}>Gruppe entfernen</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.children}>
        {group.children.length === 0 ? <Text style={styles.emptyHint}>Keine Bedingungen.</Text> : null}
        {group.children.map((child, index) =>
          child.kind === "leaf" ? (
            <ConditionLeafRow
              key={index}
              leaf={child}
              onChange={(next) => updateChild(index, next)}
              onRemove={() => removeChild(index)}
              onMoveUp={index > 0 ? () => moveChild(index, -1) : undefined}
              onMoveDown={index < group.children.length - 1 ? () => moveChild(index, 1) : undefined}
              datapoints={datapoints}
            />
          ) : (
            <ConditionGroupEditor
              key={index}
              group={child}
              onChange={(next) => updateChild(index, next)}
              onRemove={() => removeChild(index)}
              datapoints={datapoints}
              depth={depth + 1}
            />
          )
        )}
      </View>

      <View style={styles.footerRow}>
        <Pressable onPress={addLeaf} style={styles.addButton}>
          <Text style={styles.addLabel}>+ Bedingung</Text>
        </Pressable>
        <Pressable onPress={addGroup} style={styles.addButton}>
          <Text style={styles.addLabel}>+ Gruppe</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radius.chip,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  opGroup: { flexDirection: "row", gap: 6 },
  opChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.glassBorder,
  },
  opLabel: { color: palette.textSecondary, fontSize: 12, fontWeight: "700" },
  opLabelActive: { color: palette.background },
  removeGroupButton: { paddingHorizontal: spacing.xs, paddingVertical: 4 },
  removeGroupLabel: { color: palette.danger, fontSize: 11, fontWeight: "600" },
  children: { gap: spacing.xs, paddingLeft: spacing.xs },
  emptyHint: { color: palette.textSecondary, fontSize: 12 },
  footerRow: { flexDirection: "row", gap: spacing.xs },
  addButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.accent,
  },
  addLabel: { color: palette.accent, fontSize: 12, fontWeight: "700" },
});
