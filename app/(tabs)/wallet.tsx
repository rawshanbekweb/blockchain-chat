import React, { useState } from "react";
import {
  Alert,
  Clipboard,
  Modal,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWallet } from "@/context/WalletContext";
import { useChat } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";
import { formatFileSize, shortAddress } from "@/utils/blockchain";

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("uz-UZ", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { walletAddress, walletName, chain, setWalletName, regenerateWallet } = useWallet();
  const { isOnline, serverUrl, setAndSaveServerUrl } = useChat();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(walletName);
  const [showGuide, setShowGuide] = useState(false);
  const [editingServer, setEditingServer] = useState(false);
  const [serverInput, setServerInput] = useState(serverUrl);
  const isWeb = Platform.OS === "web";

  const myBlocks = chain.filter((b) => b.ownerAddress === walletAddress);

  const handleCopy = () => {
    Clipboard.setString(walletAddress);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveName = async () => {
    await setWalletName(nameInput.trim());
    setEditingName(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRegenerate = () => {
    Alert.alert("Yangi Hamyon Yaratish", "Yangi manzil yaratilsa, eski manzil o'chiriladi. Davom etasizmi?", [
      { text: "Bekor", style: "cancel" },
      { text: "Yaratish", style: "destructive", onPress: async () => { await regenerateWallet(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
    ]);
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: isWeb ? 67 : 0, paddingBottom: isWeb ? 34 : insets.bottom + 90, padding: 16, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={["#3d1a8f", "#0d1b35"]} style={styles.walletHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.heroTop}>
          <LinearGradient colors={["#6c5ce7", "#0652dd"]} style={styles.heroAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Feather name="user" size={30} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={[styles.nameInput, { color: "#fff", borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.1)" }]}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  placeholder="Ismingiz..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
                <Pressable onPress={handleSaveName} style={[styles.saveBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <Feather name="check" size={16} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => { setEditingName(true); setNameInput(walletName); }} style={styles.nameRow}>
                <Text style={styles.heroName}>{walletName || "Ism qo'shish"}</Text>
                <Feather name="edit-2" size={13} color="rgba(255,255,255,0.5)" />
              </Pressable>
            )}
            <Text style={styles.heroLabel}>Blokcheyn Identifikatori</Text>
          </View>
          <Pressable onPress={() => setShowGuide(true)} style={styles.guideBtn}>
            <Feather name="help-circle" size={22} color="rgba(255,255,255,0.6)" />
          </Pressable>
        </View>

        <View style={[styles.addressBox, { backgroundColor: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.1)" }]}>
          <Text style={styles.addressLabel}>Hamyon Manzili</Text>
          <Text style={styles.addressText} numberOfLines={2} selectable>{walletAddress}</Text>
        </View>

        <View style={styles.heroActions}>
          <Pressable onPress={handleCopy} style={[styles.heroBtn, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
            <Feather name="copy" size={15} color="#fff" />
            <Text style={styles.heroBtnText}>Nusxalash</Text>
          </Pressable>
          <Pressable onPress={handleRegenerate} style={[styles.heroBtn, { backgroundColor: "rgba(255,107,107,0.25)" }]}>
            <Feather name="refresh-cw" size={15} color="#ff6b6b" />
            <Text style={[styles.heroBtnText, { color: "#ff6b6b" }]}>Yangi yaratish</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Statistika</Text>
        <View style={styles.statsRow}>
          <StatItem icon="layers" value={chain.length} label="Jami bloklar" gradColors={["#6c5ce7", "#0652dd"] as [string,string]} colors={colors} />
          <StatItem icon="shield" value={myBlocks.length} label="Autentifikatsiya" gradColors={["#00cec9", "#00b894"] as [string,string]} colors={colors} />
          <StatItem icon="file-text" value={myBlocks.length} label="Hujjatlar" gradColors={["#fdcb6e", "#e17055"] as [string,string]} colors={colors} />
        </View>
      </View>

      {myBlocks.length > 0 && (
        <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Blokcheyn Tarixi</Text>
          {myBlocks.slice().reverse().slice(0, 15).map((block, i, arr) => (
            <View key={block.index}>
              <View style={styles.blockRow}>
                <View style={styles.blockLeft}>
                  <LinearGradient colors={["#6c5ce7", "#0652dd"]} style={styles.blockNumBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.blockNumText}>#{block.index}</Text>
                  </LinearGradient>
                  {i < arr.length - 1 && (
                    <View style={[styles.chainLine, { backgroundColor: colors.border }]} />
                  )}
                </View>
                <View style={[styles.blockCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.blockCardTop}>
                    <Feather name="file-text" size={15} color={colors.successDark} />
                    <Text style={[styles.blockDocName, { color: colors.foreground }]} numberOfLines={1}>
                      {block.documentName}
                    </Text>
                    <View style={[styles.verifiedTag, { backgroundColor: colors.successBg }]}>
                      <Feather name="check" size={10} color={colors.successDark} />
                    </View>
                  </View>
                  <Text style={[styles.blockMeta, { color: colors.mutedForeground }]}>
                    {formatFileSize(block.fileSize)} · {formatDate(block.timestamp)}
                  </Text>
                  <Text style={[styles.blockHash, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {block.hash.slice(0, 20)}...{block.hash.slice(-8)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <ServerConfigCard
        colors={colors}
        isOnline={isOnline}
        serverUrl={serverUrl}
        serverInput={serverInput}
        setServerInput={setServerInput}
        editingServer={editingServer}
        setEditingServer={setEditingServer}
        onSave={async () => {
          await setAndSaveServerUrl(serverInput.trim());
          setEditingServer(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      {chain.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
            <Feather name="inbox" size={36} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Blokcheyn Bo'sh</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Hujjat autentifikatsiya qilgach, u bu yerda zanjir sifatida saqlanadi
          </Text>
        </View>
      )}

      <GuideModal visible={showGuide} onClose={() => setShowGuide(false)} colors={colors} insets={insets} />
    </ScrollView>
  );
}

function ServerConfigCard({ colors, isOnline, serverUrl, serverInput, setServerInput, editingServer, setEditingServer, onSave }: any) {
  return (
    <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[styles.statIconBg, { backgroundColor: isOnline ? colors.successBg : colors.warningBg, width: 34, height: 34, borderRadius: 17 }]}>
            <Feather name={isOnline ? "wifi" : "wifi-off"} size={16} color={isOnline ? colors.successDark : colors.warning} />
          </View>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontSize: 15 }]}>Server Ulanishi</Text>
            <Text style={[{ color: isOnline ? colors.successDark : colors.warning, fontSize: 12, fontFamily: "Inter_500Medium" }]}>
              {isOnline ? "Ulangan" : "Ulanmagan"}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => setEditingServer((v: boolean) => !v)} style={[{ padding: 8, borderRadius: 8, backgroundColor: colors.surface }]}>
          <Feather name={editingServer ? "x" : "settings"} size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {editingServer ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
            Server URL ni kiriting (masalan: https://yourdomain.replit.app/api-server)
          </Text>
          <TextInput
            style={[styles.nameInput, { color: colors.foreground, borderColor: colors.primary, backgroundColor: colors.secondary, height: 48 }]}
            value={serverInput}
            onChangeText={setServerInput}
            placeholder="https://..."
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            onSubmitEditing={onSave}
          />
          <Pressable onPress={onSave}>
            <LinearGradient colors={["#6c5ce7", "#0652dd"]} style={[styles.heroBtn, { borderRadius: 12, height: 46 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.heroBtnText}>Saqlash</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <View style={[{ borderRadius: 10, padding: 10, backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }} numberOfLines={1}>
            {serverUrl || "Sozlanmagan — Sozlamalar tugmasini bosing"}
          </Text>
        </View>
      )}
    </View>
  );
}

function StatItem({ icon, value, label, gradColors, colors }: any) {
  return (
    <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <LinearGradient colors={gradColors} style={styles.statIconBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Feather name={icon} size={16} color="#fff" />
      </LinearGradient>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const GUIDE_SECTIONS = [
  {
    icon: "info" as const,
    color: "#6c5ce7",
    title: "BlockChat nima?",
    content: "BlockChat — blokcheyn texnologiyasi asosida ishlovchi professional xavfsiz chat ilovasi. U foydalanuvchilarga hujjatlarni kriptografik imzo bilan tasdiqlash va zanjirli blokcheynda o'zgarmas tarzda saqlash imkonini beradi.",
  },
  {
    icon: "shield" as const,
    color: "#00b894",
    title: "Blokcheyn autentifikatsiya qanday ishlaydi?",
    content: "1. Hujjat yuklanadi\n2. SHA-256 algoritmi yordamida 256-bit kriptografik \"barmoq izi\" (hash) hisoblanadi\n3. Bu hash sizning hamyon manzilingiz, vaqt tamg'asi va oldingi blokning hash'i bilan birga yangi blokka yoziladi\n4. Har bir blok oldingi blokning hash'ini o'z ichiga oladi — bu blokcheyn zanjirini buzib bo'lmaydi\n5. Hujjatni tekshirishda hash yana hisoblanadi va zanjirdagi qiymat bilan taqqoslanadi",
  },
  {
    icon: "message-circle" as const,
    color: "#6c5ce7",
    title: "Hujjat chatda qanday autentifikatsiya qilinadi?",
    content: "1. Suhbatga o'ting\n2. Pastdagi qog'oz qisqich (📎) tugmasini bosing\n3. Hujjatni tanlang — hash avtomatik hisoblanadi\n4. Hujjat kartasidagi sariq \"Blokcheynda tasdiqlash\" tugmasini bosing\n5. Tasdiqlashdan so'ng karta yashil \"Tasdiqlangan\" belgisiga o'tadi",
  },
  {
    icon: "upload" as const,
    color: "#fdcb6e",
    title: "Hujjatni mustaqil qanday tekshirish mumkin?",
    content: "Tekshirish tabiga o'ting.\n\nTekshirish uchun: \"Hujjat tanlash\" tugmasini bosib faylni yuklang — natija bir zumda chiqadi.\n\nAutentifikatsiya uchun: \"Hujjat tanlash va saqlash\" tugmasini bosing — hujjat blokcheynda ro'yxatga olinadi.",
  },
  {
    icon: "lock" as const,
    color: "#00cec9",
    title: "Ma'lumotlar qayerda saqlanadi?",
    content: "Barcha blokcheyn ma'lumotlari faqat qurilmangizda (lokal) saqlanadi. Hech qanday server yoki bulutga uzatilmaydi. Bu sizning ma'lumotlaringiz to'liq xavfsizligini ta'minlaydi.",
  },
];

function GuideModal({ visible, onClose, colors, insets }: any) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <LinearGradient colors={["#3d1a8f", "#060912"]} style={styles.modalHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={{ paddingTop: insets.top + 16, paddingBottom: 20, paddingHorizontal: 20 }}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Foydalanish Qo'llanmasi</Text>
              <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <Feather name="x" size={18} color="#fff" />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>BlockChat bilan hujjatlarni blokcheynda tasdiqlang</Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
          {GUIDE_SECTIONS.map((sec, i) => (
            <View key={i} style={[styles.guideSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.guideSectionHeader}>
                <View style={[styles.guideIcon, { backgroundColor: sec.color + "20" }]}>
                  <Feather name={sec.icon} size={20} color={sec.color} />
                </View>
                <Text style={[styles.guideSectionTitle, { color: colors.foreground }]}>{sec.title}</Text>
              </View>
              <Text style={[styles.guideSectionText, { color: colors.mutedForeground }]}>{sec.content}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  walletHero: { borderRadius: 20, padding: 18, gap: 14 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroAvatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  heroName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  heroLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  nameInput: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  guideBtn: { padding: 4 },
  addressBox: { borderRadius: 13, borderWidth: 1, padding: 13, gap: 5 },
  addressLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.5)", letterSpacing: 0.5 },
  addressText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#fff", lineHeight: 20, letterSpacing: 0.5 },
  heroActions: { flexDirection: "row", gap: 10 },
  heroBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 11, borderRadius: 12 },
  heroBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statsCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 10 },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 7 },
  statIconBg: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  historyCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 2 },
  blockRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  blockLeft: { alignItems: "center", width: 36 },
  blockNumBadge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  blockNumText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  chainLine: { width: 2, flex: 1, minHeight: 16, marginVertical: 4 },
  blockCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, gap: 4, marginBottom: 10 },
  blockCardTop: { flexDirection: "row", alignItems: "center", gap: 7 },
  blockDocName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  verifiedTag: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  blockMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  blockHash: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyCard: { borderRadius: 18, borderWidth: 1, padding: 30, alignItems: "center", gap: 12 },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  modalContainer: { flex: 1 },
  modalHeader: {},
  modalTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  modalSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  guideSection: { borderRadius: 16, borderWidth: 1, padding: 15, gap: 10 },
  guideSectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  guideIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  guideSectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1 },
  guideSectionText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
});
