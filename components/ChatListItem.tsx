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
  ["#6c5ce7", "#a29bfe"],
  ["#e17055", "#fd79a8"],
  ["#00b894", "#00cec9"],
  ["#0652dd", "#1e90ff"],
  ["#6ab04c", "#badc58"],
  ["#eb4d4b", "#ff7979"],
  ["#f9ca24", "#f0932b"],
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

  const isDoc = lastMessage.startsWith("Hujjat:") || lastMessage.startsWith("shartnoma") || lastMessage.endsWith(".pdf") || lastMessage.endsWith(".docx");

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <LinearGradient
        colors={[gradStart, gradEnd]}
        style={styles.avatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.initials}>{initials}</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.time, { color: unreadCount > 0 ? colors.primary : colors.mutedForeground }]}>
            {formatDate(lastMessageTime)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.lastMsgRow}>
            {isDoc && (
              <Feather name="paperclip" size={12} color={colors.mutedForeground} style={{ marginRight: 3 }} />
            )}
            <Text
              style={[
                styles.lastMessage,
                { color: unreadCount > 0 ? colors.secondaryForeground : colors.mutedForeground },
                unreadCount > 0 && { fontFamily: "Inter_500Medium" },
              ]}
              numberOfLines={1}
            >
              {lastMessage || "Xabar yo'q"}
            </Text>
          </View>
          {unreadCount > 0 && (
            <LinearGradient
              colors={["#6c5ce7", "#0652dd"]}
              style={styles.badge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </LinearGradient>
          )}
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
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 13,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  initials: {
    color: "#fff",
    fontSize: 19,
    fontFamily: "Inter_700Bold",
  },
  content: { flex: 1 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMsgRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
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
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },
});
