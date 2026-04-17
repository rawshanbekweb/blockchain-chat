import { getServerUrl } from "./api";

type MessageHandler = (data: any) => void;

class BlockChatSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private walletAddress = "";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private reconnectDelay = 2000;

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  private emit(type: string, data: any) {
    this.handlers.get(type)?.forEach((h) => h(data));
    this.handlers.get("*")?.forEach((h) => h({ type, ...data }));
  }

  async connect(walletAddress: string) {
    this.walletAddress = walletAddress;
    this.shouldReconnect = true;

    const base = await getServerUrl();
    if (!base) return;

    const wsUrl = base.replace(/^https?:\/\//, (match) =>
      match.startsWith("https") ? "wss://" : "ws://"
    ) + "/api/bc/ws";

    if (this.ws && this.ws.readyState < 2) {
      this.ws.close();
    }

    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = 2000;
      ws.send(JSON.stringify({ type: "auth", address: walletAddress }));
      this.emit("connected", {});
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
      } catch {}
    };

    ws.onclose = () => {
      this.emit("disconnected", {});
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
          this.connect(this.walletAddress);
        }, this.reconnectDelay);
      }
    };

    ws.onerror = () => {
      this.emit("error", { message: "WebSocket ulanish xatosi" });
    };
  }

  send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  joinRoom(roomId: string) {
    this.send({ type: "join_room", roomId });
  }

  sendMessage(roomId: string, content: string, msgType = "text", document?: object) {
    return this.send({ type: "message", roomId, content, msgType, document });
  }

  notifyDocAuthenticated(roomId: string, messageId: string, document: object) {
    this.send({ type: "doc_authenticated", roomId, messageId, document });
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const socket = new BlockChatSocket();
