import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAllDatapoints } from "@/hooks/useAllDatapoints";
import { useFloorplanDesigner } from "@/hooks/useFloorplanDesigner";
import { useFloorplanLiveBindings } from "@/hooks/useFloorplanLiveBindings";
import { palette, radius, spacing } from "@/theme/palette";
import type { FloorplanItem, FloorplanItemType, FloorplanLevel } from "@/types/domain";
import { FloorplanBindingPanel } from "./floorplan/FloorplanBindingPanel";
import { FloorplanCanvas, type FloorplanCanvasHandle, type FloorplanSelection, type FloorplanTool } from "./floorplan/FloorplanCanvas";
import { FloorplanSettingsPanel } from "./floorplan/FloorplanSettingsPanel";
import { FloorplanToolbar } from "./floorplan/FloorplanToolbar";

const LEVELS: FloorplanLevel[] = ["EG", "OG"];

export function FloorplanScreen(): React.JSX.Element {
  const {
    data,
    images,
    level,
    setLevel,
    floor,
    floorView,
    isLoading,
    isSaving,
    isDirty,
    error,
    canUndo,
    updateFloor,
    updateFloorView,
    updateSettings,
    updateImages,
    undo,
    save,
  } = useFloorplanDesigner();
  const { datapoints } = useAllDatapoints();

  const [tool, setTool] = useState<FloorplanTool>("select");
  const [placeItemType, setPlaceItemType] = useState<FloorplanItemType | null>(null);
  const [selection, setSelection] = useState<FloorplanSelection>(null);
  const canvasRef = useRef<FloorplanCanvasHandle>(null);

  const boundIds = useMemo(
    () => floor.items.map((item) => item.alarmBindingId).filter((id): id is string => Boolean(id)),
    [floor.items],
  );
  const alarmActiveBindingIds = useFloorplanLiveBindings(datapoints, boundIds);

  const selectedItem: FloorplanItem | null = useMemo(() => {
    if (!selection || selection.kind !== "item") return null;
    return floor.items.find((item) => item.id === selection.id) ?? null;
  }, [selection, floor.items]);

  const backgroundImageUri = useMemo(() => {
    if (!floorView.showBg) return null;
    return level === "EG" ? images.egImageDataUri : images.ogImageDataUri;
  }, [floorView.showBg, images, level]);

  const handleToolChange = useCallback((next: FloorplanTool) => {
    setTool(next);
    setSelection(null);
    if (next !== "place") {
      setPlaceItemType(null);
    }
  }, []);

  const handlePlaceItemTypeChange = useCallback((type: FloorplanItemType) => {
    setPlaceItemType(type);
    setTool("place");
  }, []);

  const handleDeleteSelection = useCallback(() => {
    if (!selection) return;
    updateFloor((prev) =>
      selection.kind === "item"
        ? { ...prev, items: prev.items.filter((item) => item.id !== selection.id) }
        : { ...prev, walls: prev.walls.filter((wall) => wall.id !== selection.id) },
    );
    setSelection(null);
  }, [selection, updateFloor]);

  const handleBind = useCallback(
    (binding: { alarmBindingType: NonNullable<FloorplanItem["alarmBindingType"]>; alarmBindingKey: string; alarmBindingId: string }) => {
      if (!selectedItem) return;
      updateFloor((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === selectedItem.id ? { ...item, ...binding } : item)),
      }));
    },
    [selectedItem, updateFloor],
  );

  const handleUnbind = useCallback(() => {
    if (!selectedItem) return;
    updateFloor((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === selectedItem.id
          ? { ...item, alarmBindingType: undefined, alarmBindingKey: undefined, alarmBindingId: undefined }
          : item,
      ),
    }));
  }, [selectedItem, updateFloor]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <GlassCard accentColor={palette.danger}>
          <Text style={{ color: palette.danger }}>{error}</Text>
        </GlassCard>
      ) : null}

      <GlassCard style={styles.headerCard}>
        <View style={styles.levelRow}>
          {LEVELS.map((lvl) => (
            <Pressable key={lvl} onPress={() => setLevel(lvl)} style={[styles.levelChip, level === lvl && styles.levelChipActive]}>
              <Text style={[styles.levelChipLabel, level === lvl && styles.levelChipLabelActive]}>{lvl}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => void save()}
          disabled={!isDirty || isSaving}
          style={({ pressed }) => [styles.saveButton, { opacity: !isDirty || isSaving ? 0.4 : pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.saveLabel}>{isSaving ? "Speichert…" : "Speichern"}</Text>
        </Pressable>
      </GlassCard>

      <View style={styles.canvasWrapper}>
        <FloorplanCanvas
          ref={canvasRef}
          floor={floor}
          floorView={floorView}
          backgroundImageUri={backgroundImageUri}
          snap={data.settings.snap}
          grid={data.settings.grid}
          tool={tool}
          placeItemType={placeItemType}
          selection={selection}
          onSelectionChange={setSelection}
          onFloorChange={updateFloor}
          onItemPlaced={() => setTool("select")}
          alarmActiveBindingIds={alarmActiveBindingIds}
        />
      </View>

      <FloorplanToolbar
        tool={tool}
        onToolChange={handleToolChange}
        placeItemType={placeItemType}
        onPlaceItemTypeChange={handlePlaceItemTypeChange}
        onFinishWall={() => canvasRef.current?.finishWall()}
        onCancelWall={() => canvasRef.current?.cancelWall()}
        snap={data.settings.snap}
        onSnapChange={(snap) => updateSettings((prev) => ({ ...prev, snap }))}
        grid={data.settings.grid}
        onGridChange={(grid) => updateSettings((prev) => ({ ...prev, grid }))}
        canUndo={canUndo}
        onUndo={undo}
        selection={selection}
        onDeleteSelection={handleDeleteSelection}
      />

      <FloorplanBindingPanel selectedItem={selectedItem} onBind={handleBind} onUnbind={handleUnbind} />

      <FloorplanSettingsPanel
        level={level}
        floorView={floorView}
        onFloorViewChange={updateFloorView}
        images={images}
        onImagesChange={updateImages}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: spacing.lg, gap: spacing.md },
  loading: { flex: 1, backgroundColor: palette.background, alignItems: "center", justifyContent: "center" },
  headerCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  levelRow: { flexDirection: "row", gap: spacing.sm },
  levelChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.glassBorder,
  },
  levelChipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  levelChipLabel: { color: palette.textSecondary, fontSize: 14, fontWeight: "700" },
  levelChipLabelActive: { color: palette.background },
  saveButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.chip, backgroundColor: palette.accent },
  saveLabel: { color: palette.background, fontSize: 14, fontWeight: "700" },
  canvasWrapper: {
    height: 520,
    borderRadius: radius.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.glassBorder,
  },
});
