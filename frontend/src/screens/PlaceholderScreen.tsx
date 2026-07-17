import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { palette, spacing } from "@/theme/palette";

interface PlaceholderScreenProps {
  title: string;
}

export function PlaceholderScreen({ title }: PlaceholderScreenProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <GlassCard style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>Diese Seite wird in M7 implementiert.</Text>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    padding: spacing.lg,
  },
  card: {
    alignSelf: "flex-start",
    minWidth: 280,
  },
  title: {
    color: palette.textPrimary,
    fontSize: 20,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  hint: {
    color: palette.textSecondary,
    fontSize: 14,
  },
});
