import React from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { palette, radius } from "@/theme/palette";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
}

export function GlassCard({ children, style, accentColor }: GlassCardProps): React.JSX.Element {
  const border = accentColor ? { borderColor: accentColor } : null;

  if (Platform.OS === "web") {
    return (
      <View style={[styles.card, styles.webFallback, border, style]}>
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.card, border, style]}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    overflow: "hidden",
  },
  webFallback: {
    backgroundColor: palette.glassFill,
    backdropFilter: "blur(20px)",
  } as ViewStyle,
  content: {
    padding: 16,
  },
});
