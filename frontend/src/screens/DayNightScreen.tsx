import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { useDayNightConfig } from "@/hooks/useDayNightConfig";
import { useDayNightStatus } from "@/hooks/useDayNightStatus";
import { palette, radius, spacing } from "@/theme/palette";
import { DAY_NIGHT_MODE_LABELS, type DayNightConfig } from "@/types/domain";

function StatusRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  );
}

export function DayNightScreen(): React.JSX.Element {
  const { status, isOnline, error: statusError } = useDayNightStatus();
  const { config, isLoading: configLoading, error: configError, save } = useDayNightConfig();

  const [draft, setDraft] = useState<DayNightConfig>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  if (configLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(config);

  function updateField<K extends keyof DayNightConfig>(key: K, value: DayNightConfig[K]): void {
    setDraft((prev) => ({ ...prev, [key]: value }));
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {statusError ? (
        <GlassCard accentColor={palette.danger}>
          <Text style={{ color: palette.danger }}>{statusError}</Text>
        </GlassCard>
      ) : null}

      <GlassCard accentColor={isOnline ? palette.accent : palette.danger} style={styles.card}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: isOnline ? palette.accent : palette.danger }]} />
          <Text style={styles.cardTitle}>Aktueller Status</Text>
        </View>
        <StatusRow label="Modus" value={status?.mode ? DAY_NIGHT_MODE_LABELS[status.mode] : "—"} />
        <StatusRow label="Nacht aktiv" value={status?.isNight ? "Ja" : "Nein"} />
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.cardTitle}>Tag-Nacht-Logik</Text>
        <Text style={styles.hint}>
          Bestimmt Dämmerung/Nacht per Sonnenstand mit Offset, optional überschrieben durch einen
          Helligkeits-Datenpunkt.
        </Text>

        {configError ? <Text style={styles.error}>{configError}</Text> : null}

        <Text style={styles.fieldLabel}>Dämmerung-Offset (Minuten)</Text>
        <TextInput
          value={String(draft.duskOffsetMin)}
          onChangeText={(text) => updateField("duskOffsetMin", Number(text) || 0)}
          keyboardType="numeric"
          placeholderTextColor={palette.textSecondary}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Morgendämmerung-Offset (Minuten)</Text>
        <TextInput
          value={String(draft.dawnOffsetMin)}
          onChangeText={(text) => updateField("dawnOffsetMin", Number(text) || 0)}
          keyboardType="numeric"
          placeholderTextColor={palette.textSecondary}
          style={styles.input}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Helligkeits-Override verwenden</Text>
          <Switch
            value={draft.useBrightnessOverride}
            onValueChange={(value) => updateField("useBrightnessOverride", value)}
            trackColor={{ true: palette.accent, false: palette.zoneOff }}
          />
        </View>

        {draft.useBrightnessOverride ? (
          <>
            <Text style={styles.fieldLabel}>Helligkeits-Datenpunkt</Text>
            <TextInput
              value={draft.brightnessDatapointId ?? ""}
              onChangeText={(text) => updateField("brightnessDatapointId", text)}
              placeholder="Datenpunkt-ID"
              placeholderTextColor={palette.textSecondary}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Nacht-Schwellenwert</Text>
            <TextInput
              value={draft.brightnessNightThreshold !== undefined ? String(draft.brightnessNightThreshold) : ""}
              onChangeText={(text) => updateField("brightnessNightThreshold", Number(text) || 0)}
              keyboardType="numeric"
              placeholderTextColor={palette.textSecondary}
              style={styles.input}
            />
          </>
        ) : null}

        <Pressable
          onPress={() => void handleSave()}
          disabled={!dirty || saving}
          style={({ pressed }) => [styles.saveButton, { opacity: !dirty || saving ? 0.4 : pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.saveLabel}>{saving ? "Speichert…" : "Änderungen speichern"}</Text>
        </Pressable>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: spacing.lg, gap: spacing.md },
  loading: { flex: 1, backgroundColor: palette.background, alignItems: "center", justifyContent: "center" },
  card: { gap: spacing.sm },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  dot: { width: 12, height: 12, borderRadius: 6 },
  cardTitle: { color: palette.textPrimary, fontSize: 18, fontWeight: "700" },
  hint: { color: palette.textSecondary, fontSize: 13 },
  statusRow: { flexDirection: "row", justifyContent: "space-between" },
  statusLabel: { color: palette.textSecondary, fontSize: 14 },
  statusValue: { color: palette.textPrimary, fontSize: 14, fontWeight: "600" },
  fieldLabel: { color: palette.textSecondary, fontSize: 12, fontWeight: "600", marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: palette.textPrimary,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  switchLabel: { color: palette.textPrimary, fontSize: 14 },
  error: { color: palette.danger, fontSize: 13 },
  saveButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.chip,
    backgroundColor: palette.accent,
    alignItems: "center",
  },
  saveLabel: { color: palette.background, fontSize: 15, fontWeight: "700" },
});
