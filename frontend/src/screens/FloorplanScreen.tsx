import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAllDatapoints } from "@/hooks/useAllDatapoints";
import { useAlarmCenterStatus } from "@/hooks/useAlarmCenterStatus";
import { useFloorplanConfig } from "@/hooks/useFloorplanConfig";
import { palette, radius, spacing } from "@/theme/palette";
import {
  createDefaultFloorplanRoom,
  deriveZoneState,
  type DerivedZoneState,
  type FloorplanConfig,
  type FloorplanRoom,
} from "@/types/domain";

type RoomZone = NonNullable<FloorplanRoom["zone"]>;
type Mode = "view" | "edit";

const ZONE_OPTIONS: { value: FloorplanRoom["zone"]; label: string }[] = [
  { value: "perimeter", label: "Perimeter" },
  { value: "aussenhaut", label: "Außenhaut" },
  { value: "innenraum", label: "Innenraum" },
  { value: null, label: "Keine" },
];

const ZONE_LABELS: Record<RoomZone, string> = {
  perimeter: "Perimeter",
  aussenhaut: "Außenhaut",
  innenraum: "Innenraum",
};

const ZONE_COLORS: Record<RoomZone, string> = {
  perimeter: palette.zonePerimeter,
  aussenhaut: palette.zoneAussenhaut,
  innenraum: palette.zoneInnenraum,
};

const ZONE_ACTIVE_FIELD: Record<RoomZone, keyof DerivedZoneState> = {
  perimeter: "perimeterActive",
  aussenhaut: "aussenhautActive",
  innenraum: "innenraumActive",
};

const ZONE_COMMAND: Record<RoomZone, "armPerimeter" | "armAussenhaut" | "armVollschutz"> = {
  perimeter: "armPerimeter",
  aussenhaut: "armAussenhaut",
  innenraum: "armVollschutz",
};

export function FloorplanScreen(): React.JSX.Element {
  const { config, isLoading, error, save } = useFloorplanConfig();
  const { datapoints } = useAllDatapoints();
  const { status, sendCommand } = useAlarmCenterStatus();
  const [draft, setDraft] = useState<FloorplanConfig>(config);
  const [mode, setMode] = useState<Mode>("view");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(config);
  const derived = status ? deriveZoneState(status.mode) : null;

  function updateRoom(index: number, next: FloorplanRoom): void {
    setDraft((prev) => ({ rooms: prev.rooms.map((r, i) => (i === index ? next : r)) }));
  }

  function removeRoom(index: number): void {
    setDraft((prev) => ({ rooms: prev.rooms.filter((_, i) => i !== index) }));
  }

  function addRoom(): void {
    setDraft((prev) => ({ rooms: [...prev.rooms, createDefaultFloorplanRoom()] }));
  }

  function toggleDatapoint(room: FloorplanRoom, index: number, datapointId: string): void {
    const has = room.datapointIds.includes(datapointId);
    const next = has
      ? room.datapointIds.filter((id) => id !== datapointId)
      : [...room.datapointIds, datapointId];
    updateRoom(index, { ...room, datapointIds: next });
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      await save(draft);
    } finally {
      setSaving(false);
    }
  }

  function isRoomActive(room: FloorplanRoom): boolean {
    if (!room.zone || !derived) {
      return false;
    }
    return derived[ZONE_ACTIVE_FIELD[room.zone]];
  }

  function roomColor(room: FloorplanRoom): string {
    if (room.zone && status?.triggerZone === room.zone) {
      return palette.danger;
    }
    if (room.zone && isRoomActive(room)) {
      return ZONE_COLORS[room.zone];
    }
    return palette.zoneOff;
  }

  function handleRoomTap(room: FloorplanRoom): void {
    if (!room.zone) {
      return;
    }
    void sendCommand(ZONE_COMMAND[room.zone]);
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setMode("view")}
            style={[styles.chip, mode === "view" && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, mode === "view" && styles.chipLabelActive]}>Anzeige</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("edit")}
            style={[styles.chip, mode === "edit" && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, mode === "edit" && styles.chipLabelActive]}>Bearbeiten</Text>
          </Pressable>
        </View>

        {mode === "view" ? (
          <GlassCard style={styles.card}>
            {draft.rooms.length === 0 ? (
              <Text style={styles.hint}>Keine Räume konfiguriert. Im Bearbeiten-Modus einen hinzufügen.</Text>
            ) : (
              <View style={styles.canvas}>
                {draft.rooms.map((room) => (
                  <Pressable
                    key={room.id}
                    onPress={() => handleRoomTap(room)}
                    style={[
                      styles.roomBox,
                      {
                        left: `${room.x}%`,
                        top: `${room.y}%`,
                        width: `${room.width}%`,
                        height: `${room.height}%`,
                        borderColor: roomColor(room),
                      },
                    ]}
                  >
                    <View style={[styles.roomDot, { backgroundColor: roomColor(room) }]} />
                    <Text style={styles.roomLabel} numberOfLines={1}>
                      {room.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </GlassCard>
        ) : (
          <>
            {draft.rooms.length === 0 ? (
              <GlassCard style={styles.card}>
                <Text style={styles.hint}>Keine Räume konfiguriert. Unten einen hinzufügen.</Text>
              </GlassCard>
            ) : null}

            {draft.rooms.map((room, index) => (
              <GlassCard key={room.id} style={styles.card}>
                <View style={styles.rowHeader}>
                  <TextInput
                    value={room.name}
                    onChangeText={(text) => updateRoom(index, { ...room, name: text })}
                    style={styles.nameInput}
                    placeholder="Raumname"
                    placeholderTextColor={palette.textSecondary}
                  />
                  <Pressable onPress={() => removeRoom(index)} style={styles.deleteButton}>
                    <Text style={styles.deleteLabel}>Entfernen</Text>
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>Zone</Text>
                <View style={styles.chipRow}>
                  {ZONE_OPTIONS.map((option) => (
                    <Pressable
                      key={option.label}
                      onPress={() => updateRoom(index, { ...room, zone: option.value })}
                      style={[styles.chip, room.zone === option.value && styles.chipActive]}
                    >
                      <Text
                        style={[styles.chipLabel, room.zone === option.value && styles.chipLabelActive]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Position & Größe (%)</Text>
                <View style={styles.numberRow}>
                  {(["x", "y", "width", "height"] as const).map((field) => (
                    <View key={field} style={styles.numberField}>
                      <Text style={styles.numberFieldLabel}>{field}</Text>
                      <TextInput
                        value={String(room[field])}
                        onChangeText={(text) =>
                          updateRoom(index, { ...room, [field]: Number(text) || 0 })
                        }
                        keyboardType="numeric"
                        style={styles.numberInput}
                      />
                    </View>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Datenpunkte</Text>
                <View style={styles.chipRow}>
                  {datapoints.length === 0 ? (
                    <Text style={styles.hint}>Keine Datenpunkte konfiguriert.</Text>
                  ) : (
                    datapoints.map((dp) => (
                      <Pressable
                        key={dp.id}
                        onPress={() => toggleDatapoint(room, index, dp.id)}
                        style={[
                          styles.chip,
                          room.datapointIds.includes(dp.id) && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipLabel,
                            room.datapointIds.includes(dp.id) && styles.chipLabelActive,
                          ]}
                        >
                          {dp.label}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              </GlassCard>
            ))}

            <Pressable onPress={addRoom} style={styles.addButton}>
              <Text style={styles.addLabel}>+ Raum hinzufügen</Text>
            </Pressable>

            <Pressable
              onPress={() => void handleSave()}
              disabled={!dirty || saving}
              style={({ pressed }) => [styles.saveButton, { opacity: !dirty || saving ? 0.4 : pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.saveLabel}>{saving ? "Speichert…" : "Änderungen speichern"}</Text>
            </Pressable>
          </>
        )}
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
  numberRow: { flexDirection: "row", gap: spacing.sm },
  numberField: { flex: 1, gap: 2 },
  numberFieldLabel: { color: palette.textSecondary, fontSize: 11 },
  numberInput: {
    color: palette.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
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
  canvas: {
    position: "relative",
    width: "100%",
    minHeight: 280,
    backgroundColor: palette.glassFill,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  roomBox: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: palette.background,
    padding: 6,
    gap: 4,
  },
  roomDot: { width: 8, height: 8, borderRadius: 4 },
  roomLabel: { color: palette.textPrimary, fontSize: 12, fontWeight: "600" },
});
