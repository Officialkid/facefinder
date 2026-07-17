"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageSorterAPI, UploadResponse } from "@/lib/api";

interface Props {
  onSuccess: (result: UploadResponse, previewUrl: string) => void;
}

export default function ReferenceUpload({ onSuccess }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setError(null);
      setSelectedFile(file);

      if (preview) {
        URL.revokeObjectURL(preview);
      }

      const url = URL.createObjectURL(file);
      setPreview(url);
    },
    [preview]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [], "image/bmp": [] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (rejections) => {
      const msg = rejections[0]?.errors[0]?.message ?? "File not accepted.";
      setError(msg);
    },
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const result = await ImageSorterAPI.uploadReference(selectedFile);
      onSuccess(result, preview!);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Upload failed. Please try again.";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview(null);
    setSelectedFile(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
          Step 1
          <span className="h-1 w-1 rounded-full bg-violet-400" />
          Reference Photo
        </div>

        <div>
          <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-indigo-950">
            Upload the clearest photo of yourself
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-gray-600">
            This photo becomes the face signature for the whole search. One visible face works
            best, but the backend now validates the file type and image signature before any scan
            begins.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            "Single visible face",
            "JPG, PNG, WEBP, BMP",
            "Up to 10MB",
            "Temporary session storage",
          ].map((tip) => (
            <span
              key={tip}
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600"
            >
              {tip}
            </span>
          ))}
        </div>
      </div>

      {!preview ? (
        <div
          {...getRootProps()}
          className={`relative overflow-hidden rounded-[28px] border-2 border-dashed p-10 text-center transition-all duration-200 sm:p-12 ${
            isDragActive
              ? "border-violet-500 bg-violet-50 shadow-lg shadow-violet-100"
              : "border-gray-200 bg-gradient-to-br from-white via-slate-50 to-violet-50/50 hover:border-violet-400 hover:shadow-md"
          }`}
        >
          <input {...getInputProps()} />

          <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-b-[32px] bg-gradient-to-b from-violet-100/70 to-transparent" />

          <div className="relative flex flex-col items-center gap-4">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-3xl border transition-colors ${
                isDragActive
                  ? "border-violet-300 bg-white text-violet-700"
                  : "border-violet-100 bg-white text-violet-500"
              }`}
            >
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <h3 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {isDragActive ? "Drop to prepare your face scan" : "Drop your photo here"}
              </h3>
              <p className="text-base text-slate-600">
                Click to browse or drag a file in. The best reference is sharp, well lit, and
                centered on your face.
              </p>
            </div>

            <div className="grid w-full max-w-2xl grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white/80 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-gray-400">Best Match</p>
                <p className="mt-1 text-sm font-semibold text-gray-700">One face, front-facing, minimal blur</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white/80 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-gray-400">Accepted</p>
                <p className="mt-1 text-sm font-semibold text-gray-700">JPG, PNG, WEBP, BMP</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white/80 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-gray-400">Privacy</p>
                <p className="mt-1 text-sm font-semibold text-gray-700">Stored only in your temporary session</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[28px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-emerald-50 shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
              <img src={preview} alt="Reference" className="h-full w-full object-cover" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Reference ready
              </div>
              <p className="truncate text-lg font-bold text-slate-900">{selectedFile?.name}</p>
              <p className="mt-1 text-sm text-gray-500">
                {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : ""}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div className="rounded-xl border border-white bg-white/80 px-3 py-2">
                  The backend will validate the image type before scanning.
                </div>
                <div className="rounded-xl border border-white bg-white/80 px-3 py-2">
                  If this is not the clearest face photo, replace it now.
                </div>
              </div>
            </div>

            <button
              onClick={handleClear}
              className="self-start rounded-xl border border-white bg-white/80 p-2 text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
              aria-label="Remove selected file"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="font-semibold">Upload issue</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-950 px-6 py-4 text-lg font-bold text-white transition-colors hover:bg-indigo-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {uploading ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Validating and uploading...
          </>
        ) : (
          <>
            Continue to dataset step
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-500">
        This file is only used to create your temporary search session and is not kept permanently.
      </p>
    </div>
  );
}
