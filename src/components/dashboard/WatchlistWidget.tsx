import { useNavigate } from "react-router-dom";
import { Eye, ChevronRight } from "lucide-react";

export function WatchlistWidget() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/watchlists")}
      className="w-full flex items-center justify-between gap-2 group"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent/50 flex items-center justify-center">
          <Eye className="w-3.5 h-3.5 text-chart-cyan" />
        </div>
        <div className="text-left">
          <p className="text-[10px] font-semibold">Watchlists</p>
          <p className="text-[8px] text-muted-foreground">Track wallets & tokens</p>
        </div>
      </div>
      <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
    </button>
  );
}
