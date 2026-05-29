import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { impactLight, impactMedium, notifySuccess, notifyWarning } from "@/utils/haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import { computeFileHash, verifyDocumentInChain } from "@/utils/blockchain";

type VerifyResult =
  | {
      status: "verified";
      blockIndex: number;
      ownerAddress: string;
      timestamp: number;
      documentHash: string;
      documentName: string;
    }
  | { status: "not_found"; documentHash: string }
  | null;

type AuthResult =
  | {
      status: "success";
      blockIndex: number;
      blockHash: string;
      documentHash: string;
      documentName: string;
    }
  | null;

export default function VerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { chain, authenticateDocument, walletAddress } = useWallet();
  const isWeb = Platform.OS === "web";

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult>(null);
  const [authResult, setAuthResult] = useState<AuthResult>(null);
  const [verifyFileName, setVerifyFileName] = useState<string | null>(null);
  const [authFileName, setAuthFileName] = useState<string | null>(null);

  const handleVerify = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setVerifyFileName(asset.name);
      setVerifyResult(null);
      setVerifyLoading(true);
      impactLight();
      const hash = await computeFileHash(
        asset.name,
        asset.size ?? 0,
        asset.mimeType ?? "application/octet-stream",
        asset.uri
      );
      const { verified, block } = await verifyDocumentInChain(hash, chain);
      if (verified && block) {
        setVerifyResult({
          status: "verified",
          blockIndex: block.index,
          ownerAddress: block.ownerAddress,
          timestamp: block.timestamp,
          documentHash: hash,
          documentName: block.documentName,
        });
        notifySuccess();
      } else {
        setVerifyResult({ status: "not_found", documentHash: hash });
        notifyWarning();
      }
    } catch {
      Alert.alert("Xato", "Hujjatni tekshirib bo'lmadi");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setAuthFileName(asset.name);
      setAuthResult(null);
      setAuthLoading(true);
      impactMedium();
      const hash = await computeFileHash(
        asset.name,
        asset.size ?? 0,
        asset.mimeType ?? "application/octet-stream",
        asset.uri
      );
      if (chain.find((b) => b.documentHash === hash)) {
        Alert.alert("Allaqachon mavjud", "Bu hujjat blokcheynda allaqachon ro'yxatdan o'tgan.");
        setAuthLoading(false);
        return;
      }
      const block = await authenticateDocument({
        documentName: asset.name,
        documentHash: hash,
        fileSize: asset.size ?? 0,
        mimeType: asset.mimeType ?? "application/octet-stream",
        chatId: "verify-screen",
      });
      setAuthResult({
        status: "success",
        blockIndex: block.index,
        blockHash: block.hash,
        documentHash: hash,
        documentName: asset.name,
      });
      notifySuccess();
    } catch {
      Alert.alert("Xato", "Hujjatni autentifikatsiya qilib bo'lmadi");
    } finally {
      setAuthLoading(false);
    }
  };

  const myBlocks = chain.filter((b) => b.ownerAddress === walletAddress);
  const lastBlockDate =
    chain.length > 0
      ? new Date(chain[chain.length - 1].timestamp).toLocaleDateString("uz-UZ", {
          day: "2-digit",
          month: "2-digit",
        })
      : "—";

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: isWeb ? 67 : 0,
        paddingBottom: isWeb ? 34 : insets.bottom + 100,
        padding: 16,
        gap: 14,
      }}
      showsVerticalScrollIndicator={false}
    >
      <ActionCard
        icon="shield"
        iconColor="#7c6ff7"
        gradientColors={["#7c6ff7", "#5548d4"] as [string, string]}
        bgGlow="rgba(124,111,247,0.08)"
        title="Hujjat Tekshirish"
        desc="Hujjat blokcheynda mavjudligini tekshiring"
        btnLabel="Hujjat tanlash"
        onPress={handleVerify}
        loading={verifyLoading}
        fileName={verifyFileName}
        colors={colors}
      >
        {verifyResult && <ResultCard result={verifyResult} colors={colors} />}
      </ActionCard>

      <ActionCard
        icon="lock"
        iconColor="#10b981"
        gradientColors={["#10b981", "#059669"] as [string, string]}
        bgGlow="rgba(16,185,129,0.08)"
        title="Hujjat Autentifikatsiyasi"
        desc="Hujjatni blokcheynda ro'yxatdan o'tkaz"
        btnLabel="Hujjat tanlash va saqlash"
        onPress={handleAuthenticate}
        loading={authLoading}
        fileName={authFileName}
        colors={colors}
      >
        {authResult && <AuthResultCard result={authResult} colors={colors} />}
      </ActionCard>

      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statsHeader}>
          <LinearGradient
            colors={["#f59e0b", "#d97706"]}
            style={styles.statsHeaderIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="layers" size={15} color="#fff" />
          </LinearGradient>
          <Text style={[styles.statsTitle, { color: colors.foreground }]}>
            Blokcheyn Statistikasi
          </Text>
        </View>
        <View style={styles.statsGrid}>
          <StatBox
            icon="link"
            value={chain.length}
            label="Jami bloklar"
            accent={colors.primary}
            glow={colors.primaryGlow}
            colors={colors}
          />
          <StatBox
            icon="shield"
            value={myBlocks.length}
            label="Mening bloklarim"
            accent={colors.success}
            glow={colors.successBg}
            colors={colors}
          />
          <StatBox
            icon="clock"
            value={lastBlockDate}
            label="Oxirgi blok"
            accent={colors.warning}
            glow={colors.warningBg}
            colors={colors}
          />
        </View>
      </View>

      <HowItWorksCard colors={colors} />
    </ScrollView>
  );
}

function ActionCard({
  icon,
  iconColor,
  gradientColors,
  bgGlow,
  title,
  desc,
  btnLabel,
  onPress,
  loading,
  fileName,
  colors,
  children,
}: any) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.cardGlowBg, { backgroundColor: bgGlow }]} />
      <View style={styles.cardHeader}>
        <LinearGradient
          colors={loading ? [colors.border, colors.border] : gradientColors}
          style={styles.cardIconBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name={icon} size={20} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{desc}</Text>
        </View>
      </View>

      <Pressable onPress={onPress} disabled={loading}>
        {({ pressed }) => (
          <LinearGradient
            colors={loading ? ([colors.border, colors.border] as any) : (gradientColors as any)}
            style={[styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="upload" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>{btnLabel}</Text>
              </>
            )}
          </LinearGradient>
        )}
      </Pressable>

      {fileName && !loading && (
        <View
          style={[
            styles.fileTag,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Feather name="file" size={13} color={colors.mutedForeground} />
          <Text
            style={[styles.fileTagText, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {fileName}
          </Text>
          <View style={[styles.fileTagDot, { backgroundColor: iconColor }]} />
        </View>
      )}

      {children}
    </View>
  );
}

function ResultCard({
  result,
  colors,
}: {
  result: NonNullable<VerifyResult>;
  colors: any;
}) {
  const isOk = result.status === "verified";
  return (
    <View
      style={[
        styles.resultBox,
        {
          backgroundColor: isOk ? colors.successBg : colors.errorBg,
          borderColor: isOk ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)",
        },
      ]}
    >
      <View style={styles.resultHead}>
        <LinearGradient
          colors={isOk ? (["#10b981", "#059669"] as any) : (["#ef4444", "#dc2626"] as any)}
          style={styles.resultIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name={isOk ? "check" : "x"} size={16} color="#fff" />
        </LinearGradient>
        <Text
          style={[
            styles.resultTitle,
            { color: isOk ? colors.success : colors.destructive },
          ]}
        >
          {isOk ? "Hujjat Tasdiqlangan" : "Blokcheynda Topilmadi"}
        </Text>
      </View>
      {isOk && result.status === "verified" ? (
        <>
          <RRow label="Hujjat nomi" value={result.documentName} colors={colors} />
          <RRow label="Blok raqami" value={`#${result.blockIndex}`} colors={colors} />
          <RRow
            label="Egasi"
            value={`${result.ownerAddress.slice(0, 10)}...${result.ownerAddress.slice(-6)}`}
            colors={colors}
          />
          <RRow
            label="Sana"
            value={new Date(result.timestamp).toLocaleString("uz-UZ")}
            colors={colors}
          />
        </>
      ) : (
        <Text style={[styles.resultDesc, { color: colors.mutedForeground }]}>
          Bu hujjat hali blokcheynda ro'yxatdan o'tmagan yoki o'zgartirilgan.
        </Text>
      )}
      <View style={[styles.hashBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Feather name="hash" size={11} color={colors.mutedForeground} />
        <Text style={[styles.hashText, { color: colors.mutedForeground }]}>
          {result.documentHash.slice(0, 16)}...{result.documentHash.slice(-8)}
        </Text>
      </View>
    </View>
  );
}

function AuthResultCard({
  result,
  colors,
}: {
  result: NonNullable<AuthResult>;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.resultBox,
        { backgroundColor: colors.successBg, borderColor: "rgba(16,185,129,0.35)" },
      ]}
    >
      <View style={styles.resultHead}>
        <LinearGradient
          colors={["#10b981", "#059669"]}
          style={styles.resultIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name="check" size={16} color="#fff" />
        </LinearGradient>
        <Text style={[styles.resultTitle, { color: colors.success }]}>
          Blokcheynda Saqlandi
        </Text>
      </View>
      <RRow label="Hujjat" value={result.documentName} colors={colors} />
      <RRow label="Blok #" value={String(result.blockIndex)} colors={colors} />
      <View style={[styles.hashBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Feather name="hash" size={11} color={colors.mutedForeground} />
        <Text style={[styles.hashText, { color: colors.mutedForeground }]}>
          {result.blockHash.slice(0, 14)}...{result.blockHash.slice(-6)}
        </Text>
      </View>
    </View>
  );
}

function RRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.rRow}>
      <Text style={[styles.rLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.rValue, { color: colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function StatBox({
  icon,
  value,
  label,
  accent,
  glow,
  colors,
}: any) {
  return (
    <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIconWrap, { backgroundColor: glow }]}>
        <Feather name={icon} size={17} color={accent} />
      </View>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function HowItWorksCard({ colors }: { colors: any }) {
  const steps = [
    {
      n: "1",
      icon: "upload" as const,
      title: "Hujjat yuklash",
      desc: "PDF, DOCX, yoki istalgan faylni tanlang",
      color: "#7c6ff7",
    },
    {
      n: "2",
      icon: "hash" as const,
      title: "Hash hisoblash",
      desc: "SHA-256 algoritmi fayl \"barmoq izini\" hisoblaydi",
      color: "#22d3ee",
    },
    {
      n: "3",
      icon: "layers" as const,
      title: "Blokcheynda yozish",
      desc: "Hash zanjirga qo'shiladi va o'zgarmas bo'ladi",
      color: "#10b981",
    },
    {
      n: "4",
      icon: "check-circle" as const,
      title: "Tekshirish",
      desc: "Xuddi shu fayl qayta yuklanib hash taqqoslanadi",
      color: "#f59e0b",
    },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <LinearGradient
          colors={["#f59e0b", "#d97706"]}
          style={styles.cardIconBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name="info" size={20} color="#fff" />
        </LinearGradient>
        <View style={{ gap: 2 }}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Qanday Ishlaydi?</Text>
          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
            Blokcheyn autentifikatsiya jarayoni
          </Text>
        </View>
      </View>

      <View style={styles.stepsWrap}>
        {steps.map((s, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepLeft}>
              <LinearGradient
                colors={[s.color, s.color + "bb"]}
                style={styles.stepNum}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name={s.icon} size={14} color="#fff" />
              </LinearGradient>
              {i < steps.length - 1 && (
                <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
              )}
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>{s.title}</Text>
              <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{s.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 13,
    overflow: "hidden",
  },
  cardGlowBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    borderRadius: 20,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 13 },
  cardIconBg: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actionBtn: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    shadowColor: "#7c6ff7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  actionBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  fileTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  fileTagText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  fileTagDot: { width: 8, height: 8, borderRadius: 4 },
  resultBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  resultHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitle: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  resultDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  rRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  rLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  rValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", maxWidth: "58%", textAlign: "right" },
  hashBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  hashText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statsCard: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14 },
  statsHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  statsHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  statsTitle: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  statsGrid: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 7,
  },
  statIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  stepsWrap: { gap: 0 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 13 },
  stepLeft: { alignItems: "center", width: 34 },
  stepNum: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLine: { width: 2, height: 18, marginVertical: 3 },
  stepContent: { flex: 1, paddingTop: 7, paddingBottom: 8 },
  stepTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 3, letterSpacing: -0.2 },
  stepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
});
