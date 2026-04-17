import * as Crypto from "expo-crypto";

export interface Block {
  index: number;
  timestamp: number;
  documentName: string;
  documentHash: string;
  fileSize: number;
  mimeType: string;
  ownerAddress: string;
  chatId: string;
  previousHash: string;
  hash: string;
}

export async function computeFileHash(
  fileName: string,
  fileSize: number,
  mimeType: string,
  uri: string
): Promise<string> {
  const content = `${fileName}::${fileSize}::${mimeType}::${uri}`;
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    content
  );
}

export async function computeBlockHash(block: Omit<Block, "hash">): Promise<string> {
  const content = JSON.stringify({
    index: block.index,
    timestamp: block.timestamp,
    documentName: block.documentName,
    documentHash: block.documentHash,
    ownerAddress: block.ownerAddress,
    previousHash: block.previousHash,
  });
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    content
  );
}

export async function createBlock(params: {
  index: number;
  documentName: string;
  documentHash: string;
  fileSize: number;
  mimeType: string;
  ownerAddress: string;
  chatId: string;
  previousHash: string;
}): Promise<Block> {
  const timestamp = Date.now();
  const blockData = {
    ...params,
    timestamp,
  };
  const hash = await computeBlockHash(blockData);
  return { ...blockData, hash };
}

export async function verifyDocumentInChain(
  documentHash: string,
  chain: Block[]
): Promise<{ verified: boolean; block: Block | null }> {
  const block = chain.find((b) => b.documentHash === documentHash);
  if (!block) return { verified: false, block: null };

  const expectedHash = await computeBlockHash({
    index: block.index,
    timestamp: block.timestamp,
    documentName: block.documentName,
    documentHash: block.documentHash,
    fileSize: block.fileSize,
    mimeType: block.mimeType,
    ownerAddress: block.ownerAddress,
    chatId: block.chatId,
    previousHash: block.previousHash,
  });

  if (expectedHash !== block.hash) return { verified: false, block: null };
  return { verified: true, block };
}

export function generateWalletAddress(): string {
  let address = "0x";
  const chars = "0123456789abcdef";
  for (let i = 0; i < 40; i++) {
    const rand = Math.floor(Math.random() * chars.length);
    address += chars[rand];
  }
  return address;
}

export function shortAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getGenesisHash(): string {
  return "0000000000000000000000000000000000000000000000000000000000000000";
}
