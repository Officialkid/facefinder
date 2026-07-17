"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getApiErrorMessage,
  ImageSorterAPI,
  MatchedImage,
  ResultsResponse,
} from "@/lib/api";
import SimilarityBar from "./SimilarityBar";

interface Props {
  sessionId: string;
  referencePreview: string;
  onReset: () => void;
}

type SortMode = "score" | "name";

function getMatchBadge(score: number) {
  const pct = Math.round(score * 100);
  if (pct >= 85) {
    return {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      label: "High match",
      icon: "✓",
    };
  }
  if (pct >= 65) {
    return {
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      label: "Good match",
      icon: "!",
    };
  }
  return {
    tone: "border-orange-200 bg-orange-50 text-orange-700",
    label: "Possible match",
    icon: "?",
  };
}

export default function ResultsGrid({ sessionId, referencePreview, onReset }: Props) {
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortMode>("score");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await ImageSorterAPI.getResults(sessionId);
        setResults(data);
      } catch (error) {
        setError(getApiErrorMessage(error, "Failed to load results."));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [sessionId]);

  const handleDownload = async (image: MatchedImage) => {
    setDownloading((prev) => new Set(prev).add(image.relative_path));
    try {
      const url = ImageSorterAPI.getDownloadUrl(sessionId, image.relative_path);
      const a = document.createElement("a");
      a.href = url;
      a.download = image.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(image.relative_path);
        return next;
      });
    }
  };

  const handleDownloadAll = async () => {
    if (!results) return;
    for (const img of results.matched_images) {
      await handleDownload(img);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  };

  const sorted = useMemo(() => {
    if (!results) return [];
    return [...results.matched_images].sort((a, b) =>
      sortBy === "score"
        ? b.similarity_score - a.similarity_score
        : a.filename.localeCompare(b.filename)
    );
  }, [results, sortBy]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <svg className="h-8 w-8 animate-spin text-violet-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-gray-500">Loading your results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-14 text-center">
        <p className="font-semibold text-red-600">{error}</p>
        <button onClick={onReset} className="mt-4 text-sm font-semibold text-violet-600 hover:underline">
          Start over
        </button>
      </div>
    );
  }

  if (!results) return null;

  return (
    <div className="space-y-8">
      <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
              Step 4
              <span className="h-1 w-1 rounded-full bg-violet-400" />
              Results
            </div>

            <div>
              <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {results.matched_count > 0
                  ? `Found ${results.matched_count} photo${results.matched_count !== 1 ? "s" : ""} of you`
                  : "No confident matches found"}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-gray-600">
                The scan reviewed {results.total_images_scanned.toLocaleString()} image
                {results.total_images_scanned === 1 ? "" : "s"}
                {results.processing_time_seconds
                  ? ` in ${results.processing_time_seconds.toFixed(2)} seconds`
                  : ""}.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3">
              <div className="h-11 w-11 overflow-hidden rounded-xl border border-gray-200 bg-white">
                <img src={referencePreview} alt="Reference" className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Reference
                </p>
                <p className="text-sm font-medium text-gray-700">Matched against your uploaded face</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Matches</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{results.matched_count}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Scanned</p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {results.total_images_scanned.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Faces found</p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {results.images_with_detected_faces.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Top confidence</p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {results.top_match_confidence != null
                    ? `${Math.round(results.top_match_confidence * 100)}%`
                    : "N/A"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Model</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {results.requested_model_name ?? "Unknown"}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Threshold</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {results.requested_similarity_threshold != null
                    ? results.requested_similarity_threshold.toFixed(2)
                    : "Unknown"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {results.matched_count === 0 ? (
        <div className="rounded-[30px] border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          </div>
          <h3 className="mt-4 text-xl font-bold text-slate-900">No photos matched strongly enough</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
            Try a clearer reference photo, a more complete dataset, or a slightly more lenient
            match sensitivity before scanning again.
          </p>
          <button
            onClick={onReset}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
          >
            Start a new search
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-[26px] border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Sort by
              </span>
              <button
                onClick={() => setSortBy("score")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  sortBy === "score"
                    ? "bg-indigo-950 text-white"
                    : "border border-gray-200 bg-slate-50 text-gray-600 hover:bg-slate-100"
                }`}
              >
                Similarity
              </button>
              <button
                onClick={() => setSortBy("name")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  sortBy === "name"
                    ? "bg-indigo-950 text-white"
                    : "border border-gray-200 bg-slate-50 text-gray-600 hover:bg-slate-100"
                }`}
              >
                Filename
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleDownloadAll}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download all
              </button>

              <button
                onClick={onReset}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-900"
              >
                New search
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Avg match</p>
              <p className="mt-1 text-xl font-black text-slate-900">
                {results.average_match_confidence != null
                  ? `${Math.round(results.average_match_confidence * 100)}%`
                  : "N/A"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">No-face images</p>
              <p className="mt-1 text-xl font-black text-slate-900">
                {results.images_without_detected_faces.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Multi-face images</p>
              <p className="mt-1 text-xl font-black text-slate-900">
                {results.images_with_multiple_faces.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Review note</p>
              <p className="mt-1 text-sm font-medium leading-5 text-slate-700">
                Backend ranking favors stronger similarity first. Multi-face frames may need visual review.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((image, index) => (
              <ImageCard
                key={image.relative_path}
                image={image}
                sessionId={sessionId}
                isDownloading={downloading.has(image.relative_path)}
                onDownload={() => handleDownload(image)}
                animationDelay={index * 50}
              />
            ))}
          </div>
        </>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-slate-50 p-4 text-sm text-gray-600">
        <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <p>
          All uploaded files and matched images remain temporary session data and are automatically
          cleaned up after expiry.
        </p>
      </div>
    </div>
  );
}

function ImageCard({
  image,
  sessionId,
  isDownloading,
  onDownload,
  animationDelay,
}: {
  image: MatchedImage;
  sessionId: string;
  isDownloading: boolean;
  onDownload: () => void;
  animationDelay: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  const previewUrl = image.preview_url || ImageSorterAPI.getDownloadUrl(sessionId, image.relative_path);
  const badge = getMatchBadge(image.similarity_score);

  return (
    <div
      className={`group overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      style={{ transitionDelay: `${animationDelay}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        <img
          src={previewUrl}
          alt={image.filename}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/0 to-slate-900/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute left-4 top-4">
          <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${badge.tone}`}>
            <span>{badge.icon}</span>
            <span>{badge.label}</span>
          </div>
        </div>

        <div className="absolute right-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm">
          #{image.rank}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900" title={image.filename}>
                {image.filename}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {image.face_count !== null && image.face_count > 0
                  ? `${image.face_count} face${image.face_count === 1 ? "" : "s"} detected`
                  : "Face count unavailable"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Confidence {image.confidence_percent}% • {image.confidence_label.replace("_", " ")}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Source group: {image.source_group}
              </p>
              <p className="mt-1 truncate text-[11px] text-gray-400" title={image.relative_path}>
                {image.relative_path}
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              Dist {image.distance.toFixed(2)}
            </div>
          </div>

          <SimilarityBar score={image.similarity_score} />
          <p className="text-xs leading-5 text-gray-500">{image.match_reason}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-950 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-900 disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Downloading...
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download
              </>
            )}
          </button>

          <div className="flex items-center rounded-xl border border-gray-200 px-3 text-xs font-medium text-gray-500">
            Backend-ranked
          </div>
        </div>
      </div>
    </div>
  );
}
