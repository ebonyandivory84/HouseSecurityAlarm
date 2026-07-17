import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { GlassCard } from "@/components/ui/GlassCard";
import { OverviewScreen } from "@/screens/OverviewScreen";
import { ZonesScreen } from "@/screens/ZonesScreen";
import { PlaceholderScreen } from "@/screens/PlaceholderScreen";
import { DatapointCategoryScreen } from "@/screens/DatapointCategoryScreen";
import { TelegramScreen as TelegramScreenComponent } from "@/screens/TelegramScreen";
import { AlarmCenterScreen as AlarmCenterScreenComponent } from "@/screens/AlarmCenterScreen";
import { DayNightScreen as DayNightScreenComponent } from "@/screens/DayNightScreen";
import { PresenceScreen as PresenceScreenComponent } from "@/screens/PresenceScreen";
import { LogikScreen as LogikScreenComponent } from "@/screens/LogikScreen";
import { palette, spacing } from "@/theme/palette";
import type { DatapointCategory } from "@/types/domain";

const TABLET_BREAKPOINT = 768;
const DRAWER_WIDTH_TABLET = 260;
const DRAWER_WIDTH_PHONE = 240;

type DrawerParamList = {
  Übersicht: undefined;
  Kameras: undefined;
  Motion: undefined;
  Türsensoren: undefined;
  Telegram: undefined;
  AlarmCenter: undefined;
  Zonen: undefined;
  Logik: undefined;
  "Tag-Nacht-Logik": undefined;
  Anwesenheit: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

const ICONS: Record<keyof DrawerParamList, keyof typeof Ionicons.glyphMap> = {
  Übersicht: "speedometer-outline",
  Kameras: "videocam-outline",
  Motion: "walk-outline",
  Türsensoren: "log-in-outline",
  Telegram: "paper-plane-outline",
  AlarmCenter: "hardware-chip-outline",
  Zonen: "shield-checkmark-outline",
  Logik: "git-branch-outline",
  "Tag-Nacht-Logik": "moon-outline",
  Anwesenheit: "people-outline",
};

function PlaceholderFor(title: string) {
  return function ScreenWrapper(): React.JSX.Element {
    return <PlaceholderScreen title={title} />;
  };
}

function DatapointScreenFor(
  category: DatapointCategory,
  options: { emptyHint: string; showCameraCapabilities?: boolean }
) {
  return function ScreenWrapper(): React.JSX.Element {
    return (
      <DatapointCategoryScreen
        category={category}
        emptyHint={options.emptyHint}
        showCameraCapabilities={options.showCameraCapabilities}
      />
    );
  };
}

const KamerasScreen = DatapointScreenFor("camera", {
  showCameraCapabilities: true,
  emptyHint: "Keine Kameras konfiguriert. Unten einen Datenpunkt hinzufügen.",
});
const MotionScreen = DatapointScreenFor("motion", {
  emptyHint: "Keine Bewegungsmelder konfiguriert. Unten einen Datenpunkt hinzufügen.",
});
const TürsensorenScreen = DatapointScreenFor("door", {
  emptyHint: "Keine Türsensoren konfiguriert. Unten einen Datenpunkt hinzufügen.",
});
const TelegramScreen = TelegramScreenComponent;
const AlarmCenterScreen = AlarmCenterScreenComponent;
const LogikScreen = LogikScreenComponent;
const TagNachtLogikScreen = DayNightScreenComponent;
const AnwesenheitScreen = PresenceScreenComponent;

function GlassDrawerContent(props: DrawerContentComponentProps): React.JSX.Element {
  return (
    <View style={styles.drawerContainer}>
      <GlassCard style={styles.drawerHeaderCard}>
        <Text style={styles.drawerTitle}>HouseSecurityAlarm</Text>
      </GlassCard>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerScrollContent}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
    </View>
  );
}

export function DrawerNavigator(): React.JSX.Element {
  const { width } = Dimensions.get("window");
  const isTablet = width >= TABLET_BREAKPOINT;

  return (
    <Drawer.Navigator
      initialRouteName="Übersicht"
      drawerContent={(props) => <GlassDrawerContent {...props} />}
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.textPrimary,
        headerShadowVisible: false,
        drawerType: isTablet ? "permanent" : "front",
        drawerStyle: {
          width: isTablet ? DRAWER_WIDTH_TABLET : DRAWER_WIDTH_PHONE,
          backgroundColor: palette.background,
          borderRightColor: palette.glassBorder,
          borderRightWidth: 1,
        },
        sceneStyle: { backgroundColor: palette.background },
        drawerActiveBackgroundColor: palette.glassFill,
        drawerActiveTintColor: palette.accent,
        drawerInactiveTintColor: palette.textSecondary,
        drawerLabelStyle: { fontSize: 14 },
        drawerIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name as keyof DrawerParamList]} size={size} color={color} />
        ),
      })}
    >
      <Drawer.Screen name="Übersicht" component={OverviewScreen} />
      <Drawer.Screen name="Kameras" component={KamerasScreen} />
      <Drawer.Screen name="Motion" component={MotionScreen} />
      <Drawer.Screen name="Türsensoren" component={TürsensorenScreen} />
      <Drawer.Screen name="Telegram" component={TelegramScreen} />
      <Drawer.Screen name="AlarmCenter" component={AlarmCenterScreen} />
      <Drawer.Screen name="Zonen" component={ZonesScreen} />
      <Drawer.Screen name="Logik" component={LogikScreen} />
      <Drawer.Screen name="Tag-Nacht-Logik" component={TagNachtLogikScreen} />
      <Drawer.Screen name="Anwesenheit" component={AnwesenheitScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: palette.background,
  },
  drawerHeaderCard: {
    margin: spacing.md,
    marginBottom: spacing.xs,
  },
  drawerTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  drawerScrollContent: {
    paddingTop: 0,
  },
});
