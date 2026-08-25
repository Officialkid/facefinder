"use client";

import { useEffect, useState } from "react";
import { ImageSorterAPI, SessionError, StatusResponse } from "@/lib/api";

interface Props {
  sessionId: string;
  onComplete: () => void;
  onFailed: (error: SessionError | null) => void;
}

const CHECKPOINTS = [
  { id: 1, title: "1. Image Normalization", desc: "Resolution & lighting fixed." },
  { id: 2, title: "2. Face Detection", desc: "MTCNN localized faces." },
  { id: 3, title: "3. Landmark Alignment", desc: "68-point spatial mapping." },
  { id: 4, title: "4. Quality Filtering", desc: "Blur & occlusion rejected." },
  { id: 5, title: "5. Feature Extraction", desc: "Deep topology mapping." },
  { id: 6, title: "6. Vector Embedding", desc: "Generating 512-D tensors..." },
  { id: 7, title: "7. Cosine Distance Matching", desc: "Comparing angular distance." },
  { id: 8, title: "8. Result Clustering", desc: "Aggregating candidate matches." },
];

export default function ProcessingStatus({ sessionId, onComplete, onFailed }: Props) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const data = await ImageSorterAPI.getStatus(sessionId);
        setStatus(data);

        if (data.status === "completed") {
          clearInterval(intervalId);
          setTimeout(() => onComplete(), 800);
        } else if (data.status === "failed" || data.status === "expired") {
          clearInterval(intervalId);
          onFailed(data.error ?? null);
        }
      } catch (err) {
        console.error("Status poll failed:", err);
      }
    };

    checkStatus();
    intervalId = setInterval(checkStatus, 1500);

    return () => clearInterval(intervalId);
  }, [sessionId, onComplete, onFailed]);

  const progress = status ? Math.min(100, Math.max(10, Math.round(status.progress_percent))) : 15;
  const currentStageIndex = Math.min(
    CHECKPOINTS.length,
    Math.max(1, Math.floor((progress / 100) * CHECKPOINTS.length))
  );

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6">
      {/* Left Sidebar: Vertical Pipeline */}
      <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
        <div className="glass-panel rounded-xl p-5 h-full flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

          <h3 className="font-headline text-base text-white mb-5 flex items-center gap-2.5 font-bold">
            <span className="material-symbols-outlined text-secondary text-[20px]">memory</span>
            <span>Processing Pipeline</span>
          </h3>

          <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1 relative z-10">
            {CHECKPOINTS.map((cp) => {
              const isPast = cp.id < currentStageIndex;
              const isCurrent = cp.id === currentStageIndex;

              return (
                <div
                  key={cp.id}
                  className={`flex items-start gap-3 transition-all ${
                    isCurrent
                      ? "p-2.5 -mx-1.5 rounded-lg bg-primary/10 border border-primary/30"
                      : isPast
                      ? "opacity-90 hover:opacity-100"
                      : "opacity-40"
                  }`}
                >
                  {isPast ? (
                    <div className="w-5 h-5 rounded-full bg-tertiary-container flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_10px_rgba(0,165,114,0.4)]">
                      <span className="material-symbols-outlined text-[13px] text-on-tertiary-container font-bold">
                        check
                      </span>
                    </div>
                  ) : isCurrent ? (
                    <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-outline-variant flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p
                      className={`font-mono text-xs font-semibold ${
                        isCurrent
                          ? "text-primary neon-text-primary"
                          : isPast
                          ? "text-tertiary"
                          : "text-outline"
                      }`}
                    >
                      {cp.title}
                    </p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">
                      {isCurrent ? "Executing..." : isPast ? cp.desc : "Pending..."}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Center Area: Radar Cockpit */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Top Horizontal Mini-Tracker */}
        <div className="glass-panel rounded-xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[18px]">check_circle</span>
            <span className="font-mono text-xs text-on-surface">Upload &amp; Parse</span>
          </div>
          <div className="h-[1px] w-6 sm:w-12 bg-tertiary/40" />
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[18px]">check_circle</span>
            <span className="font-mono text-xs text-on-surface">Pre-processing</span>
          </div>
          <div className="h-[1px] w-6 sm:w-12 bg-primary/40" />
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px] animate-pulse">psychology</span>
            <span className="font-mono text-xs text-primary font-bold neon-text-primary">AI Recognition</span>
          </div>
          <div className="h-[1px] w-6 sm:w-12 bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 opacity-50">
            <span className="material-symbols-outlined text-outline text-[18px]">summarize</span>
            <span className="font-mono text-xs text-outline">Report Gen</span>
          </div>
        </div>

        {/* Center Scanner Panel */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-[360px]">
          {/* Live Scan Active Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-semibold bg-secondary/10 border border-secondary/40 text-secondary mb-4 glow-pulse">
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
            <span>@ LIVE SCAN ACTIVE</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white text-center mb-2 tracking-tight">
            Deep Neural Scan
          </h2>
          <p className="font-sans text-xs sm:text-sm text-on-surface-variant text-center mb-8 max-w-md">
            Comparing 512-D embeddings across event photos in memory.
          </p>

          {/* Central Animated HUD Biometric Radar Reticle */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center my-4">
            {/* Outer radar circle */}
            <div className="absolute inset-0 rounded-full border border-secondary/30" />
            <div className="absolute inset-4 rounded-full border border-dashed border-primary/40 animate-spin" style={{ animationDuration: "16s" }} />
            <div className="absolute inset-8 rounded-full border border-white/10" />

            {/* Corner Brackets */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-secondary" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-secondary" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-secondary" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-secondary" />

            {/* Rotating Radar Sweep Gradient */}
            <div
              className="absolute inset-0 rounded-full animate-spin pointer-events-none opacity-40"
              style={{
                background: "conic-gradient(from 0deg, rgba(76, 215, 246, 0.4) 0deg, transparent 90deg)",
                animationDuration: "3s",
              }}
            />

            {/* Center Biometric Face Icon */}
            <div className="relative z-10 w-16 h-16 rounded-full bg-surface-container flex items-center justify-center border border-secondary text-secondary shadow-[0_0_20px_rgba(76,215,246,0.5)]">
              <span className="material-symbols-outlined text-[32px] animate-pulse">face</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-md space-y-2 mt-4">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-on-surface-variant">
                {status?.stage_message || status?.current_image || "Processing batch..."}
              </span>
              <span className="text-secondary font-bold">{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-variant overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-tertiary to-secondary transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(76,215,246,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom 4 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="glass-panel rounded-xl p-4">
            <span className="font-mono text-[10px] uppercase text-on-surface-variant block">Scanned Photos</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-display text-2xl font-bold text-white">{status?.total_images_scanned ?? 0}</span>
              <span className="text-xs text-outline font-mono">/ {status?.total_images_discovered ?? "--"}</span>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <span className="font-mono text-[10px] uppercase text-on-surface-variant block">Matches Found</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-display text-2xl font-bold text-tertiary neon-text-tertiary">
                {status?.matched_count ?? 0}
              </span>
              <span className="material-symbols-outlined text-tertiary text-[16px]">check_circle</span>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <span className="font-mono text-[10px] uppercase text-on-surface-variant block">Active Model</span>
            <p className="font-mono text-xs font-bold text-primary truncate mt-2">
              ArcFace ResNet-50
            </p>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <span className="font-mono text-[10px] uppercase text-on-surface-variant block">Elapsed Time</span>
            <p className="font-mono text-xl font-bold text-white mt-1">{formatTime(elapsed)}</p>
          </div>
        </div>

        {/* Privacy First Info Banner */}
        <div className="glass-panel rounded-xl p-4 flex items-start gap-3 border border-secondary/20 bg-secondary/5">
          <span className="material-symbols-outlined text-secondary text-[20px] flex-shrink-0 mt-0.5">info</span>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            <strong className="text-secondary font-semibold">Privacy First:</strong> Cosine angular distance ensures high precision matching while vectors remain ephemeral and privacy-compliant. No facial data is stored persistently.
          </p>
        </div>
      </div>
    </div>
  );
}
