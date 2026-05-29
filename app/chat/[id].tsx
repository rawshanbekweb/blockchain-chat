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
import { impactLight, impactMedium, notifySuccess } from "@/utils/haptics";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MessageBubble from "@/components/MessageBubble";
import { useChat } from "@/context/ChatContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import { computeFileHash, formatFileSize, shortAddress } from "@/utils/blockchain";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { chats, getMessages, sendMessage, markAsRead, updateMessageDocument } = useChat();
  const { walletAddress, walletName, authenticateDocument, chain } = useWallet();
  const [text, setText] = useState("");
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    size: number;
    mimeType: string;
    uri: string;
    hash: string;
  } | null>(null);
  const [attachingFile, setAttachingFile] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const isWeb = Platform.OS === "web";

  const chat = chats.find((c) => c.id === id);
  const messages = getMessages(id ?? "");
  const authenticatedCount = chain.filter((b) => b.chatId === id).length;

  useEffect(() => {
    if (chat) {
      navigation.setOptions({
        headerShown: false,
      });
    }
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
      impactLight();
      const hash = await computeFileHash(
        asset.name,
        asset.size ?? 0,
        asset.mimeType ?? "application/octet-stream",
        asset.uri
      );
      setAttachedFile({
        name: asset.name,
        size: asset.size ?? 0,
        mimeType: asset.mimeType ?? "application/octet-stream",
        uri: asset.uri,
        hash,
      });
    } catch {
      /* ignore */
    } finally {
      setAttachingFile(false);
    }
  };

  const handleSend = useCallback(async () => {
    if (!id) return;
    if (!text.trim() && !attachedFile) return;
    const displayName = walletName || shortAddress(walletAddress);

    if (attachedFile) {
      impactMedium();
      sendMessage({
        chatId: id,
        senderAddress: walletAddress,
        senderName: displayName,
        content: attachedFile.name,
        type: "document",
        document: {
          name: attachedFile.name,
          size: attachedFile.size,
          mimeType: attachedFile.mimeType,
          uri: attachedFile.uri,
          hash: attachedFile.hash,
          authenticated: false,
        },
      });
      setAttachedFile(null);
    }

    if (text.trim()) {
      impactLight();
      sendMessage({
        chatId: id,
        senderAddress: walletAddress,
        senderName: displayName,
        content: text.trim(),
        type: "text",
      });
      setText("");
    }
  }, [id, text, attachedFile, walletAddress, walletName, sendMessage]);

  const handleAuthenticateDocument = useCallback(
    async (
      messageId: string,
      doc: NonNullable<(typeof messages)[number]["document"]>
    ) => {
      if (!id) return;
      const block = await authenticateDocument({
        documentName: doc.name,
        documentHash: doc.hash,
        fileSize: doc.size,
        mimeType: doc.mimeType,
        chatId: id,
      });
      updateMessageDocument(id, messageId, {
        authenticated: true,
        blockIndex: block.index,
        blockHash: block.hash,
      });
      notifySuccess();
    },
    [id, authenticateDocument, updateMessageDocument]
  );

  if (!chat) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={["rgba(124,111,247,0.15)", "rgba(124,111,247,0.05)"]}
          style={styles.notFoundIcon}
        >
          <Feather name="alert-circle" size={36} color={colors.primary} />
        </LinearGradient>
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Suhbat topilmadi</Text>
        <Pressable onPress={() => router.back()}>
          <View style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={16} color={colors.mutedForeground} />
            <Text style={[styles.backBtnText, { color: colors.mutedForeground }]}>Orqaga</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  const reversedMessages = [...messages].reverse();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={[styles.chatHeader, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} style={styles.backArrow} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        <LinearGradient
          colors={["#7c6ff7", "#5548d4"]}
          style={styles.headerAvatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.headerInitials}>{getInitials(chat.name)}</Text>
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <Text style={[styles.headerName, { color: colors.foreground }]}>{chat.name}</Text>
          <Text style={[styles.headerAddr, { color: colors.mutedForeground }]}>
            {shortAddress(chat.participantAddress)}
          </Text>
        </View>

        {authenticatedCount > 0 && (
          <View style={[styles.authBadge, { backgroundColor: colors.successBg, borderColor: "rgba(16,185,129,0.3)" }]}>
            <Feather name="shield" size={11} color={colors.success} />
            <Text style={[styles.authBadgeText, { color: colors.success }]}>{authenticatedCount}</Text>
          </View>
        )}
      </View>

      <FlatList
        ref={flatRef}
        data={reversedMessages}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: 16,
          paddingBottom: 16,
        }}
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
            <LinearGradient
              colors={["rgba(124,111,247,0.15)", "rgba(124,111,247,0.04)"]}
              style={styles.emptyChatIcon}
            >
              <Feather name="message-square" size={32} color={colors.primary} />
            </LinearGradient>
            <Text style={[styles.emptyChatText, { color: colors.foreground }]}>Suhbat boshlang</Text>
            <Text style={[styles.emptyChatSub, { color: colors.mutedForeground }]}>
              Hujjat yuborish uchun 📎 ni bosing
            </Text>
          </View>
        }
      />

      {attachedFile && (
        <View
          style={[
            styles.attachPreview,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <LinearGradient
            colors={["rgba(124,111,247,0.3)", "rgba(85,72,212,0.2)"]}
            style={styles.attachIconBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="file-text" size={18} color={colors.primaryLight} />
          </LinearGradient>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.attachName, { color: colors.foreground }]} numberOfLines={1}>
              {attachedFile.name}
            </Text>
            <Text style={[styles.attachMeta, { color: colors.mutedForeground }]}>
              {formatFileSize(attachedFile.size)} · Hash hisoblandi ✓
            </Text>
          </View>
          <Pressable onPress={() => setAttachedFile(null)} hitSlop={8}>
            <View style={[styles.removeBtn, { backgroundColor: colors.border }]}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </View>
          </Pressable>
        </View>
      )}

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: isWeb ? 34 : insets.bottom + 10,
          },
        ]}
      >
        <Pressable
          onPress={handleAttach}
          disabled={attachingFile}
          style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {attachingFile ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="paperclip" size={19} color={attachedFile ? colors.primary : colors.mutedForeground} />
          )}
        </Pressable>

        <View
          style={[
            styles.inputWrap,
            { backgroundColor: colors.surface, borderColor: text ? colors.borderGlow : colors.border },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Xabar yozing..."
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
          />
        </View>

        <Pressable onPress={handleSend} disabled={!text.trim() && !attachedFile}>
          <LinearGradient
            colors={
              text.trim() || attachedFile
                ? (["#7c6ff7", "#5548d4"] as any)
                : ([colors.surface, colors.surface] as any)
            }
            style={[
              styles.sendBtn,
              {
                borderColor: text.trim() || attachedFile ? "transparent" : colors.border,
                borderWidth: text.trim() || attachedFile ? 0 : 1,
              },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather
              name="send"
              size={18}
              color={text.trim() || attachedFile ? "#fff" : colors.mutedForeground}
            />
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  notFoundIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  backBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 11,
  },
  backArrow: { padding: 4 },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7c6ff7",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerInitials: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  headerName: { fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: -0.2 },
  headerAddr: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1, letterSpacing: 0.2 },
  authBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  authBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyChatIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyChatText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyChatSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  attachPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 11,
  },
  attachIconBg: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  attachName: { fontSize: 14, fontFamily: "Inter_600SemiBold", letterSpacing: -0.2 },
  attachMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 1,
    borderWidth: 1,
  },
  inputWrap: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minHeight: 44,
    maxHeight: 130,
    justifyContent: "center",
  },
  input: {
    minHeight: 40,
    paddingHorizontal: 13,
    paddingVertical: 9,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 1,
    shadowColor: "#7c6ff7",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
});
