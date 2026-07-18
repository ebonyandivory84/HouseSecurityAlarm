import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAlarmCenterStatus } from "@/hooks/useAlarmCenterStatus";
import { iobrokerClient } from "@/services/iobrokerClient";
import { palette, radius, spacing } from "@/theme/palette";
import { ZONE_MODE_LABELS, type ZoneCommand } from "@/types/domain";

const COMMANDS: Array<{ command: ZoneCommand; label: string; color: string }> = [
  { command: "disarm", label: "Unscharf", color: palette.zoneOff },
  { command: "armPerimeter", label: "Perimeter", color: palette.zonePerimeter },
  { command: "armAussenhaut", label: "Außenhaut", color: palette.zoneAussenhaut },
  { command: "armVollschutz", label: "Vollschutz", color: palette.zoneInnenraum },
];

export function OverviewScreen(): React.JSX.Element {
  const { status, isOnline, error, sendCommand } = useAlarmCenterStatus();

  if (!status) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const alarm = status.alarmActive;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GlassCard accentColor={alarm ? palette.danger : undefined} style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.label}>Modus</Text>
            <Text style={styles.modeText}>{ZONE_MODE_LABELS[status.mode]}</Text>
          </View>
          <View style={[styles.dot, { backgroundColor: isOnline ? palette.success : palette.textSecondary }]} />
        </View>

        {alarm ? (
          <Text style={[styles.alarmText, { color: palette.danger }]}>
            ALARM{status.triggerZone ? ` — ${status.triggerZone}` : ""}
            {status.triggerReason ? ` (${status.triggerReason})` : ""}
          </Text>
        ) : null}

        {status.panicActive ? <Text style={[styles.alarmText, { color: palette.danger }]}>PANIK AUSGELÖST</Text> : null}

        {status.countdownActive ? (
          <Text style={styles.countdownText}>Countdown läuft: {status.countdownRemainingSec}s</Text>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            AlarmCenter: {status.alarmCenterOnline ? "verbunden" : "nicht verbunden"}
          </Text>
          {status.triggeredDatapointIds.length > 0 ? (
            <Text style={styles.metaText}>Ausgelöst: {status.triggeredDatapointIds.join(", ")}</Text>
          ) : null}
        </View>
      </GlassCard>

      {error ? (
        <GlassCard accentColor={palette.danger} style={styles.errorCard}>
          <Text style={{ color: palette.danger }}>{error}</Text>
        </GlassCard>
      ) : null}

      <View style={styles.commandGrid}>
        {COMMANDS.map(({ command, label, color }) => {
          const active =
            (command === "disarm" && status.mode === "unscharf") ||
            (command === "armPerimeter" && status.mode === "perimeter") ||
            (command === "armAussenhaut" && status.mode === "aussenhaut") ||
            (command === "armVollschutz" && status.mode === "vollschutz");
          return (
            <Pressable
              key={command}
              onPress={() => void sendCommand(command)}
              style={({ pressed }) => [
                styles.commandButton,
                { borderColor: color, opacity: pressed ? 0.7 : 1 },
                active ? { backgroundColor: color } : null,
              ]}
            >
              <Text style={[styles.commandLabel, active ? { color: palette.background } : { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => void iobrokerClient.writeState("commands.panic", true, false)}
        style={({ pressed }) => [styles.panicButton, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={styles.panicLabel}>PANIK</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  loading: {
    flex: 1,
    backgroundColor: palette.background,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCard: {
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  modeText: {
    color: palette.textPrimary,
    fontSize: 26,
    fontWeight: "700",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  alarmText: {
    fontSize: 16,
    fontWeight: "700",
  },
  countdownText: {
    color: palette.warning,
    fontSize: 15,
    fontWeight: "600",
  },
  metaRow: {
    marginTop: spacing.xs,
    gap: spacing.xs / 2,
  },
  metaText: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  errorCard: {},
  commandGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  commandButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.chip,
    borderWidth: 2,
    minWidth: 140,
    alignItems: "center",
  },
  commandLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  panicButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.chip,
    backgroundColor: palette.danger,
    alignItems: "center",
  },
  panicLabel: {
    color: palette.background,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
