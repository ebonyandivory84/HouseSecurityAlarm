import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { GlassCard } from "@/components/ui/GlassCard";
import { palette, radius, spacing } from "@/theme/palette";
import type { FloorplanFloorView, FloorplanImagesConfig, FloorplanLevel } from "@/types/domain";

export interface FloorplanSettingsPanelProps {
  level: FloorplanLevel;
  floorView: FloorplanFloorView;
  onFloorViewChange: (updater: (view: FloorplanFloorView) => FloorplanFloorView) => void;
  images: FloorplanImagesConfig;
  onImagesChange: (updater: (images: FloorplanImagesConfig) => FloorplanImagesConfig) => void;
}

const SCALE_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const OFFSET_STEP = 10;

export function FloorplanSettingsPanel({
  level,
  floorView,
  onFloorViewChange,
  images,
  onImagesChange,
}: FloorplanSettingsPanelProps): React.JSX.Element {
  const [isPicking, setIsPicking] = useState(false);
  const imageKey = level === "EG" ? "egImageDataUri" : "ogImageDataUri";
  const currentImage = images[imageKey];

  const handlePickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }
    setIsPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.8,
      });
      if (result.canceled) {
        return;
      }
      const asset = result.assets[0];
      if (!asset?.base64) {
        return;
      }
      const mime = asset.mimeType ?? "image/jpeg";
      const dataUri = `data:${mime};base64,${asset.base64}`;
      onImagesChange((prev) => ({ ...prev, [imageKey]: dataUri }));
    } finally {
      setIsPicking(false);
    }
  }, [imageKey, onImagesChange]);

  const handleRemoveImage = useCallback(() => {
    onImagesChange((prev) => ({ ...prev, [imageKey]: null }));
  }, [imageKey, onImagesChange]);

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.sectionLabel}>Hintergrundbild ({level})</Text>
      <View style={styles.row}>
        <Pressable onPress={handlePickImage} disabled={isPicking} style={styles.actionButton}>
          {isPicking ? (
            <ActivityIndicator color={palette.background} />
          ) : (
            <Text style={styles.actionLabel}>{currentImage ? "Bild ersetzen" : "Bild hochladen"}</Text>
          )}
        </Pressable>
        {currentImage ? (
          <Pressable onPress={handleRemoveImage} style={[styles.actionButton, styles.actionButtonDanger]}>
            <Text style={styles.actionLabelDanger}>Entfernen</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Hintergrund anzeigen</Text>
        <Switch
          value={floorView.showBg}
          onValueChange={(v) => onFloorViewChange((prev) => ({ ...prev, showBg: v }))}
          disabled={!currentImage}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Nur in Übersicht verwenden</Text>
        <Switch
          value={floorView.useInOverviewOnly}
          onValueChange={(v) => onFloorViewChange((prev) => ({ ...prev, useInOverviewOnly: v }))}
        />
      </View>

      <Text style={styles.sectionLabel}>Skalierung</Text>
      <View style={styles.chipRow}>
        {SCALE_STEPS.map((s) => (
          <Pressable
            key={s}
            onPress={() => onFloorViewChange((prev) => ({ ...prev, workspaceScale: s }))}
            style={[styles.chip, floorView.workspaceScale === s && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, floorView.workspaceScale === s && styles.chipLabelActive]}>{s}×</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Bild-Position</Text>
      <View style={styles.offsetGrid}>
        <View style={styles.offsetRow}>
          <Text style={styles.offsetLabel}>X: {floorView.bgOffsetX}</Text>
          <View style={styles.offsetButtons}>
            <Pressable
              onPress={() => onFloorViewChange((prev) => ({ ...prev, bgOffsetX: prev.bgOffsetX - OFFSET_STEP }))}
              style={styles.offsetButton}
            >
              <Text style={styles.offsetButtonLabel}>−</Text>
            </Pressable>
            <Pressable
              onPress={() => onFloorViewChange((prev) => ({ ...prev, bgOffsetX: prev.bgOffsetX + OFFSET_STEP }))}
              style={styles.offsetButton}
            >
              <Text style={styles.offsetButtonLabel}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.offsetRow}>
          <Text style={styles.offsetLabel}>Y: {floorView.bgOffsetY}</Text>
          <View style={styles.offsetButtons}>
            <Pressable
              onPress={() => onFloorViewChange((prev) => ({ ...prev, bgOffsetY: prev.bgOffsetY - OFFSET_STEP }))}
              style={styles.offsetButton}
            >
              <Text style={styles.offsetButtonLabel}>−</Text>
            </Pressable>
            <Pressable
              onPress={() => onFloorViewChange((prev) => ({ ...prev, bgOffsetY: prev.bgOffsetY + OFFSET_STEP }))}
              style={styles.offsetButton}
            >
              <Text style={styles.offsetButtonLabel}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Veröffentlicht (Lock)</Text>
        <Switch value={images.published} onValueChange={(v) => onImagesChange((prev) => ({ ...prev, published: v }))} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  sectionLabel: { color: palette.textSecondary, fontSize: 12, fontWeight: "600", marginTop: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonDanger: {
    flex: 0,
    paddingHorizontal: spacing.md,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.danger,
  },
  actionLabel: { color: palette.background, fontWeight: "700", fontSize: 13 },
  actionLabelDanger: { color: palette.danger, fontWeight: "600", fontSize: 13 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  switchLabel: { color: palette.textPrimary, fontSize: 13 },
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
  offsetGrid: { gap: 6 },
  offsetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  offsetLabel: { color: palette.textPrimary, fontSize: 13 },
  offsetButtons: { flexDirection: "row", gap: 6 },
  offsetButton: {
    width: 32,
    height: 32,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  offsetButtonLabel: { color: palette.textPrimary, fontSize: 16, fontWeight: "700" },
});
