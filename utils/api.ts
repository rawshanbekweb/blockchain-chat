import AsyncStorage from "@react-native-async-storage/async-storage";

const SERVER_URL_KEY = "blockchat:server_url";
const DEFAULT_SERVER =
  process.env.EXPO_PUBLIC_API_URL ??
  (process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api-server`
    : "");

export async function getServerUrl(): Promise<string> {
  const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
  return (saved ?? DEFAULT_SERVER).replace(/\/$/, "");
}

export async function setServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_URL_KEY, url.replace(/\/$/, ""));
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const base = await getServerUrl();
  if (!base) throw new Error("Server URL sozlanmagan");
  const response = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Server xatosi: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  registerUser: (walletAddress: string, displayName: string) =>
    request<{ ok: boolean }>("/api/bc/users/register", {
      method: "POST",
      body: JSON.stringify({ walletAddress, displayName }),
    }),

  getRooms: (address: string) =>
    request<any[]>(`/api/bc/rooms?address=${encodeURIComponent(address)}`),

  createRoom: (name: string, createdBy: string, participantAddress?: string) =>
    request<{ id: string; name: string }>("/api/bc/rooms", {
      method: "POST",
      body: JSON.stringify({ name, createdBy, participantAddress }),
    }),

  getMessages: (roomId: string, limit = 100) =>
    request<any[]>(`/api/bc/messages/${roomId}?limit=${limit}`),

  sendMessage: (params: {
    roomId: string;
    senderAddress: string;
    senderName: string;
    content: string;
    type?: string;
    document?: object;
  }) =>
    request<any>("/api/bc/messages", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  updateDocument: (msgId: string, document: object) =>
    request<{ ok: boolean }>(`/api/bc/messages/${msgId}/document`, {
      method: "PATCH",
      body: JSON.stringify({ document }),
    }),

  healthCheck: () =>
    request<{ status: string }>("/api/healthz"),
};
