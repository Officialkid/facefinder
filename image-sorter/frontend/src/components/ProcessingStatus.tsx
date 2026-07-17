"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageSorterAPI, SessionError, StatusResponse } from "@/lib/api";

interface Props {
  sessionId: string;
  onComplete: () => void;
  onFailed: (error: SessionError | null) => void;
}

const POLL_INTERVAL_MS = 3000;

const processingFacts = [
  "ArcFace converts each detected face into an embedding so matches can be ranked consistently.",
  "The pipeline checks every dataset image independently, so one bad file does not stop the whole scan.",
  "Dataset progress improves once the archive has been downloaded and the image count is known.",
  "Face alignment helps reduce the effect of tilt and rotation before comparison starts.",
  "Reference and dataset files are temporary and are cleaned up after processing completes.",
];

const stageOrder: StatusResponse["stage"][] = [
  "queued",
  "upload_received",
  "dataset_validation",
  "dataset_download",
  "dataset_extraction",
  "reference_analysis",
  "dataset_scan",
  "results_ready",
];

const stageMeta: Record<
  StatusResponse["stage"],
  { label: string; description: string; accent: string }
> = {
  queued: {
    label: "Queued",
    description: "Waiting for an available worker to start your scan.",
    accent: "bg-amber-500",
  },
  upload_received: {
    label: "Reference ready",
    description: "Your uploaded face image has been accepted.",
    accent: "bg-sky-500",
  },
  dataset_validation: {
    label: "Validating dataset",
    description: "Checking the dataset source and basic safety rules.",
    accent: "bg-cyan-500",
  },
  dataset_download: {
    label: "Downloading dataset",
    description: "Fetching the dataset archive from the provided link.",
    accent: "bg-blue-500",
  },
  dataset_extraction: {
    label: "Preparing files",
    description: "Extracting images and verifying the archive structure.",
    accent: "bg-indigo-500",
  },
  reference_analysis: {
    label: "Analyzing reference",
    description: "Detecting and encoding the face in your reference image.",
    accent: "bg-violet-500",
  },
  dataset_scan: {
    label: "Scanning dataset",
    description: "Comparing detected faces across dataset images for matches.",
    accent: "bg-fuchsia-500",
  },
  results_ready: {
    label: "Preparing results",
    description: "Ranking matches and finalizing the result package.",
    accent: "bg-emerald-500",
  },
  failed: {
    label: "Failed",
    description: "Processing stopped before results could be prepared.",
    accent: "bg-red-500",
  },
};

export default function ProcessingStatus({ sessionId, onComplete, onFailed }: Props) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [factIndex, setFactIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());
  const pollRef = useRef<NodeJS.Timeout>();
  const factRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    factRef.current = setInterval(() => {
      setFactIndex((index) => (index + 1) % processingFacts.length);
    }, 4000);

    const ticker = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);

    const poll = async () => {
      try {
        const nextStatus = await ImageSorterAPI.getStatus(sessionId);
        setStatus(nextStatus);

        if (nextStatus.status === "completed") {
          clearInterval(pollRef.current);
          clearInterval(factRef.current);
          clearInterval(ticker);
          setTimeout(onComplete, 800);
        } else if (nextStatus.status === "failed" || nextStatus.status === "expired") {
          clearInterval(pollRef.current);
          clearInterval(factRef.current);
          clearInterval(ticker);
          onFailed(nextStatus.error);
        }
      } catch {
        // Keep polling through brief network failures.
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      clearInterval(pollRef.current);
      clearInterval(factRef.current);
      clearInterval(ticker);
    };
  }, [sessionId, onComplete, onFailed]);

  const stageIndex = status ? stageOrder.indexOf(status.stage) : 0;
  const stage = status?.stage ? stageMeta[status.stage] : stageMeta.queued;

  const stageSummary = useMemo(() => {
    if (!status) {
      return "Connecting to the processing worker and preparing your session.";
    }

    if (status.stage_message) {
      return status.stage_message;
    }

    if (status.stage === "dataset_scan" && status.current_image) {
      return `Currently scanning ${status.current_image}.`;
    }

    if (status.stage === "queued" && status.queue_position) {
      return `Your job is waiting in position ${status.queue_position}.`;
    }

    return stage.description;
  }, [stage.description, status]);

  const formatElapsed = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  const formatClockTime = (value: string | null | undefined) => {
    if (!value) return null;
    return new Date(value).toLocaleTimeString();
  };

  const stageElapsed = status?.stage_elapsed_seconds ?? 0;
  const estimatedRemaining = status?.estimated_remaining_seconds ?? null;

  const progressValue = Math.max(status?.progress_percent ?? 10, 10);
  const discoveredCount = status?.total_images_discovered ?? 0;
  const scannedCount = status?.total_images_scanned ?? 0;
  const backendRuntime = status?.processing_time_seconds;
  const downloadedBytes = status?.dataset_downloaded_bytes ?? 0;
  const totalDownloadBytes = status?.dataset_total_bytes ?? null;
  const extractedFiles = status?.dataset_files_extracted ?? 0;
  const totalExtractFiles = status?.dataset_total_files ?? null;

  const formatBytes = (value: number) => {
    if (value <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700">
          <span className={`h-2 w-2 rounded-full ${stage.accent}`} />
          Live processing
        </p>
        <h2 className="text-2xl font-bold text-slate-950">The scan is actively running</h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          We are following the full backend pipeline in real time so you can see what the worker is
          doing, how far it has progressed, and whether the dataset scan is already finding matches.
        </p>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_38%),linear-gradient(135deg,_#0f172a_0%,_#1e1b4b_52%,_#111827_100%)] p-6 text-white shadow-xl sm:p-8">
        <div className="space-y-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200">
                Current stage
              </p>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold">{stage.label}</h3>
                <p className="max-w-xl text-sm leading-6 text-slate-300">{stageSummary}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Progress</p>
                <p className="mt-2 text-3xl font-bold">{status?.progress_percent ?? 0}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Matches</p>
                <p className="mt-2 text-3xl font-bold">{status?.matched_count ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>{discoveredCount > 0 ? `${scannedCount} of ${discoveredCount} images scanned` : "Preparing image inventory"}</span>
              <span>{status?.queue_position ? `Queue position ${status.queue_position}` : "Worker active"}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-fuchsia-400 transition-[width] duration-700 ease-out"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-200">Images scanned</p>
              <p className="mt-2 text-2xl font-bold">{scannedCount.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-300">
                {status?.stage === "dataset_download"
                  ? totalDownloadBytes
                    ? `${formatBytes(downloadedBytes)} of ${formatBytes(totalDownloadBytes)} downloaded`
                    : `${formatBytes(downloadedBytes)} downloaded so far`
                  : status?.stage === "dataset_extraction"
                  ? totalExtractFiles
                    ? `${extractedFiles.toLocaleString()} of ${totalExtractFiles.toLocaleString()} files prepared`
                    : `${extractedFiles.toLocaleString()} files prepared`
                  : discoveredCount > 0
                  ? `${discoveredCount.toLocaleString()} discovered in the dataset`
                  : "Dataset size will appear after extraction"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-200">Elapsed time</p>
              <p className="mt-2 text-2xl font-bold">{formatElapsed(elapsed)}</p>
              <p className="mt-1 text-xs text-slate-300">
                {estimatedRemaining != null
                  ? `Estimated ${formatElapsed(Math.max(0, Math.round(estimatedRemaining)))} remaining`
                  : backendRuntime != null
                  ? `Backend runtime: ${backendRuntime.toFixed(1)}s`
                  : "Runtime updates as processing continues"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-200">Current target</p>
              <p className="mt-2 truncate text-lg font-semibold">
                {status?.current_image ?? "Waiting for the next scan item"}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                Live image names appear when the worker is in the dataset scan phase.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-200">Session health</p>
              <p className="mt-2 text-lg font-semibold capitalize">
                {status?.status ?? "pending"}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {status?.last_updated_at
                  ? `Last update at ${new Date(status.last_updated_at).toLocaleTimeString()}`
                  : "Waiting for the first worker update"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-200">Processing started</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatClockTime(status?.processing_started_at) ?? "Queued but not yet timestamped"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-200">Stage started</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatClockTime(status?.current_stage_started_at) ?? "Waiting for stage metadata"}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {status ? `${formatElapsed(Math.max(0, Math.round(stageElapsed)))} in this stage` : "Stage timer will appear once updates arrive"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-200">Completed at</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatClockTime(status?.processing_completed_at) ?? "Still running"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-200">Recognition model</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {status?.requested_model_name ?? "Waiting for processing settings"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-200">Dataset source</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {status?.dataset_provider
                  ? `${status.dataset_provider}${status.dataset_source_kind ? ` (${status.dataset_source_kind.replace("_", " ")})` : ""}`
                  : "Waiting for dataset metadata"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-200">Match sensitivity</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {status?.requested_similarity_threshold != null
                  ? status.requested_similarity_threshold.toFixed(2)
                  : "Waiting for processing settings"}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
                  Pipeline checkpoints
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Each step below mirrors a real backend stage rather than a simulated animation.
                </p>
              </div>
              <p className="text-xs text-slate-400">{Math.max(stageIndex + 1, 1)} of {stageOrder.length}</p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {stageOrder.map((pipelineStage, index) => {
                const isCurrent = status?.stage === pipelineStage;
                const isComplete = stageIndex > index || status?.status === "completed";
                const meta = stageMeta[pipelineStage];

                return (
                  <div
                    key={pipelineStage}
                    className={`rounded-2xl border p-4 transition-colors ${
                      isCurrent
                        ? "border-violet-300 bg-violet-500/15"
                        : isComplete
                        ? "border-emerald-400/30 bg-emerald-500/10"
                        : "border-white/10 bg-slate-950/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{meta.label}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-300">{meta.description}</p>
                      </div>
                      <span
                        className={`mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold ${
                          isCurrent
                            ? "bg-violet-300 text-violet-950"
                            : isComplete
                            ? "bg-emerald-300 text-emerald-950"
                            : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {isComplete ? "Done" : isCurrent ? "Now" : index + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-indigo-700 shadow-sm">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
        </div>
        <p key={factIndex} className="text-sm leading-6 text-indigo-950" style={{ animation: "fadeIn 0.4s ease" }}>
          {processingFacts[factIndex]}
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
