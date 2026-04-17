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
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import {
  computeFileHash,
  formatFileSize,
  verifyDocumentInChain,
} from "@/utils/blockchain";

type VerifyResult =
  | { status: "verified"; blockIndex: number; ownerAddress: string; timestamp: number; documentHash: string; documentName: string }
  | { status: "not_found"; documentHash: string }
  | null;

type AuthResult =
  | { status: "success"; blockIndex: number; blockHash: string; documentHash: string; documentName: string }
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
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const hash = await computeFileHash(asset.name, asset.size ?? 0, asset.mimeType ?? "application/octet-stream", asset.uri);
      const { verified, block } = await verifyDocumentInChain(hash, chain);
      if (verified && block) {
        setVerifyResult({ status: "verified", blockIndex: block.index, ownerAddress: block.ownerAddress, timestamp: block.timestamp, documentHash: hash, documentName: block.documentName });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setVerifyResult({ status: "not_found", documentHash: hash });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const hash = await computeFileHash(asset.name, asset.size ?? 0, asset.mimeType ?? "application/octet-stream", asset.uri);
      if (chain.find((b) => b.documentHash === hash)) {
        Alert.alert("Allaqachon mavjud", "Bu hujjat blokcheynda allaqachon ro'yxatdan o'tgan.");
        setAuthLoading(false);
        return;
      }
      const block = await authenticateDocument({ documentName: asset.name, documentHash: hash, fileSize: asset.size ?? 0, mimeType: asset.mimeType ?? "application/octet-stream", chatId: "verify-screen" });
      setAuthResult({ status: "success", blockIndex: block.index, blockHash: block.hash, documentHash: hash, documentName: asset.name });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Xato", "Hujjatni autentifikatsiya qilib bo'lmadi");
    } finally {
      setAuthLoading(false);
    }
  };

  const myBlocks = chain.filter((b) => b.ownerAddress === walletAddress);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: isWeb ? 67 : 0, paddingBottom: isWeb ? 34 : insets.bottom + 90, padding: 16, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <ActionCard
        icon="shield"
        iconColor="#6c5ce7"
        gradientColors={["#6c5ce7", "#4834d4"] as [string, string]}
        title="Hujjat Tekshirish"
        desc="Hujjat blokcheynda mavjudligini tekshiring"
        btnLabel={verifyLoading ? "" : "Hujjat tanlash"}
        onPress={handleVerify}
        loading={verifyLoading}
        fileName={verifyFileName}
        colors={colors}
      >
        {verifyResult && (
          <ResultCard result={verifyResult} colors={colors} />
        )}
      </ActionCard>

      <ActionCard
        icon="lock"
        iconColor="#00b894"
        gradientColors={["#00cec9", "#00b894"] as [string, string]}
        title="Hujjat Autentifikatsiyasi"
        desc="Hujjatni blokcheynda ro'yxatdan o'tkaz"
        btnLabel={authLoading ? "" : "Hujjat tanlash va saqlash"}
        onPress={handleAuthenticate}
        loading={authLoading}
        fileName={authFileName}
        colors={colors}
      >
        {authResult && (
          <AuthResultCard result={authResult} colors={colors} />
        )}
      </ActionCard>

      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statsHeader}>
          <Feather name="layers" size={18} color={colors.warning} />
          <Text style={[styles.statsTitle, { color: colors.foreground }]}>Blokcheyn Statistikasi</Text>
        </View>
        <View style={styles.statsGrid}>
          <StatBox icon="link" value={chain.length} label="Jami bloklar" accent={colors.primary} colors={colors} />
          <StatBox icon="shield" value={myBlocks.length} label="Mening bloklarim" accent={colors.successDark} colors={colors} />
          <StatBox icon="clock" value={chain.length > 0 ? new Date(chain[chain.length - 1].timestamp).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" }) : "—"} label="Oxirgi blok" accent={colors.warning} colors={colors} />
        </View>
      </View>

      <HowItWorksCard colors={colors} />
    </ScrollView>
  );
}

function ActionCard({ icon, iconColor, gradientColors, title, desc, btnLabel, onPress, loading, fileName, colors, children }: any) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBg, { backgroundColor: iconColor + "20" }]}>
          <Feather name={icon} size={22} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{desc}</Text>
        </View>
      </View>

      <Pressable onPress={onPress} disabled={loading}>
        <LinearGradient colors={loading ? [colors.border, colors.border] : gradientColors} style={styles.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Feather name="upload" size={17} color="#fff" />
              <Text style={styles.actionBtnText}>{btnLabel}</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>

      {fileName && !loading && (
        <View style={[styles.fileTag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="file" size={13} color={colors.mutedForeground} />
          <Text style={[styles.fileTagText, { color: colors.mutedForeground }]} numberOfLines={1}>{fileName}</Text>
        </View>
      )}

      {children}
    </View>
  );
}

function ResultCard({ result, colors }: { result: NonNullable<VerifyResult>; colors: any }) {
  const isOk = result.status === "verified";
  return (
    <View style={[styles.resultBox, { backgroundColor: isOk ? colors.successBg : colors.errorBg, borderColor: isOk ? colors.successDark : colors.destructive }]}>
      <View style={styles.resultHead}>
        <Feather name={isOk ? "check-circle" : "x-circle"} size={22} color={isOk ? colors.successDark : colors.destructive} />
        <Text style={[styles.resultTitle, { color: isOk ? colors.successDark : colors.destructive }]}>
          {isOk ? "Hujjat Tasdiqlangan" : "Blokcheynda Topilmadi"}
        </Text>
      </View>
      {isOk && result.status === "verified" ? (
        <>
          <RRow label="Hujjat nomi" value={result.documentName} colors={colors} />
          <RRow label="Blok raqami" value={`#${result.blockIndex}`} colors={colors} />
          <RRow label="Egasi manzil" value={`${result.ownerAddress.slice(0, 10)}...${result.ownerAddress.slice(-6)}`} colors={colors} />
          <RRow label="Tasdiqlangan sana" value={new Date(result.timestamp).toLocaleString("uz-UZ")} colors={colors} />
        </>
      ) : (
        <Text style={[styles.resultDesc, { color: colors.mutedForeground }]}>
          Bu hujjat hali blokcheynda ro'yxatdan o'tmagan yoki o'zgartirilgan.
        </Text>
      )}
      <RRow label="SHA-256" value={`${result.documentHash.slice(0, 14)}...${result.documentHash.slice(-8)}`} colors={colors} />
    </View>
  );
}

function AuthResultCard({ result, colors }: { result: NonNullable<AuthResult>; colors: any }) {
  return (
    <View style={[styles.resultBox, { backgroundColor: colors.successBg, borderColor: colors.successDark }]}>
      <View style={styles.resultHead}>
        <Feather name="check-circle" size={22} color={colors.successDark} />
        <Text style={[styles.resultTitle, { color: colors.successDark }]}>Blokcheynda Saqlandi</Text>
      </View>
      <RRow label="Hujjat" value={result.documentName} colors={colors} />
      <RRow label="Blok #" value={String(result.blockIndex)} colors={colors} />
      <RRow label="Blok hash" value={`${result.blockHash.slice(0, 12)}...${result.blockHash.slice(-6)}`} colors={colors} />
      <RRow label="Hujjat hash" value={`${result.documentHash.slice(0, 12)}...${result.documentHash.slice(-6)}`} colors={colors} />
    </View>
  );
}

function RRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.rRow}>
      <Text style={[styles.rLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.rValue, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function StatBox({ icon, value, label, accent, colors }: any) {
  return (
    <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Feather name={icon} size={18} color={accent} />
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function HowItWorksCard({ colors }: { colors: any }) {
  const steps = [
    { n: "1", title: "Hujjat yuklash", desc: "PDF, DOCX, yoki istalgan faylni tanlang" },
    { n: "2", title: "Hash hisoblash", desc: "SHA-256 algoritmi fayl \"barmoq izini\" hisoblaydi" },
    { n: "3", title: "Blokcheynda yozish", desc: "Hash zanjirga qo'shiladi va o'zgarmas bo'ladi" },
    { n: "4", title: "Tekshirish", desc: "Xuddi shu fayl qayta yuklanib hash taqqoslanadi" },
  ];
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBg, { backgroundColor: "rgba(253,203,110,0.15)" }]}>
          <Feather name="info" size={22} color={colors.warning} />
        </View>
        <View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Qanday Ishlaydi?</Text>
          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>Blokcheyn autentifikatsiya jarayoni</Text>
        </View>
      </View>
      {steps.map((s, i) => (
        <View key={i} style={styles.stepRow}>
          <LinearGradient colors={["#6c5ce7", "#0652dd"]} style={styles.stepNum} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.stepNumText}>{s.n}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>{s.title}</Text>
            <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{s.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIconBg: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 2 },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actionBtn: { height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  actionBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  fileTag: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  fileTagText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  resultBox: { borderRadius: 14, borderWidth: 1, padding: 13, gap: 8 },
  resultHead: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 3 },
  resultTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  resultDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  rRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  rValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", maxWidth: "60%", textAlign: "right" },
  statsCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  statsHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  statsTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statsGrid: { flexDirection: "row", gap: 10 },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 5 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNum: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepNumText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  stepTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  stepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
