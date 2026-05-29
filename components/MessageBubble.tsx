import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { impactMedium } from "@/utils/haptics";
import { DocumentAttachment } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";
import { formatFileSize } from "@/utils/blockchain";

interface MessageBubbleProps {
  content: string;
  type: "text" | "document";
  isMine: boolean;
  senderName: string;
  timestamp: number;
  document?: DocumentAttachment;
  onAuthenticateDocument?: () => Promise<void>;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function getFileIcon(mimeType: string): keyof typeof Feather.glyphMap {
  if (mimeType.includes("pdf")) return "file-text";
  if (mimeType.includes("image")) return "image";
  if (mimeType.includes("word") || mimeType.includes("document")) return "file-text";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "grid";
  if (mimeType.includes("zip") || mimeType.includes("archive")) return "archive";
  return "file";
}

function getFileColor(mimeType: string): string {
  if (mimeType.includes("pdf")) return "#ef4444";
  if (mimeType.includes("image")) return "#10b981";
  if (mimeType.includes("word") || mimeType.includes("document")) return "#3b82f6";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "#10b981";
  if (mimeType.includes("zip") || mimeType.includes("archive")) return "#f59e0b";
  return "#7c6ff7";
}

export default function MessageBubble({
  content,
  type,
  isMine,
  senderName,
  timestamp,
  document,
  onAuthenticateDocument,
}: MessageBubbleProps) {
  const colors = useColors();
  const [authenticating, setAuthenticating] = useState(false);
  const pressAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(pressAnim, { toValue: 0.97, tension: 200, friction: 12, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressAnim, { toValue: 1, tension: 200, friction: 12, useNativeDriver: true }).start();
  };

  const handleAuthenticate = async () => {
    if (!onAuthenticateDocument) return;
    impactMedium();
    Alert.alert(
      "Blokcheynda Autentifikatsiya",
      `"${document?.name}" hujjatini blokcheynda tasdiqlaysizmi?\n\nBu amal qaytarib bo'lmaydi.`,
      [
        { text: "Bekor", style: "cancel" },
        {
          text: "Tasdiqlash",
          style: "default",
          onPress: async () => {
            setAuthenticating(true);
            try {
              await onAuthenticateDocument();
            } finally {
              setAuthenticating(false);
            }
          },
        },
      ]
    );
  };

  if (type === "document" && document) {
    const iconName = getFileIcon(document.mimeType);
    const fileColor = getFileColor(document.mimeType);
    return (
      <Animated.View
        style={[
          styles.container,
          isMine ? styles.mine : styles.theirs,
          { transform: [{ scale: pressAnim }] },
        ]}
      >
        {!isMine && (
          <Text style={[styles.senderName, { color: colors.primaryLight }]}>{senderName}</Text>
        )}
        <View
          style={[
            styles.docBubble,
            {
              backgroundColor: isMine ? "#1e1660" : colors.card,
              borderColor: isMine ? "rgba(124,111,247,0.35)" : colors.border,
            },
          ]}
        >
          <View style={styles.docTop}>
            <LinearGradient
              colors={[fileColor + "30", fileColor + "10"]}
              style={[styles.fileIconWrap, { borderColor: fileColor + "20" }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name={iconName} size={22} color={fileColor} />
            </LinearGradient>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.docName, { color: colors.foreground }]} numberOfLines={1}>
                {document.name}
              </Text>
              <Text style={[styles.docSize, { color: colors.mutedForeground }]}>
                {formatFileSize(document.size)} · {document.mimeType.split("/")[1]?.toUpperCase() || "FILE"}
              </Text>
            </View>
          </View>

          <View style={[styles.hashRow, { borderTopColor: isMine ? "rgba(255,255,255,0.08)" : colors.border }]}>
            <View style={[styles.hashChip, { backgroundColor: colors.surface }]}>
              <Feather name="hash" size={11} color={colors.mutedForeground} />
              <Text style={[styles.hashText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {document.hash.slice(0, 16)}...{document.hash.slice(-6)}
              </Text>
            </View>
          </View>

          {document.authenticated ? (
            <View style={[styles.verifiedRow, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
              <LinearGradient
                colors={["#10b981", "#059669"]}
                style={styles.verifiedIconBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name="shield" size={12} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.verifiedText, { color: colors.success }]}>
                  Blokcheynda tasdiqlangan
                </Text>
                <Text style={[styles.verifiedSub, { color: colors.mutedForeground }]}>
                  Blok #{document.blockIndex ?? 0}
                </Text>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={handleAuthenticate}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={authenticating}
            >
              <View
                style={[
                  styles.authBtn,
                  {
                    backgroundColor: "rgba(245,158,11,0.1)",
                    borderColor: "rgba(245,158,11,0.25)",
                  },
                ]}
              >
                {authenticating ? (
                  <ActivityIndicator size="small" color={colors.warning} />
                ) : (
                  <>
                    <Feather name="shield" size={14} color={colors.warning} />
                    <Text style={[styles.authBtnText, { color: colors.warning }]}>
                      Blokcheynda tasdiqlash
                    </Text>
                  </>
                )}
              </View>
            </Pressable>
          )}
        </View>
        <View style={styles.timeRow}>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{formatTime(timestamp)}</Text>
        </View>
      </Animated.View>
    );
  }

  if (isMine) {
    return (
      <Animated.View style={[styles.container, styles.mine, { transform: [{ scale: pressAnim }] }]}>
        <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
          <LinearGradient
            colors={["#7c6ff7", "#5548d4"]}
            style={[styles.bubble, styles.bubbleMine]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.text, { color: "#fff" }]}>{content}</Text>
          </LinearGradient>
        </Pressable>
        <View style={styles.timeRow}>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{formatTime(timestamp)}</Text>
          <Feather name="check" size={11} color={colors.mutedForeground} />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, styles.theirs, { transform: [{ scale: pressAnim }] }]}>
      <Text style={[styles.senderName, { color: colors.primaryLight }]}>{senderName}</Text>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <View
          style={[
            styles.bubble,
            styles.bubbleTheirs,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.text, { color: colors.foreground }]}>{content}</Text>
        </View>
      </Pressable>
      <View style={styles.timeRow}>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>{formatTime(timestamp)}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 3, maxWidth: "82%" },
  mine: { alignSelf: "flex-end", alignItems: "flex-end" },
  theirs: { alignSelf: "flex-start", alignItems: "flex-start" },
  senderName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 5,
    marginLeft: 2,
  },
  bubble: { borderRadius: 20, paddingHorizontal: 15, paddingVertical: 11 },
  bubbleMine: {
    borderBottomRightRadius: 5,
    shadowColor: "#7c6ff7",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bubbleTheirs: {
    borderBottomLeftRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  docBubble: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    minWidth: 240,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  docTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  fileIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  docName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.2,
  },
  docSize: { fontSize: 12, fontFamily: "Inter_400Regular" },
  hashRow: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  hashChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  hashText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  verifiedIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  verifiedSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  authBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 10,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    justifyContent: "center",
    borderWidth: 1,
  },
  authBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
    marginHorizontal: 4,
  },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
