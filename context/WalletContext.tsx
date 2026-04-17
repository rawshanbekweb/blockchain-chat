import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  Block,
  createBlock,
  generateWalletAddress,
  getGenesisHash,
} from "@/utils/blockchain";
import { getItem, setItem } from "@/utils/storage";

interface WalletContextValue {
  walletAddress: string;
  walletName: string;
  chain: Block[];
  isLoading: boolean;
  isOnboarded: boolean;
  authenticateDocument: (params: {
    documentName: string;
    documentHash: string;
    fileSize: number;
    mimeType: string;
    chatId: string;
  }) => Promise<Block>;
  setWalletName: (name: string) => Promise<void>;
  completeOnboarding: (name: string) => Promise<void>;
  regenerateWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const WALLET_KEY = "blockchat:wallet_address";
const WALLET_NAME_KEY = "blockchat:wallet_name";
const CHAIN_KEY = "blockchat:blockchain";
const ONBOARDED_KEY = "blockchat:onboarded";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [walletName, setWalletNameState] = useState<string>("");
  const [chain, setChain] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      let address = await getItem<string>(WALLET_KEY, "");
      if (!address) {
        address = generateWalletAddress();
        await setItem(WALLET_KEY, address);
      }
      const name = await getItem<string>(WALLET_NAME_KEY, "");
      const onboarded = await getItem<boolean>(ONBOARDED_KEY, false);
      const savedChain = await getItem<Block[]>(CHAIN_KEY, []);
      if (mounted) {
        setWalletAddress(address);
        setWalletNameState(name);
        setIsOnboarded(onboarded);
        setChain(savedChain);
        setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const authenticateDocument = useCallback(
    async (params: {
      documentName: string;
      documentHash: string;
      fileSize: number;
      mimeType: string;
      chatId: string;
    }) => {
      const previousHash =
        chain.length > 0 ? chain[chain.length - 1].hash : getGenesisHash();
      const block = await createBlock({
        index: chain.length,
        documentName: params.documentName,
        documentHash: params.documentHash,
        fileSize: params.fileSize,
        mimeType: params.mimeType,
        ownerAddress: walletAddress,
        chatId: params.chatId,
        previousHash,
      });
      const newChain = [...chain, block];
      setChain(newChain);
      await setItem(CHAIN_KEY, newChain);
      return block;
    },
    [chain, walletAddress]
  );

  const setWalletName = useCallback(async (name: string) => {
    setWalletNameState(name);
    await setItem(WALLET_NAME_KEY, name);
  }, []);

  const completeOnboarding = useCallback(async (name: string) => {
    setWalletNameState(name);
    setIsOnboarded(true);
    await setItem(WALLET_NAME_KEY, name);
    await setItem(ONBOARDED_KEY, true);
  }, []);

  const regenerateWallet = useCallback(async () => {
    const address = generateWalletAddress();
    setWalletAddress(address);
    await setItem(WALLET_KEY, address);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        walletName,
        chain,
        isLoading,
        isOnboarded,
        authenticateDocument,
        setWalletName,
        completeOnboarding,
        regenerateWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
