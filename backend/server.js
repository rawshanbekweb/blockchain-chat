/**
 * BlockChat API + WebSocket Backend Server
 *
 * Endpoints:
 *   POST   /api/bc/users/register
 *   GET    /api/bc/rooms?address=
 *   POST   /api/bc/rooms
 *   GET    /api/bc/messages/:roomId
 *   POST   /api/bc/messages
 *   PATCH  /api/bc/messages/:id/document
 *   GET    /api/healthz
 *   WS     /api/bc/ws
 */

const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");

const app = express();

// ── CORS & JSON ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.use(express.json());

// ── IN-MEMORY STORAGE ────────────────────────────────────────────────────────
// users: Map<walletAddress, { walletAddress, displayName, registeredAt }>
const users = new Map();

// rooms: Map<roomId, { id, name, createdBy, participantAddress, participants: Set<address>, createdAt }>
const rooms = new Map();

// messages: Map<roomId, Message[]>
// Message: { id, roomId, senderAddress, senderName, content, type, document, timestamp }
const messages = new Map();

// WebSocket clients: Map<ws, { address, rooms: Set<roomId> }>
const wsClients = new Map();

// ── HELPERS ──────────────────────────────────────────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function broadcastToRoom(roomId, payload) {
  const data = JSON.stringify(payload);
  for (const [ws, meta] of wsClients.entries()) {
    if (ws.readyState !== 1) continue;
    // send if the client explicitly joined this room OR is a participant
    const room = rooms.get(roomId);
    const isParticipant =
      room &&
      (room.participants.has(meta.address) ||
        room.participantAddress === meta.address ||
        room.createdBy === meta.address);
    if (meta.rooms.has(roomId) || isParticipant) {
      ws.send(data);
    }
  }
}

function roomSummary(room) {
  const msgs = messages.get(room.id) || [];
  const last = msgs[msgs.length - 1];
  return {
    id: room.id,
    name: room.name,
    createdBy: room.createdBy,
    participantAddress: room.participantAddress || "",
    lastMessage: last?.content || "",
    lastMessageTime: last?.timestamp || room.createdAt,
    unreadCount: 0,
  };
}

// ── REST ROUTES ──────────────────────────────────────────────────────────────

// Health check
app.get("/api/healthz", (req, res) => {
  res.json({
    status: "ok",
    rooms: rooms.size,
    users: users.size,
    messages: [...messages.values()].reduce((a, m) => a + m.length, 0),
    uptime: Math.floor(process.uptime()),
  });
});

// Register user
app.post("/api/bc/users/register", (req, res) => {
  const { walletAddress, displayName } = req.body;
  if (!walletAddress) return res.status(400).json({ error: "walletAddress kerak" });
  users.set(walletAddress, {
    walletAddress,
    displayName: (displayName || "").trim() || walletAddress,
    registeredAt: Date.now(),
  });
  console.log(`[user] ro'yxatdan o'tdi: ${displayName} (${walletAddress.slice(0, 10)}...)`);
  res.json({ ok: true });
});

// Get rooms for a user
app.get("/api/bc/rooms", (req, res) => {
  const { address } = req.query;
  const result = [];
  for (const room of rooms.values()) {
    if (
      !address ||
      room.createdBy === address ||
      room.participantAddress === address ||
      room.participants.has(address)
    ) {
      result.push(roomSummary(room));
    }
  }
  // Newest rooms first
  result.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  res.json(result);
});

// Create room
app.post("/api/bc/rooms", (req, res) => {
  const { name, createdBy, participantAddress } = req.body;
  if (!name || !createdBy) return res.status(400).json({ error: "name va createdBy kerak" });
  const id = genId();
  const room = {
    id,
    name: name.trim(),
    createdBy,
    participantAddress: participantAddress || "",
    participants: new Set([createdBy]),
    createdAt: Date.now(),
  };
  if (participantAddress) room.participants.add(participantAddress);
  rooms.set(id, room);
  messages.set(id, []);
  console.log(`[room] yangi: "${name}" (${id})`);
  res.json({ id, name: room.name });
});

// Get messages
app.get("/api/bc/messages/:roomId", (req, res) => {
  const { roomId } = req.params;
  const limit = Math.min(parseInt(req.query.limit || "100", 10), 500);
  const msgs = messages.get(roomId) || [];
  res.json(msgs.slice(-limit));
});

// Send message (REST fallback)
app.post("/api/bc/messages", (req, res) => {
  const { roomId, senderAddress, senderName, content, type, document } = req.body;
  if (!roomId || !senderAddress || !content)
    return res.status(400).json({ error: "roomId, senderAddress, content kerak" });

  if (!rooms.has(roomId)) return res.status(404).json({ error: "Xona topilmadi" });

  const msg = {
    id: genId(),
    roomId,
    senderAddress,
    senderName: senderName || senderAddress,
    content,
    type: type || "text",
    document: document || null,
    timestamp: Date.now(),
  };

  // Add sender as participant
  const room = rooms.get(roomId);
  room.participants.add(senderAddress);

  messages.get(roomId).push(msg);
  broadcastToRoom(roomId, { type: "new_message", ...msg });
  console.log(`[msg] ${senderName || senderAddress.slice(0, 8)}: "${content.slice(0, 40)}"`);
  res.json(msg);
});

// Update document (authentication)
app.patch("/api/bc/messages/:id/document", (req, res) => {
  const { id } = req.params;
  const { document } = req.body;

  for (const [roomId, msgs] of messages.entries()) {
    const msg = msgs.find((m) => m.id === id);
    if (msg) {
      msg.document = { ...msg.document, ...document };
      broadcastToRoom(roomId, {
        type: "doc_authenticated",
        messageId: id,
        roomId,
        document: msg.document,
      });
      return res.json({ ok: true });
    }
  }
  res.status(404).json({ error: "Xabar topilmadi" });
});

// ── WEBSOCKET ────────────────────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/api/bc/ws" });

wss.on("connection", (ws, req) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "?";
  wsClients.set(ws, { address: null, rooms: new Set(), ip });
  console.log(`[ws] ulanish: ${ip} (jami: ${wsClients.size})`);

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const meta = wsClients.get(ws);
    if (!meta) return;

    // auth — hamyon manzili bilan autentifikatsiya
    if (data.type === "auth") {
      meta.address = data.address;
      ws.send(JSON.stringify({ type: "connected", address: data.address }));
      console.log(`[ws] auth: ${data.address?.slice(0, 14)}...`);

      // Auto-join all rooms where this address is a participant
      for (const room of rooms.values()) {
        if (
          room.createdBy === data.address ||
          room.participantAddress === data.address ||
          room.participants.has(data.address)
        ) {
          meta.rooms.add(room.id);
        }
      }
      return;
    }

    // join_room — xonaga qo'shilish
    if (data.type === "join_room") {
      meta.rooms.add(data.roomId);
      if (meta.address && rooms.has(data.roomId)) {
        rooms.get(data.roomId).participants.add(meta.address);
      }
      return;
    }

    // message — xabar yuborish
    if (data.type === "message") {
      if (!rooms.has(data.roomId)) return;
      const msg = {
        id: genId(),
        roomId: data.roomId,
        senderAddress: meta.address || data.senderAddress,
        senderName: data.senderName || meta.address || "Noma'lum",
        content: data.content || "",
        type: data.msgType || "text",
        document: data.document || null,
        timestamp: Date.now(),
      };
      if (meta.address) rooms.get(data.roomId).participants.add(meta.address);
      if (!messages.has(data.roomId)) messages.set(data.roomId, []);
      messages.get(data.roomId).push(msg);
      broadcastToRoom(data.roomId, { type: "new_message", ...msg });
      console.log(
        `[ws-msg] ${msg.senderName.slice(0, 12)}: "${msg.content.slice(0, 40)}" → xona ${data.roomId}`
      );
      return;
    }

    // doc_authenticated — hujjat tasdiqlandi
    if (data.type === "doc_authenticated") {
      broadcastToRoom(data.roomId, {
        type: "doc_authenticated",
        roomId: data.roomId,
        messageId: data.messageId,
        document: data.document,
      });
      return;
    }
  });

  ws.on("close", () => {
    wsClients.delete(ws);
    console.log(`[ws] uzildi. Qolgan: ${wsClients.size}`);
  });

  ws.on("error", (err) => {
    console.error(`[ws] xato:`, err.message);
    wsClients.delete(ws);
  });
});

// ── START ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3001", 10);
server.listen(PORT, "0.0.0.0", () => {
  console.log("─────────────────────────────────────────");
  console.log(`  BlockChat Backend — port ${PORT}`);
  console.log(`  REST  → http://localhost:${PORT}/api/bc`);
  console.log(`  WS    → ws://localhost:${PORT}/api/bc/ws`);
  console.log(`  Sog'  → http://localhost:${PORT}/api/healthz`);
  console.log("─────────────────────────────────────────");
});
