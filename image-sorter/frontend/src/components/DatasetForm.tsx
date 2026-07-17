"use client";

import { useMemo, useState } from "react";
import {
  getApiErrorMessage,
  ImageSorterAPI,
  RecognitionModel,
  RECOGNITION_MODELS,
} from "@/lib/api";

interface Props {
  sessionId: string;
  referencePreview: string;
  onStarted: () => void;
}

const MODEL_OPTIONS: Array<{ value: RecognitionModel; label: string; desc: string }> = [
  { value: "ArcFace", label: "ArcFace", desc: "Best accuracy and the default recommendation" },
  { value: "Facenet", label: "FaceNet", desc: "Faster for larger datasets with good quality" },
  { value: "VGG-Face", label: "VGG-Face", desc: "Classic baseline when you want a second pass" },
  { value: "DeepFace", label: "DeepFace", desc: "Useful as an alternate pass when recall matters" },
];

const SUPPORTED_SOURCES = [
  "Google Photos",
  "Pixieset",
  "Pixabay",
  "Google Drive",
  "Dropbox",
  "ZIP link",
  "Direct image URL",
];

function getDatasetUrlState(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: null as boolean | null, message: "" };
  }

  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { isValid: false, message: "Use a public http:// or https:// dataset URL." };
    }

    const host = url.hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host)) {
      return { isValid: false, message: "Local or loopback dataset URLs are blocked for security." };
    }

    const suffix = url.pathname.split(".").pop()?.toLowerCase();
    if (
      suffix &&
      !["zip", "jpg", "jpeg", "png", "bmp", "webp", "tiff"].includes(suffix)
    ) {
      return {
        isValid: false,
        message: "Use a ZIP archive link, direct image URL, or a supported public gallery link.",
      };
    }

    return {
      isValid: true,
      message: "Dataset URL looks valid and is ready for backend provider checks.",
    };
  } catch {
    return { isValid: false, message: "Enter a valid public dataset URL starting with http:// or https://." };
  }
}

export default function DatasetForm({ sessionId, referencePreview, onStarted }: Props) {
  const [datasetUrl, setDatasetUrl] = useState("");
  const [threshold, setThreshold] = useState(0.4);
  const [model, setModel] = useState<RecognitionModel>(RECOGNITION_MODELS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlState = useMemo(() => getDatasetUrlState(datasetUrl), [datasetUrl]);

  const handleSubmit = async () => {
    if (!datasetUrl.trim()) {
      setError("Please enter a dataset URL.");
      return;
    }

    if (urlState.isValid === false) {
      setError(urlState.message);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await ImageSorterAPI.startProcessing(sessionId, datasetUrl.trim(), threshold, model);
      onStarted();
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "Failed to start processing. Check the dataset URL and try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
          Step 2
          <span className="h-1 w-1 rounded-full bg-indigo-400" />
          Dataset Source
        </div>

        <div>
          <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-indigo-950">
            Point the search to your event photos
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-gray-600">
            Paste the public dataset link where the event photos live. The backend now accepts
            supported gallery providers like Google Photos, Pixieset, and Pixabay alongside direct
            ZIP or image links, while still rejecting unsafe local or private URLs.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-emerald-200 bg-white">
          <img src={referencePreview} alt="Reference" className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Reference photo locked in
          </p>
          <p className="text-sm text-emerald-900">
            Session <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs">{sessionId.slice(0, 8)}...</code> is ready for dataset scanning.
          </p>
        </div>
        <div className="ml-auto h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </div>

      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <label
            htmlFor="dataset-url"
            className="block text-sm font-bold uppercase tracking-[0.16em] text-gray-600"
          >
            Album or dataset URL
          </label>

          <div
            className={`flex items-center gap-2 rounded-2xl border p-1 transition-all ${
              urlState.isValid === true
                ? "border-emerald-300 bg-emerald-50/50"
                : urlState.isValid === false
                  ? "border-red-300 bg-red-50/60"
                  : "border-gray-200 bg-slate-50 hover:border-indigo-300"
            }`}
          >
            <div className="pl-3 text-gray-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>

            <input
              id="dataset-url"
              type="url"
              value={datasetUrl}
              onChange={(e) => setDatasetUrl(e.target.value)}
              placeholder="https://photos.app.goo.gl/... or https://example.com/photos.zip"
              className="flex-1 bg-transparent px-1 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
            />

            {urlState.isValid !== null && (
              <div className="pr-3">
                {urlState.isValid ? (
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
            )}
          </div>

          <p
            className={`text-sm ${
              urlState.isValid === false
                ? "text-red-700"
                : urlState.isValid === true
                  ? "text-emerald-700"
                  : "text-gray-500"
            }`}
          >
            {urlState.message || "Use a public Google Photos, Pixieset, Pixabay, Drive, Dropbox, ZIP, or direct image link."}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {SUPPORTED_SOURCES.map((source) => (
              <span
                key={source}
                className="inline-flex items-center rounded-full border border-gray-200 bg-slate-50 px-3 py-1 text-xs font-medium text-gray-600"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm space-y-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-gray-600">
            Recognition model
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {MODEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setModel(opt.value)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  model === opt.value
                    ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <p className={`text-sm font-semibold ${model === opt.value ? "text-violet-800" : "text-gray-700"}`}>
                  {opt.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-bold uppercase tracking-[0.16em] text-gray-600">
              Match sensitivity
            </label>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-mono text-violet-700">
              {threshold.toFixed(2)}
            </span>
          </div>

          <input
            type="range"
            min="0.2"
            max="0.7"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full accent-violet-600"
          />

          <div className="mt-2 flex justify-between text-xs text-gray-400">
            <span>Strict: fewer, more precise matches</span>
            <span>Lenient: more results, higher false-positive risk</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="font-semibold">Dataset step blocked</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 py-4 text-lg font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Queueing scan job...
          </>
        ) : (
          <>
            Start AI scan
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
