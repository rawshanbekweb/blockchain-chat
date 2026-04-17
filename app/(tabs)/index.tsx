import React, { useEffect, useMemo, useState } from "react";
import {
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
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ChatListItem from "@/components/ChatListItem";
import { Chat, useChat } from "@/context/ChatContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

export default function ChatListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { chats, createChat, isOnline } = useChat();
  const { isLoading, isOnboarded } = useWallet();
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [creating, setCreating] = useState(false);
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (!isLoading && !isOnboarded) {
      router.replace("/onboarding");
    }
  }, [isLoading, isOnboarded]);

  const sortedChats = useMemo(() => {
    const sorted = [...chats].sort(
      (a, b) => (b.lastMessageTime ?? 0) - (a.lastMessageTime ?? 0)
    );
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.participantAddress.toLowerCase().includes(q)
    );
  }, [chats, search]);

  const totalUnread = chats.reduce((acc, c) => acc + c.unreadCount, 0);

  const handleNewChat = async () => {
    if (!newChatName.trim() || creating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCreating(true);
    const rand = Math.random().toString(16).slice(2);
    const addr = "0x" + rand.padEnd(40, "0").slice(0, 40);
    const chat = await createChat(newChatName.trim(), addr);
    setNewChatName("");
    setShowNewChat(false);
    setCreating(false);
    router.push(`/chat/${chat.id}`);
  };

  const handlePressChat = (chat: Chat) => {
    Haptics.selectionAsync();
    router.push(`/chat/${chat.id}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isWeb && <View style={{ height: 67 }} />}

      <View style={[styles.statusBar, { backgroundColor: isOnline ? colors.successBg : colors.warningBg, borderBottomColor: isOnline ? colors.successDark : colors.warning }]}>
        <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.successDark : colors.warning }]} />
        <Text style={[styles.statusText, { color: isOnline ? colors.successDark : colors.warning }]}>
          {isOnline ? "Server bilan ulangan · Real vaqt chat" : "Oflayn rejim · Sozlamalar > Server URL"}
        </Text>
      </View>

      <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Qidirish..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setShowNewChat((v) => !v)}
          style={styles.newChatFab}
        >
          <LinearGradient
            colors={["#6c5ce7", "#0652dd"]}
            style={styles.newChatFabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name={showNewChat ? "x" : "edit"} size={18} color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>

      {showNewChat && (
        <View style={[styles.newChatBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TextInput
            style={[styles.newChatInput, { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border }]}
            placeholder="Suhbat nomini kiriting..."
            placeholderTextColor={colors.mutedForeground}
            value={newChatName}
            onChangeText={setNewChatName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleNewChat}
          />
          <Pressable onPress={handleNewChat} disabled={creating}>
            <LinearGradient
              colors={newChatName.trim() ? ["#6c5ce7", "#0652dd"] : [colors.border, colors.border]}
              style={styles.newChatSendBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name={creating ? "loader" : "arrow-right"} size={18} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {totalUnread > 0 && !search && (
        <View style={[styles.unreadBanner, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.unreadText, { color: colors.mutedForeground }]}>
            {totalUnread} o'qilmagan xabar
          </Text>
        </View>
      )}

      <FlatList
        data={sortedChats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => handlePressChat(item)}>
            <ChatListItem
              name={item.name}
              participantAddress={item.participantAddress}
              lastMessage={item.lastMessage}
              lastMessageTime={item.lastMessageTime}
              unreadCount={item.unreadCount}
            />
          </Pressable>
        )}
        scrollEnabled={sortedChats.length > 0}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
              <Feather name="message-circle" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {search ? "Hech narsa topilmadi" : "Suhbatlar yo'q"}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              {search
                ? `"${search}" bo'yicha natija yo'q`
                : "Yangi suhbat boshlash uchun\nqalam belgisini bosing"}
            </Text>
          </View>
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: isWeb ? 34 : insets.bottom + 90,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 7,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  newChatFab: {},
  newChatFabGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  newChatBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  newChatInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  newChatSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  unreadText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 14,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
});
