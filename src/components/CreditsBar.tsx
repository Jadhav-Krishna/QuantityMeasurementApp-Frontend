import { Coins, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

type CreditsBarProps = {
  credits: number;
  loading?: boolean;
  isGuest?: boolean;
};

export function CreditsBar({ credits, loading = false, isGuest = false }: CreditsBarProps) {
  const navigate = useNavigate();
  const exhausted = credits <= 0;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
        isGuest
          ? exhausted
            ? "bg-amber-100 text-amber-900"
            : "bg-amber-100 text-amber-950"
          : exhausted
          ? "bg-rose-100 text-rose-700"
          : credits <= 2
            ? "bg-amber-100 text-amber-700"
            : "bg-white/20 text-white"
      }`}
    >
      <Coins className="h-4 w-4 shrink-0" />
      {loading ? (
        <span>Loading...</span>
      ) : (
        <span>
          {isGuest
            ? `Guest Credits: ${credits}/5`
            : `Credits: ${credits}`}
        </span>
      )}
      <button
        type="button"
        onClick={() => void navigate(isGuest ? "/auth?returnTo=/recharge" : "/recharge")}
        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition ${
          isGuest
            ? "bg-amber-900 text-white hover:bg-amber-950"
            : exhausted
            ? "bg-rose-600 text-white hover:bg-rose-700"
            : "bg-white/25 hover:bg-white/35"
        }`}
      >
        <Zap className="h-3 w-3" />
        {isGuest ? "Login to Recharge" : exhausted ? "Recharge Now" : "Recharge"}
      </button>
    </div>
  );
}
