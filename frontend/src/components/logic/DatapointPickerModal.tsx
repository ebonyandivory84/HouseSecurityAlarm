import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { palette, radius, spacing } from "@/theme/palette";
import type { DatapointConfig } from "@/types/domain";

interface DatapointPickerModalProps {
  visible: boolean;
  title: string;
  datapoints: DatapointConfig[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function DatapointPickerModal({
  visible,
  title,
  datapoints,
  onSelect,
  onClose,
}: DatapointPickerModalProps): React.JSX.Element {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return datapoints;
    return datapoints.filter(
      (dp) => dp.label.toLowerCase().includes(q) || dp.id.toLowerCase().includes(q)
    );
  }, [datapoints, search]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Suchen…"
            placeholderTextColor={palette.textSecondary}
            style={styles.search}
          />
          <ScrollView style={styles.list}>
            {filtered.length === 0 ? <Text style={styles.empty}>Keine Datenpunkte gefunden.</Text> : null}
            {filtered.map((dp) => (
              <Pressable
                key={dp.id}
                onPress={() => {
                  onSelect(dp.id);
                  onClose();
                }}
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.rowLabel}>{dp.label}</Text>
                <Text style={styles.rowId}>{dp.id}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeLabel}>Abbrechen</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "80%",
    backgroundColor: palette.background,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { color: palette.textPrimary, fontSize: 16, fontWeight: "700" },
  search: {
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: palette.textPrimary,
    fontSize: 14,
  },
  list: { maxHeight: 360 },
  empty: { color: palette.textSecondary, fontSize: 13, paddingVertical: spacing.md },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.glassBorder,
  },
  rowLabel: { color: palette.textPrimary, fontSize: 14, fontWeight: "600" },
  rowId: { color: palette.textSecondary, fontSize: 12 },
  closeButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    alignItems: "center",
  },
  closeLabel: { color: palette.textSecondary, fontSize: 13, fontWeight: "600" },
});
