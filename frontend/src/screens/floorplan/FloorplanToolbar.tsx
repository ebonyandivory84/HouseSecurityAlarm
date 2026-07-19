import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { palette, radius, spacing } from "@/theme/palette";
import type { FloorplanItemType } from "@/types/domain";
import type { FloorplanSelection, FloorplanTool } from "./FloorplanCanvas";

const TOOL_LABELS: Record<FloorplanTool, string> = {
  select: "Auswahl",
  place: "Objekt",
  wall: "Wand",
  perimeter: "Perimeter",
  outer: "Außenhaut",
};

const TOOL_ORDER: FloorplanTool[] = ["select", "place", "wall", "perimeter", "outer"];

const ITEM_TYPE_LABELS: Record<FloorplanItemType, string> = {
  door: "Tür",
  window: "Fenster",
  garagedoor: "Garagentor",
  garage: "Garage",
  pavingDriveway: "Einfahrt",
  pavingTerrace: "Terrasse",
  cameraZone: "Kamera-Bereich",
  pirZone: "PIR-Bereich",
  stairs: "Treppe",
  wc: "WC",
  washbasin: "Waschbecken",
  bathtub: "Badewanne",
  shower: "Dusche",
  sink: "Spüle",
  kitchen: "Küchenzeile",
  stove: "Herd",
  cabinet: "Schrank",
  sofa: "Sofa",
  tableRect: "Tisch eckig",
  tableRound: "Tisch rund",
  chair: "Stuhl",
  beam: "Balken",
};

const ITEM_TYPE_GROUPS: { label: string; types: FloorplanItemType[] }[] = [
  { label: "Öffnungen", types: ["door", "window", "garagedoor", "garage"] },
  { label: "Außenbereich", types: ["pavingDriveway", "pavingTerrace"] },
  { label: "Sensorik", types: ["cameraZone", "pirZone"] },
  { label: "Sanitär", types: ["wc", "washbasin", "bathtub", "shower", "sink"] },
  { label: "Küche & Möbel", types: ["kitchen", "stove", "cabinet", "sofa", "tableRect", "tableRound", "chair"] },
  { label: "Struktur", types: ["stairs", "beam"] },
];

const GRID_PRESETS = [4, 8, 12, 16, 24];

export interface FloorplanToolbarProps {
  tool: FloorplanTool;
  onToolChange: (tool: FloorplanTool) => void;
  placeItemType: FloorplanItemType | null;
  onPlaceItemTypeChange: (type: FloorplanItemType) => void;
  onFinishWall: () => void;
  onCancelWall: () => void;
  snap: boolean;
  onSnapChange: (snap: boolean) => void;
  grid: number;
  onGridChange: (grid: number) => void;
  canUndo: boolean;
  onUndo: () => void;
  selection: FloorplanSelection;
  onDeleteSelection: () => void;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function FloorplanToolbar({
  tool,
  onToolChange,
  placeItemType,
  onPlaceItemTypeChange,
  onFinishWall,
  onCancelWall,
  snap,
  onSnapChange,
  grid,
  onGridChange,
  canUndo,
  onUndo,
  selection,
  onDeleteSelection,
}: FloorplanToolbarProps): React.JSX.Element {
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.sectionLabel}>Werkzeug</Text>
      <View style={styles.chipRow}>
        {TOOL_ORDER.map((t) => (
          <Chip key={t} label={TOOL_LABELS[t]} active={tool === t} onPress={() => onToolChange(t)} />
        ))}
      </View>

      {tool === "place" ? (
        <>
          <Text style={styles.sectionLabel}>Objekttyp</Text>
          <ScrollView style={styles.itemPicker} nestedScrollEnabled>
            {ITEM_TYPE_GROUPS.map((group) => (
              <View key={group.label} style={styles.itemGroup}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                <View style={styles.chipRow}>
                  {group.types.map((type) => (
                    <Chip
                      key={type}
                      label={ITEM_TYPE_LABELS[type]}
                      active={placeItemType === type}
                      onPress={() => onPlaceItemTypeChange(type)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      {tool === "wall" ? (
        <View style={styles.actionRow}>
          <Pressable onPress={onFinishWall} style={styles.actionButton}>
            <Text style={styles.actionLabel}>Wand fertigstellen</Text>
          </Pressable>
          <Pressable onPress={onCancelWall} style={[styles.actionButton, styles.actionButtonSecondary]}>
            <Text style={styles.actionLabelSecondary}>Wand abbrechen</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Raster</Text>
      <View style={styles.chipRow}>
        <Chip label={snap ? "Snap: An" : "Snap: Aus"} active={snap} onPress={() => onSnapChange(!snap)} />
        {GRID_PRESETS.map((g) => (
          <Chip key={g} label={`${g}px`} active={grid === g} onPress={() => onGridChange(g)} />
        ))}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={onUndo}
          disabled={!canUndo}
          style={[styles.actionButton, styles.actionButtonSecondary, !canUndo && styles.actionButtonDisabled]}
        >
          <Text style={styles.actionLabelSecondary}>Rückgängig</Text>
        </Pressable>
        <Pressable
          onPress={onDeleteSelection}
          disabled={!selection}
          style={[styles.actionButton, styles.actionButtonDanger, !selection && styles.actionButtonDisabled]}
        >
          <Text style={styles.actionLabelDanger}>
            {selection ? `${selection.kind === "item" ? "Objekt" : "Wand"} löschen` : "Nichts ausgewählt"}
          </Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  sectionLabel: { color: palette.textSecondary, fontSize: 12, fontWeight: "600", marginTop: spacing.sm },
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
  itemPicker: { maxHeight: 220 },
  itemGroup: { marginBottom: spacing.sm },
  groupLabel: { color: palette.textSecondary, fontSize: 11, fontWeight: "600", marginBottom: 4, opacity: 0.8 },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    backgroundColor: palette.accent,
    alignItems: "center",
  },
  actionButtonSecondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: palette.glassBorder },
  actionButtonDanger: { backgroundColor: "transparent", borderWidth: 1, borderColor: palette.danger },
  actionButtonDisabled: { opacity: 0.4 },
  actionLabel: { color: palette.background, fontWeight: "700", fontSize: 13 },
  actionLabelSecondary: { color: palette.textPrimary, fontWeight: "600", fontSize: 13 },
  actionLabelDanger: { color: palette.danger, fontWeight: "600", fontSize: 13 },
});
