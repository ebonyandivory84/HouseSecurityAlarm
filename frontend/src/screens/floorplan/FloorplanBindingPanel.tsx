import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAllDatapoints } from "@/hooks/useAllDatapoints";
import { palette, radius, spacing } from "@/theme/palette";
import { FLOORPLAN_ITEM_ALARM_TYPES, type DatapointCategory, type FloorplanItem } from "@/types/domain";

const CATEGORY_TO_BINDING_TYPE: Partial<Record<DatapointCategory, NonNullable<FloorplanItem["alarmBindingType"]>>> = {
  camera: "camera",
  motion: "pir",
  door: "contact",
};

const BINDING_TYPE_LABELS: Record<NonNullable<FloorplanItem["alarmBindingType"]>, string> = {
  contact: "Türsensor",
  pir: "Bewegungsmelder",
  camera: "Kamera",
};

export interface FloorplanBindingPanelProps {
  selectedItem: FloorplanItem | null;
  onBind: (binding: { alarmBindingType: NonNullable<FloorplanItem["alarmBindingType"]>; alarmBindingKey: string; alarmBindingId: string }) => void;
  onUnbind: () => void;
}

export function FloorplanBindingPanel({ selectedItem, onBind, onUnbind }: FloorplanBindingPanelProps): React.JSX.Element | null {
  const { datapoints, isLoading } = useAllDatapoints();
  const [query, setQuery] = useState("");

  const requiredBindingType = selectedItem ? FLOORPLAN_ITEM_ALARM_TYPES[selectedItem.type] : null;

  const candidates = useMemo(() => {
    if (!requiredBindingType) {
      return [];
    }
    const q = query.trim().toLowerCase();
    return datapoints.filter((dp) => {
      if (CATEGORY_TO_BINDING_TYPE[dp.category] !== requiredBindingType) {
        return false;
      }
      if (!dp.enabled) {
        return false;
      }
      if (q && !dp.label.toLowerCase().includes(q) && !dp.id.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [datapoints, requiredBindingType, query]);

  if (!selectedItem) {
    return null;
  }

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.sectionLabel}>Sensor-Bindung</Text>

      {!requiredBindingType ? (
        <Text style={styles.hint}>Dieser Objekttyp kann keinem Sensor zugeordnet werden.</Text>
      ) : (
        <>
          <Text style={styles.hint}>Erwarteter Typ: {BINDING_TYPE_LABELS[requiredBindingType]}</Text>

          {selectedItem.alarmBindingId ? (
            <View style={styles.boundRow}>
              <Text style={styles.boundLabel} numberOfLines={1}>
                Gebunden: {selectedItem.alarmBindingKey ?? selectedItem.alarmBindingId}
              </Text>
              <Pressable onPress={onUnbind} style={styles.unbindButton}>
                <Text style={styles.unbindLabel}>Lösen</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.hint}>Kein Sensor gebunden.</Text>
          )}

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Datenpunkt suchen…"
            placeholderTextColor={palette.textSecondary}
            style={styles.input}
          />

          <ScrollView style={styles.candidateList} nestedScrollEnabled>
            {isLoading ? (
              <Text style={styles.hint}>Lade Datenpunkte…</Text>
            ) : candidates.length === 0 ? (
              <Text style={styles.hint}>Keine passenden Datenpunkte gefunden.</Text>
            ) : (
              candidates.map((dp) => (
                <Pressable
                  key={dp.id}
                  onPress={() =>
                    onBind({ alarmBindingType: requiredBindingType, alarmBindingKey: dp.label, alarmBindingId: dp.id })
                  }
                  style={[styles.candidateRow, selectedItem.alarmBindingId === dp.id && styles.candidateRowActive]}
                >
                  <Text style={styles.candidateLabel} numberOfLines={1}>
                    {dp.label}
                  </Text>
                  <Text style={styles.candidateId} numberOfLines={1}>
                    {dp.id}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  sectionLabel: { color: palette.textSecondary, fontSize: 12, fontWeight: "600" },
  hint: { color: palette.textSecondary, fontSize: 12 },
  boundRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  boundLabel: { color: palette.success, fontSize: 13, fontWeight: "600", flex: 1 },
  unbindButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.danger,
  },
  unbindLabel: { color: palette.danger, fontSize: 12, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: palette.textPrimary,
    fontSize: 14,
  },
  candidateList: { maxHeight: 180 },
  candidateRow: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    marginBottom: 6,
  },
  candidateRowActive: { borderColor: palette.accent, backgroundColor: "rgba(77,163,255,0.12)" },
  candidateLabel: { color: palette.textPrimary, fontSize: 13, fontWeight: "600" },
  candidateId: { color: palette.textSecondary, fontSize: 11 },
});
