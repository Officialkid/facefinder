"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageSorterAPI, MatchedImage, ResultsResponse } from "@/lib/api";

interface Props {
  sessionId: string;
  referencePreview: string;
  onReset: () => void;
}

type SortMode = "similarity" | "filename";
type TabMode = "verified" | "candidates";

export default function ResultsGrid({ sessionId, referencePreview, onReset }: Props) {
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabMode>("verified");
  const [sortMode, setSortMode] = useState<SortMode>("similarity");
  const [selectedMatch, setSelectedMatch] = useState<MatchedImage | null>(null);
  const [confirmingFile, setConfirmingFile] = useState<string | null>(null);

  const [confirmedMatches, setConfirmedMatches] = useState<Record<string, boolean>>(() => {
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

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await ImageSorterAPI.getResults(sessionId);
        setResults(data);
        const confirmedCount = data.matched_images?.length ?? 0;
        const candidateCount = data.candidate_images?.length ?? 0;
        if (confirmedCount === 0 && candidateCount > 0) {
          setActiveTab("candidates");
        }
      } catch (err: any) {
        setError("Failed to retrieve matched results. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);

  const verifiedMatches = useMemo(() => {
    if (!results?.matched_images) return [];
    let list = [...results.matched_images];
    if (sortMode === "similarity") {
      list.sort((a, b) => b.similarity_score - a.similarity_score);
    } else {
      list.sort((a, b) => a.filename.localeCompare(b.filename));
    }
    return list;
  }, [results?.matched_images, sortMode]);

  const candidateMatches = useMemo(() => {
    if (!results?.candidate_images) return [];
    let list = [...results.candidate_images];
    if (sortMode === "similarity") {
      list.sort((a, b) => b.similarity_score - a.similarity_score);
    } else {
      list.sort((a, b) => a.filename.localeCompare(b.filename));
    }
    return list;
  }, [results?.candidate_images, sortMode]);

  const activeList = activeTab === "verified" ? verifiedMatches : candidateMatches;

  const topMatchPercent = useMemo(() => {
    const all = [...(results?.matched_images || []), ...(results?.candidate_images || [])];
    if (!all.length) return 0;
    const bestSim = Math.max(...all.map((m) => m.similarity_score));
    return Math.round(bestSim * 100);
  }, [results]);

  const avgMatchPercent = useMemo(() => {
    const all = [...(results?.matched_images || []), ...(results?.candidate_images || [])];
    if (!all.length) return 0;
    const avgSim = all.reduce((acc, m) => acc + m.similarity_score, 0) / all.length;
    return Math.round(avgSim * 100);
  }, [results]);

  const handleConfirmCandidate = async (match: MatchedImage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmingFile(match.filename);

    try {
      await ImageSorterAPI.confirmCandidateMatches(sessionId, [match.filename]);

      setResults((prev) => {
        if (!prev) return prev;
        const remainingCandidates = (prev.candidate_images || []).filter(
          (c) => c.filename !== match.filename
        );
        const promotedMatch: MatchedImage = {
          ...match,
          match_tier: "confirmed",
          confidence_label: "confirmed_by_user",
          match_reason: "Confirmed by user verification.",
        };
        const updatedMatched = [...(prev.matched_images || []), promotedMatch];

        return {
          ...prev,
          matched_images: updatedMatched,
          candidate_images: remainingCandidates,
          matched_count: updatedMatched.length,
          candidate_count: remainingCandidates.length,
        };
      });

      setConfirmedMatches((prev) => {
        const next = { ...prev, [match.filename]: true };
        try {
          localStorage.setItem(`facefinder_confirmed_${sessionId}`, JSON.stringify(next));
        } catch {}
        return next;
      });
    } catch (err) {
      console.error("Failed confirming match:", err);
    } finally {
      setConfirmingFile(null);
    }
  };

  const handleDismissCandidate = (filename: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setResults((prev) => {
      if (!prev) return prev;
      const remaining = (prev.candidate_images || []).filter((c) => c.filename !== filename);
      return {
        ...prev,
        candidate_images: remaining,
        candidate_count: remaining.length,
      };
    });
  };

  const handleDownloadAll = () => {
    const url = ImageSorterAPI.getDownloadAllUrl(sessionId);
    window.open(url, "_blank");
  };

  const handleDownloadSingle = (match: MatchedImage) => {
    const url = ImageSorterAPI.getDownloadUrl(sessionId, match.relative_path || match.filename);
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="font-mono text-sm text-secondary animate-pulse">Aggregating matched biometric vectors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 glass-panel rounded-2xl text-center space-y-4 border-error/40 max-w-xl mx-auto">
        <span className="material-symbols-outlined text-[42px] text-error">error</span>
        <p className="text-sm font-bold text-error">{error}</p>
        <button onClick={onReset} className="gradient-button text-white px-6 py-2.5 rounded-lg font-mono text-xs font-bold">
          Start New Search
        </button>
      </div>
    );
  }

  const verifiedCount = verifiedMatches.length;
  const candidateCount = candidateMatches.length;
  const totalFound = verifiedCount + candidateCount;

  return (
    <div className="w-full space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-tertiary-container/30 border border-tertiary-fixed-dim/40 text-tertiary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
              Scan Complete
            </span>
            <span className="font-mono text-xs text-on-surface-variant">
              Session: {sessionId ? `FF-${sessionId.slice(0, 8).toUpperCase()}` : "FF-LIVE"}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Found {totalFound} Potential {totalFound === 1 ? "Photo" : "Photos"}
          </h2>
          <p className="text-xs text-on-surface-variant pt-0.5">
            {verifiedCount} verified with high similarity, {candidateCount} candidates available for confirmation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg bg-surface-container border border-white/10 hover:border-secondary/40 text-white font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>New Search</span>
          </button>

          {verifiedCount > 0 && (
            <button
              onClick={handleDownloadAll}
              className="gradient-button text-white px-5 py-2.5 rounded-lg font-mono text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">folder_zip</span>
              <span>Download Verified ZIP ({verifiedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between bg-surface-container-low/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase text-outline">Total Scanned</span>
            <span className="material-symbols-outlined text-secondary text-[18px]">photo_library</span>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-white">
              {results?.total_images_scanned ?? 0}
            </p>
            <span className="font-mono text-[10px] text-on-surface-variant">Dataset images analyzed</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between bg-surface-container-low/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase text-outline">Top Similarity</span>
            <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-tertiary neon-text-tertiary">
              {topMatchPercent}%
            </p>
            <span className="font-mono text-[10px] text-on-surface-variant">Highest biometric score</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between bg-surface-container-low/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase text-outline">Verified Matches</span>
            <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-primary neon-text-primary">
              {verifiedCount}
            </p>
            <span className="font-mono text-[10px] text-on-surface-variant">High-confidence matches</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between bg-surface-container-low/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase text-outline">Review Needed</span>
            <span className="material-symbols-outlined text-secondary text-[18px]">help_outline</span>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-secondary">
              {candidateCount}
            </p>
            <span className="font-mono text-[10px] text-on-surface-variant">Candidate cards to confirm</span>
          </div>
        </div>
      </div>

      {/* Primary Section Switcher Tabs & Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl glass-panel bg-surface-container-low/40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("verified")}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "verified"
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "bg-surface-container text-on-surface-variant hover:text-white border border-white/10"
            }`}
          >
            <span className="material-symbols-outlined text-sm">verified</span>
            <span>Verified Matches</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white">
              {verifiedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("candidates")}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "candidates"
                ? "bg-secondary text-surface shadow-lg shadow-secondary/30"
                : "bg-surface-container text-on-surface-variant hover:text-white border border-white/10"
            }`}
          >
            <span className="material-symbols-outlined text-sm">psychology</span>
            <span>Candidates ("Is this you?")</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-current">
              {candidateCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-outline">Sort:</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="bg-surface-container border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-secondary"
          >
            <option value="similarity">Highest Similarity First</option>
            <option value="filename">Filename (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Grid of Images */}
      {activeList.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-2xl space-y-3">
          <span className="material-symbols-outlined text-[48px] text-outline">
            {activeTab === "verified" ? "task_alt" : "search_off"}
          </span>
          <h3 className="text-lg font-bold text-white">
            {activeTab === "verified" ? "No High-Confidence Matches Yet" : "No Pending Candidates"}
          </h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">
            {activeTab === "verified" && candidateCount > 0
              ? "We found candidate photos with moderate similarity! Switch to the 'Candidates' tab to confirm which photos are you."
              : "All photos have been processed."}
          </p>
          {activeTab === "verified" && candidateCount > 0 && (
            <button
              onClick={() => setActiveTab("candidates")}
              className="mt-4 px-6 py-2.5 rounded-lg gradient-button text-white font-mono text-xs font-bold"
            >
              Review {candidateCount} Candidates Now
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeList.map((match, idx) => {
            const matchPercent = Math.round((1 - match.similarity_score) * 100);
            const isConfirmed = confirmedMatches[match.filename] ?? (match.match_tier === "confirmed");
            const isCandidate = match.match_tier === "candidate";

            return (
              <div
                key={match.filename || idx}
                className={`group relative rounded-xl overflow-hidden glass-panel border transition-all duration-300 flex flex-col bg-surface-container/60 shadow-md ${
                  isCandidate
                    ? "border-secondary/40 hover:border-secondary shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    : isConfirmed
                    ? "border-tertiary shadow-[0_0_15px_rgba(78,222,163,0.25)]"
                    : "border-white/10 hover:border-secondary/50"
                }`}
              >
                {/* Photo Preview Container */}
                <div className="relative aspect-[4/3] bg-surface-container-lowest overflow-hidden">
                  <img
                    src={match.preview_url || ImageSorterAPI.getImageUrl(sessionId, match.relative_path || match.filename)}
                    alt={match.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold backdrop-blur-md border flex items-center gap-1 ${
                      isCandidate
                        ? "bg-secondary/90 text-surface border-secondary font-bold"
                        : "bg-surface-container/90 border-white/10 text-white"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isCandidate ? "bg-surface" : "bg-secondary"} animate-pulse`} />
                      {matchPercent}% Match
                    </span>
                    <span className="px-2 py-1 rounded-full text-[10px] font-mono font-bold bg-surface-container/80 backdrop-blur-md text-outline">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Candidate / Confirmed Status Tag */}
                  <div className="absolute top-2.5 right-2.5">
                    {isCandidate ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary/90 text-surface text-[10px] font-mono font-bold shadow">
                        Review Needed
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-tertiary text-surface text-[10px] font-mono font-bold shadow flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">check</span>
                        Verified
                      </span>
                    )}
                  </div>

                  {/* Hover Actions Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                    <button
                      onClick={() => setSelectedMatch(match)}
                      className="px-3.5 py-2 rounded-lg bg-surface/90 hover:bg-white text-surface text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">compare</span>
                      <span>Compare</span>
                    </button>
                    <button
                      onClick={() => handleDownloadSingle(match)}
                      className="p-2 rounded-lg bg-secondary text-surface hover:bg-white transition-all cursor-pointer"
                      title="Download Photo"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </button>
                  </div>
                </div>

                {/* Card Details & Action Buttons */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="font-mono text-xs font-bold text-white truncate" title={match.filename}>
                      {match.filename}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-outline">
                      <span>Cos Dist: {match.similarity_score.toFixed(3)}</span>
                      <span>{match.source_group || "Event Photo"}</span>
                    </div>
                  </div>

                  {/* Similarity Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-surface-variant overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isCandidate
                          ? "bg-gradient-to-r from-cyan-400 to-blue-500"
                          : "bg-gradient-to-r from-emerald-400 to-cyan-400"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(10, matchPercent))}%` }}
                    />
                  </div>

                  {/* Interactive Verification Buttons */}
                  {isCandidate ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={(e) => handleConfirmCandidate(match, e)}
                        disabled={confirmingFile === match.filename}
                        className="flex-1 py-2 px-3 rounded-lg bg-secondary text-surface hover:bg-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-secondary/20 cursor-pointer active:scale-95"
                      >
                        {confirmingFile === match.filename ? (
                          <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[15px]">thumb_up</span>
                            <span>Yes, that's me!</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDismissCandidate(match.filename, e)}
                        className="py-2 px-3 rounded-lg bg-surface-container border border-white/10 hover:border-error/40 hover:text-error text-on-surface-variant font-mono text-xs transition-colors cursor-pointer"
                        title="Dismiss"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1 text-xs font-mono text-tertiary">
                      <span className="flex items-center gap-1 font-bold">
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        <span>Included in Download</span>
                      </span>
                      <button
                        onClick={() => handleDownloadSingle(match)}
                        className="text-secondary hover:text-white underline cursor-pointer"
                      >
                        Save Photo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Side-by-Side Verification Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-3xl glass-panel rounded-2xl p-6 border border-primary/40 space-y-6 shadow-2xl overflow-hidden bg-surface-container-high/95">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">compare</span>
                </div>
                <div>
                  <h3 className="font-headline text-lg font-bold text-white">Side-by-Side Comparison</h3>
                  <p className="font-mono text-xs text-on-surface-variant">Biometric similarity verification</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="p-1.5 rounded-lg bg-surface border border-white/10 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <span className="font-mono text-[11px] uppercase tracking-widest text-on-surface-variant block">Reference Portrait</span>
                <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-primary/50 bg-surface-container-lowest">
                  <img src={referencePreview} alt="Reference" className="w-full h-full object-cover" />
                  <div className="absolute inset-3 border border-dashed border-primary/60 rounded-lg pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <span className="font-mono text-[11px] uppercase tracking-widest text-on-surface-variant block">Matched Photo ({selectedMatch.filename})</span>
                <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-secondary/50 bg-surface-container-lowest">
                  <img
                    src={selectedMatch.preview_url || ImageSorterAPI.getImageUrl(sessionId, selectedMatch.relative_path || selectedMatch.filename)}
                    alt="Matched Photo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-3 border border-dashed border-secondary/60 rounded-lg pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container/60 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="font-mono text-[10px] text-outline uppercase block">Cosine Distance</span>
                  <span className="font-mono text-base font-bold text-secondary">
                    {selectedMatch.distance !== undefined ? selectedMatch.distance.toFixed(4) : (1 - selectedMatch.similarity_score).toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-outline uppercase block">Match Confidence</span>
                  <span className="font-mono text-base font-bold text-tertiary neon-text-tertiary">
                    {selectedMatch.confidence_percent ?? Math.round((1 - selectedMatch.similarity_score) * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {selectedMatch.match_tier === "candidate" && (
                  <button
                    onClick={() => {
                      handleConfirmCandidate(selectedMatch);
                      setSelectedMatch(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-secondary text-surface font-mono text-xs font-bold hover:bg-white transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">thumb_up</span>
                    <span>Confirm as Me</span>
                  </button>
                )}
                <button
                  onClick={() => handleDownloadSingle(selectedMatch)}
                  className="gradient-button text-white px-5 py-2.5 rounded-lg font-mono text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Download Photo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
