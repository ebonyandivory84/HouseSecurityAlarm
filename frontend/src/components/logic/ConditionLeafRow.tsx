import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { DatapointPickerModal } from "@/components/logic/DatapointPickerModal";
import { palette, radius, spacing } from "@/theme/palette";
import {
  coerceInputValue,
  COMPARATOR_LABELS,
  formatInputValue,
  type ConditionComparator,
  type ConditionLeaf,
} from "@/types/logic";
import type { DatapointConfig } from "@/types/domain";

const COMPARATORS: ConditionComparator[] = ["triggered", "equals", "above", "below"];

interface ConditionLeafRowProps {
  leaf: ConditionLeaf;
  onChange: (next: ConditionLeaf) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  datapoints: DatapointConfig[];
}

export function ConditionLeafRow({
  leaf,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  datapoints,
}: ConditionLeafRowProps): React.JSX.Element {
  const [pickerVisible, setPickerVisible] = useState(false);
  const selectedLabel = datapoints.find((dp) => dp.id === leaf.datapointId)?.label ?? leaf.datapointId;
  const needsValue = leaf.comparator === "equals" || leaf.comparator === "above" || leaf.comparator === "below";

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable style={styles.datapointButton} onPress={() => setPickerVisible(true)}>
          <Text style={styles.datapointLabel} numberOfLines={1}>
            {selectedLabel || "Datenpunkt wählen"}
          </Text>
        </Pressable>
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
      <View style={styles.comparatorRow}>
        {COMPARATORS.map((comp) => (
          <Pressable
            key={comp}
            onPress={() => onChange({ ...leaf, comparator: comp })}
            style={[styles.chip, leaf.comparator === comp && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, leaf.comparator === comp && styles.chipLabelActive]}>
              {COMPARATOR_LABELS[comp]}
            </Text>
          </Pressable>
        ))}
      </View>
      {needsValue ? (
        <TextInput
          value={formatInputValue(leaf.value)}
          onChangeText={(text) => onChange({ ...leaf, value: coerceInputValue(text) })}
          placeholder="Wert"
          placeholderTextColor={palette.textSecondary}
          style={styles.valueInput}
        />
      ) : null}
      <DatapointPickerModal
        visible={pickerVisible}
        title="Datenpunkt wählen"
        datapoints={datapoints}
        onSelect={(id) => onChange({ ...leaf, datapointId: id })}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.chip,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  datapointButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  datapointLabel: { color: palette.textPrimary, fontSize: 13, fontWeight: "600" },
  moveGroup: { flexDirection: "row", gap: 4 },
  moveButton: { paddingHorizontal: 6, paddingVertical: 4 },
  moveLabel: { color: palette.textSecondary, fontSize: 12 },
  removeButton: { paddingHorizontal: 8, paddingVertical: 4 },
  removeLabel: { color: palette.danger, fontSize: 16, fontWeight: "700" },
  comparatorRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
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
  valueInput: {
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    color: palette.textPrimary,
    fontSize: 13,
  },
});
