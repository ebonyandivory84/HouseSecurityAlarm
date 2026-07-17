import React, { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import type { CameraSnapshot } from "@/hooks/useCameraSnapshots";
import { palette, radius, spacing } from "@/theme/palette";
import { createDefaultDatapointConfig, type DatapointCategory, type DatapointConfig } from "@/types/domain";

interface DatapointListEditorProps {
  category: DatapointCategory;
  datapoints: DatapointConfig[];
  liveValues: Record<string, ioBroker.State | null>;
  onSave: (next: DatapointConfig[]) => Promise<void>;
  showCameraCapabilities?: boolean;
  snapshots?: Record<string, CameraSnapshot>;
  emptyHint: string;
}

const ZONE_OPTIONS: Array<{ value: DatapointConfig["zone"]; label: string }> = [
  { value: null, label: "Keine" },
  { value: "perimeter", label: "Perimeter" },
  { value: "aussenhaut", label: "Außenhaut" },
  { value: "innenraum", label: "Innenraum" },
];

const CAPABILITY_FIELDS = [
  ["personDetectionId", "Personenerkennung-DP"],
  ["animalDetectionId", "Tiererkennung-DP"],
  ["objectDetectionId", "Objekterkennung-DP"],
  ["ledId", "LED-DP"],
  ["sirenId", "Sirene-DP"],
] as const;

function isTriggered(dp: DatapointConfig, state: ioBroker.State | null | undefined): boolean {
  if (!state) return false;
  if (dp.valueType === "boolean") return state.val === true;
  return dp.triggerString !== undefined && state.val === dp.triggerString;
}

export function DatapointListEditor({
  category,
  datapoints,
  liveValues,
  onSave,
  showCameraCapabilities = false,
  snapshots,
  emptyHint,
}: DatapointListEditorProps): React.JSX.Element {
  const [draft, setDraft] = useState<DatapointConfig[]>(datapoints);
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(datapoints);
  }, [datapoints]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(datapoints);

  function updateRow(index: number, patch: Partial<DatapointConfig>): void {
    setDraft((prev) => prev.map((dp, i) => (i === index ? { ...dp, ...patch } : dp)));
  }

  function updateCapabilities(
    index: number,
    patch: Partial<NonNullable<DatapointConfig["cameraCapabilities"]>>
  ): void {
    setDraft((prev) =>
      prev.map((dp, i) => (i === index ? { ...dp, cameraCapabilities: { ...dp.cameraCapabilities, ...patch } } : dp))
    );
  }

  function removeRow(index: number): void {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }

  function addRow(): void {
    const id = newId.trim();
    if (!id) return;
    setDraft((prev) => [...prev, createDefaultDatapointConfig(id, category, newLabel.trim() || id)]);
    setNewId("");
    setNewLabel("");
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {draft.length === 0 ? (
        <GlassCard style={styles.card}>
          <Text style={styles.hint}>{emptyHint}</Text>
        </GlassCard>
      ) : null}

      {draft.map((dp, index) => {
        const state = liveValues[dp.id];
        const triggered = isTriggered(dp, state);
        return (
          <GlassCard key={`${dp.id}-${index}`} accentColor={triggered ? palette.danger : undefined} style={styles.card}>
            <View style={styles.rowHeader}>
              <View style={styles.rowTitleBlock}>
                <View style={styles.titleRow}>
                  <View style={[styles.dot, { backgroundColor: triggered ? palette.danger : palette.zoneOff }]} />
                  <Text style={styles.idText}>{dp.id}</Text>
                </View>
                <Text style={styles.valueText}>{state ? `Wert: ${JSON.stringify(state.val)}` : "kein Wert"}</Text>
              </View>
              <View style={styles.headerActions}>
                <Switch
                  value={dp.enabled}
                  onValueChange={(value) => updateRow(index, { enabled: value })}
                  trackColor={{ true: palette.accent, false: palette.zoneOff }}
                />
                <Pressable onPress={() => removeRow(index)} style={styles.deleteButton}>
                  <Text style={styles.deleteLabel}>Entfernen</Text>
                </Pressable>
              </View>
            </View>

            <TextInput
              value={dp.label}
              onChangeText={(text) => updateRow(index, { label: text })}
              placeholder="Bezeichnung"
              placeholderTextColor={palette.textSecondary}
              style={styles.input}
            />

            <View style={styles.chipRow}>
              {(["boolean", "string"] as const).map((vt) => (
                <Pressable
                  key={vt}
                  onPress={() => updateRow(index, { valueType: vt })}
                  style={[styles.chip, dp.valueType === vt ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipLabel, dp.valueType === vt ? styles.chipLabelActive : null]}>{vt}</Text>
                </Pressable>
              ))}
            </View>

            {dp.valueType === "string" ? (
              <TextInput
                value={dp.triggerString ?? ""}
                onChangeText={(text) => updateRow(index, { triggerString: text })}
                placeholder="Trigger-String (z.B. 'open')"
                placeholderTextColor={palette.textSecondary}
                style={styles.input}
              />
            ) : null}

            <Text style={styles.fieldLabel}>Zone</Text>
            <View style={styles.chipRow}>
              {ZONE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={() => updateRow(index, { zone: opt.value })}
                  style={[styles.chip, dp.zone === opt.value ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipLabel, dp.zone === opt.value ? styles.chipLabelActive : null]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {showCameraCapabilities ? (
              <View style={styles.capabilitiesBlock}>
                <Text style={styles.fieldLabel}>Kamera-Fähigkeiten</Text>
                {snapshots?.[dp.id] ? (
                  <Image
                    source={{ uri: snapshots[dp.id].url }}
                    style={styles.snapshotImage}
                    resizeMode="cover"
                  />
                ) : null}
                {CAPABILITY_FIELDS.map(([key, placeholder]) => (
                  <TextInput
                    key={key}
                    value={dp.cameraCapabilities?.[key] ?? ""}
                    onChangeText={(text) => updateCapabilities(index, { [key]: text || undefined })}
                    placeholder={placeholder}
                    placeholderTextColor={palette.textSecondary}
                    style={styles.input}
                  />
                ))}
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Innenraum-Kamera</Text>
                  <Switch
                    value={dp.cameraCapabilities?.isIndoor ?? false}
                    onValueChange={(value) => updateCapabilities(index, { isIndoor: value })}
                    trackColor={{ true: palette.accent, false: palette.zoneOff }}
                  />
                </View>
              </View>
            ) : null}
          </GlassCard>
        );
      })}

      <GlassCard style={styles.card}>
        <Text style={styles.fieldLabel}>Neuen Datenpunkt hinzufügen</Text>
        <TextInput
          value={newId}
          onChangeText={setNewId}
          placeholder="Datenpunkt-ID (z.B. hm-rpc.0.xxx.STATE)"
          placeholderTextColor={palette.textSecondary}
          style={styles.input}
        />
        <TextInput
          value={newLabel}
          onChangeText={setNewLabel}
          placeholder="Bezeichnung (optional)"
          placeholderTextColor={palette.textSecondary}
          style={styles.input}
        />
        <Pressable onPress={addRow} style={styles.addButton}>
          <Text style={styles.addLabel}>Hinzufügen</Text>
        </Pressable>
      </GlassCard>

      <Pressable
        onPress={() => void handleSave()}
        disabled={!dirty || saving}
        style={({ pressed }) => [styles.saveButton, { opacity: !dirty || saving ? 0.4 : pressed ? 0.7 : 1 }]}
      >
        <Text style={styles.saveLabel}>{saving ? "Speichert…" : "Änderungen speichern"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  hint: { color: palette.textSecondary, fontSize: 14 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  rowTitleBlock: { gap: spacing.xs / 2, flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  idText: { color: palette.textPrimary, fontSize: 14, fontWeight: "700" },
  valueText: { color: palette.textSecondary, fontSize: 12 },
  headerActions: { alignItems: "flex-end", gap: spacing.xs },
  deleteButton: { paddingVertical: 2 },
  deleteLabel: { color: palette.danger, fontSize: 12, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: palette.textPrimary,
    fontSize: 14,
  },
  fieldLabel: { color: palette.textSecondary, fontSize: 12, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.glassBorder,
  },
  chipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  chipLabel: { color: palette.textSecondary, fontSize: 12, fontWeight: "600" },
  chipLabelActive: { color: palette.background },
  capabilitiesBlock: { gap: spacing.sm, marginTop: spacing.xs },
  snapshotImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.chip,
    backgroundColor: palette.zoneOff,
  },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { color: palette.textSecondary, fontSize: 13 },
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
