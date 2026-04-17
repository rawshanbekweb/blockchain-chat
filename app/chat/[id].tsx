import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MessageBubble from "@/components/MessageBubble";
import { useChat } from "@/context/ChatContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import { computeFileHash, formatFileSize, shortAddress } from "@/utils/blockchain";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { chats, getMessages, sendMessage, markAsRead, updateMessageDocument } = useChat();
  const { walletAddress, walletName, authenticateDocument, chain } = useWallet();
  const [text, setText] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: number; mimeType: string; uri: string; hash: string } | null>(null);
  const [attachingFile, setAttachingFile] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const isWeb = Platform.OS === "web";

  const chat = chats.find((c) => c.id === id);
  const messages = getMessages(id ?? "");
  const authenticatedCount = chain.filter((b) => b.chatId === id).length;

  useEffect(() => {
    if (chat) navigation.setOptions({ title: chat.name });
  }, [chat, navigation]);

  useEffect(() => {
    if (id) markAsRead(id);
  }, [id, markAsRead]);

  const handleAttach = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setAttachingFile(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const hash = await computeFileHash(asset.name, asset.size ?? 0, asset.mimeType ?? "application/octet-stream", asset.uri);
      setAttachedFile({ name: asset.name, size: asset.size ?? 0, mimeType: asset.mimeType ?? "application/octet-stream", uri: asset.uri, hash });
    } catch { /* ignore */ }
    finally { setAttachingFile(false); }
  };

  const handleSend = useCallback(async () => {
    if (!id) return;
    if (!text.trim() && !attachedFile) return;

    if (attachedFile) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      sendMessage({
        chatId: id,
        senderAddress: walletAddress,
        senderName: walletName || shortAddress(walletAddress),
        content: attachedFile.name,
        type: "document",
        document: { name: attachedFile.name, size: attachedFile.size, mimeType: attachedFile.mimeType, uri: attachedFile.uri, hash: attachedFile.hash, authenticated: false },
      });
      setAttachedFile(null);
    }

    if (text.trim()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      sendMessage({
        chatId: id,
        senderAddress: walletAddress,
        senderName: walletName || shortAddress(walletAddress),
        content: text.trim(),
        type: "text",
      });
      setText("");
    }
  }, [id, text, attachedFile, walletAddress, walletName, sendMessage]);

  const handleAuthenticateDocument = useCallback(
    async (messageId: string, doc: NonNullable<(typeof messages)[number]["document"]>) => {
      if (!id) return;
      const block = await authenticateDocument({ documentName: doc.name, documentHash: doc.hash, fileSize: doc.size, mimeType: doc.mimeType, chatId: id });
      updateMessageDocument(id, messageId, { authenticated: true, blockIndex: block.index, blockHash: block.hash });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [id, authenticateDocument, updateMessageDocument]
  );

  if (!chat) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Suhbat topilmadi</Text>
      </View>
    );
  }

  const reversedMessages = [...messages].reverse();
  const myDisplayName = walletName || shortAddress(walletAddress);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={[styles.chatHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <LinearGradient colors={["#6c5ce7", "#0652dd"]} style={styles.headerAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.headerInitials}>
            {chat.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
          </Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerName, { color: colors.foreground }]}>{chat.name}</Text>
          <Text style={[styles.headerAddr, { color: colors.mutedForeground }]}>
            {shortAddress(chat.participantAddress)}
          </Text>
        </View>
        {authenticatedCount > 0 && (
          <View style={[styles.authBadge, { backgroundColor: colors.successBg, borderColor: colors.successDark }]}>
            <Feather name="shield" size={12} color={colors.successDark} />
            <Text style={[styles.authBadgeText, { color: colors.successDark }]}>{authenticatedCount} tasdiqlandi</Text>
          </View>
        )}
      </View>

      <FlatList
        ref={flatRef}
        data={reversedMessages}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!!reversedMessages.length}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <MessageBubble
            content={item.content}
            type={item.type}
            isMine={item.senderAddress === walletAddress}
            senderName={item.senderName}
            timestamp={item.timestamp}
            document={item.document}
            onAuthenticateDocument={
              item.type === "document" && item.document && !item.document.authenticated
                ? () => handleAuthenticateDocument(item.id, item.document!)
                : undefined
            }
          />
        )}
        ListEmptyComponent={
          <View style={[styles.emptyChat, { transform: [{ scaleY: -1 }] }]}>
            <View style={[styles.emptyChatIcon, { backgroundColor: colors.surface }]}>
              <Feather name="message-square" size={30} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyChatText, { color: colors.mutedForeground }]}>Suhbat boshlang</Text>
            <Text style={[styles.emptyChatSub, { color: colors.mutedForeground }]}>
              Hujjat yuborish uchun 📎 ni bosing
            </Text>
          </View>
        }
      />

      {attachedFile && (
        <View style={[styles.attachPreview, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <LinearGradient colors={["rgba(108,92,231,0.3)", "rgba(6,82,221,0.3)"]} style={styles.attachIconBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Feather name="file-text" size={18} color={colors.primaryLight} />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.attachName, { color: colors.foreground }]} numberOfLines={1}>{attachedFile.name}</Text>
            <Text style={[styles.attachMeta, { color: colors.mutedForeground }]}>
              {formatFileSize(attachedFile.size)} · Hash hisoblandi
            </Text>
          </View>
          <Pressable onPress={() => setAttachedFile(null)} style={styles.attachRemove}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}

      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: isWeb ? 34 : insets.bottom + 8 }]}>
        <Pressable onPress={handleAttach} disabled={attachingFile} style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
          {attachingFile
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Feather name="paperclip" size={20} color={colors.mutedForeground} />
          }
        </Pressable>
        <TextInput
          style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
          placeholder="Xabar yozing..."
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
        />
        <Pressable onPress={handleSend} disabled={!text.trim() && !attachedFile} style={styles.sendWrap}>
          <LinearGradient
            colors={text.trim() || attachedFile ? ["#6c5ce7", "#0652dd"] : [colors.secondary, colors.secondary]}
            style={styles.sendBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="send" size={18} color={text.trim() || attachedFile ? "#fff" : colors.mutedForeground} />
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFound: { fontSize: 16, fontFamily: "Inter_400Regular" },
  chatHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  headerInitials: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  headerName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerAddr: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  authBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  authBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyChatIcon: { width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center" },
  emptyChatText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyChatSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  attachPreview: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  attachIconBg: { width: 42, height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  attachName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  attachMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  attachRemove: { padding: 6 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 1 },
  input: { flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 21, paddingHorizontal: 16, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular", borderWidth: StyleSheet.hairlineWidth },
  sendWrap: { flexShrink: 0, marginBottom: 1 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
