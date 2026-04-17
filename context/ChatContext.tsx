import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "@/utils/api";
import { socket } from "@/utils/socket";
import { getItem, setItem } from "@/utils/storage";
import { useWallet } from "./WalletContext";

export interface DocumentAttachment {
  name: string;
  size: number;
  mimeType: string;
  uri: string;
  hash: string;
  authenticated: boolean;
  blockIndex?: number;
  blockHash?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderAddress: string;
  senderName: string;
  content: string;
  type: "text" | "document";
  timestamp: number;
  document?: DocumentAttachment;
}

export interface Chat {
  id: string;
  name: string;
  participantAddress: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}

interface ChatContextValue {
  chats: Chat[];
  getMessages: (chatId: string) => Message[];
  createChat: (name: string, participantAddress: string) => Promise<Chat>;
  sendMessage: (params: {
    chatId: string;
    senderAddress: string;
    senderName: string;
    content: string;
    type: "text" | "document";
    document?: DocumentAttachment;
  }) => void;
  updateMessageDocument: (chatId: string, messageId: string, updates: Partial<DocumentAttachment>) => void;
  markAsRead: (chatId: string) => void;
  isLoaded: boolean;
  isOnline: boolean;
  serverUrl: string;
  setAndSaveServerUrl: (url: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

const CHATS_KEY = "blockchat:chats_v2";
const MESSAGES_PREFIX = "blockchat:messages_v2:";

function roomToChat(room: any): Chat {
  return {
    id: room.id,
    name: room.name,
    participantAddress: room.created_by || "0x000",
    lastMessage: room.last_message || "",
    lastMessageTime: room.last_message_time ? new Date(room.last_message_time).getTime() : 0,
    unreadCount: 0,
  };
}

function serverMsgToLocal(msg: any, chatId: string): Message {
  return {
    id: msg.id,
    chatId: msg.room_id || chatId,
    senderAddress: msg.sender_address || msg.senderAddress || "",
    senderName: msg.sender_name || msg.senderName || "",
    content: msg.content,
    type: msg.type || "text",
    timestamp: msg.timestamp || (msg.created_at ? new Date(msg.created_at).getTime() : Date.now()),
    document: msg.document || undefined,
  };
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { walletAddress, walletName, isLoading: walletLoading } = useWallet();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [serverUrl, setServerUrlState] = useState("");
  const currentChatRef = useRef<string | null>(null);

  // Load server URL
  useEffect(() => {
    (async () => {
      const { getServerUrl } = await import("@/utils/api");
      const url = await getServerUrl();
      setServerUrlState(url);
    })();
  }, []);

  const setAndSaveServerUrl = useCallback(async (url: string) => {
    const { setServerUrl } = await import("@/utils/api");
    await setServerUrl(url);
    setServerUrlState(url);
  }, []);

  // Load local chats first (offline fallback)
  useEffect(() => {
    (async () => {
      const saved = await getItem<Chat[]>(CHATS_KEY, []);
      if (saved.length > 0) {
        setChats(saved);
        const msgs: Record<string, Message[]> = {};
        for (const c of saved) {
          msgs[c.id] = await getItem<Message[]>(`${MESSAGES_PREFIX}${c.id}`, []);
        }
        setMessages(msgs);
      }
      setIsLoaded(true);
    })();
  }, []);

  // Connect to server when wallet is ready
  useEffect(() => {
    if (walletLoading || !walletAddress || !serverUrl) return;

    let unsubConnected: (() => void) | null = null;
    let unsubDisconnected: (() => void) | null = null;
    let unsubNewMsg: (() => void) | null = null;
    let unsubDocAuth: (() => void) | null = null;

    const init = async () => {
      // Register user on server
      try {
        await api.registerUser(walletAddress, walletName || walletAddress.slice(0, 8));
      } catch {}

      // Load rooms from server
      try {
        const rooms = await api.getRooms(walletAddress);
        const serverChats = rooms.map(roomToChat);
        setChats(serverChats);
        await setItem(CHATS_KEY, serverChats);

        // Load messages for each room
        const msgs: Record<string, Message[]> = {};
        for (const room of rooms) {
          try {
            const roomMsgs = await api.getMessages(room.id);
            msgs[room.id] = roomMsgs.map((m) => serverMsgToLocal(m, room.id));
          } catch {}
        }
        setMessages(msgs);
        for (const [chatId, chatMsgs] of Object.entries(msgs)) {
          await setItem(`${MESSAGES_PREFIX}${chatId}`, chatMsgs);
        }
      } catch {}

      // Connect WebSocket
      await socket.connect(walletAddress);

      unsubConnected = socket.on("connected", () => setIsOnline(true));
      unsubDisconnected = socket.on("disconnected", () => setIsOnline(false));

      unsubNewMsg = socket.on("new_message", ({ message }: any) => {
        const roomId = message.roomId || message.room_id;
        const msg = serverMsgToLocal(message, roomId);

        setMessages((prev) => {
          const chatMsgs = [...(prev[roomId] ?? [])];
          if (!chatMsgs.find((m) => m.id === msg.id)) {
            chatMsgs.push(msg);
            setItem(`${MESSAGES_PREFIX}${roomId}`, chatMsgs);
          }
          return { ...prev, [roomId]: chatMsgs };
        });

        setChats((prev) => {
          const isMine = message.senderAddress === walletAddress;
          return prev.map((c) =>
            c.id === roomId
              ? {
                  ...c,
                  lastMessage: msg.type === "document" ? `Hujjat: ${msg.document?.name ?? "fayl"}` : msg.content,
                  lastMessageTime: msg.timestamp,
                  unreadCount: isMine || currentChatRef.current === roomId ? 0 : c.unreadCount + 1,
                }
              : c
          );
        });
      });

      unsubDocAuth = socket.on("doc_authenticated", ({ messageId, document }: any) => {
        setMessages((prev) => {
          const newMsgs: Record<string, Message[]> = {};
          for (const [cid, chatMsgs] of Object.entries(prev)) {
            newMsgs[cid] = chatMsgs.map((m) =>
              m.id === messageId && m.document
                ? { ...m, document: { ...m.document, ...document } }
                : m
            );
          }
          return newMsgs;
        });
      });
    };

    init();

    return () => {
      unsubConnected?.();
      unsubDisconnected?.();
      unsubNewMsg?.();
      unsubDocAuth?.();
    };
  }, [walletAddress, walletName, walletLoading, serverUrl]);

  const getMessages = useCallback(
    (chatId: string): Message[] => messages[chatId] ?? [],
    [messages]
  );

  const createChat = useCallback(
    async (name: string, participantAddress: string): Promise<Chat> => {
      let roomId: string | null = null;

      if (isOnline) {
        try {
          const room = await api.createRoom(name, walletAddress, participantAddress);
          roomId = room.id;
          socket.joinRoom(room.id);
        } catch {}
      }

      const id = roomId ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      const chat: Chat = {
        id,
        name,
        participantAddress,
        lastMessage: "",
        lastMessageTime: Date.now(),
        unreadCount: 0,
      };
      setChats((prev) => {
        const updated = [chat, ...prev];
        setItem(CHATS_KEY, updated);
        return updated;
      });
      setMessages((prev) => {
        setItem(`${MESSAGES_PREFIX}${id}`, []);
        return { ...prev, [id]: [] };
      });
      return chat;
    },
    [walletAddress, isOnline]
  );

  const sendMessage = useCallback(
    (params: {
      chatId: string;
      senderAddress: string;
      senderName: string;
      content: string;
      type: "text" | "document";
      document?: DocumentAttachment;
    }) => {
      const { chatId, senderAddress, senderName, content, type, document } = params;

      if (isOnline && !chatId.startsWith("local-")) {
        const sent = socket.sendMessage(chatId, content, type, document);
        if (sent) return;
      }

      // Offline fallback
      const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      const msg: Message = {
        id,
        chatId,
        senderAddress,
        senderName,
        content,
        type,
        timestamp: Date.now(),
        document,
      };
      setMessages((prev) => {
        const chatMsgs = [...(prev[chatId] ?? []), msg];
        setItem(`${MESSAGES_PREFIX}${chatId}`, chatMsgs);
        return { ...prev, [chatId]: chatMsgs };
      });
      setChats((prev) => {
        const updated = prev.map((c) =>
          c.id === chatId
            ? { ...c, lastMessage: type === "document" ? `Hujjat: ${document?.name}` : content, lastMessageTime: Date.now() }
            : c
        );
        setItem(CHATS_KEY, updated);
        return updated;
      });
    },
    [isOnline]
  );

  const updateMessageDocument = useCallback(
    (chatId: string, messageId: string, updates: Partial<DocumentAttachment>) => {
      setMessages((prev) => {
        const chatMsgs = (prev[chatId] ?? []).map((m) =>
          m.id === messageId && m.document
            ? { ...m, document: { ...m.document, ...updates } }
            : m
        );
        setItem(`${MESSAGES_PREFIX}${chatId}`, chatMsgs);

        // Notify other users via WebSocket
        if (isOnline && updates) {
          const msg = chatMsgs.find((m) => m.id === messageId);
          if (msg?.document) {
            socket.notifyDocAuthenticated(chatId, messageId, msg.document);
          }
        }
        return { ...prev, [chatId]: chatMsgs };
      });
    },
    [isOnline]
  );

  const markAsRead = useCallback((chatId: string) => {
    currentChatRef.current = chatId;
    setChats((prev) => {
      const updated = prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c));
      setItem(CHATS_KEY, updated);
      return updated;
    });
    return () => { currentChatRef.current = null; };
  }, []);

  return (
    <ChatContext.Provider
      value={{
        chats,
        getMessages,
        createChat,
        sendMessage,
        updateMessageDocument,
        markAsRead,
        isLoaded,
        isOnline,
        serverUrl,
        setAndSaveServerUrl,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
}
