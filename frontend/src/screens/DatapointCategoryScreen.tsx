import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { DatapointListEditor } from "@/components/datapoints/DatapointListEditor";
import { useDatapointCategory } from "@/hooks/useDatapointCategory";
import { palette, spacing } from "@/theme/palette";
import type { DatapointCategory } from "@/types/domain";

interface DatapointCategoryScreenProps {
  category: DatapointCategory;
  emptyHint: string;
  showCameraCapabilities?: boolean;
}

export function DatapointCategoryScreen({
  category,
  emptyHint,
  showCameraCapabilities = false,
}: DatapointCategoryScreenProps): React.JSX.Element {
  const { datapoints, liveValues, isLoading, error, save } = useDatapointCategory(category);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <DatapointListEditor
        category={category}
        datapoints={datapoints}
        liveValues={liveValues}
        onSave={save}
        showCameraCapabilities={showCameraCapabilities}
        emptyHint={emptyHint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  loading: { flex: 1, backgroundColor: palette.background, alignItems: "center", justifyContent: "center" },
  error: { color: palette.danger, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
