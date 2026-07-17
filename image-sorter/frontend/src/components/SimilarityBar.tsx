"use client";

import { useEffect, useState } from "react";

interface Props {
  score: number; // 0.0 – 1.0
  animate?: boolean;
}

export default function SimilarityBar({ score, animate = true }: Props) {
  const [width, setWidth] = useState(0);
  const pct = Math.round(score * 100);

  useEffect(() => {
    if (!animate) {
      setWidth(pct);
      return;
    }
    // Stagger the bar animation by a small delay for visual delight
    const t = setTimeout(() => setWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct, animate]);

  const color =
    pct >= 80
      ? "from-emerald-500 to-green-400"
      : pct >= 60
      ? "from-violet-500 to-indigo-400"
      : "from-amber-500 to-yellow-400";

  const label =
    pct >= 80 ? "Strong match" : pct >= 60 ? "Good match" : "Possible match";

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-bold text-gray-700">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
