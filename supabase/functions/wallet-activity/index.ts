import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2";

// Chain ID mapping
const CHAIN_MAP: Record<string, string> = {
  cronos: "0x19",
  ethereum: "0x1",
  bsc: "0x38",
  polygon: "0x89",
  arbitrum: "0xa4b1",
  base: "0x2105",
};

// --- Risk heuristics ---

interface RiskFlag {
  id: string;
  label: string;
  severity: "info" | "warning" | "danger" | "critical";
  detail: string;
}

const LARGE_TRANSFER_THRESHOLD_USD = 10_000;
const FRESH_WALLET_HOURS = 24;

function detectRiskFlags(
  tx: NormalizedTransaction,
  allTxs: NormalizedTransaction[]
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Flag large transfers (heuristic: value in native token * rough USD estimate)
  const valueNum = parseFloat(tx.value);
  if (valueNum > LARGE_TRANSFER_THRESHOLD_USD) {
    flags.push({
      id: "large_transfer",
      label: "Large Transfer",
      severity: "warning",
      detail: `Transfer of ${valueNum.toLocaleString()} detected`,
    });
  }

  // Flag fresh wallet: first tx within threshold
  if (allTxs.length > 0) {
    const sorted = [...allTxs].sort((a, b) => a.timestamp - b.timestamp);
    const firstTxTime = sorted[0].timestamp;
    const walletAgeHours = (Date.now() - firstTxTime) / (1000 * 60 * 60);
    if (walletAgeHours < FRESH_WALLET_HOURS && tx.hash === sorted[0].hash) {
      flags.push({
        id: "fresh_wallet",
        label: "Fresh Wallet",
        severity: "info",
        detail: `Wallet is less than ${FRESH_WALLET_HOURS}h old`,
      });
    }
  }

  return flags;
}

// --- Normalized transaction type ---

interface NormalizedTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string | null;
  timestamp: number;
  chain: string;
  blockNumber: string;
  gasUsed: string;
  riskFlags: RiskFlag[];
}

interface MoralisTx {
  hash: string;
  from_address: string;
  to_address: string;
  value: string;
  block_timestamp: string;
  block_number: string;
  gas: string;
  receipt_status: string;
}

function normalizeTx(raw: MoralisTx, chain: string): NormalizedTransaction {
  // Convert wei to CRO (18 decimals) for Cronos
  const valueWei = BigInt(raw.value || "0");
  const valueCro = Number(valueWei) / 1e18;

  return {
    hash: raw.hash,
    from: raw.from_address,
    to: raw.to_address ?? "",
    value: valueCro.toFixed(6),
    tokenSymbol: "CRO", // native transactions
    timestamp: new Date(raw.block_timestamp).getTime(),
    chain,
    blockNumber: raw.block_number,
    gasUsed: raw.gas,
    riskFlags: [], // populated after normalization pass
  };
}

// --- Simple in-memory cache ---

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// --- Moralis fetch with retry ---

async function fetchMoralis(
  apiKey: string,
  path: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const url = new URL(`${MORALIS_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
      });

      if (res.status === 429 && attempt < maxRetries) {
        // Rate limited - wait and retry
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          `Moralis ${res.status}: ${JSON.stringify(data).slice(0, 200)}`
        );
      }

      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error("Moralis fetch failed");
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("MORALIS_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "MORALIS_API_KEY not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();
    const { address, chain = "cronos", limit = 25, cursor } = body as {
      address?: string;
      chain?: string;
      limit?: number;
      cursor?: string;
    };

    if (!address || typeof address !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'address' parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate address format (basic hex check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid wallet address format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const chainHex = CHAIN_MAP[chain] ?? CHAIN_MAP.cronos;
    const cacheKey = `${address}:${chainHex}:${limit}:${cursor ?? ""}`;

    // Check cache
    const cached = getCached<{ transactions: NormalizedTransaction[]; cursor: string | null }>(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch from Moralis
    const params: Record<string, string> = {
      chain: chainHex,
      limit: String(Math.min(limit, 100)),
      order: "DESC",
    };
    if (cursor) params.cursor = cursor;

    const raw = (await fetchMoralis(apiKey, `/${address}`, params)) as {
      result: MoralisTx[];
      cursor?: string;
    };

    // Normalize
    const normalized = (raw.result ?? []).map((tx) => normalizeTx(tx, chain));

    // Apply risk flags
    for (const tx of normalized) {
      tx.riskFlags = detectRiskFlags(tx, normalized);
    }

    const result = {
      transactions: normalized,
      cursor: raw.cursor ?? null,
      address,
      chain,
      fetchedAt: Date.now(),
    };

    setCache(cacheKey, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
