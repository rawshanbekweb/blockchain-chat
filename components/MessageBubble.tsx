import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

  const handleAuthenticate = async () => {
    if (!onAuthenticateDocument) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    return (
      <View style={[styles.container, isMine ? styles.mine : styles.theirs]}>
        {!isMine && (
          <Text style={[styles.senderName, { color: colors.primaryLight }]}>
            {senderName}
          </Text>
        )}
        <View
          style={[
            styles.docBubble,
            {
              backgroundColor: isMine ? colors.sentBubble : colors.card,
              borderColor: isMine ? "rgba(108,92,231,0.4)" : colors.border,
            },
          ]}
        >
          <View style={styles.docTop}>
            <View
              style={[
                styles.fileIconWrap,
                { backgroundColor: isMine ? "rgba(255,255,255,0.1)" : colors.secondary },
              ]}
            >
              <Feather
                name={iconName}
                size={22}
                color={isMine ? colors.primaryLight : colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.docName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {document.name}
              </Text>
              <Text style={[styles.docSize, { color: colors.mutedForeground }]}>
                {formatFileSize(document.size)} · {document.mimeType.split("/")[1]?.toUpperCase() || "FILE"}
              </Text>
            </View>
          </View>

          <View style={[styles.hashRow, { borderTopColor: colors.border }]}>
            <Feather name="hash" size={12} color={colors.mutedForeground} />
            <Text style={[styles.hashText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {document.hash.slice(0, 18)}...{document.hash.slice(-6)}
            </Text>
          </View>

          {document.authenticated ? (
            <View style={[styles.verifiedRow, { backgroundColor: colors.successBg }]}>
              <Feather name="shield" size={14} color={colors.verified} />
              <Text style={[styles.verifiedText, { color: colors.verified }]}>
                Blokcheynda tasdiqlangan · Blok #{document.blockIndex ?? 0}
              </Text>
            </View>
          ) : (
            <Pressable onPress={handleAuthenticate} disabled={authenticating}>
              <LinearGradient
                colors={authenticating ? [colors.border, colors.border] : ["rgba(108,92,231,0.2)", "rgba(6,82,221,0.2)"]}
                style={styles.authBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {authenticating ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Feather name="shield-off" size={14} color={colors.warning} />
                    <Text style={[styles.authBtnText, { color: colors.warning }]}>
                      Blokcheynda tasdiqlash
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}
        </View>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {formatTime(timestamp)}
        </Text>
      </View>
    );
  }

  if (isMine) {
    return (
      <View style={[styles.container, styles.mine]}>
        <LinearGradient
          colors={["#6c5ce7", "#4834d4"]}
          style={[styles.bubble, styles.bubbleMine]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.text, { color: "#fff" }]}>{content}</Text>
        </LinearGradient>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {formatTime(timestamp)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.theirs]}>
      <Text style={[styles.senderName, { color: colors.primaryLight }]}>
        {senderName}
      </Text>
      <View
        style={[
          styles.bubble,
          styles.bubbleTheirs,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.text, { color: colors.foreground }]}>{content}</Text>
      </View>
      <Text style={[styles.time, { color: colors.mutedForeground }]}>
        {formatTime(timestamp)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4, maxWidth: "80%" },
  mine: { alignSelf: "flex-end", alignItems: "flex-end" },
  theirs: { alignSelf: "flex-start", alignItems: "flex-start" },
  senderName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleTheirs: {
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 21 },
  docBubble: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    minWidth: 230,
  },
  docTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
  },
  fileIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  docName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  docSize: { fontSize: 12, fontFamily: "Inter_400Regular" },
  hashRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hashText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  verifiedText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  authBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    margin: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(253,203,110,0.3)",
  },
  authBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    marginHorizontal: 4,
  },
});
