"use client";

import { useEffect, useState } from "react";

interface Props {
  score: number; // 0.0 – 1.0
  animate?: boolean;
  compact?: boolean;
}

export default function SimilarityBar({ score, animate = true, compact = false }: Props) {
  const [width, setWidth] = useState(0);
  const pct = Math.round(score * 100);

  useEffect(() => {
    if (!animate) {
      setWidth(pct);
      return;
    }
    const t = setTimeout(() => setWidth(pct), 60);
    return () => clearTimeout(t);
  }, [pct, animate]);

  const config =
    pct >= 80
      ? {
          gradient: "from-emerald-500 to-teal-400",
          glow: "shadow-emerald-500/30",
          text: "text-emerald-400",
          label: "High Match",
          dot: "bg-emerald-400",
        }
      : pct >= 60
      ? {
          gradient: "from-violet-500 to-indigo-400",
          glow: "shadow-violet-500/30",
          text: "text-violet-400",
          label: "Good Match",
          dot: "bg-violet-400",
        }
      : {
          gradient: "from-amber-500 to-orange-400",
          glow: "shadow-amber-500/30",
          text: "text-amber-400",
          label: "Possible Match",
          dot: "bg-amber-400",
        };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-700 ease-out`}
            style={{ width: `${width}%` }}
          />
        </div>
        <span className={`text-[11px] font-bold ${config.text}`}>{pct}%</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
          <span className="text-slate-400 font-medium">{config.label}</span>
        </div>
        <span className={`font-bold ${config.text}`}>{pct}%</span>
      </div>
      <div className="h-2 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${config.gradient} shadow-sm ${config.glow} transition-all duration-700 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

