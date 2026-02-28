import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// --- Types ---

export interface TransactionRiskFlag {
  id: string;
  label: string;
  severity: "info" | "warning" | "danger" | "critical";
  detail: string;
}

export interface NormalizedTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string | null;
  timestamp: number;
  chain: string;
  blockNumber: string;
  gasUsed: string;
  riskFlags: TransactionRiskFlag[];
}

export interface WalletActivityResponse {
  transactions: NormalizedTransaction[];
  cursor: string | null;
  address: string;
  chain: string;
  fetchedAt: number;
}

interface UseWalletActivityOptions {
  address: string;
  chain?: string;
  limit?: number;
  enabled?: boolean;
  refetchInterval?: number | false;
}

// --- Fetcher ---

async function fetchWalletActivity(
  address: string,
  chain: string,
  limit: number
): Promise<WalletActivityResponse> {
  const { data, error } = await supabase.functions.invoke("wallet-activity", {
    body: { address, chain, limit },
  });

  if (error) {
    throw new Error(error.message ?? "Failed to fetch wallet activity");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as WalletActivityResponse;
}

// --- Hook ---

export function useWalletActivity({
  address,
  chain = "cronos",
  limit = 25,
  enabled = true,
  refetchInterval = false,
}: UseWalletActivityOptions) {
  return useQuery<WalletActivityResponse>({
    queryKey: ["wallet-activity", address, chain, limit],
    queryFn: () => fetchWalletActivity(address, chain, limit),
    enabled: enabled && !!address && /^0x[a-fA-F0-9]{40}$/.test(address),
    staleTime: 30_000,
    retry: 1,
    refetchInterval,
  });
}
