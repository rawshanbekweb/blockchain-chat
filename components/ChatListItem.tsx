import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { shortAddress } from "@/utils/blockchain";

interface ChatListItemProps {
  name: string;
  participantAddress: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}

function formatDate(ts: number): string {
  if (!ts) return "";
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return "Hozir";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} daq`;
  if (diff < 86400000) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

const GRADIENT_SETS: [string, string][] = [
  ["#7c6ff7", "#a89ef8"],
  ["#e17055", "#fd79a8"],
  ["#10b981", "#34d399"],
  ["#1e40af", "#3b82f6"],
  ["#059669", "#10b981"],
  ["#dc2626", "#f87171"],
  ["#d97706", "#fbbf24"],
];

function getGradient(address: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  return GRADIENT_SETS[Math.abs(hash) % GRADIENT_SETS.length];
}

export default function ChatListItem({
  name,
  participantAddress,
  lastMessage,
  lastMessageTime,
  unreadCount,
}: ChatListItemProps) {
  const colors = useColors();
  const [gradStart, gradEnd] = getGradient(participantAddress);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isDoc =
    lastMessage.startsWith("Hujjat:") ||
    lastMessage.endsWith(".pdf") ||
    lastMessage.endsWith(".docx") ||
    lastMessage.endsWith(".xlsx");

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.avatarWrap}>
        <LinearGradient
          colors={[gradStart, gradEnd]}
          style={styles.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.initials}>{initials}</Text>
        </LinearGradient>
        {unreadCount > 0 && <View style={[styles.onlineBubble, { borderColor: colors.background }]} />}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {name}
          </Text>
          <Text
            style={[
              styles.time,
              {
                color: unreadCount > 0 ? colors.primaryLight : colors.mutedForeground,
                fontFamily: unreadCount > 0 ? "Inter_600SemiBold" : "Inter_400Regular",
              },
            ]}
          >
            {formatDate(lastMessageTime)}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.lastMsgRow}>
            {isDoc && (
              <View style={[styles.docChip, { backgroundColor: colors.primaryGlow }]}>
                <Feather name="paperclip" size={10} color={colors.primaryLight} />
              </View>
            )}
            <Text
              style={[
                styles.lastMessage,
                {
                  color: unreadCount > 0 ? colors.textSecondary : colors.mutedForeground,
                  fontFamily: unreadCount > 0 ? "Inter_500Medium" : "Inter_400Regular",
                },
              ]}
              numberOfLines={1}
            >
              {lastMessage || "Xabar yo'q"}
            </Text>
          </View>
          {unreadCount > 0 ? (
            <LinearGradient
              colors={["#7c6ff7", "#5548d4"]}
              style={styles.badge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </LinearGradient>
          ) : null}
        </View>

        <Text style={[styles.address, { color: colors.mutedForeground }]}>
          {shortAddress(participantAddress)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 13,
  },
  avatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineBubble: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#7c6ff7",
    borderWidth: 2,
  },
  initials: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  content: { flex: 1 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
  },
  time: {
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  lastMsgRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  docChip: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  address: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.2,
  },
});
