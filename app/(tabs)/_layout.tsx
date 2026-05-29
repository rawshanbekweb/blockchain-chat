import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

function TabIcon({ name, color, label, focused }: { name: any; color: string; label: string; focused: boolean }) {
  return (
    <View style={tabStyles.iconWrap}>
      {focused && (
        <LinearGradient
          colors={["rgba(124,111,247,0.25)", "rgba(124,111,247,0)"]}
          style={tabStyles.activeBg}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      )}
      <Feather name={name} size={22} color={color} />
      <Text style={[tabStyles.label, { color }]}>{label}</Text>
      {focused && <View style={tabStyles.activeBar} />}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingHorizontal: 18,
    gap: 4,
    position: "relative",
  },
  activeBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
  activeBar: {
    position: "absolute",
    bottom: -2,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#7c6ff7",
  },
});

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const tabBarHeight = isWeb ? 84 : 64 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
        headerTitleStyle: {
          fontFamily: "Inter_700Bold",
          color: colors.foreground,
          fontSize: 19,
          letterSpacing: -0.3,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: tabBarHeight,
          position: "absolute",
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card + "ee" }]}>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: colors.border,
              }}
            />
          </View>
        ),
        tabBarShowLabel: false,
        tabBarItemStyle: { paddingVertical: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "BlockChat",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="message-circle" color={color} label="Chatlar" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="verify"
        options={{
          title: "Hujjat Tekshirish",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="shield" color={color} label="Tekshirish" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Mening Hamyonim",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="user" color={color} label="Hamyon" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
