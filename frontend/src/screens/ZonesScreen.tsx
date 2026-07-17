import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAlarmCenterStatus } from "@/hooks/useAlarmCenterStatus";
import { palette, radius, spacing } from "@/theme/palette";
import { deriveZoneState, type ZoneCommand } from "@/types/domain";

interface ZoneRow {
  key: "perimeter" | "aussenhaut" | "innenraum";
  label: string;
  description: string;
  color: string;
  armCommand: ZoneCommand;
}

const ZONE_ROWS: ZoneRow[] = [
  {
    key: "perimeter",
    label: "Perimeter",
    description: "Kameras (außer Innenraum-Ausnahmen)",
    color: palette.zonePerimeter,
    armCommand: "armPerimeter",
  },
  {
    key: "aussenhaut",
    label: "Außenhaut",
    description: "Türsensoren — impliziert Perimeter",
    color: palette.zoneAussenhaut,
    armCommand: "armAussenhaut",
  },
  {
    key: "innenraum",
    label: "Innenraum",
    description: "Bewegungsmelder — impliziert Außenhaut + Perimeter",
    color: palette.zoneInnenraum,
    armCommand: "armVollschutz",
  },
];

const ACTIVE_FIELD: Record<ZoneRow["key"], "perimeterActive" | "aussenhautActive" | "innenraumActive"> = {
  perimeter: "perimeterActive",
  aussenhaut: "aussenhautActive",
  innenraum: "innenraumActive",
};

export function ZonesScreen(): React.JSX.Element {
  const { status, error, sendCommand } = useAlarmCenterStatus();

  if (!status) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const derived = deriveZoneState(status.mode);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <GlassCard accentColor={palette.danger} style={styles.errorCard}>
          <Text style={{ color: palette.danger }}>{error}</Text>
        </GlassCard>
      ) : null}

      {ZONE_ROWS.map((row) => {
        const active = derived[ACTIVE_FIELD[row.key]];
        const triggered = status.triggerZone === row.key;

        return (
          <GlassCard key={row.key} accentColor={active ? row.color : undefined} style={styles.zoneCard}>
            <View style={styles.zoneHeader}>
              <View style={styles.zoneTitleBlock}>
                <View style={styles.titleRow}>
                  <View style={[styles.zoneDot, { backgroundColor: active ? row.color : palette.zoneOff }]} />
                  <Text style={styles.zoneLabel}>{row.label}</Text>
                </View>
                <Text style={styles.zoneDescription}>{row.description}</Text>
              </View>
              <Text style={[styles.zoneState, { color: active ? row.color : palette.textSecondary }]}>
                {active ? "Scharf" : "Unscharf"}
              </Text>
            </View>

            {triggered ? (
              <Text style={[styles.triggerText, { color: palette.danger }]}>
                Ausgelöst{status.triggerReason ? ` — ${status.triggerReason}` : ""}
              </Text>
            ) : null}

            <Pressable
              onPress={() => void sendCommand(row.armCommand)}
              style={({ pressed }) => [
                styles.armButton,
                { borderColor: row.color, opacity: pressed ? 0.7 : 1 },
                active ? { backgroundColor: row.color } : null,
              ]}
            >
              <Text style={[styles.armButtonLabel, active ? { color: palette.background } : { color: row.color }]}>
                {row.label} scharf schalten
              </Text>
            </Pressable>
          </GlassCard>
        );
      })}

      <Pressable
        onPress={() => void sendCommand("disarm")}
        style={({ pressed }) => [styles.disarmButton, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={styles.disarmLabel}>Alles unscharf schalten</Text>
      </Pressable>

      {status.triggeredDatapointIds.length > 0 ? (
        <GlassCard style={styles.datapointCard}>
          <Text style={styles.zoneLabel}>Ausgelöste Datenpunkte</Text>
          {status.triggeredDatapointIds.map((id) => (
            <Text key={id} style={styles.datapointText}>
              {id}
            </Text>
          ))}
        </GlassCard>
      ) : null}
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
  errorCard: {},
  zoneCard: {
    gap: spacing.sm,
  },
  zoneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  zoneTitleBlock: {
    gap: spacing.xs / 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  zoneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  zoneLabel: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  zoneDescription: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  zoneState: {
    fontSize: 14,
    fontWeight: "700",
  },
  triggerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  armButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    borderWidth: 2,
    alignItems: "center",
  },
  armButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  disarmButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    borderWidth: 2,
    borderColor: palette.zoneOff,
    alignItems: "center",
  },
  disarmLabel: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  datapointCard: {
    gap: spacing.xs / 2,
  },
  datapointText: {
    color: palette.textSecondary,
    fontSize: 13,
  },
});
