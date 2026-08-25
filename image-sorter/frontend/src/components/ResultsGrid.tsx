"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageSorterAPI, MatchedImage, ResultsResponse } from "@/lib/api";

interface Props {
  sessionId: string;
  referencePreview: string;
  onReset: () => void;
}

type SortMode = "similarity" | "filename";
type FilterMode = "all" | "80" | "70";

export default function ResultsGrid({ sessionId, referencePreview, onReset }: Props) {
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("similarity");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedMatch, setSelectedMatch] = useState<MatchedImage | null>(null);
  const [confirmedMatches, setConfirmedMatches] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await ImageSorterAPI.getResults(sessionId);
        setResults(data);
      } catch (err: any) {
        setError("Failed to retrieve matched results. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);

  const filteredMatches = useMemo(() => {
    if (!results?.matched_images) return [];

    let list = [...results.matched_images];

    // Filter
    if (filterMode === "80") {
      list = list.filter((m) => (1 - m.similarity_score) >= 0.8);
    } else if (filterMode === "70") {
      list = list.filter((m) => (1 - m.similarity_score) >= 0.7);
    }

    // Sort
    if (sortMode === "similarity") {
      list.sort((a, b) => a.similarity_score - b.similarity_score);
    } else if (sortMode === "filename") {
      list.sort((a, b) => a.filename.localeCompare(b.filename));
    }

    return list;
  }, [results, filterMode, sortMode]);

  const topMatchPercent = useMemo(() => {
    if (!results?.matched_images?.length) return 0;
    const bestDist = Math.min(...results.matched_images.map((m) => m.similarity_score));
    return Math.round((1 - bestDist) * 100);
  }, [results]);

  const avgMatchPercent = useMemo(() => {
    if (!results?.matched_images?.length) return 0;
    const avgDist =
      results.matched_images.reduce((acc, m) => acc + m.similarity_score, 0) /
      results.matched_images.length;
    return Math.round((1 - avgDist) * 100);
  }, [results]);

  const handleToggleConfirm = (filename: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmedMatches((prev) => ({
      ...prev,
      [filename]: !prev[filename],
    }));
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
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="font-mono text-sm text-secondary">Aggregating matched biometric vectors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 glass-panel rounded-2xl text-center space-y-4 border-error/40">
        <span className="material-symbols-outlined text-[36px] text-error">error</span>
        <p className="text-sm font-bold text-error">{error}</p>
        <button onClick={onReset} className="gradient-button text-white px-6 py-2.5 rounded-lg font-mono text-xs font-bold">
          Start New Search
        </button>
      </div>
    );
  }

  const matchCount = filteredMatches.length;

  return (
    <div className="w-full space-y-8">
      {/* Top Header & Stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-tertiary-container/30 border border-tertiary-fixed-dim/40 text-tertiary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
              Scan Complete
            </span>
            <span className="font-mono text-xs text-on-surface-variant">
              Session: {sessionId ? `FF-AI-${sessionId.slice(0, 5).toUpperCase()}` : "FF-AI-9928X"}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Found {matchCount} Matching {matchCount === 1 ? "Photo" : "Photos"}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg bg-surface-container border border-white/10 hover:border-secondary/40 text-white font-mono text-xs transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>New Search</span>
          </button>

          {matchCount > 0 && (
            <button
              onClick={handleDownloadAll}
              className="gradient-button text-white px-5 py-2 rounded-lg font-mono text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">folder_zip</span>
              <span>Download All Matches (ZIP)</span>
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
              {results?.total_images_scanned ?? results?.matched_images?.length ?? 0}
            </p>
            <span className="font-mono text-[10px] text-on-surface-variant">Dataset images analyzed</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between bg-surface-container-low/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase text-outline">Top Match Score</span>
            <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-tertiary neon-text-tertiary">
              {topMatchPercent}%
            </p>
            <span className="font-mono text-[10px] text-on-surface-variant">Highest similarity rank</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between bg-surface-container-low/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase text-outline">Avg Similarity</span>
            <span className="material-symbols-outlined text-primary text-[18px]">analytics</span>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-primary neon-text-primary">
              {avgMatchPercent}%
            </p>
            <span className="font-mono text-[10px] text-on-surface-variant">Across candidate pool</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between bg-surface-container-low/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase text-outline">Verified by You</span>
            <span className="material-symbols-outlined text-secondary text-[18px]">how_to_reg</span>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-white">
              {Object.values(confirmedMatches).filter(Boolean).length} / {matchCount}
            </p>
            <span className="font-mono text-[10px] text-on-surface-variant">Confirmed identities</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Sort & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl glass-panel bg-surface-container-low/40">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-outline">Filter by Cutoff:</span>
          <div className="inline-flex rounded-lg bg-surface-container p-0.5 border border-white/5 font-mono text-xs">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1 rounded-md transition-all ${
                filterMode === "all" ? "bg-secondary text-surface font-bold shadow-sm" : "text-on-surface-variant hover:text-white"
              }`}
            >
              All ({results?.matched_images?.length ?? 0})
            </button>
            <button
              onClick={() => setFilterMode("80")}
              className={`px-3 py-1 rounded-md transition-all ${
                filterMode === "80" ? "bg-secondary text-surface font-bold shadow-sm" : "text-on-surface-variant hover:text-white"
              }`}
            >
              &gt;80%
            </button>
            <button
              onClick={() => setFilterMode("70")}
              className={`px-3 py-1 rounded-md transition-all ${
                filterMode === "70" ? "bg-secondary text-surface font-bold shadow-sm" : "text-on-surface-variant hover:text-white"
              }`}
            >
              &gt;70%
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-outline">Sort by:</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="bg-surface-container border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-secondary"
          >
            <option value="similarity">Highest Similarity</option>
            <option value="filename">Filename (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 3-Column Matched Photo Grid */}
      {matchCount === 0 ? (
        <div className="p-12 text-center glass-panel rounded-2xl space-y-3">
          <span className="material-symbols-outlined text-[48px] text-outline">search_off</span>
          <h3 className="text-lg font-bold text-white">No Matching Photos Found</h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">
            Try adjusting your sensitivity slider to a broader threshold (e.g. 0.50) or verify that the album contains clear, well-lit photos.
          </p>
          <button
            onClick={onReset}
            className="mt-4 px-6 py-2.5 rounded-lg gradient-button text-white font-mono text-xs font-bold"
          >
            Adjust Parameters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map((match, idx) => {
            const matchPercent = Math.round((1 - match.similarity_score) * 100);
            const isConfirmed = confirmedMatches[match.filename] ?? false;

            return (
              <div
                key={match.filename || idx}
                className={`group relative rounded-xl overflow-hidden glass-panel border transition-all duration-300 flex flex-col bg-surface-container/60 shadow-md ${
                  isConfirmed ? "border-tertiary shadow-[0_0_15px_rgba(78,222,163,0.25)]" : "border-white/10 hover:border-secondary/50"
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
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-surface-container/90 backdrop-blur-md border border-white/10 text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                      {matchPercent}% Match
                    </span>
                    <span className="px-2 py-1 rounded-full text-[10px] font-mono font-bold bg-surface-container/80 backdrop-blur-md text-outline">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* User Verified Status Chip */}
                  {isConfirmed && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-tertiary text-surface text-[10px] font-mono font-bold flex items-center gap-1 shadow-md">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      Confirmed You
                    </div>
                  )}

                  {/* Hover Actions Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                    <button
                      onClick={() => setSelectedMatch(match)}
                      className="px-3.5 py-2 rounded-lg bg-surface/90 hover:bg-white text-surface text-xs font-mono font-bold transition-all flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">compare</span>
                      <span>Compare</span>
                    </button>
                    <button
                      onClick={() => handleDownloadSingle(match)}
                      className="p-2 rounded-lg bg-secondary text-surface hover:bg-white transition-all"
                      title="Download Photo"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </button>
                  </div>
                </div>

                {/* Card Details & Confirm Verification */}
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

                  {/* Similarity track */}
                  <div className="w-full h-1 rounded-full bg-surface-variant overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-tertiary to-secondary rounded-full" style={{ width: `${matchPercent}%` }} />
                  </div>

                  {/* Confirm if this is you button */}
                  <button
                    onClick={(e) => handleToggleConfirm(match.filename, e)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isConfirmed
                        ? "bg-tertiary-container/30 border border-tertiary-fixed-dim/60 text-tertiary"
                        : "bg-surface-container border border-white/10 hover:border-secondary/40 text-on-surface-variant hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {isConfirmed ? "check" : "thumb_up"}
                    </span>
                    <span>{isConfirmed ? "Confirmed: This is Me" : "Confirm if this is you"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Side-by-Side Verification Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-3xl glass-panel-glow rounded-2xl p-6 border border-primary/40 space-y-6 shadow-2xl overflow-hidden">
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
                className="p-1.5 rounded-lg bg-surface border border-white/10 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
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
                    {selectedMatch.similarity_score.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-outline uppercase block">Confidence</span>
                  <span className="font-mono text-base font-bold text-tertiary neon-text-tertiary">
                    {Math.round((1 - selectedMatch.similarity_score) * 100)}%
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-outline uppercase block">User Feedback</span>
                  <button
                    onClick={() => handleToggleConfirm(selectedMatch.filename)}
                    className={`mt-0.5 px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1 transition-all ${
                      confirmedMatches[selectedMatch.filename]
                        ? "bg-tertiary text-surface"
                        : "bg-surface-container border border-white/10 text-on-surface-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      {confirmedMatches[selectedMatch.filename] ? "check" : "add"}
                    </span>
                    <span>{confirmedMatches[selectedMatch.filename] ? "Confirmed Me" : "Confirm Match"}</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleDownloadSingle(selectedMatch)}
                className="gradient-button text-white px-5 py-2.5 rounded-lg font-mono text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Download Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
