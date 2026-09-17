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
  const [confirmedMap, setConfirmedMap] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`facefinder_confirmed_${sessionId}`);
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const handleConfirm = (filename: string, confirmed: boolean) => {
    setConfirmedMap((prev) => {
      const updated = { ...prev };
      if (updated[filename] === confirmed) {
        delete updated[filename];
      } else {
        updated[filename] = confirmed;
      }
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`facefinder_confirmed_${sessionId}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

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
          setTimeout(() => onComplete(), 1500);
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

  const [showResearchInsights, setShowResearchInsights] = useState(false);

  const liveMatches = status?.matched_images || [];
  const confirmedCount = Object.values(confirmedMap).filter((v) => v === true).length;
  const rejectedCount = Object.values(confirmedMap).filter((v) => v === false).length;

  // Information Retrieval Metrics calculation
  const truePositives = confirmedCount;
  const falsePositives = rejectedCount;
  const evaluatedCount = truePositives + falsePositives;
  const precisionPct = evaluatedCount > 0 ? Math.round((truePositives / evaluatedCount) * 100) : null;
  const estimatedRecallPct = liveMatches.length > 0 ? Math.round((truePositives / Math.max(1, truePositives + 1)) * 100) : null;
  const f1ScorePct =
    precisionPct && estimatedRecallPct && precisionPct + estimatedRecallPct > 0
      ? Math.round((2 * precisionPct * estimatedRecallPct) / (precisionPct + estimatedRecallPct))
      : null;

  const manualEstSecs =
    status?.manual_search_estimated_seconds ||
    (status?.total_images_discovered ? Math.round(status.total_images_discovered * 1.8) : null);
  const timeSaved =
    status?.time_saved_percent ??
    (manualEstSecs && manualEstSecs > elapsed ? Math.round(((manualEstSecs - elapsed) / manualEstSecs) * 100) : null);

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
            <div className="absolute inset-0 rounded-full border border-secondary/30 hud-radar-circle" />
            <div className="absolute inset-4 rounded-full border border-dashed border-primary/40 animate-spin hud-radar-dashed" style={{ animationDuration: "16s" }} />
            <div className="absolute inset-8 rounded-full border border-white/10 hud-radar-inner" />

            {/* Corner Brackets */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-secondary hud-radar-reticle" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-secondary hud-radar-reticle" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-secondary hud-radar-reticle" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-secondary hud-radar-reticle" />

            {/* Rotating Radar Sweep Gradient */}
            <div
              className="absolute inset-0 rounded-full animate-spin pointer-events-none opacity-40 conic-radar"
              style={{
                background: "conic-gradient(from 0deg, rgba(76, 215, 246, 0.4) 0deg, transparent 90deg)",
                animationDuration: "3s",
              }}
            />

            {/* Center Biometric Face Icon */}
            <div className="relative z-10 w-16 h-16 rounded-full bg-surface-container flex items-center justify-center border border-secondary text-secondary shadow-[0_0_20px_rgba(76,215,246,0.5)] hud-radar-center">
              <span className="material-symbols-outlined text-[32px] animate-pulse">face</span>
            </div>
          </div>

          {/* Progress Bar & Real-Time Status */}
          <div className="w-full max-w-lg space-y-2 mt-4">
            <div className="flex justify-between items-center text-xs font-mono gap-3">
              <span className="text-on-surface-variant font-medium truncate flex-1" title={status?.stage_message || status?.current_image || "Processing batch..."}>
                {status?.stage_message || status?.current_image || "Processing batch..."}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {status?.estimated_remaining_seconds !== null && status?.estimated_remaining_seconds !== undefined && status.estimated_remaining_seconds > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-[10px] font-bold">
                    <span className="material-symbols-outlined text-[12px] animate-pulse">timer</span>
                    {formatTime(Math.round(status.estimated_remaining_seconds))} left
                  </span>
                )}
                <span className="text-secondary font-bold text-sm">{progress}%</span>
              </div>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface-variant overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-tertiary via-cyan-400 to-secondary transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(76,215,246,0.6)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom 4 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="glass-panel rounded-xl p-4">
            <span className="font-mono text-[10px] uppercase text-on-surface-variant block">
              {(status?.total_images_scanned ?? 0) > 0 ? "Scanned Photos" : "Prepared Photos"}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-display text-2xl font-bold text-white">
                {(status?.total_images_scanned ?? 0) > 0
                  ? status?.total_images_scanned
                  : (status?.dataset_files_extracted ?? 0)}
              </span>
              <span className="text-xs text-outline font-mono">
                / {status?.total_images_discovered || status?.dataset_total_files || "--"}
              </span>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <span className="font-mono text-[10px] uppercase text-on-surface-variant block">Matches Found</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-display text-2xl font-bold text-tertiary neon-text-tertiary">
                {status?.matched_count ?? liveMatches.length}
              </span>
              <span className="material-symbols-outlined text-tertiary text-[16px]">check_circle</span>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <span className="font-mono text-[10px] uppercase text-on-surface-variant block">Active Model</span>
            <p className="font-mono text-xs font-bold text-primary truncate mt-2">
              ArcFace (Multi-Core)
            </p>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <span className="font-mono text-[10px] uppercase text-on-surface-variant block">Scan Time / Pace</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-xl font-bold text-white">{formatTime(elapsed)}</span>
              {status?.estimated_remaining_seconds ? (
                <span className="text-[10px] font-mono text-secondary">
                  (~{Math.round(status.estimated_remaining_seconds)}s left)
                </span>
              ) : null}
            </div>
          </div>
        </div>


        {/* Academic Benchmark & Efficiency Banner */}
        <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-tertiary/20 bg-tertiary/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-tertiary/20 border border-tertiary/40 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-tertiary text-[20px]">speed</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-white">Automated Retrieval vs Manual Search</span>
                {timeSaved && (
                  <span className="px-2 py-0.5 rounded-full bg-tertiary/20 text-tertiary text-[10px] font-mono font-bold">
                    {timeSaved}% Time Saved
                  </span>
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Manual scrolling baseline: ~{manualEstSecs ? formatTime(manualEstSecs) : "--"} vs AI retrieval: {formatTime(elapsed)}
                {evaluatedCount > 0 && ` | Precision: ${precisionPct}% | Est. F1-Score: ${f1ScorePct}%`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowResearchInsights((prev) => !prev)}
            className="text-xs font-mono text-secondary hover:text-white transition-colors flex items-center gap-1 flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">school</span>
            <span>{showResearchInsights ? "Hide Research Insights" : "Research Insights"}</span>
          </button>
        </div>

        {/* Expandable Research & Academic Insights Panel */}
        {showResearchInsights && (
          <div className="glass-panel rounded-xl p-5 border border-primary/30 bg-surface-container/60 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <h4 className="font-display text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">science</span>
                <span>Academic Research Principles (Gateri et al., JKUAT Study)</span>
              </h4>
              <span className="font-mono text-[10px] text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-full">
                Evaluation Mode
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                <span className="font-mono text-[10px] text-tertiary block font-bold">1. FEATURE EXTRACTION</span>
                <p className="text-on-surface-variant text-[11px] mt-1 leading-relaxed">
                  512-D deep vector representation via ArcFace. Landmark alignment guarantees orientation robustness without heavy brute-force image rotation.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                <span className="font-mono text-[10px] text-secondary block font-bold">2. COLOR-SPACE / ILLUMINATION</span>
                <p className="text-on-surface-variant text-[11px] mt-1 leading-relaxed">
                  Decouples luminance from chrominance (HSV/LAB). Normalizes lighting on underexposed event photos while preserving facial identity.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                <span className="font-mono text-[10px] text-primary block font-bold">3. INFORMATION RETRIEVAL METRICS</span>
                <p className="text-on-surface-variant text-[11px] mt-1 leading-relaxed">
                  Cosine Angular Distance: d = max(0, 1 - sim). Evaluated: {evaluatedCount} (Verified TP: {truePositives}, Dismissed FP: {falsePositives}).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live Discovered Candidates: "Is this you?" Verification Stream */}
        {liveMatches.length > 0 && (
          <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-tertiary/30 bg-surface-container/40 relative overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-ping" />
                  <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                    Live Found Matches ({liveMatches.length})
                  </h3>
                  {confirmedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-tertiary/20 text-tertiary text-xs font-mono font-bold border border-tertiary/40">
                      {confirmedCount} Verified
                    </span>
                  )}
                  {rejectedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-error/20 text-error text-xs font-mono font-bold border border-error/40">
                      {rejectedCount} Dismissed
                    </span>
                  )}
                </div>
                <p className="font-sans text-xs text-on-surface-variant mt-1">
                  Confirm your photos as they are scanned. Tap <strong className="text-tertiary">Yes</strong> or <strong className="text-error">No</strong>:
                </p>
              </div>

              <button
                type="button"
                onClick={() => onComplete()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-on-primary text-xs font-bold font-mono flex items-center gap-1.5 shadow-md hover:brightness-110 transition-all"
              >
                <span>View Full Results</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            {/* Scrollable Live Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 max-h-[440px] overflow-y-auto pr-1">
              {liveMatches.map((item, idx) => {
                const isConfirmed = confirmedMap[item.filename] === true;
                const isRejected = confirmedMap[item.filename] === false;
                const pct = item.confidence_percent || Math.round(item.similarity_score * 100);

                return (
                  <div
                    key={item.filename || idx}
                    className={`rounded-xl border transition-all overflow-hidden flex flex-col bg-surface-container/70 ${
                      isConfirmed
                        ? "border-tertiary ring-2 ring-tertiary/50 bg-tertiary/10"
                        : isRejected
                        ? "border-error/30 opacity-40 grayscale"
                        : "border-white/10 hover:border-primary/50"
                    }`}
                  >
                    <div className="relative aspect-square w-full bg-black/40 overflow-hidden">
                      <img
                        src={item.download_url}
                        alt={item.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Confidence Tag */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-mono text-tertiary font-bold">
                        {pct}% match
                      </div>

                      {isConfirmed && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-tertiary text-on-tertiary flex items-center gap-1 font-bold text-[10px] shadow-md font-mono">
                          <span>✓ ME</span>
                        </div>
                      )}
                      {isRejected && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-error text-white flex items-center gap-1 font-bold text-[10px] shadow-md font-mono">
                          <span>✕ NOT ME</span>
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 flex flex-col gap-2">
                      <p className="text-[11px] font-mono text-white truncate" title={item.filename}>
                        {item.filename}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => handleConfirm(item.filename, true)}
                          className={`flex-1 py-1 px-1.5 rounded text-[11px] font-mono font-semibold flex items-center justify-center gap-1 transition-colors ${
                            isConfirmed
                              ? "bg-tertiary text-on-tertiary font-bold"
                              : "bg-tertiary/20 text-tertiary hover:bg-tertiary/30 border border-tertiary/40"
                          }`}
                          title="Yes, this is me"
                        >
                          <span>✓ Yes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirm(item.filename, false)}
                          className={`flex-1 py-1 px-1.5 rounded text-[11px] font-mono font-semibold flex items-center justify-center gap-1 transition-colors ${
                            isRejected
                              ? "bg-error text-white font-bold"
                              : "bg-white/5 text-on-surface-variant hover:bg-error/20 hover:text-error border border-white/10"
                          }`}
                          title="Not me"
                        >
                          <span>✕ No</span>
                        </button>
                        <a
                          href={item.download_url}
                          download={item.filename}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded bg-white/5 hover:bg-primary/20 text-on-surface-variant hover:text-primary transition-colors"
                          title="Download Image"
                        >
                          <span className="material-symbols-outlined text-[15px]">download</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
