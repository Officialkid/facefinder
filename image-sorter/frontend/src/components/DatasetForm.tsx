"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageSorterAPI, RecognitionModel } from "@/lib/api";

interface Props {
  sessionId: string;
  referencePreview: string;
  selectedFaceIndex?: number | null;
  onStarted: () => void;
  onBack: () => void;
}

export default function DatasetForm({ sessionId, referencePreview, selectedFaceIndex, onStarted, onBack }: Props) {
  const [sourceMode, setSourceMode] = useState<"url" | "zip">("url");
  const [datasetUrl, setDatasetUrl] = useState("");
  const [datasetEmail, setDatasetEmail] = useState("");
  const [datasetPassword, setDatasetPassword] = useState("");
  const [showAuthFields, setShowAuthFields] = useState(false);
  const [threshold, setThreshold] = useState(0.45);
  const [modelName, setModelName] = useState<RecognitionModel>("ArcFace");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgSrc, setImgSrc] = useState(referencePreview || ImageSorterAPI.getReferenceImageUrl(sessionId));

  // ZIP upload state
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipUploading, setZipUploading] = useState(false);
  const [zipReadyCount, setZipReadyCount] = useState<number | null>(null);

  const handleZipDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Please select a valid .zip file.");
      return;
    }

    setZipFile(file);
    setError(null);
    setZipUploading(true);

    try {
      const res = await ImageSorterAPI.uploadDatasetZip(sessionId, file);
      setZipReadyCount(res.image_count);
      setDatasetUrl(`local_zip://${file.name}`);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Failed to upload and extract ZIP file. Please try again.";
      setError(msg);
      setZipFile(null);
      setZipReadyCount(null);
    } finally {
      setZipUploading(false);
    }
  }, [sessionId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleZipDrop,
    accept: { "application/zip": [".zip"], "application/x-zip-compressed": [".zip"] },
    maxFiles: 1,
    maxSize: 300 * 1024 * 1024,
    noClick: false,
    onDropRejected: (rejections) => {
      const msg = rejections[0]?.errors[0]?.message ?? "File rejected. Please upload a ZIP under 300MB.";
      setError(msg);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (sourceMode === "url" && !datasetUrl.trim()) {
      setError("Please enter a valid dataset or album URL.");
      return;
    }

    if (sourceMode === "zip" && !datasetUrl.startsWith("local_zip://")) {
      setError("Please upload a .zip file first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await ImageSorterAPI.startProcessing(
        sessionId,
        datasetUrl.trim(),
        threshold,
        modelName,
        selectedFaceIndex,
        datasetEmail.trim() || undefined,
        datasetPassword.trim() || undefined
      );
      onStarted();
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Failed to initiate scan. Please verify your album source.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const similarityPercent = Math.round((1 - threshold) * 100);

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8">
      {/* Main Interaction Card */}
      <div className="w-full glass-panel rounded-2xl p-1 relative overflow-hidden group shadow-2xl">
        {/* Inner Bevel Effect */}
        <div className="absolute inset-0 border-t border-l border-white/20 rounded-2xl pointer-events-none" />
        <div className="absolute inset-0 border-b border-r border-black/40 rounded-2xl pointer-events-none" />

        <div className="bg-surface-container/40 rounded-xl p-6 sm:p-8 backdrop-blur-md space-y-8">
          {/* Stepper */}
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-surface-variant -z-10 -translate-y-1/2" />
            <div
              onClick={onBack}
              title="Click to change reference portrait"
              className="flex flex-col items-center gap-2 bg-surface-container/40 px-2 cursor-pointer group/step"
            >
              <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-tertiary flex items-center justify-center text-tertiary group-hover/step:border-secondary transition-colors">
                <span className="material-symbols-outlined text-[16px] font-bold">check</span>
              </div>
              <span className="font-mono text-xs text-on-surface-variant group-hover/step:text-white transition-colors flex items-center gap-0.5">
                <span>Reference Face</span>
                <span className="material-symbols-outlined text-[12px]">edit</span>
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-surface-container/40 px-2">
              <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center border-2 border-secondary glow-pulse relative">
                <div className="absolute inset-0 rounded-full bg-secondary/20 animate-ping" />
                <span className="font-mono text-xs text-secondary font-bold z-10">2</span>
              </div>
              <span className="font-mono text-xs text-secondary font-semibold">Dataset Source</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-surface-container/40 px-2">
              <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center border border-white/10 text-on-surface-variant">
                <span className="font-mono text-xs">3</span>
              </div>
              <span className="font-mono text-xs text-on-surface-variant">AI Recognition</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-surface-container/40 px-2">
              <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center border border-white/10 text-on-surface-variant">
                <span className="font-mono text-xs">4</span>
              </div>
              <span className="font-mono text-xs text-on-surface-variant">Results</span>
            </div>
          </div>

          {/* Screen Title */}
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Configure Scan Parameters
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant">
              Define your event album source, recognition tensor model, and cosine sensitivity.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-error-container/20 border border-error/40 text-error text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Top Row: Target Profile & Target Dataset Source */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* Target Profile Card */}
            <div className="md:col-span-4 glass-panel rounded-xl p-4 flex flex-col justify-between relative overflow-hidden bg-surface-container-low/60">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
                  Target Profile
                </span>
                <button
                  type="button"
                  onClick={onBack}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-surface border border-white/10 text-secondary hover:text-white transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[12px]">cached</span>
                  <span>Change</span>
                </button>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-secondary/50 flex-shrink-0 bg-surface-container-lowest">
                  <img
                    src={imgSrc}
                    onError={() => setImgSrc(ImageSorterAPI.getReferenceImageUrl(sessionId))}
                    alt="Target Reference"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-on-surface-variant uppercase">Session ID</p>
                  <p className="font-mono text-xs font-bold text-secondary tracking-wider truncate">
                    {sessionId ? `FF-AI-${sessionId.slice(0, 5).toUpperCase()}` : "FF-AI-9928X"}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-tertiary">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                    Biometrics Locked
                  </span>
                </div>
              </div>
            </div>

            {/* Target Dataset Source Input */}
            <div className="md:col-span-8 glass-panel rounded-xl p-4 flex flex-col justify-between space-y-3 bg-surface-container-low/60">
              {/* Mode Toggle Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSourceMode("url");
                      if (datasetUrl.startsWith("local_zip://")) {
                        setDatasetUrl("");
                      }
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                      sourceMode === "url"
                        ? "bg-secondary text-slate-950 shadow-sm"
                        : "text-on-surface-variant hover:text-white bg-surface-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">link</span>
                    <span>Album / Gallery URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceMode("zip");
                      if (!datasetUrl.startsWith("local_zip://")) {
                        setDatasetUrl(zipFile ? `local_zip://${zipFile.name}` : "");
                      }
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                      sourceMode === "zip"
                        ? "bg-tertiary text-slate-950 shadow-sm"
                        : "text-on-surface-variant hover:text-white bg-surface-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">folder_zip</span>
                    <span>Upload Local ZIP</span>
                  </button>
                </div>
                <span className="material-symbols-outlined text-outline text-[16px]">info</span>
              </div>

              {/* URL Input Mode */}
              {sourceMode === "url" ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
                      <span className="material-symbols-outlined text-[18px]">link</span>
                    </div>
                    <input
                      id="dataset-url"
                      type="url"
                      value={datasetUrl.startsWith("local_zip://") ? "" : datasetUrl}
                      onChange={(e) => setDatasetUrl(e.target.value)}
                      placeholder="https://photos.app.goo.gl/... or https://client.pixieset.com/... or Google Drive Link"
                      className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-white/10 rounded-lg text-xs text-white placeholder:text-outline focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-mono"
                    />
                  </div>

                  {/* Supported Provider Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="font-mono text-[10px] text-outline">Supported:</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-white/5 font-mono text-[10px] text-on-surface-variant">
                      <span className="material-symbols-outlined text-[12px] text-secondary">photo_library</span>
                      Google Photos
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-white/5 font-mono text-[10px] text-on-surface-variant">
                      <span className="material-symbols-outlined text-[12px] text-secondary">collections</span>
                      Pixieset
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-white/5 font-mono text-[10px] text-primary">cloud</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-white/5 font-mono text-[10px] text-on-surface-variant">
                      Google Drive
                    </span>
                  </div>

                  {/* Protected Gallery Access (Email & Password/PIN) Accordion */}
                  <div className="mt-2 pt-2.5 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setShowAuthFields(!showAuthFields)}
                      className="flex items-center gap-1.5 text-xs font-mono text-on-surface-variant hover:text-white transition-colors group"
                    >
                      <span className="material-symbols-outlined text-[15px] text-secondary group-hover:scale-110 transition-transform">
                        {showAuthFields ? "lock_open" : "lock"}
                      </span>
                      <span className="font-semibold text-secondary">
                        {showAuthFields ? "Protected Gallery Credentials" : "🔒 Password or Email Required for Album?"}
                      </span>
                      <span className="text-[10px] text-outline ml-1">
                        (Optional • For Pixieset &amp; private collections)
                      </span>
                      <span className="material-symbols-outlined text-[15px] text-outline ml-auto">
                        {showAuthFields ? "expand_less" : "expand_more"}
                      </span>
                    </button>

                    {showAuthFields && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 animate-fadeIn">
                        <div>
                          <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-secondary">mail</span>
                            <span>Visitor Email</span>
                          </label>
                          <input
                            type="email"
                            value={datasetEmail}
                            onChange={(e) => setDatasetEmail(e.target.value)}
                            placeholder="e.g. yourname@example.com"
                            className="w-full px-3 py-2 bg-surface-container-lowest border border-white/10 rounded-lg text-xs text-white placeholder:text-outline/50 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-mono"
                          />
                          <p className="font-mono text-[9px] text-outline mt-1">
                            Unlocks client galleries asking for visitor email.
                          </p>
                        </div>

                        <div>
                          <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-secondary">key</span>
                            <span>Gallery Password or PIN</span>
                          </label>
                          <input
                            type="password"
                            value={datasetPassword}
                            onChange={(e) => setDatasetPassword(e.target.value)}
                            placeholder="e.g. 1234 or album password"
                            className="w-full px-3 py-2 bg-surface-container-lowest border border-white/10 rounded-lg text-xs text-white placeholder:text-outline/50 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-mono"
                          />
                          <p className="font-mono text-[9px] text-outline mt-1">
                            Enter 4-digit PIN or password if protected.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ZIP File Drag-and-Drop Mode */
                <div className="space-y-2">
                  <div
                    {...getRootProps()}
                    className={`w-full border-2 border-dashed rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                      isDragActive
                        ? "border-tertiary bg-tertiary/10 shadow-[0_0_20px_rgba(45,212,191,0.2)]"
                        : zipFile
                        ? "border-tertiary/60 bg-surface-container-lowest"
                        : "border-white/20 hover:border-tertiary/60 bg-surface-container-lowest hover:bg-surface-container/50"
                    }`}
                  >
                    <input {...getInputProps()} />

                    {zipUploading ? (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <div className="w-6 h-6 rounded-full border-2 border-tertiary border-t-transparent animate-spin" />
                        <span className="font-mono text-xs text-tertiary font-medium">Extracting ZIP archive photos...</span>
                      </div>
                    ) : zipFile && zipReadyCount !== null ? (
                      <div className="flex items-center justify-between w-full px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-tertiary/20 border border-tertiary/40 flex items-center justify-center text-tertiary">
                            <span className="material-symbols-outlined text-[22px]">folder_zip</span>
                          </div>
                          <div>
                            <p className="font-mono text-xs font-bold text-white truncate max-w-[220px] sm:max-w-xs">{zipFile.name}</p>
                            <p className="font-mono text-[11px] text-tertiary flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                              <span>{zipReadyCount} event photos ready for scanning</span>
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-surface border border-white/10 text-[10px] font-mono text-on-surface-variant">
                          Click to Change
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center gap-1.5 py-2">
                        <div className="w-9 h-9 rounded-full bg-tertiary/15 border border-tertiary/30 flex items-center justify-center text-tertiary">
                          <span className="material-symbols-outlined text-[20px]">upload_file</span>
                        </div>
                        <div>
                          <span className="font-mono text-xs font-bold text-white">Click or drag &amp; drop your .ZIP file here</span>
                          <p className="font-mono text-[10px] text-outline mt-0.5">Supports ZIP archives containing 1 to 1,000+ event photos (JPG, PNG, WEBP)</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recognition Engine Architecture Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs uppercase tracking-wider text-on-surface-variant font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[16px]">psychology</span>
                <span>Recognition Engine Architecture</span>
              </label>
              <span className="font-mono text-[11px] text-outline">Select Tensor Model</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* ArcFace */}
              <div
                onClick={() => setModelName("ArcFace")}
                className={`cursor-pointer rounded-xl p-4 transition-all duration-200 relative overflow-hidden border flex flex-col justify-between ${
                  modelName === "ArcFace"
                    ? "bg-primary-container/20 border-primary shadow-[0_0_20px_rgba(208,188,255,0.2)]"
                    : "glass-panel bg-surface-container-low/40 border-white/10 hover:border-primary/40 hover:bg-surface-container-high/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-bold text-white">ArcFace</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-primary/20 text-primary border border-primary/40">
                      Recommended SOTA
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    512-D Angular Margin Loss (99.83% LFW). Best for 95% of events: weddings, crowded stages &amp; varying poses.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-outline">
                  <span>Vectors: 512</span>
                  <span>ResNet-50</span>
                </div>
              </div>

              {/* FaceNet */}
              <div
                onClick={() => setModelName("Facenet")}
                className={`cursor-pointer rounded-xl p-4 transition-all duration-200 relative overflow-hidden border flex flex-col justify-between ${
                  modelName === "Facenet"
                    ? "bg-secondary-container/20 border-secondary shadow-[0_0_20px_rgba(76,215,246,0.2)]"
                    : "glass-panel bg-surface-container-low/40 border-white/10 hover:border-secondary/40 hover:bg-surface-container-high/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-bold text-white">FaceNet</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-secondary/20 text-secondary border border-secondary/40">
                      Ultra Fast Scan
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    128-D Triplet Loss. 3x faster inference. Ideal for scanning massive albums with over 1,000+ images.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-outline">
                  <span>Vectors: 128</span>
                  <span>Inception-ResNet</span>
                </div>
              </div>

              {/* VGG-Face */}
              <div
                onClick={() => setModelName("VGG-Face")}
                className={`cursor-pointer rounded-xl p-4 transition-all duration-200 relative overflow-hidden border flex flex-col justify-between ${
                  modelName === "VGG-Face"
                    ? "bg-tertiary-container/20 border-tertiary shadow-[0_0_20px_rgba(78,222,163,0.2)]"
                    : "glass-panel bg-surface-container-low/40 border-white/10 hover:border-tertiary/40 hover:bg-surface-container-high/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-bold text-white">VGG-Face</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-tertiary/20 text-tertiary border border-tertiary/40">
                      Legacy Robust
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    4096-D Deep CNN. Extremely robust against vintage/older photos, motion blur, and low-light venues.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-outline">
                  <span>Vectors: 4096</span>
                  <span>VGG-16</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cosine Sensitivity Threshold Slider */}
          <div className="glass-panel rounded-xl p-5 bg-surface-container-low/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="sensitivity" className="font-mono text-xs uppercase tracking-wider text-on-surface-variant font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[16px]">tune</span>
                <span>Cosine Distance Threshold</span>
              </label>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-outline">Max Angular Distance:</span>
                <span className="font-bold text-secondary">{threshold.toFixed(2)}</span>
                <span className="px-2 py-0.5 rounded bg-surface border border-white/10 text-tertiary text-[11px] font-bold">
                  {similarityPercent}% Match Cutoff
                </span>
              </div>
            </div>

            <input
              id="sensitivity"
              type="range"
              min="0.20"
              max="0.65"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-surface-container-lowest rounded-lg appearance-none cursor-pointer accent-secondary"
            />

            {/* Presets with Guidance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setThreshold(0.35)}
                className={`p-2.5 rounded-lg text-left text-xs font-mono transition-all border ${
                  threshold === 0.35
                    ? "bg-secondary/15 border-secondary text-white shadow-sm"
                    : "text-on-surface-variant hover:text-white bg-surface-container border-white/5"
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Strict (0.35)</span>
                  <span className="text-[10px] text-secondary">65% Cutoff</span>
                </div>
                <p className="text-[10px] text-outline mt-0.5">Zero false positives. Front-facing only.</p>
              </button>

              <button
                type="button"
                onClick={() => setThreshold(0.4)}
                className={`p-2.5 rounded-lg text-left text-xs font-mono transition-all border ${
                  threshold === 0.4
                    ? "bg-secondary/15 border-secondary text-white shadow-sm"
                    : "text-on-surface-variant hover:text-white bg-surface-container border-white/5"
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Balanced (0.40)</span>
                  <span className="text-[10px] text-tertiary font-bold">Recommended</span>
                </div>
                <p className="text-[10px] text-outline mt-0.5">Captures smiles, angled poses &amp; indoor lighting.</p>
              </button>

              <button
                type="button"
                onClick={() => setThreshold(0.5)}
                className={`p-2.5 rounded-lg text-left text-xs font-mono transition-all border ${
                  threshold === 0.5
                    ? "bg-secondary/15 border-secondary text-white shadow-sm"
                    : "text-on-surface-variant hover:text-white bg-surface-container border-white/5"
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Broad (0.50)</span>
                  <span className="text-[10px] text-outline">50% Cutoff</span>
                </div>
                <p className="text-[10px] text-outline mt-0.5">Forgiving. Detects hats, sunglasses &amp; crowds.</p>
              </button>
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-5 py-3 rounded-lg bg-surface border border-white/10 hover:border-secondary/40 text-on-surface-variant hover:text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back / Change Reference Photo</span>
            </button>

            <button
              type="submit"
              disabled={loading || !datasetUrl.trim()}
              className="w-full sm:w-auto gradient-button text-white px-8 py-3 rounded-lg font-mono text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Connecting to Recognition Worker...</span>
                </>
              ) : (
                <>
                  <span>Initialize Scan Pipeline</span>
                  <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
