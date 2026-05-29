import React, { useState, useRef, useEffect } from "react";
import {
  Animated,
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
import { impactLight, impactMedium } from "@/utils/haptics";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

const FEATURES = [
  {
    icon: "message-circle" as const,
    title: "Xavfsiz Chat",
    desc: "Shifrlangan xabarlar va hujjatlar almashish imkoniyati",
    color: "#7c6ff7",
    glow: "rgba(124,111,247,0.2)",
  },
  {
    icon: "shield" as const,
    title: "Blokcheyn Autentifikatsiya",
    desc: "SHA-256 kriptografiya va o'zgarmas blokcheyn zanjiri",
    color: "#10b981",
    glow: "rgba(16,185,129,0.2)",
  },
  {
    icon: "zap" as const,
    title: "Tezkor Tekshirish",
    desc: "Istalgan hujjatni bir zumda tasdiqlang yoki tekshiring",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.2)",
  },
];

function GlowOrb({ color, size, top, left, opacity }: { color: string; size: number; top: number; left?: number; right?: number; opacity?: number }) {
  return (
    <View
      style={{
        position: "absolute",
        top,
        left,
        right: left === undefined ? 0 : undefined,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: opacity ?? 0.12,
      }}
    />
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useWallet();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleStart = async () => {
    if (!name.trim()) {
      inputRef.current?.focus();
      impactLight();
      return;
    }
    impactMedium();
    setLoading(true);
    await completeOnboarding(name.trim());
    setLoading(false);
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlowOrb color="#7c6ff7" size={320} top={-80} left={-80} opacity={0.1} />
      <GlowOrb color="#10b981" size={220} top={200} left={width - 120} opacity={0.08} />
      <GlowOrb color="#7c6ff7" size={180} top={500} left={-60} opacity={0.07} />

      <LinearGradient
        colors={["rgba(124,111,247,0.18)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        pointerEvents="none"
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 36 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.logoSection}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <LinearGradient
                  colors={["#7c6ff7", "#5548d4", "#1e40af"]}
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.logoInner}>
                    <Feather name="link" size={38} color="#fff" />
                  </View>
                </LinearGradient>
              </Animated.View>
              <View style={styles.appNameWrap}>
                <Text style={[styles.appName, { color: colors.foreground }]}>Block</Text>
                <Text style={[styles.appName, { color: colors.primaryLight }]}>Chat</Text>
              </View>
              <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
                Blokcheyn kuchidagi{"\n"}xavfsiz muloqot platformasi
              </Text>
            </View>

            <View style={styles.features}>
              {FEATURES.map((f, i) => (
                <View
                  key={i}
                  style={[
                    styles.featureCard,
                    { backgroundColor: "rgba(255,255,255,0.035)", borderColor: colors.border },
                  ]}
                >
                  <View style={[styles.featureIcon, { backgroundColor: f.glow, borderColor: f.color + "30" }]}>
                    <Feather name={f.icon} size={21} color={f.color} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.featureTitle, { color: colors.foreground }]}>{f.title}</Text>
                    <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>
                  </View>
                  <View style={[styles.featureArrow, { backgroundColor: f.glow }]}>
                    <Feather name="chevron-right" size={14} color={f.color} />
                  </View>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.setupCard,
                { backgroundColor: "rgba(124,111,247,0.06)", borderColor: "rgba(124,111,247,0.2)" },
              ]}
            >
              <View style={styles.setupHeader}>
                <LinearGradient
                  colors={["#7c6ff7", "#5548d4"]}
                  style={styles.setupIconBg}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Feather name="user" size={16} color="#fff" />
                </LinearGradient>
                <View>
                  <Text style={[styles.setupTitle, { color: colors.foreground }]}>Ismingizni kiriting</Text>
                  <Text style={[styles.setupDesc, { color: colors.mutedForeground }]}>
                    Hamyon avtomatik yaratiladi
                  </Text>
                </View>
              </View>

              <View style={[styles.inputWrap, { borderColor: name ? colors.primary : colors.border }]}>
                <Feather name="user" size={16} color={name ? colors.primary : colors.mutedForeground} style={{ marginLeft: 14 }} />
                <TextInput
                  ref={inputRef}
                  style={[styles.nameInput, { color: colors.foreground, backgroundColor: colors.input }]}
                  placeholder="Masalan: Alisher Nazarov"
                  placeholderTextColor={colors.mutedForeground}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleStart}
                />
              </View>

              <Pressable onPress={handleStart} disabled={loading}>
                {({ pressed }) => (
                  <LinearGradient
                    colors={
                      name.trim()
                        ? (["#7c6ff7", "#5548d4", "#1e40af"] as any)
                        : ([colors.border, colors.border] as any)
                    }
                    style={[styles.startButton, { opacity: pressed ? 0.85 : 1 }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <View style={styles.loadingRow}>
                        <Text style={styles.startBtnText}>Yaratilmoqda</Text>
                        <Feather name="loader" size={18} color="#fff" />
                      </View>
                    ) : (
                      <View style={styles.loadingRow}>
                        <Text style={styles.startBtnText}>Boshlash</Text>
                        <Feather name="arrow-right" size={18} color="#fff" />
                      </View>
                    )}
                  </LinearGradient>
                )}
              </Pressable>
            </View>

            <View style={styles.disclaimerRow}>
              <Feather name="lock" size={13} color={colors.mutedForeground} />
              <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
                Ma'lumotlaringiz faqat qurilmangizda saqlanadi. Hech qanday serverga yuborilmaydi.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 22, gap: 24 },
  logoSection: { alignItems: "center", gap: 14 },
  logoGradient: {
    width: 92,
    height: 92,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7c6ff7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoInner: { alignItems: "center", justifyContent: "center" },
  appNameWrap: { flexDirection: "row", alignItems: "center" },
  appName: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 23,
    letterSpacing: 0.1,
  },
  features: { gap: 10 },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  featureDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  featureArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  setupCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  setupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  setupIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  setupTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  setupDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    height: 54,
  },
  nameInput: {
    flex: 1,
    height: 54,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  startButton: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7c6ff7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  startBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  disclaimerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    flex: 1,
  },
});
