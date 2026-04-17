import React, { useState, useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

const FEATURES = [
  {
    icon: "message-circle" as const,
    title: "Xavfsiz Chat",
    desc: "Shifrlangan xabarlar va hujjatlar almashish",
    color: "#6c5ce7",
  },
  {
    icon: "shield" as const,
    title: "Blokcheyn Autentifikatsiya",
    desc: "SHA-256 kriptografiya va o'zgarmas blokcheyn zanjiri",
    color: "#00cec9",
  },
  {
    icon: "check-circle" as const,
    title: "Tezkor Tekshirish",
    desc: "Istalgan hujjatni bir zumda tasdiqlang yoki tekshiring",
    color: "#fdcb6e",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useWallet();
  const [step, setStep] = useState<"welcome" | "setup">("welcome");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleStart = async () => {
    if (!name.trim()) {
      inputRef.current?.focus();
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    await completeOnboarding(name.trim());
    setLoading(false);
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#3d1a8f", "#060912", "#060912"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <LinearGradient
              colors={["#6c5ce7", "#0652dd"]}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="link" size={42} color="#fff" />
            </LinearGradient>
            <Text style={[styles.appName, { color: colors.foreground }]}>
              Block<Text style={{ color: colors.primaryLight }}>Chat</Text>
            </Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              Blokcheyn kuchidagi xavfsiz muloqot
            </Text>
          </View>

          <View style={styles.features}>
            {FEATURES.map((f, i) => (
              <View
                key={i}
                style={[
                  styles.featureCard,
                  { backgroundColor: "rgba(255,255,255,0.04)", borderColor: colors.border },
                ]}
              >
                <View style={[styles.featureIcon, { backgroundColor: f.color + "20" }]}>
                  <Feather name={f.icon} size={22} color={f.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureTitle, { color: colors.foreground }]}>
                    {f.title}
                  </Text>
                  <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>
                    {f.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.setupCard, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: colors.border }]}>
            <Text style={[styles.setupTitle, { color: colors.foreground }]}>
              Ismingizni kiriting
            </Text>
            <Text style={[styles.setupDesc, { color: colors.mutedForeground }]}>
              Blokcheyn hamyoningiz avtomatik yaratiladi
            </Text>
            <TextInput
              ref={inputRef}
              style={[
                styles.nameInput,
                {
                  backgroundColor: colors.secondary,
                  borderColor: name ? colors.primary : colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="Masalan: Alisher Nazarov"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleStart}
            />

            <Pressable onPress={handleStart} disabled={loading || !name.trim()}>
              <LinearGradient
                colors={
                  name.trim()
                    ? ["#6c5ce7", "#0652dd"]
                    : [colors.border, colors.border]
                }
                style={styles.startButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.startBtnText}>Boshlash</Text>
                    <Feather name="arrow-right" size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
            Hamyon manziliz qurilmangizda xavfsiz saqlanadi.{"\n"}
            Hech qanday server yoki bulutga uzatilmaydi.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 28 },
  logoSection: { alignItems: "center", gap: 12 },
  logoGradient: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appName: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 22,
  },
  features: { gap: 10 },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  featureIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  setupCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  setupTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  setupDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  nameInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  startButton: {
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  startBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
});
