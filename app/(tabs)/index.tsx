import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
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
import { impactLight, selectionFeedback } from "@/utils/haptics";
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
  const { isLoading, isOnboarded, walletName } = useWallet();
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [creating, setCreating] = useState(false);
  const isWeb = Platform.OS === "web";

  const newChatAnim = useRef(new Animated.Value(0)).current;
  const fabRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading && !isOnboarded) {
      router.replace("/onboarding");
    }
  }, [isLoading, isOnboarded]);

  const toggleNewChat = () => {
    const toValue = showNewChat ? 0 : 1;
    Animated.parallel([
      Animated.spring(newChatAnim, { toValue, tension: 80, friction: 9, useNativeDriver: false }),
      Animated.spring(fabRotate, { toValue, tension: 80, friction: 9, useNativeDriver: true }),
    ]).start();
    setShowNewChat(!showNewChat);
    impactLight();
  };

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
    setCreating(true);
    const rand = Math.random().toString(16).slice(2);
    const addr = "0x" + rand.padEnd(40, "0").slice(0, 40);
    const chat = await createChat(newChatName.trim(), addr);
    setNewChatName("");
    toggleNewChat();
    setCreating(false);
    router.push(`/chat/${chat.id}`);
  };

  const handlePressChat = (chat: Chat) => {
    selectionFeedback();
    router.push(`/chat/${chat.id}`);
  };

  const newChatHeight = newChatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 70],
  });
  const newChatOpacity = newChatAnim;
  const fabSpin = fabRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Xayrli tong";
    if (h < 17) return "Xayrli kun";
    return "Xayrli kech";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isWeb && <View style={{ height: 67 }} />}

      <View style={[styles.topHeader, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greetText, { color: colors.mutedForeground }]}>{greeting()},</Text>
          <Text style={[styles.nameText, { color: colors.foreground }]}>
            {walletName || "BlockChat"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {totalUnread > 0 && (
            <LinearGradient colors={["#7c6ff7", "#5548d4"]} style={styles.unreadPill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.unreadPillText}>{totalUnread} yangi</Text>
            </LinearGradient>
          )}
          <View style={[styles.onlineDot, { backgroundColor: isOnline ? colors.success : colors.warning }]} />
        </View>
      </View>

      <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Suhbat yoki manzil qidirish..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <View style={[styles.clearBtn, { backgroundColor: colors.border }]}>
                <Feather name="x" size={12} color={colors.mutedForeground} />
              </View>
            </Pressable>
          )}
        </View>
        <Pressable onPress={toggleNewChat}>
          <LinearGradient
            colors={showNewChat ? (["#ef4444", "#dc2626"] as any) : (["#7c6ff7", "#5548d4"] as any)}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View style={{ transform: [{ rotate: fabSpin }] }}>
              <Feather name="edit-2" size={17} color="#fff" />
            </Animated.View>
          </LinearGradient>
        </Pressable>
      </View>

      <Animated.View
        style={{
          height: newChatHeight,
          opacity: newChatOpacity,
          overflow: "hidden",
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        <View style={[styles.newChatBar, { backgroundColor: colors.surface }]}>
          <View style={[styles.newChatInputWrap, { backgroundColor: colors.secondary, borderColor: colors.borderLight }]}>
            <Feather name="hash" size={15} color={colors.mutedForeground} style={{ marginLeft: 12 }} />
            <TextInput
              style={[styles.newChatInput, { color: colors.foreground }]}
              placeholder="Suhbat nomini kiriting..."
              placeholderTextColor={colors.mutedForeground}
              value={newChatName}
              onChangeText={setNewChatName}
              autoFocus={showNewChat}
              returnKeyType="done"
              onSubmitEditing={handleNewChat}
            />
          </View>
          <Pressable onPress={handleNewChat} disabled={creating || !newChatName.trim()}>
            <LinearGradient
              colors={newChatName.trim() ? (["#7c6ff7", "#5548d4"] as any) : ([colors.border, colors.border] as any)}
              style={styles.newChatSendBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="arrow-right" size={18} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>

      <FlatList
        data={sortedChats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => handlePressChat(item)}>
            {({ pressed }) => (
              <View style={{ opacity: pressed ? 0.75 : 1 }}>
                <ChatListItem
                  name={item.name}
                  participantAddress={item.participantAddress}
                  lastMessage={item.lastMessage}
                  lastMessageTime={item.lastMessageTime}
                  unreadCount={item.unreadCount}
                />
              </View>
            )}
          </Pressable>
        )}
        scrollEnabled={sortedChats.length > 0}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <LinearGradient
              colors={["rgba(124,111,247,0.15)", "rgba(124,111,247,0.05)"]}
              style={styles.emptyIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name={search ? "search" : "message-circle"} size={36} color={colors.primary} />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {search ? "Hech narsa topilmadi" : "Suhbatlar yo'q"}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              {search
                ? `"${search}" bo'yicha natija yo'q`
                : "Yangi suhbat boshlash uchun\ntahrirlash tugmasini bosing"}
            </Text>
            {!search && (
              <Pressable onPress={toggleNewChat}>
                <LinearGradient
                  colors={["#7c6ff7", "#5548d4"]}
                  style={styles.emptyBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.emptyBtnText}>Yangi suhbat</Text>
                </LinearGradient>
              </Pressable>
            )}
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
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  greetText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  nameText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  unreadPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  unreadPillText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
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
    gap: 9,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  clearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fabGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7c6ff7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  newChatBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  newChatInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  newChatInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  newChatSendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 14,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 4,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
