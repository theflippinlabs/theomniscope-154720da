import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { useMarketData } from "@/hooks/useMarketData";

export function ActivityWidget() {
  const { tokens } = useMarketData();

  const gainers = tokens.filter((t) => t.priceChange24h > 0).length;
  const losers = tokens.filter((t) => t.priceChange24h < 0).length;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-success" />
          <span className="text-[10px] font-semibold text-success">{gainers}</span>
          <span className="text-[8px] text-muted-foreground">up</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingDown className="w-3 h-3 text-danger" />
          <span className="text-[10px] font-semibold text-danger">{losers}</span>
          <span className="text-[8px] text-muted-foreground">down</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
        <div
          className="h-full bg-success rounded-full transition-all"
          style={{ width: `${tokens.length ? (gainers / tokens.length) * 100 : 50}%` }}
        />
        <div
          className="h-full bg-danger rounded-full transition-all"
          style={{ width: `${tokens.length ? (losers / tokens.length) * 100 : 50}%` }}
        />
      </div>
    </div>
  );
}
