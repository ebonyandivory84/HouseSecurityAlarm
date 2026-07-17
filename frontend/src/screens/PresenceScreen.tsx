import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { DatapointListEditor } from "@/components/datapoints/DatapointListEditor";
import { GlassCard } from "@/components/ui/GlassCard";
import { useDatapointCategory } from "@/hooks/useDatapointCategory";
import { usePresenceConfig } from "@/hooks/usePresenceConfig";
import { usePresenceStatus } from "@/hooks/usePresenceStatus";
import { palette, radius, spacing } from "@/theme/palette";
import type { DatapointConfig } from "@/types/domain";

export function PresenceScreen(): React.JSX.Element {
  const { status, isOnline, error: statusError } = usePresenceStatus();
  const {
    datapoints,
    liveValues,
    isLoading: datapointsLoading,
    error: datapointsError,
    save: saveDatapoints,
  } = useDatapointCategory("presence");
  const { config, isLoading: configLoading, error: configError, save: saveConfig } = usePresenceConfig();

  const [autoDisarm, setAutoDisarm] = useState(config.autoDisarmOnPresence);
  const [savingAutoDisarm, setSavingAutoDisarm] = useState(false);

  useEffect(() => {
    setAutoDisarm(config.autoDisarmOnPresence);
  }, [config.autoDisarmOnPresence]);

  if (datapointsLoading || configLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const autoDisarmDirty = autoDisarm !== config.autoDisarmOnPresence;

  async function handleSaveDatapoints(next: DatapointConfig[]): Promise<void> {
    await saveDatapoints(next);
    const enabledIds = next.filter((dp) => dp.enabled).map((dp) => dp.id);
    await saveConfig({ ...config, datapointIds: enabledIds, autoDisarmOnPresence: autoDisarm });
  }

  async function handleSaveAutoDisarm(): Promise<void> {
    setSavingAutoDisarm(true);
    try {
      await saveConfig({ ...config, autoDisarmOnPresence: autoDisarm });
    } finally {
      setSavingAutoDisarm(false);
    }
  }

  return (
    <View style={styles.container}>
      {statusError ? (
        <GlassCard accentColor={palette.danger} style={styles.headerCard}>
          <Text style={styles.errorText}>{statusError}</Text>
        </GlassCard>
      ) : null}
      {configError ? (
        <GlassCard accentColor={palette.danger} style={styles.headerCard}>
          <Text style={styles.errorText}>{configError}</Text>
        </GlassCard>
      ) : null}
      {datapointsError ? (
        <GlassCard accentColor={palette.danger} style={styles.headerCard}>
          <Text style={styles.errorText}>{datapointsError}</Text>
        </GlassCard>
      ) : null}

      <GlassCard
        accentColor={status?.confirmed ? palette.accent : palette.zoneOff}
        style={[styles.headerCard, styles.card]}
      >
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: isOnline ? palette.accent : palette.danger }]} />
          <Text style={styles.cardTitle}>Anwesenheit</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Erkannt</Text>
          <Text style={styles.statusValue}>{status?.confirmed ? "Ja" : "Nein"}</Text>
        </View>
      </GlassCard>

      <GlassCard style={[styles.headerCard, styles.card]}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Bei Anwesenheit automatisch auf Außenhaut zurückstufen</Text>
          <Switch
            value={autoDisarm}
            onValueChange={setAutoDisarm}
            trackColor={{ true: palette.accent, false: palette.zoneOff }}
          />
        </View>
        <Text style={styles.hint}>Nur wirksam bei aktivem Vollschutz.</Text>
        <Pressable
          onPress={() => void handleSaveAutoDisarm()}
          disabled={!autoDisarmDirty || savingAutoDisarm}
          style={({ pressed }) => [
            styles.saveButton,
            { opacity: !autoDisarmDirty || savingAutoDisarm ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.saveLabel}>{savingAutoDisarm ? "Speichert…" : "Änderung speichern"}</Text>
        </Pressable>
      </GlassCard>

      <View style={styles.editorContainer}>
        <DatapointListEditor
          category="presence"
          datapoints={datapoints}
          liveValues={liveValues}
          onSave={handleSaveDatapoints}
          emptyHint="Keine Anwesenheits-Datenpunkte konfiguriert. Unten einen Datenpunkt hinzufügen."
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  loading: { flex: 1, backgroundColor: palette.background, alignItems: "center", justifyContent: "center" },
  headerCard: { marginHorizontal: spacing.lg, marginTop: spacing.md },
  card: { gap: spacing.sm },
  editorContainer: { flex: 1, marginTop: spacing.sm },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  dot: { width: 12, height: 12, borderRadius: 6 },
  cardTitle: { color: palette.textPrimary, fontSize: 18, fontWeight: "700" },
  statusRow: { flexDirection: "row", justifyContent: "space-between" },
  statusLabel: { color: palette.textSecondary, fontSize: 14 },
  statusValue: { color: palette.textPrimary, fontSize: 14, fontWeight: "600" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { color: palette.textPrimary, fontSize: 14, flex: 1, paddingRight: spacing.sm },
  hint: { color: palette.textSecondary, fontSize: 12 },
  errorText: { color: palette.danger, fontSize: 13 },
  saveButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.chip,
    backgroundColor: palette.accent,
    alignItems: "center",
  },
  saveLabel: { color: palette.background, fontSize: 15, fontWeight: "700" },
});
