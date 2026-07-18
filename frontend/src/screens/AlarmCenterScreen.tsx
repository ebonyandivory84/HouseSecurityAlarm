import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAlarmCenterMapping } from "@/hooks/useAlarmCenterMapping";
import { useAlarmCenterStatus } from "@/hooks/useAlarmCenterStatus";
import { useAlarmTimingConfig } from "@/hooks/useAlarmTimingConfig";
import { palette, radius, spacing } from "@/theme/palette";
import { ZONE_MODE_LABELS, type AlarmCenterMapping, type AlarmTimingConfig } from "@/types/domain";

const MAPPING_FIELDS: Array<{ key: keyof AlarmCenterMapping; label: string }> = [
  { key: "armedStateId", label: "Scharf-Status (armedStateId)" },
  { key: "perimeterStateId", label: "Perimeter-Status (perimeterStateId)" },
  { key: "countdownStateId", label: "Countdown-Status (countdownStateId)" },
  { key: "sirenStateId", label: "Sirene (sirenStateId)" },
  { key: "triggerStateId", label: "Auslöser (triggerStateId)" },
  { key: "displayStateId", label: "Display (displayStateId)" },
  { key: "buzzerStateId", label: "Buzzer (buzzerStateId)" },
  { key: "ledRedStateId", label: "LED Rot (ledRedStateId)" },
  { key: "ledYellowStateId", label: "LED Gelb (ledYellowStateId)" },
  { key: "fingerprintStateId", label: "Fingerprint (fingerprintStateId)" },
];

function StatusRow({ label, value, danger }: { label: string; value: string; danger?: boolean }): React.JSX.Element {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, danger ? { color: palette.danger } : null]}>{value}</Text>
    </View>
  );
}

export function AlarmCenterScreen(): React.JSX.Element {
  const { status, isOnline, error: statusError, sendCommand } = useAlarmCenterStatus();
  const { mapping, isLoading: mappingLoading, error: mappingError, save } = useAlarmCenterMapping();
  const { config: timing, isLoading: timingLoading, error: timingError, save: saveTiming } = useAlarmTimingConfig();

  const [draft, setDraft] = useState<AlarmCenterMapping>(mapping);
  const [saving, setSaving] = useState(false);

  const [timingDraft, setTimingDraft] = useState<AlarmTimingConfig>(timing);
  const [timingSaving, setTimingSaving] = useState(false);

  useEffect(() => {
    setDraft(mapping);
  }, [mapping]);

  useEffect(() => {
    setTimingDraft(timing);
  }, [timing]);

  if (!status || mappingLoading || timingLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(mapping);
  const timingDirty = JSON.stringify(timingDraft) !== JSON.stringify(timing);

  function updateField(key: keyof AlarmCenterMapping, value: string): void {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function updateTimingField(key: keyof AlarmTimingConfig, value: string): void {
    const parsed = Number(value);
    setTimingDraft((prev) => ({ ...prev, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      await save(draft);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTiming(): Promise<void> {
    setTimingSaving(true);
    try {
      await saveTiming(timingDraft);
    } finally {
      setTimingSaving(false);
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
          <View
            style={[styles.dot, { backgroundColor: isOnline && status.alarmCenterOnline ? palette.accent : palette.danger }]}
          />
          <Text style={styles.cardTitle}>AlarmCenter-Panel</Text>
        </View>
        <StatusRow label="Verbindung" value={status.alarmCenterOnline ? "Online" : "Offline"} danger={!status.alarmCenterOnline} />
        <StatusRow label="Modus" value={ZONE_MODE_LABELS[status.mode]} />
        <StatusRow label="Alarm aktiv" value={status.alarmActive ? "Ja" : "Nein"} danger={status.alarmActive} />
        <StatusRow label="Panik aktiv" value={status.panicActive ? "Ja" : "Nein"} danger={status.panicActive} />
        <StatusRow
          label="Countdown"
          value={status.countdownActive ? `Aktiv — ${status.countdownRemainingSec}s` : "Inaktiv"}
        />
        {status.triggerReason ? <StatusRow label="Auslöser" value={status.triggerReason} danger /> : null}
        {status.triggerZone ? <StatusRow label="Zone" value={status.triggerZone} danger /> : null}
      </GlassCard>

      {status.alarmActive || status.panicActive ? (
        <Pressable
          onPress={() => void sendCommand("disarm")}
          style={({ pressed }) => [styles.disarmButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.disarmLabel}>Alarm quittieren / unscharf schalten</Text>
        </Pressable>
      ) : null}

      <GlassCard style={styles.card}>
        <Text style={styles.cardTitle}>Verzögerungen</Text>
        <Text style={styles.hint}>
          Austrittsverzögerung nach dem Scharfschalten und Eintrittsverzögerung nach Türöffnung, jeweils in Sekunden.
        </Text>

        {timingError ? <Text style={styles.error}>{timingError}</Text> : null}

        <Text style={styles.fieldLabel}>Austrittsverzögerung (Sekunden)</Text>
        <TextInput
          value={String(timingDraft.exitDelaySec)}
          onChangeText={(text) => updateTimingField("exitDelaySec", text)}
          keyboardType="numeric"
          placeholderTextColor={palette.textSecondary}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Eintrittsverzögerung (Sekunden)</Text>
        <TextInput
          value={String(timingDraft.entryDelaySec)}
          onChangeText={(text) => updateTimingField("entryDelaySec", text)}
          keyboardType="numeric"
          placeholderTextColor={palette.textSecondary}
          style={styles.input}
        />

        <Pressable
          onPress={() => void handleSaveTiming()}
          disabled={!timingDirty || timingSaving}
          style={({ pressed }) => [
            styles.saveButton,
            { opacity: !timingDirty || timingSaving ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.saveLabel}>{timingSaving ? "Speichert…" : "Änderungen speichern"}</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.cardTitle}>Datenpunkt-Zuordnung</Text>
        <Text style={styles.hint}>
          Verknüpft das physische AlarmCenter-Panel (Sirene, Display, LEDs, Fingerprint) mit ioBroker-Datenpunkten.
        </Text>

        {mappingError ? <Text style={styles.error}>{mappingError}</Text> : null}

        {MAPPING_FIELDS.map((field) => (
          <View key={field.key}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <TextInput
              value={draft[field.key]}
              onChangeText={(text) => updateField(field.key, text)}
              placeholder="Datenpunkt-ID"
              placeholderTextColor={palette.textSecondary}
              style={styles.input}
            />
          </View>
        ))}

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
  error: { color: palette.danger, fontSize: 13 },
  disarmButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.chip,
    borderWidth: 2,
    borderColor: palette.danger,
    alignItems: "center",
  },
  disarmLabel: { color: palette.danger, fontSize: 15, fontWeight: "700" },
  saveButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.chip,
    backgroundColor: palette.accent,
    alignItems: "center",
  },
  saveLabel: { color: palette.background, fontSize: 15, fontWeight: "700" },
});
